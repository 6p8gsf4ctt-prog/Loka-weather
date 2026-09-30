import {
  DAILY_INSIGHT_DATA_VERSION,
  validateDailyInsightDataBundle,
  type DailyInsightDataBundle
} from "../engine/dailyInsight/dataBundle";

export type DailyInsightDataCacheStatus = "READY" | "STALE" | "UNAVAILABLE" | "REJECTED";

export interface DailyInsightDataCacheResult {
  status: DailyInsightDataCacheStatus;
  detail: string;
  bundle: DailyInsightDataBundle | null;
}

interface DailyInsightDataRow {
  city_slug: string;
  target_date: string;
  bundle_version: string;
  bundle_id: string;
  forecast_snapshot_id: string;
  reference_snapshot_id: string;
  generated_at: string;
  payload_json: string;
}

function databaseAvailable(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

export async function saveDailyInsightDataBundle(db: D1Database, bundle: DailyInsightDataBundle): Promise<void> {
  if (!databaseAvailable(db)) throw new Error("daily_insight_data_database_unavailable");
  validateDailyInsightDataBundle(bundle);
  await db.prepare(`
    INSERT INTO daily_insight_data_cache (
      city_slug, target_date, bundle_version, bundle_id,
      forecast_snapshot_id, reference_snapshot_id, generated_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, target_date) DO UPDATE SET
      bundle_version = excluded.bundle_version,
      bundle_id = excluded.bundle_id,
      forecast_snapshot_id = excluded.forecast_snapshot_id,
      reference_snapshot_id = excluded.reference_snapshot_id,
      generated_at = excluded.generated_at,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    bundle.city.slug,
    bundle.targetDate,
    bundle.version,
    bundle.id,
    bundle.sources.forecast.snapshotId,
    bundle.sources.localArchive.sourceSnapshotId,
    bundle.generatedAt,
    JSON.stringify(bundle)
  ).run();
}

export async function loadDailyInsightDataBundle(
  db: D1Database | undefined,
  citySlug: string,
  targetDate: string,
  expectedForecastSnapshotId?: string,
  expectedReferenceSnapshotId?: string
): Promise<DailyInsightDataCacheResult> {
  if (!databaseAvailable(db)) return { status: "UNAVAILABLE", detail: "daily_insight_data_database_unavailable", bundle: null };
  try {
    const row = await db.prepare(`
      SELECT city_slug, target_date, bundle_version, bundle_id,
             forecast_snapshot_id, reference_snapshot_id, generated_at, payload_json
      FROM daily_insight_data_cache
      WHERE city_slug = ? AND target_date = ?
      LIMIT 1
    `).bind(citySlug, targetDate).first<DailyInsightDataRow>();
    if (!row) return { status: "UNAVAILABLE", detail: "daily_insight_data_empty", bundle: null };
    if (row.bundle_version !== DAILY_INSIGHT_DATA_VERSION) throw new Error("daily_insight_data_version_mismatch");
    const bundle = validateDailyInsightDataBundle(JSON.parse(row.payload_json) as unknown);
    if (bundle.city.slug !== row.city_slug || bundle.targetDate !== row.target_date || bundle.id !== row.bundle_id
      || bundle.generatedAt !== row.generated_at || bundle.sources.forecast.snapshotId !== row.forecast_snapshot_id
      || bundle.sources.localArchive.sourceSnapshotId !== row.reference_snapshot_id) {
      throw new Error("daily_insight_data_manifest_mismatch");
    }
    if ((expectedForecastSnapshotId && expectedForecastSnapshotId !== row.forecast_snapshot_id)
      || (expectedReferenceSnapshotId && expectedReferenceSnapshotId !== row.reference_snapshot_id)) {
      return { status: "STALE", detail: `daily_insight_data_stale:${row.bundle_id}`, bundle };
    }
    return { status: "READY", detail: `daily_insight_data_ready:${row.bundle_id}`, bundle };
  } catch (error) {
    return { status: "REJECTED", detail: error instanceof Error ? error.message : "daily_insight_data_rejected", bundle: null };
  }
}
