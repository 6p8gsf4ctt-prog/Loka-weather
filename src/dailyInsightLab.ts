import { MODELS } from "./config/models";
import { buildConsensus } from "./engine/consensus";
import { buildDailyInsightDataBundle, type DailyInsightDataBundle } from "./engine/dailyInsight/dataBundle";
import { selectDailyInsightEditorial, type DailyInsightSelectionResult } from "./engine/dailyInsight/editorialSelection";
import { WEEKLY_CLIMATE_STATION_ID } from "./engine/weekly/climateReferences";
import { saveDailyInsightDataBundle } from "./storage/dailyInsightDataCache";
import { recentDailyInsightSelectionHistory, saveDailyInsightEditorialDraft } from "./storage/dailyInsightEditorialDrafts";
import { loadDailyInsightReference } from "./storage/dailyInsightReferences";
import type { CityConfig, Env, ModelForecast } from "./types";
import { collectDailyInsightExternalData } from "./weather/dailyInsightDataSources";
import { fetchModelForecast } from "./weather/openMeteo";
import type { ForecastSnapshot } from "./weather/forecastSnapshot";

export const DAILY_INSIGHT_LAB_PREVIEW_VERSION = "1.0.0" as const;

export interface DailyInsightLabPreviewResult {
  version: typeof DAILY_INSIGHT_LAB_PREVIEW_VERSION;
  mode: "LAB_ONLY";
  citySlug: string;
  targetDate: string;
  generatedAt: string;
  status: "READY" | "REFERENCE_UNAVAILABLE" | "FAILED";
  detail: string;
  bundle: DailyInsightDataBundle | null;
  selection: DailyInsightSelectionResult | null;
  forecast: {
    snapshotId: string | null;
    modelCount: number;
    failures: Record<string, string>;
  };
  persistence: {
    bundleSaved: boolean;
    draftSaved: boolean;
    warnings: string[];
  };
  timings: {
    referenceMs: number;
    forecastMs: number;
    enrichmentMs: number;
    selectionMs: number;
    persistenceMs: number;
    totalMs: number;
  };
}

function roundMs(value: number): number { return Math.round(value * 100) / 100; }

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function snapshotId(city: CityConfig, targetDate: string, forecasts: ModelForecast[]): Promise<string> {
  const value = JSON.stringify({
    version: DAILY_INSIGHT_LAB_PREVIEW_VERSION,
    citySlug: city.slug,
    targetDate,
    forecasts: forecasts.map((forecast) => ({ modelId: forecast.modelId, fetchedAt: forecast.fetchedAt, hourly: forecast.hourly }))
  });
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function captureLabForecast(env: Env, city: CityConfig, targetDate: string, generatedAt: string): Promise<ForecastSnapshot> {
  const settled = await Promise.allSettled(MODELS.map((model) => fetchModelForecast(env, city, model, {
    startDate: targetDate,
    endDate: targetDate,
    forecastDays: 1,
    timeoutMs: 10_000
  })));
  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });
  const consensus = forecasts.length >= 3 ? [...buildConsensus(forecasts).values()].sort((left, right) => left.time.localeCompare(right.time)) : [];
  return {
    version: "1.0.0",
    id: await snapshotId(city, targetDate, forecasts),
    citySlug: city.slug,
    purpose: "DAILY",
    generatedAt,
    request: { forecastDays: 1, startDate: targetDate, endDate: targetDate, timeoutMs: 10_000 },
    forecasts,
    failures,
    consensus
  };
}

function emptyResult(city: CityConfig, targetDate: string, generatedAt: string, status: DailyInsightLabPreviewResult["status"], detail: string, startedAt: number, referenceMs: number): DailyInsightLabPreviewResult {
  return {
    version: DAILY_INSIGHT_LAB_PREVIEW_VERSION,
    mode: "LAB_ONLY",
    citySlug: city.slug,
    targetDate,
    generatedAt,
    status,
    detail,
    bundle: null,
    selection: null,
    forecast: { snapshotId: null, modelCount: 0, failures: {} },
    persistence: { bundleSaved: false, draftSaved: false, warnings: [] },
    timings: { referenceMs: roundMs(referenceMs), forecastMs: 0, enrichmentMs: 0, selectionMs: 0, persistenceMs: 0, totalMs: roundMs(performance.now() - startedAt) }
  };
}

/** Independent manual preview. It never reads or writes the active Daily forecast product. */
export async function generateDailyInsightLabPreview(
  env: Env,
  city: CityConfig,
  targetDate: string,
  now = new Date()
): Promise<DailyInsightLabPreviewResult> {
  const startedAt = performance.now();
  const generatedAt = now.toISOString();
  const referenceStartedAt = performance.now();
  const referencePromise = loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID);
  const reference = await referencePromise;
  const referenceMs = performance.now() - referenceStartedAt;
  if (!reference.snapshot || !["READY", "STALE"].includes(reference.status)) {
    return emptyResult(city, targetDate, generatedAt, "REFERENCE_UNAVAILABLE", reference.detail, startedAt, referenceMs);
  }

  try {
    const forecastStartedAt = performance.now();
    const forecastPromise = captureLabForecast(env, city, targetDate, generatedAt);
    const enrichmentStartedAt = performance.now();
    const enrichmentPromise = collectDailyInsightExternalData(city, targetDate, {
      weatherBaseUrl: env.OPEN_METEO_BASE_URL,
      generatedAt
    });
    const [forecast, enrichment] = await Promise.all([forecastPromise, enrichmentPromise]);
    const forecastMs = performance.now() - forecastStartedAt;
    const enrichmentMs = performance.now() - enrichmentStartedAt;

    const bundle = buildDailyInsightDataBundle({
      city,
      targetDate,
      generatedAt,
      forecast,
      reference: reference.snapshot,
      atmosphere: enrichment.atmosphere,
      marine: enrichment.marine
    });

    const selectionStartedAt = performance.now();
    const history = await recentDailyInsightSelectionHistory(env.DB, city.slug, targetDate, 7);
    const selection = selectDailyInsightEditorial({ bundle, recentSelections: history });
    const selectionMs = performance.now() - selectionStartedAt;

    const persistenceStartedAt = performance.now();
    const warnings: string[] = [];
    let bundleSaved = false, draftSaved = false;
    try { await saveDailyInsightDataBundle(env.DB, bundle); bundleSaved = true; }
    catch (error) { warnings.push(`bundle_not_saved:${error instanceof Error ? error.message : String(error)}`); }
    try { await saveDailyInsightEditorialDraft(env.DB, selection); draftSaved = true; }
    catch (error) { warnings.push(`draft_not_saved:${error instanceof Error ? error.message : String(error)}`); }
    const persistenceMs = performance.now() - persistenceStartedAt;

    return {
      version: DAILY_INSIGHT_LAB_PREVIEW_VERSION,
      mode: "LAB_ONLY",
      citySlug: city.slug,
      targetDate,
      generatedAt,
      status: "READY",
      detail: selection.status.toLowerCase(),
      bundle,
      selection,
      forecast: { snapshotId: forecast.id, modelCount: forecast.forecasts.length, failures: forecast.failures },
      persistence: { bundleSaved, draftSaved, warnings },
      timings: {
        referenceMs: roundMs(referenceMs),
        forecastMs: roundMs(forecastMs),
        enrichmentMs: roundMs(enrichmentMs),
        selectionMs: roundMs(selectionMs),
        persistenceMs: roundMs(persistenceMs),
        totalMs: roundMs(performance.now() - startedAt)
      }
    };
  } catch (error) {
    return emptyResult(city, targetDate, generatedAt, "FAILED", error instanceof Error ? error.message : String(error), startedAt, referenceMs);
  }
}
