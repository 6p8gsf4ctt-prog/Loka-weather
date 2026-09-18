import type { CityConfig, Env, ModelForecast } from "../../types";
import { captureForecastSnapshot } from "../../weather/forecastSnapshot";
import type { WeeklyDateRange } from "./schedule";

export const WEEKLY_FORECAST_DAYS = 7 as const;
export const WEEKLY_FORECAST_TIMEOUT_MS = 30_000 as const;

export interface WeeklyForecastBatch {
  forecastDays: typeof WEEKLY_FORECAST_DAYS;
  snapshotId: string;
  generatedAt: string;
  forecasts: ModelForecast[];
  failures: Record<string, string>;
}

/**
 * Retrieves the seven-day input for the future weekly engine. This function is
 * deliberately not connected to the daily pipeline at this stage.
 */
export async function fetchWeeklyForecasts(
  env: Env,
  city: CityConfig,
  range?: WeeklyDateRange
): Promise<WeeklyForecastBatch> {
  const snapshot = await captureForecastSnapshot(env, city, "WEEKLY", range ? {
    forecastDays: WEEKLY_FORECAST_DAYS,
    startDate: range.startDate,
    endDate: range.endDate,
    timeoutMs: WEEKLY_FORECAST_TIMEOUT_MS
  } : { forecastDays: WEEKLY_FORECAST_DAYS, timeoutMs: WEEKLY_FORECAST_TIMEOUT_MS });
  if (snapshot.forecasts.length < 3) throw new Error(`LOKA_WEEKLY_NEEDS_3_MODELS:${snapshot.forecasts.length}`);
  return {
    forecastDays: WEEKLY_FORECAST_DAYS,
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt,
    forecasts: snapshot.forecasts,
    failures: snapshot.failures
  };
}
