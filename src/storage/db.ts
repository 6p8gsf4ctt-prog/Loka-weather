import type { DecisionLog, LokaForecast, LokaScene } from "../types";

export async function saveForecast(db: D1Database, forecast: LokaForecast, source: string): Promise<void> {
  await db.prepare(`
    INSERT INTO forecasts (
      city_slug, city_name, forecast_date, generated_at, source,
      temp_max_c, temp_min_c, main_verdict, rain_verdict, notable_event,
      confidence_main, confidence_rain, hourly_json, diagnostics_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, forecast_date) DO UPDATE SET
      city_name = excluded.city_name,
      generated_at = excluded.generated_at,
      source = excluded.source,
      temp_max_c = excluded.temp_max_c,
      temp_min_c = excluded.temp_min_c,
      main_verdict = excluded.main_verdict,
      rain_verdict = excluded.rain_verdict,
      notable_event = excluded.notable_event,
      confidence_main = excluded.confidence_main,
      confidence_rain = excluded.confidence_rain,
      hourly_json = excluded.hourly_json,
      diagnostics_json = excluded.diagnostics_json
  `).bind(
    forecast.citySlug, forecast.city, forecast.date, forecast.generatedAt, source,
    forecast.tempMaxC, forecast.tempMinC, forecast.mainVerdict, forecast.rainVerdict,
    forecast.notableEvent, forecast.confidenceMain, forecast.confidenceRain,
    JSON.stringify(forecast.hourly), JSON.stringify(forecast.diagnostics)
  ).run();
}

interface ForecastRow {
  city_slug: string; city_name: string; forecast_date: string; generated_at: string;
  temp_max_c: number; temp_min_c: number; main_verdict: string; rain_verdict: string;
  notable_event: string | null; confidence_main: number; confidence_rain: number;
  hourly_json: string; diagnostics_json: string;
}

function fromRow(row: ForecastRow): LokaForecast {
  const diagnostics = JSON.parse(row.diagnostics_json || "{}") as Record<string, unknown>;
  const scene = typeof diagnostics.scene === "string" ? diagnostics.scene as LokaScene : undefined;
  const subtitle = typeof diagnostics.subtitle === "string" ? diagnostics.subtitle : undefined;
  const summaryLines = Array.isArray(diagnostics.summaryLines)
    ? diagnostics.summaryLines.filter((x): x is string => typeof x === "string")
    : undefined;
  const decisionLog = diagnostics.decisionLog && typeof diagnostics.decisionLog === "object"
    ? diagnostics.decisionLog as DecisionLog
    : undefined;

  return {
    city: row.city_name, citySlug: row.city_slug, date: row.forecast_date,
    generatedAt: row.generated_at, tempMaxC: row.temp_max_c, tempMinC: row.temp_min_c,
    scene, subtitle, summaryLines, decisionLog,
    mainVerdict: row.main_verdict, rainVerdict: row.rain_verdict,
    notableEvent: row.notable_event, confidenceMain: row.confidence_main,
    confidenceRain: row.confidence_rain, hourly: JSON.parse(row.hourly_json), diagnostics
  };
}

export async function latestForecast(db: D1Database, citySlug: string): Promise<LokaForecast | null> {
  const row = await db.prepare(`SELECT * FROM forecasts WHERE city_slug = ? ORDER BY forecast_date DESC, generated_at DESC LIMIT 1`).bind(citySlug).first<ForecastRow>();
  return row ? fromRow(row) : null;
}

export async function forecastHistory(db: D1Database, citySlug: string, limit = 30): Promise<LokaForecast[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const result = await db.prepare(`SELECT * FROM forecasts WHERE city_slug = ? ORDER BY forecast_date DESC, generated_at DESC LIMIT ?`).bind(citySlug, safeLimit).all<ForecastRow>();
  return result.results.map(fromRow);
}

export async function saveRun(db: D1Database, args: {
  citySlug: string; forecastDate: string; generatedAt: string; source: string;
  status: "ok" | "partial" | "failed"; modelsOk: string[];
  modelsFailed: Record<string, string>; durationMs: number; errorMessage?: string;
}): Promise<void> {
  await db.prepare(`INSERT INTO runs (city_slug, forecast_date, generated_at, source, status, models_ok_json, models_failed_json, duration_ms, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(args.citySlug, args.forecastDate, args.generatedAt, args.source, args.status,
      JSON.stringify(args.modelsOk), JSON.stringify(args.modelsFailed), args.durationMs, args.errorMessage ?? null).run();
}

type JsonObject = Record<string, unknown>;

function objectValue(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function boolInt(value: unknown): number {
  return value === true ? 1 : 0;
}

/**
 * Append one immutable V24 shadow snapshot per generation.
 *
 * This table is intentionally separate from forecasts:
 * forecasts keeps the current official daily product and may be overwritten
 * for the same date; shadow_history preserves every V24 generation.
 */
export async function saveShadowHistory(
  db: D1Database,
  forecast: LokaForecast,
  source: string,
  modelsOk: string[],
  modelsFailed: Record<string, string>
): Promise<void> {
  const d = forecast.diagnostics ?? {};

  const legacy = objectValue(d.sceneLegacy);
  const raw = objectValue(d.scene24Raw);
  const final = objectValue(d.scene24);
  const reliability = objectValue(d.scene24Reliability);
  const runnerUp = final ? objectValue(final.runnerUp) : null;

  const candidates = final && Array.isArray(final.candidates)
    ? final.candidates
    : [];

  await db.prepare(`
    INSERT INTO shadow_history (
      city_slug, forecast_date, generated_at, source,
      production_scene, legacy_score, legacy_version,
      raw_scene_id, raw_scene_key, raw_score, raw_confidence,
      final_scene_id, final_scene_key, final_score, final_confidence,
      runner_up_scene_id, runner_up_score,
      fallback_used, hysteresis_applied,
      reliability_applied, reliability_reason, reliability_version,
      model_count, models_ok_json, models_failed_json,
      scene24_raw_json, scene24_json, reliability_json, day_profile_json, candidates_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, generated_at) DO NOTHING
  `).bind(
    forecast.citySlug,
    forecast.date,
    forecast.generatedAt,
    source,

    forecast.scene ?? null,
    legacy ? numberValue(legacy.score) : forecast.decisionLog?.selectedScore ?? null,
    legacy ? stringValue(legacy.version) : forecast.decisionLog?.version ?? null,

    raw ? numberValue(raw.sceneId) : null,
    raw ? stringValue(raw.sceneKey) : null,
    raw ? numberValue(raw.score) : null,
    raw ? stringValue(raw.confidence) : null,

    final ? numberValue(final.sceneId) : null,
    final ? stringValue(final.sceneKey) : null,
    final ? numberValue(final.score) : null,
    final ? stringValue(final.confidence) : null,

    runnerUp ? numberValue(runnerUp.sceneId) : null,
    runnerUp ? numberValue(runnerUp.score) : null,

    final ? boolInt(final.fallbackUsed) : 0,
    final ? boolInt(final.hysteresisApplied) : 0,

    reliability ? boolInt(reliability.applied) : 0,
    reliability ? stringValue(reliability.reason) : null,
    reliability ? stringValue(reliability.version) : null,

    modelsOk.length,
    JSON.stringify(modelsOk),
    JSON.stringify(modelsFailed),

    raw ? JSON.stringify(raw) : null,
    final ? JSON.stringify(final) : null,
    reliability ? JSON.stringify(reliability) : null,
    d.dayProfile24 ? JSON.stringify(d.dayProfile24) : null,
    JSON.stringify(candidates)
  ).run();
}

interface ShadowHistoryRow {
  id: number;
  city_slug: string;
  forecast_date: string;
  generated_at: string;
  source: string;
  production_scene: string | null;
  legacy_score: number | null;
  legacy_version: string | null;
  raw_scene_id: number | null;
  raw_scene_key: string | null;
  raw_score: number | null;
  raw_confidence: string | null;
  final_scene_id: number | null;
  final_scene_key: string | null;
  final_score: number | null;
  final_confidence: string | null;
  runner_up_scene_id: number | null;
  runner_up_score: number | null;
  fallback_used: number;
  hysteresis_applied: number;
  reliability_applied: number;
  reliability_reason: string | null;
  reliability_version: string | null;
  model_count: number;
  models_ok_json: string;
  models_failed_json: string;
  scene24_raw_json: string | null;
  scene24_json: string | null;
  reliability_json: string | null;
  day_profile_json: string | null;
  candidates_json: string | null;
}

function parseJson(value: string | null, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function shadowRow(row: ShadowHistoryRow, includeDetail: boolean): Record<string, unknown> {
  const compact: Record<string, unknown> = {
    id: row.id,
    citySlug: row.city_slug,
    forecastDate: row.forecast_date,
    generatedAt: row.generated_at,
    source: row.source,

    production: {
      scene: row.production_scene,
      score: row.legacy_score,
      version: row.legacy_version
    },

    raw: {
      sceneId: row.raw_scene_id,
      sceneKey: row.raw_scene_key,
      score: row.raw_score,
      confidence: row.raw_confidence
    },

    v24: {
      sceneId: row.final_scene_id,
      sceneKey: row.final_scene_key,
      score: row.final_score,
      confidence: row.final_confidence,
      runnerUp: row.runner_up_scene_id === null ? null : {
        sceneId: row.runner_up_scene_id,
        score: row.runner_up_score
      },
      fallbackUsed: row.fallback_used === 1,
      hysteresisApplied: row.hysteresis_applied === 1
    },

    reliability: {
      applied: row.reliability_applied === 1,
      reason: row.reliability_reason,
      version: row.reliability_version
    },

    models: {
      count: row.model_count,
      ok: parseJson(row.models_ok_json, []),
      failed: parseJson(row.models_failed_json, {})
    }
  };

  if (includeDetail) {
    compact.detail = {
      scene24Raw: parseJson(row.scene24_raw_json, null),
      scene24: parseJson(row.scene24_json, null),
      reliability: parseJson(row.reliability_json, null),
      dayProfile: parseJson(row.day_profile_json, null),
      candidates: parseJson(row.candidates_json, [])
    };
  }

  return compact;
}

export async function shadowHistory(
  db: D1Database,
  citySlug: string,
  limit = 30,
  includeDetail = false
): Promise<Record<string, unknown>[]> {
  const safeLimit = Math.min(200, Math.max(1, limit));

  const result = await db.prepare(`
    SELECT * FROM shadow_history
    WHERE city_slug = ?
    ORDER BY generated_at DESC
    LIMIT ?
  `).bind(citySlug, safeLimit).all<ShadowHistoryRow>();

  return result.results.map((row) => shadowRow(row, includeDetail));
}

export async function shadowHistoryForDate(
  db: D1Database,
  citySlug: string,
  forecastDate: string,
  includeDetail = false
): Promise<Record<string, unknown>[]> {
  const result = await db.prepare(`
    SELECT * FROM shadow_history
    WHERE city_slug = ? AND forecast_date = ?
    ORDER BY generated_at ASC
  `).bind(citySlug, forecastDate).all<ShadowHistoryRow>();

  return result.results.map((row) => shadowRow(row, includeDetail));
}
