import type { ForecastSnapshot } from "../weather/forecastSnapshot";

function databaseAvailable(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
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

