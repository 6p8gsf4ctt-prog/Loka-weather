import type { LokaForecast } from "../types";

export async function saveForecast(
  db: D1Database,
  forecast: LokaForecast,
  source: string
): Promise<void> {
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
    forecast.citySlug,
    forecast.city,
    forecast.date,
    forecast.generatedAt,
    source,
    forecast.tempMaxC,
    forecast.tempMinC,
    forecast.mainVerdict,
    forecast.rainVerdict,
    forecast.notableEvent,
    forecast.confidenceMain,
    forecast.confidenceRain,
    JSON.stringify(forecast.hourly),
    JSON.stringify(forecast.diagnostics)
  ).run();
}

interface ForecastRow {
  city_slug: string;
  city_name: string;
  forecast_date: string;
  generated_at: string;
  temp_max_c: number;
  temp_min_c: number;
  main_verdict: string;
  rain_verdict: string;
  notable_event: string | null;
  confidence_main: number;
  confidence_rain: number;
  hourly_json: string;
  diagnostics_json: string;
}

function fromRow(row: ForecastRow): LokaForecast {
  return {
    city: row.city_name,
    citySlug: row.city_slug,
    date: row.forecast_date,
    generatedAt: row.generated_at,
    tempMaxC: row.temp_max_c,
    tempMinC: row.temp_min_c,
    mainVerdict: row.main_verdict,
    rainVerdict: row.rain_verdict,
    notableEvent: row.notable_event,
    confidenceMain: row.confidence_main,
    confidenceRain: row.confidence_rain,
    hourly: JSON.parse(row.hourly_json),
    diagnostics: JSON.parse(row.diagnostics_json)
  };
}

export async function latestForecast(db: D1Database, citySlug: string): Promise<LokaForecast | null> {
  const row = await db.prepare(`
    SELECT * FROM forecasts
    WHERE city_slug = ?
    ORDER BY forecast_date DESC, generated_at DESC
    LIMIT 1
  `).bind(citySlug).first<ForecastRow>();
  return row ? fromRow(row) : null;
}

export async function forecastHistory(db: D1Database, citySlug: string, limit = 30): Promise<LokaForecast[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const result = await db.prepare(`
    SELECT * FROM forecasts
    WHERE city_slug = ?
    ORDER BY forecast_date DESC, generated_at DESC
    LIMIT ?
  `).bind(citySlug, safeLimit).all<ForecastRow>();
  return result.results.map(fromRow);
}

export async function saveRun(
  db: D1Database,
  args: {
    citySlug: string;
    forecastDate: string;
    generatedAt: string;
    source: string;
    status: "ok" | "partial" | "failed";
    modelsOk: string[];
    modelsFailed: Record<string, string>;
    durationMs: number;
    errorMessage?: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO runs (
      city_slug, forecast_date, generated_at, source, status,
      models_ok_json, models_failed_json, duration_ms, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    args.citySlug,
    args.forecastDate,
    args.generatedAt,
    args.source,
    args.status,
    JSON.stringify(args.modelsOk),
    JSON.stringify(args.modelsFailed),
    args.durationMs,
    args.errorMessage ?? null
  ).run();
}
