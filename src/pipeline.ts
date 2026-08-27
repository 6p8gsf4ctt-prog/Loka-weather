import { CITIES } from "./config/cities";
import { MODELS } from "./config/models";
import { buildConsensus } from "./engine/consensus";
import { buildPublicationManifest } from "./engine/publicationManifest";
import { buildInstagramV3ShadowPlan, finalizeInstagramV3ShadowPlanWithRender, type InstagramV3ShadowStatus } from "./engine/instagramV3Shadow";
import { evaluatePublicationGuard } from "./engine/publicationGuard";
import { renderInstagramV3Assets } from "./automation/instagramV3Renderer";
import { buildCandidateProduct } from "./engine/verdict";
import { archiveGeneration, saveRun } from "./storage/db";
import { ensureDailyTracking, hasOfficialScene, officializeFirstScheduledGeneration } from "./storage/dailySceneLedger";
import { recordInstagramV3ShadowAudit } from "./storage/instagramV3Shadow";
import type { CityConfig, Env, ModelForecast, OfficialPublicPayloadV24, PublicationManifestV24 } from "./types";
import { fetchModelForecast } from "./weather/openMeteo";

export function localDate(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

export interface GeneratedV24 {
  payload: OfficialPublicPayloadV24;
  manifest: PublicationManifestV24;
  generationId: number;
}

export async function generateCity(env: Env, city: CityConfig, source: string, instant = new Date()): Promise<GeneratedV24> {
  const started = Date.now();
  const targetDate = localDate(city.timezone, instant);
  const settled = await Promise.allSettled(MODELS.map((model) => fetchModelForecast(env, city, model)));
  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });
  if (forecasts.length < 3) {
    await saveRun(env.DB, {
      citySlug: city.slug, forecastDate: targetDate, generatedAt: new Date().toISOString(), source,
      status: "failed", modelsOk: forecasts.map((f) => f.modelId), modelsFailed: failures,
      durationMs: Date.now() - started, errorMessage: `fewer_than_three_models:${forecasts.length}`
    });
    throw new Error(`LOKA_V24_NEEDS_3_MODELS:${forecasts.length}`);
  }
  const consensus = buildConsensus(forecasts);
  const payload = buildCandidateProduct(city, targetDate, consensus, forecasts, failures, source);
  const guard = evaluatePublicationGuard(payload);
  if (guard.status !== "PASS") {
    await saveRun(env.DB, {
      citySlug: city.slug, forecastDate: targetDate, generatedAt: payload.generatedAt, source,
      status: "failed", modelsOk: forecasts.map((f) => f.modelId), modelsFailed: failures,
      durationMs: Date.now() - started, errorMessage: `publication_guard:${guard.reason}`
    });
    throw new Error(`PUBLICATION_GUARD_BLOCKED:${guard.reason}`);
  }
  const manifest = await buildPublicationManifest(payload);
  const generationId = await archiveGeneration(env.DB, payload, manifest);
  await saveRun(env.DB, {
    citySlug: city.slug, forecastDate: targetDate, generatedAt: payload.generatedAt, source,
    status: Object.keys(failures).length ? "partial" : "ok",
    modelsOk: forecasts.map((f) => f.modelId), modelsFailed: failures,
    durationMs: Date.now() - started
  });
  return { payload, manifest, generationId };
}

export async function runManualCity(env: Env, city: CityConfig): Promise<GeneratedV24> {
  return generateCity(env, city, "manual");
}

export async function runScheduledCity(
  env: Env,
  city: CityConfig,
  kind: "PRIMARY" | "RETRY",
  instant = new Date()
): Promise<{ skipped: boolean; officialized: boolean; generationId?: number; instagramV3ShadowStatus?: InstagramV3ShadowStatus }> {
  const date = localDate(city.timezone, instant);
  await ensureDailyTracking(env.DB, city.slug, date, instant.toISOString());
  if (await hasOfficialScene(env.DB, city.slug, date)) return { skipped: true, officialized: false };
  const source = kind === "PRIMARY" ? "cron_primary" : "cron_retry";
  const generated = await generateCity(env, city, source, instant);
  const result = await officializeFirstScheduledGeneration(env.DB, {
    id: generated.generationId,
    citySlug: city.slug,
    forecastDate: generated.payload.date,
    generatedAt: generated.payload.generatedAt,
    source,
    sceneId: generated.payload.scene.id,
    sceneKey: generated.payload.scene.key,
    score: generated.payload.decision.score,
    confidence: generated.payload.decision.confidence,
    modelCount: generated.payload.models.count,
    publicPayload: generated.payload,
    manifestHash: generated.manifest.payloadSha256
  }, generated.manifest, kind === "PRIMARY" ? "OFFICIAL" : "RECOVERED");

  let instagramV3ShadowStatus: InstagramV3ShadowStatus | undefined;
  if (result.officialized) {
    try {
      const shadow = await buildInstagramV3ShadowPlan(
        generated.payload,
        generated.generationId,
        kind === "PRIMARY" ? "CRON_PRIMARY" : "CRON_RETRY",
        instant.toISOString()
      );
      const render = await renderInstagramV3Assets(env, generated.payload, shadow, instant.toISOString());
      const finalizedShadow = await finalizeInstagramV3ShadowPlanWithRender(shadow, render);
      instagramV3ShadowStatus = finalizedShadow.status;
      await recordInstagramV3ShadowAudit(env.DB, finalizedShadow);
      console.info(
        "instagram_v3_shadow",
        city.slug,
        finalizedShadow.status,
        render.status,
        finalizedShadow.fingerprintSha256
      );
    } catch (error) {
      // Shadow mode is observational only: it must never invalidate an otherwise
      // healthy official weather generation or alter the V2 publication path.
      console.error("instagram_v3_shadow_failed", city.slug, error instanceof Error ? error.message : String(error));
    }
  }

  return { skipped: false, officialized: result.officialized, generationId: generated.generationId, instagramV3ShadowStatus };
}

export async function runScheduledAllCities(env: Env, kind: "PRIMARY" | "RETRY", instant: Date): Promise<void> {
  for (const city of Object.values(CITIES)) {
    try { await runScheduledCity(env, city, kind, instant); } catch (error) {
      console.error("scheduled_city_failed", city.slug, kind, error instanceof Error ? error.message : String(error));
    }
  }
}
