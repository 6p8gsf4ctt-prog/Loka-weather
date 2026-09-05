import { CITIES } from "../src/config/cities";
import { MODELS } from "../src/config/models";
import { fetchWeeklyForecasts, WEEKLY_FORECAST_DAYS } from "../src/engine/weekly";
import { fetchModelForecast } from "../src/weather/openMeteo";
import type { Env } from "../src/types";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_FORECAST_FAIL:${label}`);
  passed++;
}

function mockPayload(): Record<string, unknown> {
  const times = Array.from({ length: WEEKLY_FORECAST_DAYS * 24 }, (_, index) => {
    const day = String(Math.floor(index / 24) + 1).padStart(2, "0");
    const hour = String(index % 24).padStart(2, "0");
    return `2026-09-${day}T${hour}:00`;
  });
  const hourly: Record<string, unknown> = { time: times };
  for (const variable of [
    "temperature_2m", "apparent_temperature", "precipitation", "rain", "cloud_cover",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m",
    "wind_gusts_10m", "weather_code"
  ]) hourly[variable] = times.map(() => variable === "weather_code" ? 0 : 20);
  return { latitude: 43.5417, longitude: -1.4628, hourly };
}

(async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(url);
    return new Response(JSON.stringify(mockPayload()), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const batch = await fetchWeeklyForecasts({} as Env, CITIES.tarnos);
    ok(batch.forecastDays === 7, "seven_day_batch");
    ok(batch.forecasts.length === MODELS.length, "all_models_returned");
    ok(Object.keys(batch.failures).length === 0, "no_mock_failures");
    ok(batch.forecasts.every((forecast) => forecast.hourly.length === 168), "one_hundred_sixty_eight_hours");
    ok(requestedUrls.length === MODELS.length, "one_request_per_model");
    ok(requestedUrls.every((value) => new URL(value).searchParams.get("forecast_days") === "7"), "weekly_parameter_present");
    ok(requestedUrls.every((value) => new URL(value).searchParams.get("timezone") === "Europe/Paris"), "city_timezone_preserved");

    requestedUrls.length = 0;
    await fetchModelForecast({} as Env, CITIES.tarnos, MODELS[0]);
    ok(requestedUrls.length === 1, "daily_request_available");
    ok(new URL(requestedUrls[0]).searchParams.get("forecast_days") === "2", "daily_default_preserved");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`WEEKLY_FORECAST ${passed}/9 PASS`);
})().catch((error) => { throw error; });
