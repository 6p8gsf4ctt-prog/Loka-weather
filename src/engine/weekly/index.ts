export const WEEKLY_ENGINE_VERSION = "0.1.0";
export const WEEKLY_ENGINE_ENABLED_ENV = "WEEKLY_ENABLED" as const;
export { isWeeklyEnabled } from "./featureFlag";
export { fetchWeeklyForecasts, WEEKLY_FORECAST_DAYS } from "./forecast";
export type { WeeklyForecastBatch } from "./forecast";
