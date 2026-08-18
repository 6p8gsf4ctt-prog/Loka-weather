import type { GenerationArchiveRow, OfficialPublicPayloadV24, PublicationManifestV24 } from "../types";
import { parseOfficialPayload } from "../engine/publicProduct";

interface ForecastRow {
  city_slug: string;
  forecast_date: string;
  generated_at: string;
  source: string;
  diagnostics_json: string;
}
interface ShadowRow {
  id: number;
  city_slug: string;
  forecast_date: string;
  generated_at: string;
  source: string;
  final_scene_id: number;
  final_scene_key: string;
  final_score: number;
  final_confidence: string;
  model_count: number;
  public_payload_json: string | null;
  manifest_json: string | null;
  manifest_hash: string | null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

export async function saveRun(db: D1Database, args: {
  citySlug: string; forecastDate: string; generatedAt: string; source: string;
  status: "ok" | "partial" | "failed"; modelsOk: string[];
  modelsFailed: Record<string, string>; durationMs: number; errorMessage?: string;
}): Promise<void> {
  await db.prepare(`INSERT INTO runs
    (city_slug, forecast_date, generated_at, source, status, models_ok_json, models_failed_json, duration_ms, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(args.citySlug, args.forecastDate, args.generatedAt, args.source, args.status,
      JSON.stringify(args.modelsOk), JSON.stringify(args.modelsFailed), args.durationMs, args.errorMessage ?? null).run();
}

export async function archiveGeneration(
  db: D1Database,
  payload: OfficialPublicPayloadV24,
  manifest: PublicationManifestV24
): Promise<number> {
  await db.prepare(`
    INSERT INTO shadow_history (
      city_slug, forecast_date, generated_at, source,
      raw_scene_id, raw_scene_key, raw_score, raw_confidence,
      final_scene_id, final_scene_key, final_score, final_confidence,
      runner_up_scene_id, runner_up_score,
      fallback_used, hysteresis_applied,
      reliability_applied, reliability_reason, reliability_version,
      model_count, models_ok_json, models_failed_json,
      scene24_raw_json, scene24_json, reliability_json, day_profile_json, candidates_json,
      public_payload_json, manifest_json, manifest_hash, resolution_mode, doctrine_version, engine_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, NULL, NULL, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, generated_at) DO NOTHING
  `).bind(
    payload.citySlug, payload.date, payload.generatedAt, payload.source,
    payload.scene.id, payload.scene.key, payload.decision.score, payload.decision.confidence,
    payload.scene.id, payload.scene.key, payload.decision.score, payload.decision.confidence,
    payload.decision.runnerUp?.sceneId ?? null, payload.decision.runnerUp?.score ?? null,
    payload.decision.hysteresisApplied ? 1 : 0,
    payload.models.count, JSON.stringify(payload.models.ok), JSON.stringify(payload.models.failed),
    JSON.stringify(payload.decision), JSON.stringify(payload.decision), JSON.stringify(payload.decision.candidates),
    JSON.stringify(payload), JSON.stringify(manifest), manifest.payloadSha256,
    payload.decision.resolutionMode, payload.decision.doctrineVersion, payload.decision.version
  ).run();
  const row = await db.prepare(`SELECT id FROM shadow_history WHERE city_slug = ? AND generated_at = ?`)
    .bind(payload.citySlug, payload.generatedAt).first<{ id: number }>();
  if (!row) throw new Error("generation_archive_readback_failed");
  return row.id;
}

function shadowToGeneration(row: ShadowRow): GenerationArchiveRow | null {
  const payload = parseOfficialPayload(parseJson(row.public_payload_json));
  if (!payload || !row.manifest_hash) return null;
  return {
    id: row.id,
    citySlug: row.city_slug,
    forecastDate: row.forecast_date,
    generatedAt: row.generated_at,
    source: row.source,
    sceneId: payload.scene.id,
    sceneKey: payload.scene.key,
    score: row.final_score,
    confidence: payload.decision.confidence,
    modelCount: row.model_count,
    publicPayload: payload,
    manifestHash: row.manifest_hash
  };
}

export async function generationById(db: D1Database, id: number): Promise<{ generation: GenerationArchiveRow; manifest: PublicationManifestV24 } | null> {
  const row = await db.prepare(`SELECT * FROM shadow_history WHERE id = ?`).bind(id).first<ShadowRow>();
  if (!row) return null;
  const generation = shadowToGeneration(row);
  const manifest = parseJson<PublicationManifestV24>(row.manifest_json);
  return generation && manifest ? { generation, manifest } : null;
}

export async function generationHistory(db: D1Database, citySlug: string, limit = 30): Promise<GenerationArchiveRow[]> {
  const safe = Math.min(200, Math.max(1, limit));
  const rows = await db.prepare(`SELECT * FROM shadow_history WHERE city_slug = ? AND public_payload_json IS NOT NULL ORDER BY generated_at DESC LIMIT ?`)
    .bind(citySlug, safe).all<ShadowRow>();
  return rows.results.map(shadowToGeneration).filter((x): x is GenerationArchiveRow => x !== null);
}

export function officialForecastWriteStatement(
  db: D1Database,
  payload: OfficialPublicPayloadV24,
  manifest: PublicationManifestV24,
  onlyIfPreviousStatementChanged = false
): D1PreparedStatement {
  const confidence = payload.decision.confidence === "HIGH" ? 90 : payload.decision.confidence === "MEDIUM" ? 75 : 60;
  const where = onlyIfPreviousStatementChanged ? "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1" : "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  return db.prepare(`
    INSERT INTO forecasts (
      city_slug, city_name, forecast_date, generated_at, source,
      temp_max_c, temp_min_c, main_verdict, rain_verdict, notable_event,
      confidence_main, confidence_rain, hourly_json, diagnostics_json
    ) ${where}
    ON CONFLICT(city_slug, forecast_date) DO UPDATE SET
      city_name = excluded.city_name, generated_at = excluded.generated_at, source = excluded.source,
      temp_max_c = excluded.temp_max_c, temp_min_c = excluded.temp_min_c,
      main_verdict = excluded.main_verdict, rain_verdict = excluded.rain_verdict,
      notable_event = excluded.notable_event, confidence_main = excluded.confidence_main,
      confidence_rain = excluded.confidence_rain, hourly_json = excluded.hourly_json,
      diagnostics_json = excluded.diagnostics_json
  `).bind(
    payload.citySlug, payload.city, payload.date, payload.generatedAt, payload.source,
    payload.temperatures.maxC, payload.temperatures.minC,
    payload.editorial.visual.subtitle,
    `${payload.editorial.visual.primaryLine} ${payload.editorial.visual.secondaryLine}`,
    payload.editorial.visual.secondaryLine,
    confidence, confidence,
    JSON.stringify(payload.hourly),
    JSON.stringify({ v24: { payload, manifest } })
  );
}

export async function officialForDate(db: D1Database, citySlug: string, date: string): Promise<{ payload: OfficialPublicPayloadV24; manifest: PublicationManifestV24 } | null> {
  const row = await db.prepare(`SELECT * FROM forecasts WHERE city_slug = ? AND forecast_date = ? LIMIT 1`).bind(citySlug, date).first<ForecastRow>();
  if (!row) return null;
  const diagnostics = parseJson<{ v24?: { payload?: unknown; manifest?: PublicationManifestV24 } }>(row.diagnostics_json);
  const payload = parseOfficialPayload(diagnostics?.v24?.payload);
  const manifest = diagnostics?.v24?.manifest ?? null;
  return payload && manifest ? { payload, manifest } : null;
}

export async function officialHistory(db: D1Database, citySlug: string, limit = 30): Promise<OfficialPublicPayloadV24[]> {
  const safe = Math.min(100, Math.max(1, limit));
  const rows = await db.prepare(`SELECT * FROM forecasts WHERE city_slug = ? ORDER BY forecast_date DESC LIMIT ?`).bind(citySlug, safe).all<ForecastRow>();
  const result: OfficialPublicPayloadV24[] = [];
  for (const row of rows.results) {
    const diagnostics = parseJson<{ v24?: { payload?: unknown } }>(row.diagnostics_json);
    const payload = parseOfficialPayload(diagnostics?.v24?.payload);
    if (payload) result.push(payload);
  }
  return result;
}
