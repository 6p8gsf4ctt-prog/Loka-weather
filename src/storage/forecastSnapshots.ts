import type { ForecastSnapshot } from "../weather/forecastSnapshot";

function databaseAvailable(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

interface ForecastSnapshotDbRow {
  snapshot_id: string;
  city_slug: string;
  purpose: "DAILY" | "WEEKLY";
  start_date: string | null;
  end_date: string | null;
  forecast_days: number;
  generated_at: string;
  failures_json: string;
  forecasts_json: string;
  consensus_json: string;
}

function parseSnapshotRow(row: ForecastSnapshotDbRow): ForecastSnapshot {
  return {
    version: "1.0.0",
    id: row.snapshot_id,
    citySlug: row.city_slug,
    purpose: row.purpose,
    generatedAt: row.generated_at,
    request: { forecastDays: row.forecast_days, startDate: row.start_date ?? undefined, endDate: row.end_date ?? undefined },
    forecasts: JSON.parse(row.forecasts_json) as ForecastSnapshot["forecasts"],
    failures: JSON.parse(row.failures_json) as ForecastSnapshot["failures"],
    consensus: JSON.parse(row.consensus_json) as ForecastSnapshot["consensus"]
  };
}

/** Reuses a recent weekly capture so candidate previews do not refetch five models. */
export async function latestWeeklyForecastSnapshot(
  db: D1Database | undefined,
  citySlug: string,
  startDate: string,
  endDate: string,
  maxAgeMs = 12 * 60 * 60 * 1000
): Promise<ForecastSnapshot | null> {
  if (!databaseAvailable(db)) return null;
  const row = await db.prepare(`
    SELECT * FROM forecast_snapshots
    WHERE city_slug = ? AND purpose = 'WEEKLY' AND start_date = ? AND end_date = ?
    ORDER BY generated_at DESC LIMIT 1
  `).bind(citySlug, startDate, endDate).first<ForecastSnapshotDbRow>();
  if (!row || Date.now() - Date.parse(row.generated_at) > maxAgeMs) return null;
  try { return parseSnapshotRow(row); } catch { return null; }
}

/**
 * Persists the exact multi-model capture used by a publication. Failure to
 * archive never changes the forecast result; publication guards remain the
 * authority for whether the weather product itself is usable.
 */
export async function persistForecastSnapshot(db: D1Database | undefined, snapshot: ForecastSnapshot): Promise<boolean> {
  if (!databaseAvailable(db)) return false;
  try {
    await db.prepare(`
      INSERT INTO forecast_snapshots (
        snapshot_id, city_slug, purpose, start_date, end_date, forecast_days,
        generated_at, model_ids_json, failures_json, forecasts_json, consensus_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(snapshot_id) DO NOTHING
    `).bind(
      snapshot.id,
      snapshot.citySlug,
      snapshot.purpose,
      snapshot.request.startDate ?? null,
      snapshot.request.endDate ?? null,
      snapshot.request.forecastDays,
      snapshot.generatedAt,
      JSON.stringify(snapshot.forecasts.map((item) => item.modelId)),
      JSON.stringify(snapshot.failures),
      JSON.stringify(snapshot.forecasts),
      JSON.stringify(snapshot.consensus)
    ).run();
    return true;
  } catch (error) {
    console.error("forecast_snapshot_persistence_failed", error instanceof Error ? error.message : String(error));
    return false;
  }
}
