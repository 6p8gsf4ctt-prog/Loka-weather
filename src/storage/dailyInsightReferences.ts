import {
  DAILY_INSIGHT_REFERENCE_VERSION,
  validateDailyInsightReference,
  type DailyInsightReferenceSnapshot
} from "../engine/dailyInsight/referenceData";

export type DailyInsightReferenceCacheStatus = "READY" | "STALE" | "UNAVAILABLE" | "REJECTED";

export interface DailyInsightReferenceCacheResult {
  status: DailyInsightReferenceCacheStatus;
  detail: string;
  snapshot: DailyInsightReferenceSnapshot | null;
}

interface DailyInsightReferenceRow {
  station_id: string;
  reference_version: string;
  source_snapshot_id: string;
  generated_at: string;
  source_last_date: string;
  row_count: number;
  payload_json: string;
}

function hasDatabase(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

export async function saveDailyInsightReference(
  db: D1Database,
  snapshot: DailyInsightReferenceSnapshot
): Promise<void> {
  if (!hasDatabase(db)) throw new Error("daily_insight_reference_database_unavailable");
  validateDailyInsightReference(snapshot);
  await db.prepare(`
    INSERT INTO daily_insight_reference_cache (
      station_id, reference_version, source_snapshot_id, generated_at,
      source_last_date, row_count, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(station_id) DO UPDATE SET
      reference_version = excluded.reference_version,
      source_snapshot_id = excluded.source_snapshot_id,
      generated_at = excluded.generated_at,
      source_last_date = excluded.source_last_date,
      row_count = excluded.row_count,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    snapshot.stationId,
    snapshot.version,
    snapshot.sourceSnapshotId,
    snapshot.generatedAt,
    snapshot.lastDate,
    snapshot.rowCount,
    JSON.stringify(snapshot)
  ).run();
}

export async function loadDailyInsightReference(
  db: D1Database | undefined,
  stationId: string,
  expectedSourceSnapshotId?: string
): Promise<DailyInsightReferenceCacheResult> {
  if (!hasDatabase(db)) return { status: "UNAVAILABLE", detail: "daily_insight_reference_database_unavailable", snapshot: null };
  try {
    const row = await db.prepare(`
      SELECT station_id, reference_version, source_snapshot_id, generated_at,
             source_last_date, row_count, payload_json
      FROM daily_insight_reference_cache
      WHERE station_id = ?
      LIMIT 1
    `).bind(stationId).first<DailyInsightReferenceRow>();
    if (!row) return { status: "UNAVAILABLE", detail: "daily_insight_reference_empty", snapshot: null };
    if (row.reference_version !== DAILY_INSIGHT_REFERENCE_VERSION) throw new Error("daily_insight_reference_version_mismatch");
    const snapshot = validateDailyInsightReference(JSON.parse(row.payload_json) as unknown);
    if (snapshot.stationId !== row.station_id || snapshot.sourceSnapshotId !== row.source_snapshot_id
      || snapshot.generatedAt !== row.generated_at || snapshot.lastDate !== row.source_last_date
      || snapshot.rowCount !== row.row_count) {
      throw new Error("daily_insight_reference_manifest_mismatch");
    }
    if (expectedSourceSnapshotId && snapshot.sourceSnapshotId !== expectedSourceSnapshotId) {
      return { status: "STALE", detail: `daily_insight_reference_stale:${snapshot.sourceSnapshotId}`, snapshot };
    }
    return { status: "READY", detail: `daily_insight_reference_ready:${snapshot.rowCount}`, snapshot };
  } catch (error) {
    return {
      status: "REJECTED",
      detail: error instanceof Error ? error.message : "daily_insight_reference_rejected",
      snapshot: null
    };
  }
}

