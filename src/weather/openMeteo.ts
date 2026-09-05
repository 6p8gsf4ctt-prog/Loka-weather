import { HOURLY_VARIABLES } from "../config/models";
import type { CityConfig, Env, HourPoint, ModelConfig, ModelForecast } from "../types";

interface OpenMeteoPayload {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  hourly?: Record<string, Array<string | number | null>> & { time?: string[] };
  error?: boolean;
  reason?: string;
}

export interface ForecastRequestOptions {
  forecastDays?: number;
  startDate?: string;
  endDate?: string;
  timeoutMs?: number;
}

function normalizedForecastDays(value: number | undefined): number {
  const days = value ?? 2;
  if (!Number.isInteger(days) || days < 1 || days > 16) throw new Error(`invalid_forecast_days:${days}`);
  return days;
}

function normalizedTimeoutMs(value: number | undefined): number {
  const timeoutMs = value ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) throw new Error(`invalid_forecast_timeout:${timeoutMs}`);
  return timeoutMs;
}

function applyForecastRange(url: URL, startDate: string | undefined, endDate: string | undefined): void {
  if (startDate === undefined && endDate === undefined) return;
  if (startDate === undefined || endDate === undefined) throw new Error("forecast_range_requires_both_dates");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error(`invalid_forecast_range:${startDate}:${endDate}`);
  }
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error(`invalid_forecast_range:${startDate}:${endDate}`);
  }
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
}

function numeric(values: Array<string | number | null> | undefined, i: number): number | null {
  const value = values?.[i];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchModelForecast(
  env: Env,
  city: CityConfig,
  model: ModelConfig,
  options: ForecastRequestOptions = {}
): Promise<ModelForecast> {
  const forecastDays = normalizedForecastDays(options.forecastDays);
  const timeoutMs = normalizedTimeoutMs(options.timeoutMs);
  const base = env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1/forecast";
  const url = new URL(base);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("timezone", city.timezone);
  if (options.startDate !== undefined || options.endDate !== undefined) {
    applyForecastRange(url, options.startDate, options.endDate);
  } else {
    url.searchParams.set("forecast_days", String(forecastDays));
  }
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
  url.searchParams.set("models", model.apiModel);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  if (env.OPEN_METEO_API_KEY) url.searchParams.set("apikey", env.OPEN_METEO_API_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "LOKA-Weather/2.0" } });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`${model.id}: Open-Meteo ${response.status} ${(await response.text()).slice(0, 300)}`);
  const data = await response.json() as OpenMeteoPayload;
  if (data.error) throw new Error(`${model.id}: ${data.reason || "Open-Meteo error"}`);
  const hourly = data.hourly;
  const times = hourly?.time ?? [];
  if (!hourly || !times.length) throw new Error(`${model.id}: no hourly data`);
  const points: HourPoint[] = times.map((time, i) => ({
    time,
    temperatureC: numeric(hourly.temperature_2m, i),
    apparentTemperatureC: numeric(hourly.apparent_temperature, i),
    precipitationMm: numeric(hourly.precipitation, i) ?? 0,
    rainMm: numeric(hourly.rain, i) ?? 0,
    cloudCoverPct: numeric(hourly.cloud_cover, i),
    cloudCoverLowPct: numeric(hourly.cloud_cover_low, i),
    cloudCoverMidPct: numeric(hourly.cloud_cover_mid, i),
    cloudCoverHighPct: numeric(hourly.cloud_cover_high, i),
    windSpeedKmh: numeric(hourly.wind_speed_10m, i),
    windGustKmh: numeric(hourly.wind_gusts_10m, i),
    weatherCode: numeric(hourly.weather_code, i)
  }));
  return {
    modelId: model.id, family: model.family, weight: model.baseWeight,
    fetchedAt: new Date().toISOString(), latitude: data.latitude, longitude: data.longitude,
    generationTimeMs: data.generationtime_ms, hourly: points
  };
}
