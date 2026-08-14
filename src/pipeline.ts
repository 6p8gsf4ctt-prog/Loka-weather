import { CITIES } from "./config/cities";
import { MODELS } from "./config/models";
import { buildConsensus } from "./engine/consensus";
import { buildLokaForecast } from "./engine/verdict";
import { resolveSceneEngineMode, type ReadinessStatus } from "./engine/engineMode";
import { applyEngineResolutionToForecast } from "./engine/engineRuntime";
import { evaluateV24ActivationGuard } from "./engine/activationGuard";
import { verifyV24CandidateMasterAsset } from "./engine/masterAsset";
import { saveRun, saveShadowHistory } from "./storage/db";
import { getEngineControl } from "./storage/engineControl";
import { getLatestV24ApprovalProof } from "./storage/engineApproval";
import { commitSafePublication, prepareSafePublication } from "./storage/publicationSafety";
import { loadShadowMetricRows } from "./storage/shadowMetrics";
import { evaluateV24Readiness } from "./analytics/readiness";
import type { CityConfig, Env, LokaForecast, ModelForecast } from "./types";
import { fetchModelForecast } from "./weather/openMeteo";

function localDate(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function hasValidV24Decision(forecast: LokaForecast): boolean {
  const value = forecast.diagnostics.scene24;
  return !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).sceneId === "number";
}

async function connectEngineSelector(env: Env, forecast: LokaForecast): Promise<void> {
  let control = null;
  let controlAvailable = false;
  let controlError: string | null = null;

  try {
    control = await getEngineControl(env.DB, forecast.citySlug);
    controlAvailable = control !== null;
  } catch (error) {
    controlError = error instanceof Error ? error.message : String(error);
  }

  let readiness: ReadinessStatus = "UNAVAILABLE";
  let readinessError: string | null = null;

  try {
    // Current run is not archived yet: it cannot help authorize itself.
    const rows = await loadShadowMetricRows(env.DB, forecast.citySlug, 30, 1000);
    readiness = evaluateV24Readiness(rows).status;
  } catch (error) {
    readinessError = error instanceof Error ? error.message : String(error);
  }

  const configuredMode =
    (env as Env & { SCENE_ENGINE_MODE?: "LEGACY" | "V24_PREVIEW" | "V24" })
      .SCENE_ENGINE_MODE;

  const resolution = resolveSceneEngineMode({
    configuredMode,
    control,
    readiness,
    hasValidV24Decision: hasValidV24Decision(forecast)
  });

  let approvalProof = null;
  try {
    approvalProof = await getLatestV24ApprovalProof(env.DB, forecast.citySlug);
  } catch {
    // Missing approval audit must block V24, never block Legacy.
    approvalProof = null;
  }

  const masterAvailability = await verifyV24CandidateMasterAsset(
    env,
    forecast,
    resolution.effectiveProduction === "V24"
  );

  const activationGuard = evaluateV24ActivationGuard({
    forecast,
    resolution,
    approvalProof,
    masterAvailability
  });

  applyEngineResolutionToForecast({
    forecast,
    resolution,
    inputs: {
      controlAvailable,
      controlError,
      readinessError,
      readinessExcludesCurrentGeneration: true,
      activationGuard
    }
  });
}

async function runCity(env: Env, city: CityConfig, source: string): Promise<LokaForecast> {
  const started = Date.now();
  const targetDate = localDate(city.timezone);
  const settled = await Promise.allSettled(MODELS.map((model) => fetchModelForecast(env, city, model)));

  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });

  if (forecasts.length < 2) {
    await saveRun(env.DB, {
      citySlug: city.slug,
      forecastDate: targetDate,
      generatedAt: new Date().toISOString(),
      source,
      status: "failed",
      modelsOk: forecasts.map((f) => f.modelId),
      modelsFailed: failures,
      durationMs: Date.now() - started,
      errorMessage: "Fewer than two weather models available"
    });
    throw new Error(`LOKA needs at least 2 models; received ${forecasts.length}`);
  }

  const consensus = buildConsensus(forecasts);
  const forecast = buildLokaForecast(city, targetDate, consensus, forecasts);
  forecast.diagnostics.modelsFailed = failures;
  forecast.diagnostics.source = source;

  try {
    await connectEngineSelector(env, forecast);
  } catch (error) {
    forecast.diagnostics.sceneEngine = {
      version: "12.10.0",
      connectedInPipeline: true,
      requested: "LEGACY",
      resolverEffective: "LEGACY",
      effectiveProduction: "LEGACY",
      productionActivationLocked: true,
      previewEnabled: false,
      readiness: "UNAVAILABLE",
      v24Approved: false,
      reason: "pipeline_selector_exception_forced_legacy",
      runtimeForcedLegacy: true,
      error: error instanceof Error ? error.message : String(error)
    };
    forecast.diagnostics.v24ActivationGuard = {
      version: "12.10.0",
      status: "BLOCKED",
      evaluatedAt: new Date().toISOString(),
      fallbackRequired: true,
      activationReadyForCutover: false,
      reason: "pipeline_selector_exception_forced_legacy",
      checks: [],
      candidate: null
    };
    forecast.diagnostics.sceneClassifierProduction = "legacy6";
  }

  let preparation;
  try {
    preparation = await prepareSafePublication(
      env.DB,
      forecast,
      source
    );
  } catch (error) {
    try {
      await saveRun(env.DB, {
        citySlug: city.slug,
        forecastDate: targetDate,
        generatedAt: forecast.generatedAt,
        source,
        status: "failed",
        modelsOk: forecasts.map((f) => f.modelId),
        modelsFailed: failures,
        durationMs: Date.now() - started,
        errorMessage:
          error instanceof Error ? error.message : String(error)
      });
    } catch {
      // The previous public forecast remains authoritative.
    }

    throw error;
  }

  let publication;
  try {
    publication = await commitSafePublication(
      env.DB,
      preparation,
      source
    );
  } catch (error) {
    try {
      await saveRun(env.DB, {
        citySlug: city.slug,
        forecastDate: targetDate,
        generatedAt: forecast.generatedAt,
        source,
        status: "failed",
        modelsOk: forecasts.map((f) => f.modelId),
        modelsFailed: failures,
        durationMs: Date.now() - started,
        errorMessage:
          error instanceof Error ? error.message : String(error)
      });
    } catch {
      // If D1 itself is unavailable, the last committed forecast is retained.
    }

    throw error;
  }

  const publishedForecast = publication.forecast;

  try {
    await saveShadowHistory(
      env.DB,
      publishedForecast,
      source,
      forecasts.map((f) => f.modelId),
      failures
    );
    publishedForecast.diagnostics.shadowArchive = { status: "ok" };
  } catch (error) {
    publishedForecast.diagnostics.shadowArchive = {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }

  await saveRun(env.DB, {
    citySlug: city.slug,
    forecastDate: targetDate,
    generatedAt: publishedForecast.generatedAt,
    source,
    status:
      Object.keys(failures).length || publication.fallbackApplied || !publication.generationAuditRecorded
        ? "partial"
        : "ok",
    modelsOk: forecasts.map((f) => f.modelId),
    modelsFailed: failures,
    durationMs: Date.now() - started,
    errorMessage: publication.fallbackApplied
      ? `publication_fallback:${publication.reason}`
      : !publication.generationAuditRecorded
        ? "publication_generation_audit_missing"
        : undefined
  });

  return publishedForecast;
}

export async function runAllCities(env: Env, source: string): Promise<LokaForecast[]> {
  const results: LokaForecast[] = [];
  for (const city of Object.values(CITIES)) results.push(await runCity(env, city, source));
  return results;
}

export async function runOneCity(env: Env, city: CityConfig, source: string): Promise<LokaForecast> {
  return runCity(env, city, source);
}
