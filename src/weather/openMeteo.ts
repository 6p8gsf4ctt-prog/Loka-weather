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

function numeric(values: Array<string | number | null> | undefined, i: number): number | null {
  const value = values?.[i];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchModelForecast(
  env: Env,
  city: CityConfig,
  model: ModelConfig
): Promise<ModelForecast> {
  const base = env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1/forecast";
  const url = new URL(base);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("timezone", city.timezone);
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
  url.searchParams.set("models", model.apiModel);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  if (env.OPEN_METEO_API_KEY) url.searchParams.set("apikey", env.OPEN_METEO_API_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "LOKA-Weather/0.1" }
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${model.id}: Open-Meteo ${response.status} ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as OpenMeteoPayload;
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
    windSpeedKmh: numeric(hourly.wind_speed_10m, i),
    windGustKmh: numeric(hourly.wind_gusts_10m, i),
    weatherCode: numeric(hourly.weather_code, i)
  }));

  return {
    modelId: model.id,
    family: model.family,
    weight: model.baseWeight,
    fetchedAt: new Date().toISOString(),
    latitude: data.latitude,
    longitude: data.longitude,
    generationTimeMs: data.generationtime_ms,
    hourly: points
  };
}
