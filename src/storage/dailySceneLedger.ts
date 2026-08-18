import type { DailySceneLedgerRow, DailySceneStatus, GenerationArchiveRow, OfficialPublicPayloadV24, PublicationManifestV24, Scene24Confidence, ResolutionMode, Scene24Id, Scene24Key } from "../types";
import { validateOfficialProduct } from "../engine/publicProduct";
import { generationById, officialForecastWriteStatement } from "./db";

interface LedgerDbRow {
  id: number; city_slug: string; forecast_date: string; revision: number; status: DailySceneStatus; generation_id: number;
  scene_id: Scene24Id; scene_key: Scene24Key; scene_label: string; confidence: Scene24Confidence; resolution_mode: ResolutionMode;
  runner_up_scene_id: Scene24Id | null; engine_version: string; doctrine_version: string; manifest_hash: string; reason: string | null; created_at: string;
}
function mapLedger(row: LedgerDbRow): DailySceneLedgerRow {
  return { id: row.id, citySlug: row.city_slug, forecastDate: row.forecast_date, revision: row.revision, status: row.status,
    generationId: row.generation_id, sceneId: row.scene_id, sceneKey: row.scene_key, sceneLabel: row.scene_label,
    confidence: row.confidence, resolutionMode: row.resolution_mode, runnerUpSceneId: row.runner_up_scene_id,
    engineVersion: row.engine_version, doctrineVersion: row.doctrine_version, manifestHash: row.manifest_hash,
    reason: row.reason, createdAt: row.created_at };
}

export async function ensureDailyTracking(db: D1Database, citySlug: string, date: string, startedAt = new Date().toISOString()): Promise<void> {
  await db.prepare(`INSERT INTO daily_scene_tracking(city_slug, forecast_date, started_at) VALUES (?, ?, ?) ON CONFLICT(city_slug, forecast_date) DO NOTHING`)
    .bind(citySlug, date, startedAt).run();
}

export async function latestLedgerForDate(db: D1Database, citySlug: string, date: string): Promise<DailySceneLedgerRow | null> {
  const row = await db.prepare(`SELECT * FROM daily_scene_ledger WHERE city_slug = ? AND forecast_date = ? ORDER BY revision DESC LIMIT 1`)
    .bind(citySlug, date).first<LedgerDbRow>();
  return row ? mapLedger(row) : null;
}
export async function hasOfficialScene(db: D1Database, citySlug: string, date: string): Promise<boolean> {
  return (await latestLedgerForDate(db, citySlug, date)) !== null;
}

function ledgerInsertStatement(db: D1Database, generation: GenerationArchiveRow, status: DailySceneStatus, revision: number, reason: string | null, firstOnly: boolean): D1PreparedStatement {
  const p = generation.publicPayload;
  const selectTail = firstOnly ? `WHERE NOT EXISTS (SELECT 1 FROM daily_scene_ledger WHERE city_slug = ? AND forecast_date = ? AND revision = 1)` : "";
  const binds: unknown[] = [
    p.citySlug, p.date, revision, status, generation.id, p.scene.id, p.scene.key, p.scene.label, p.generatedAt, p.source,
    p.decision.confidence, p.decision.resolutionMode, p.decision.runnerUp?.sceneId ?? null, p.decision.version,
    p.decision.doctrineVersion, generation.manifestHash, reason
  ];
  if (firstOnly) binds.push(p.citySlug, p.date);
  return db.prepare(`INSERT INTO daily_scene_ledger (
      city_slug, forecast_date, revision, status, generation_id, scene_id, scene_key, scene_label,
      forecast_generated_at, source, confidence, resolution_mode, runner_up_scene_id,
      engine_version, doctrine_version, manifest_hash, reason
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ${selectTail}
    ON CONFLICT DO NOTHING`).bind(...binds);
}

export async function officializeFirstScheduledGeneration(
  db: D1Database,
  generation: GenerationArchiveRow,
  manifest: PublicationManifestV24,
  status: DailySceneStatus
): Promise<{ officialized: boolean; ledger: DailySceneLedgerRow | null }> {
  await ensureDailyTracking(db, generation.citySlug, generation.forecastDate);
  const validation = await validateOfficialProduct(generation.publicPayload, manifest);
  if (!validation.ok) throw new Error(`generation_not_promotable:${validation.reason}`);
  await db.batch([
    ledgerInsertStatement(db, generation, status, 1, null, true),
    officialForecastWriteStatement(db, generation.publicPayload, manifest, true)
  ]);
  const ledger = await latestLedgerForDate(db, generation.citySlug, generation.forecastDate);
  return { officialized: ledger?.generationId === generation.id, ledger };
}

export async function promoteVerifiedGeneration(db: D1Database, generationId: number, reason: string): Promise<DailySceneLedgerRow> {
  const resolved = await generationById(db, generationId);
  if (!resolved) throw new Error("generation_not_found");
  const { generation, manifest } = resolved;
  const validation = await validateOfficialProduct(generation.publicPayload, manifest);
  if (!validation.ok) throw new Error(`generation_not_promotable:${validation.reason}`);
  await ensureDailyTracking(db, generation.citySlug, generation.forecastDate);
  const current = await latestLedgerForDate(db, generation.citySlug, generation.forecastDate);
  const revision = current ? current.revision + 1 : 1;
  const status: DailySceneStatus = current ? current.status : "RECOVERED";
  await db.batch([
    ledgerInsertStatement(db, generation, status, revision, reason.trim() || "technical_recovery", false),
    officialForecastWriteStatement(db, generation.publicPayload, manifest, false)
  ]);
  const row = await latestLedgerForDate(db, generation.citySlug, generation.forecastDate);
  if (!row || row.generationId !== generationId) throw new Error("ledger_promotion_readback_failed");
  return row;
}

function dateRange(year: number): string[] {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const dates: string[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86400000) dates.push(new Date(t).toISOString().slice(0, 10));
  return dates;
}

export async function annualSceneReport(db: D1Database, citySlug: string, year: number, today: string): Promise<Record<string, unknown>> {
  const dates = dateRange(year);
  const start = `${year}-01-01`, end = `${year}-12-31`;
  const tracking = await db.prepare(`SELECT forecast_date FROM daily_scene_tracking WHERE city_slug = ? AND forecast_date BETWEEN ? AND ? ORDER BY forecast_date ASC`)
    .bind(citySlug, start, end).all<{ forecast_date: string }>();
  const trackingSet = new Set(tracking.results.map((r) => r.forecast_date));
  const trackingStart = tracking.results[0]?.forecast_date ?? null;
  const ledgerRows = await db.prepare(`SELECT l.* FROM daily_scene_ledger l
    JOIN (SELECT city_slug, forecast_date, MAX(revision) revision FROM daily_scene_ledger WHERE city_slug = ? AND forecast_date BETWEEN ? AND ? GROUP BY city_slug, forecast_date) x
    ON x.city_slug = l.city_slug AND x.forecast_date = l.forecast_date AND x.revision = l.revision
    ORDER BY l.forecast_date ASC`).bind(citySlug, start, end).all<LedgerDbRow>();
  const byDate = new Map(ledgerRows.results.map((r) => [r.forecast_date, mapLedger(r)]));
  const counts = new Map<number, number>();
  let officialDays = 0, recoveredDays = 0, correctedDays = 0, missingDays = 0, pendingDays = 0, eligibleDays = 0;
  const days = dates.map((date) => {
    if (date > today) { pendingDays++; return { date, status: "PENDING" }; }
    if (!trackingStart || date < trackingStart) return { date, status: "NOT_TRACKED" };
    eligibleDays++;
    const ledger = byDate.get(date);
    if (ledger) {
      officialDays++;
      if (ledger.status === "RECOVERED") recoveredDays++;
      if (ledger.revision > 1) correctedDays++;
      counts.set(ledger.sceneId, (counts.get(ledger.sceneId) ?? 0) + 1);
      return { date, status: ledger.status, revision: ledger.revision, sceneId: ledger.sceneId, sceneKey: ledger.sceneKey, sceneLabel: ledger.sceneLabel, confidence: ledger.confidence };
    }
    if (trackingSet.has(date) || date >= trackingStart) { missingDays++; return { date, status: "MISSING_TECHNICAL" }; }
    return { date, status: "NOT_TRACKED" };
  });
  return {
    citySlug, year, expectedDays: dates.length, trackingStartDate: trackingStart, eligibleDays, officialDays, recoveredDays, correctedDays, missingDays, pendingDays,
    days,
    counts: [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([sceneId, count]) => ({ sceneId, count, percentage: officialDays ? Math.round(count / officialDays * 1000) / 10 : 0 }))
  };
}
