import { CITIES } from "./config/cities";
import { MODELS } from "./config/models";
import { buildConsensus } from "./engine/consensus";
import { buildLokaForecast } from "./engine/verdict";
import { saveForecast, saveRun, saveShadowHistory } from "./storage/db";
import type { CityConfig, Env, LokaForecast, ModelForecast } from "./types";
import { fetchModelForecast } from "./weather/openMeteo";

function localDate(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function runCity(env: Env, city: CityConfig, source: string): Promise<LokaForecast> {
  const started = Date.now();
  const targetDate = localDate(city.timezone);
  const settled = await Promise.allSettled(MODELS.map((model) => fetchModelForecast(env, city, model)));

  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });

  if (forecasts.length < 2) {
    await saveRun(env.DB, {
      citySlug: city.slug,
      forecastDate: targetDate,
      generatedAt: new Date().toISOString(),
      source,
      status: "failed",
      modelsOk: forecasts.map((f) => f.modelId),
      modelsFailed: failures,
      durationMs: Date.now() - started,
      errorMessage: "Fewer than two weather models available"
    });
    throw new Error(`LOKA needs at least 2 models; received ${forecasts.length}`);
  }

  const consensus = buildConsensus(forecasts);
  const forecast = buildLokaForecast(city, targetDate, consensus, forecasts);
  forecast.diagnostics.modelsFailed = failures;
  forecast.diagnostics.source = source;

  // Bloc 9: append the V24 shadow snapshot before updating the daily forecast.
  // This archive is diagnostic-only and must never block official production.
  try {
    await saveShadowHistory(
      env.DB,
      forecast,
      source,
      forecasts.map((f) => f.modelId),
      failures
    );
    forecast.diagnostics.shadowArchive = { status: "ok" };
  } catch (error) {
    forecast.diagnostics.shadowArchive = {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }

  await saveForecast(env.DB, forecast, source);

  await saveRun(env.DB, {
    citySlug: city.slug,
    forecastDate: targetDate,
    generatedAt: forecast.generatedAt,
    source,
    status: Object.keys(failures).length ? "partial" : "ok",
    modelsOk: forecasts.map((f) => f.modelId),
    modelsFailed: failures,
    durationMs: Date.now() - started
  });

  return forecast;
}

export async function runAllCities(env: Env, source: string): Promise<LokaForecast[]> {
  const results: LokaForecast[] = [];
  for (const city of Object.values(CITIES)) results.push(await runCity(env, city, source));
  return results;
}

export async function runOneCity(env: Env, city: CityConfig, source: string): Promise<LokaForecast> {
  return runCity(env, city, source);
}
