import type { CityConfig } from "../types";
import type {
  DailyInsightAtmosphereInput,
  DailyInsightAtmospherePoint,
  DailyInsightMarineInput,
  DailyInsightMarinePoint,
  DailyInsightSourceManifest
} from "../engine/dailyInsight/dataBundle";

export interface DailyInsightSourceOptions {
  weatherBaseUrl?: string;
  marineBaseUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
  generatedAt?: string;
}

type ApiPayload = {
  error?: boolean;
  reason?: string;
  hourly?: Record<string, Array<string | number | null>> & { time?: string[] };
};

const atmosphereVariables = ["relative_humidity_2m", "surface_pressure", "visibility", "shortwave_radiation"] as const;
const marineVariables = ["sea_surface_temperature", "wave_height", "wave_period"] as const;

function numeric(values: Array<string | number | null> | undefined, index: number): number | null {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function source(state: DailyInsightSourceManifest["state"], provider: string, generatedAt: string | null, detail: string): DailyInsightSourceManifest {
  return { state, provider, generatedAt, detail };
}

async function request(url: URL, fetcher: typeof fetch, timeoutMs: number): Promise<ApiPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal, headers: { "User-Agent": "LOKA-Daily-Insight-Lab/1.0" } });
    if (!response.ok) throw new Error(`http_${response.status}`);
    const payload = await response.json() as ApiPayload;
    if (payload.error) throw new Error(payload.reason || "provider_error");
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function baseUrl(value: string | undefined, fallback: string): URL {
  const url = new URL(value || fallback);
  url.search = "";
  return url;
}

export async function fetchDailyInsightAtmosphere(
  city: CityConfig,
  targetDate: string,
  options: DailyInsightSourceOptions = {}
): Promise<DailyInsightAtmosphereInput> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const url = baseUrl(options.weatherBaseUrl, "https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("timezone", city.timezone);
  url.searchParams.set("start_date", targetDate);
  url.searchParams.set("end_date", targetDate);
  url.searchParams.set("hourly", atmosphereVariables.join(","));
  try {
    const payload = await request(url, options.fetcher ?? fetch, options.timeoutMs ?? 10_000);
    const hourly = payload.hourly;
    const times = hourly?.time ?? [];
    if (!hourly || !times.length) throw new Error("hourly_missing");
    const points: DailyInsightAtmospherePoint[] = times.map((time, index) => ({
      time,
      relativeHumidityPct: numeric(hourly.relative_humidity_2m, index),
      surfacePressureHpa: numeric(hourly.surface_pressure, index),
      visibilityM: numeric(hourly.visibility, index),
      shortwaveRadiationWm2: numeric(hourly.shortwave_radiation, index)
    }));
    return { manifest: source("READY", "OPEN_METEO_ATMOSPHERE", generatedAt, `${points.length}_hours`), points };
  } catch (error) {
    return { manifest: source("UNAVAILABLE", "OPEN_METEO_ATMOSPHERE", generatedAt, error instanceof Error ? error.message : "atmosphere_failed"), points: [] };
  }
}

export async function fetchDailyInsightMarine(
  city: CityConfig,
  targetDate: string,
  options: DailyInsightSourceOptions = {}
): Promise<DailyInsightMarineInput> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const url = baseUrl(options.marineBaseUrl, "https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("timezone", city.timezone);
  url.searchParams.set("start_date", targetDate);
  url.searchParams.set("end_date", targetDate);
  url.searchParams.set("hourly", marineVariables.join(","));
  try {
    const payload = await request(url, options.fetcher ?? fetch, options.timeoutMs ?? 10_000);
    const hourly = payload.hourly;
    const times = hourly?.time ?? [];
    if (!hourly || !times.length) throw new Error("hourly_missing");
    const points: DailyInsightMarinePoint[] = times.map((time, index) => ({
      time,
      seaSurfaceTemperatureC: numeric(hourly.sea_surface_temperature, index),
      waveHeightM: numeric(hourly.wave_height, index),
      wavePeriodS: numeric(hourly.wave_period, index)
    }));
    return { manifest: source("READY", "OPEN_METEO_MARINE", generatedAt, `${points.length}_hours`), points };
  } catch (error) {
    return { manifest: source("UNAVAILABLE", "OPEN_METEO_MARINE", generatedAt, error instanceof Error ? error.message : "marine_failed"), points: [] };
  }
}

/** Explicit laboratory collector. No production route imports this module. */
export async function collectDailyInsightExternalData(
  city: CityConfig,
  targetDate: string,
  options: DailyInsightSourceOptions = {}
): Promise<{ atmosphere: DailyInsightAtmosphereInput; marine: DailyInsightMarineInput }> {
  const [atmosphere, marine] = await Promise.all([
    fetchDailyInsightAtmosphere(city, targetDate, options),
    fetchDailyInsightMarine(city, targetDate, options)
  ]);
  return { atmosphere, marine };
}
