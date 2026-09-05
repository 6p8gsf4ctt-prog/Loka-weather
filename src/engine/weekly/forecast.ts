import { MODELS } from "../../config/models";
import type { CityConfig, Env, ModelForecast } from "../../types";
import { fetchModelForecast } from "../../weather/openMeteo";
import type { WeeklyDateRange } from "./schedule";

export const WEEKLY_FORECAST_DAYS = 7 as const;

export interface WeeklyForecastBatch {
  forecastDays: typeof WEEKLY_FORECAST_DAYS;
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
  const settled = await Promise.allSettled(
    MODELS.map((model) => fetchModelForecast(env, city, model, range ? {
      forecastDays: WEEKLY_FORECAST_DAYS,
      startDate: range.startDate,
      endDate: range.endDate
    } : { forecastDays: WEEKLY_FORECAST_DAYS }))
  );
  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });

  if (forecasts.length < 3) throw new Error(`LOKA_WEEKLY_NEEDS_3_MODELS:${forecasts.length}`);
  return { forecastDays: WEEKLY_FORECAST_DAYS, forecasts, failures };
}
