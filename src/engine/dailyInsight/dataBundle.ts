import type { CityConfig } from "../../types";
import type { ForecastSnapshot } from "../../weather/forecastSnapshot";
import { solarPresentation } from "../../ui/solarTimes";
import {
  calendarReferenceForDate,
  type DailyInsightMetric,
  type DailyInsightRecentTuple,
  type DailyInsightReferenceSnapshot
} from "./referenceData";

export const DAILY_INSIGHT_DATA_VERSION = "1.0.0" as const;
export const DAILY_INSIGHT_DATA_MODE = "LAB_ONLY" as const;

export type DailyInsightSourceState = "READY" | "PARTIAL" | "UNAVAILABLE" | "NOT_CONFIGURED";

export interface DailyInsightSourceManifest {
  state: DailyInsightSourceState;
  provider: string;
  generatedAt: string | null;
  detail: string;
}

export interface DailyInsightAtmospherePoint {
  time: string;
  relativeHumidityPct: number | null;
  surfacePressureHpa: number | null;
  visibilityM: number | null;
  shortwaveRadiationWm2: number | null;
}

export interface DailyInsightAtmosphereInput {
  manifest: DailyInsightSourceManifest;
  points: DailyInsightAtmospherePoint[];
}

export interface DailyInsightMarinePoint {
  time: string;
  seaSurfaceTemperatureC: number | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
}

export interface DailyInsightMarineInput {
  manifest: DailyInsightSourceManifest;
  points: DailyInsightMarinePoint[];
}

export interface DailyInsightTideEvent {
  time: string;
  type: "HIGH" | "LOW";
  heightM: number | null;
}

export interface DailyInsightTideInput {
  manifest: DailyInsightSourceManifest;
  events: DailyInsightTideEvent[];
}

export interface DailyInsightHourlyPoint {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  windGustKmh: number;
  relativeHumidityPct: number | null;
  surfacePressureHpa: number | null;
  visibilityM: number | null;
  shortwaveRadiationWm2: number | null;
  modelCount: number;
  temperatureSpreadC: number;
  precipitationSupport: number;
}

export interface DailyInsightDailySummary {
  minTemperatureC: number;
  maxTemperatureC: number;
  minApparentTemperatureC: number;
  maxApparentTemperatureC: number;
  thermalAmplitudeC: number;
  precipitationTotalMm: number;
  wetHourCount: number;
  maxWindGustKmh: number;
  meanCloudCoverPct: number;
  meanRelativeHumidityPct: number | null;
  minSurfacePressureHpa: number | null;
  maxSurfacePressureHpa: number | null;
  pressureChangeHpa: number | null;
  minVisibilityM: number | null;
  maxShortwaveRadiationWm2: number | null;
}

export interface DailyInsightClimateSlice {
  metric: DailyInsightMetric;
  count: number;
  mean: number;
  p05: number;
  p50: number;
  p95: number;
}

export interface DailyInsightDataBundle {
  version: typeof DAILY_INSIGHT_DATA_VERSION;
  mode: typeof DAILY_INSIGHT_DATA_MODE;
  id: string;
  city: Pick<CityConfig, "slug" | "name" | "latitude" | "longitude" | "timezone">;
  targetDate: string;
  generatedAt: string;
  sources: {
    forecast: DailyInsightSourceManifest & { snapshotId: string; modelCount: number };
    localArchive: DailyInsightSourceManifest & { sourceSnapshotId: string; stationId: string; lastDate: string };
    atmosphere: DailyInsightSourceManifest;
    marine: DailyInsightSourceManifest;
    tides: DailyInsightSourceManifest;
    solar: DailyInsightSourceManifest;
    calendar: DailyInsightSourceManifest;
  };
  hourly: DailyInsightHourlyPoint[];
  daily: DailyInsightDailySummary;
  climate: Partial<Record<DailyInsightMetric, DailyInsightClimateSlice>>;
  recentObservations: DailyInsightRecentTuple[];
  drySpellDays: number;
  solar: ReturnType<typeof solarPresentation>;
  calendar: {
    meteorologicalSeason: "WINTER" | "SPRING" | "SUMMER" | "AUTUMN";
    firstDayOfSeason: boolean;
    clockChange: "SUMMER_TIME_START" | "WINTER_TIME_START" | null;
    events: string[];
  };
  marine: {
    points: DailyInsightMarinePoint[];
    seaSurfaceTemperatureC: number | null;
    maxWaveHeightM: number | null;
  };
  tides: DailyInsightTideEvent[];
  quality: {
    coreReady: boolean;
    enrichmentCoveragePct: number;
    missingBlocks: string[];
    warnings: string[];
  };
}

export interface DailyInsightDataBuildInput {
  city: CityConfig;
  targetDate: string;
  generatedAt: string;
  forecast: ForecastSnapshot;
  reference: DailyInsightReferenceSnapshot;
  atmosphere?: DailyInsightAtmosphereInput;
  marine?: DailyInsightMarineInput;
  tides?: DailyInsightTideInput;
}

const unavailable = (provider: string, detail: string): DailyInsightSourceManifest => ({
  state: "UNAVAILABLE", provider, generatedAt: null, detail
});

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function finite(values: Array<number | null>): number[] {
  return values.filter((value): value is number => Number.isFinite(value));
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}

function drySpellDays(rows: DailyInsightRecentTuple[], rainThresholdMm = 1): number {
  let days = 0;
  for (let index = rows.length - 1; index >= 0; index--) {
    const rain = rows[index][3];
    if (rain === null || rain >= rainThresholdMm) break;
    days++;
  }
  return days;
}

function dailySummary(points: DailyInsightHourlyPoint[]): DailyInsightDailySummary {
  if (!points.length) throw new Error("daily_insight_data_hourly_empty");
  const temperatures = points.map((point) => point.temperatureC);
  const apparent = points.map((point) => point.apparentTemperatureC);
  const pressure = finite(points.map((point) => point.surfacePressureHpa));
  const humidity = finite(points.map((point) => point.relativeHumidityPct));
  const visibility = finite(points.map((point) => point.visibilityM));
  const radiation = finite(points.map((point) => point.shortwaveRadiationWm2));
  const firstPressure = points.find((point) => point.surfacePressureHpa !== null)?.surfacePressureHpa ?? null;
  const lastPressure = [...points].reverse().find((point) => point.surfacePressureHpa !== null)?.surfacePressureHpa ?? null;
  const minTemperatureC = Math.min(...temperatures);
  const maxTemperatureC = Math.max(...temperatures);
  return {
    minTemperatureC: round(minTemperatureC),
    maxTemperatureC: round(maxTemperatureC),
    minApparentTemperatureC: round(Math.min(...apparent)),
    maxApparentTemperatureC: round(Math.max(...apparent)),
    thermalAmplitudeC: round(maxTemperatureC - minTemperatureC),
    precipitationTotalMm: round(points.reduce((sum, point) => sum + point.precipitationMm, 0)),
    wetHourCount: points.filter((point) => point.precipitationMm >= 0.1).length,
    maxWindGustKmh: round(Math.max(...points.map((point) => point.windGustKmh))),
    meanCloudCoverPct: round(mean(points.map((point) => point.cloudCoverPct)) ?? 0),
    meanRelativeHumidityPct: humidity.length ? round(mean(humidity)!) : null,
    minSurfacePressureHpa: pressure.length ? round(Math.min(...pressure)) : null,
    maxSurfacePressureHpa: pressure.length ? round(Math.max(...pressure)) : null,
    pressureChangeHpa: firstPressure !== null && lastPressure !== null ? round(lastPressure - firstPressure) : null,
    minVisibilityM: visibility.length ? Math.round(Math.min(...visibility)) : null,
    maxShortwaveRadiationWm2: radiation.length ? Math.round(Math.max(...radiation)) : null
  };
}

function lastSunday(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

export function dailyInsightCalendar(date: string): DailyInsightDataBundle["calendar"] {
  if (!validIsoDate(date)) throw new Error("daily_insight_data_target_date_invalid");
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const monthDay = date.slice(5);
  const meteorologicalSeason = month <= 2 || month === 12 ? "WINTER" : month <= 5 ? "SPRING" : month <= 8 ? "SUMMER" : "AUTUMN";
  const firstDayOfSeason = ["03-01", "06-01", "09-01", "12-01"].includes(monthDay);
  const clockChange = date === lastSunday(year, 2) ? "SUMMER_TIME_START"
    : date === lastSunday(year, 9) ? "WINTER_TIME_START" : null;
  const events: string[] = [];
  if (firstDayOfSeason) events.push(`METEOROLOGICAL_${meteorologicalSeason}_START`);
  if (clockChange) events.push(clockChange);
  return { meteorologicalSeason, firstDayOfSeason, clockChange, events };
}

function bundleId(input: DailyInsightDataBuildInput): string {
  return [DAILY_INSIGHT_DATA_VERSION, input.city.slug, input.targetDate, input.forecast.id, input.reference.sourceSnapshotId].join(":");
}

export function buildDailyInsightDataBundle(input: DailyInsightDataBuildInput): DailyInsightDataBundle {
  if (!validIsoDate(input.targetDate)) throw new Error("daily_insight_data_target_date_invalid");
  if (Number.isNaN(Date.parse(input.generatedAt))) throw new Error("daily_insight_data_generated_at_invalid");
  if (input.forecast.citySlug !== input.city.slug) throw new Error("daily_insight_data_forecast_city_mismatch");
  const forecastHours = input.forecast.consensus.filter((point) => point.time.startsWith(`${input.targetDate}T`));
  if (!forecastHours.length) throw new Error("daily_insight_data_forecast_date_missing");
  const atmosphere = input.atmosphere ?? { manifest: unavailable("OPEN_METEO_ATMOSPHERE", "atmosphere_not_collected"), points: [] };
  const marine = input.marine ?? { manifest: unavailable("OPEN_METEO_MARINE", "marine_not_collected"), points: [] };
  const tides = input.tides ?? {
    manifest: { state: "NOT_CONFIGURED", provider: "TIDE_PROVIDER", generatedAt: null, detail: "tide_provider_not_configured" } as DailyInsightSourceManifest,
    events: []
  };
  const atmosphereByTime = new Map(atmosphere.points.map((point) => [point.time, point]));
  const hourly: DailyInsightHourlyPoint[] = forecastHours.map((point) => {
    const extra = atmosphereByTime.get(point.time);
    return {
      time: point.time,
      temperatureC: point.temperatureC,
      apparentTemperatureC: point.apparentTemperatureC,
      precipitationMm: point.precipitationMm,
      cloudCoverPct: point.cloudCoverPct,
      windSpeedKmh: point.windSpeedKmh,
      windGustKmh: point.windGustKmh,
      relativeHumidityPct: extra?.relativeHumidityPct ?? null,
      surfacePressureHpa: extra?.surfacePressureHpa ?? null,
      visibilityM: extra?.visibilityM ?? null,
      shortwaveRadiationWm2: extra?.shortwaveRadiationWm2 ?? null,
      modelCount: point.modelCount,
      temperatureSpreadC: point.temperatureSpreadC,
      precipitationSupport: point.precipitationSupport
    };
  });
  const metrics: DailyInsightMetric[] = ["tminC", "tmaxC", "rainMm", "gustKmh"];
  const climate = Object.fromEntries(metrics.flatMap((metric) => {
    const reference = calendarReferenceForDate(input.reference, input.targetDate, metric);
    return reference ? [[metric, { metric, count: reference.count, mean: reference.mean, p05: reference.p05, p50: reference.p50, p95: reference.p95 }]] : [];
  })) as Partial<Record<DailyInsightMetric, DailyInsightClimateSlice>>;
  const recentObservations = input.reference.recent.filter((row) => row[0] < input.targetDate).slice(-31);
  const solar = solarPresentation(input.city, input.targetDate);
  const calendar = dailyInsightCalendar(input.targetDate);
  const marinePoints = marine.points.filter((point) => point.time.startsWith(`${input.targetDate}T`));
  const seaTemperatures = finite(marinePoints.map((point) => point.seaSurfaceTemperatureC));
  const waveHeights = finite(marinePoints.map((point) => point.waveHeightM));
  const missingBlocks = [
    ...(atmosphere.manifest.state === "READY" ? [] : ["atmosphere"]),
    ...(marine.manifest.state === "READY" ? [] : ["marine"]),
    ...(tides.manifest.state === "READY" ? [] : ["tides"])
  ];
  const coverageBlocks = [atmosphere.manifest.state === "READY", marine.manifest.state === "READY", tides.manifest.state === "READY"];
  const warnings = [
    ...(atmosphere.points.length && atmosphere.points.length !== forecastHours.length ? ["atmosphere_hour_count_mismatch"] : []),
    ...(input.reference.lastDate >= input.targetDate ? [] : [`archive_ends_before_target:${input.reference.lastDate}`])
  ];
  return {
    version: DAILY_INSIGHT_DATA_VERSION,
    mode: DAILY_INSIGHT_DATA_MODE,
    id: bundleId(input),
    city: { slug: input.city.slug, name: input.city.name, latitude: input.city.latitude, longitude: input.city.longitude, timezone: input.city.timezone },
    targetDate: input.targetDate,
    generatedAt: input.generatedAt,
    sources: {
      forecast: { state: input.forecast.forecasts.length >= 3 ? "READY" : "PARTIAL", provider: "LOKA_MULTI_MODEL_CONSENSUS", generatedAt: input.forecast.generatedAt, detail: `${input.forecast.forecasts.length}_models`, snapshotId: input.forecast.id, modelCount: input.forecast.forecasts.length },
      localArchive: { state: "READY", provider: "METEO_FRANCE", generatedAt: input.reference.generatedAt, detail: `${input.reference.rowCount}_rows`, sourceSnapshotId: input.reference.sourceSnapshotId, stationId: input.reference.stationId, lastDate: input.reference.lastDate },
      atmosphere: atmosphere.manifest,
      marine: marine.manifest,
      tides: tides.manifest,
      solar: { state: solar.sunrise && solar.sunset ? "READY" : "PARTIAL", provider: "LOKA_NOAA_CALCULATION", generatedAt: input.generatedAt, detail: solar.method },
      calendar: { state: "READY", provider: "LOKA_DETERMINISTIC_CALENDAR", generatedAt: input.generatedAt, detail: "meteorological_seasons_and_french_clock_changes" }
    },
    hourly,
    daily: dailySummary(hourly),
    climate,
    recentObservations,
    drySpellDays: drySpellDays(recentObservations),
    solar,
    calendar,
    marine: {
      points: marinePoints,
      seaSurfaceTemperatureC: seaTemperatures.length ? round(mean(seaTemperatures)!) : null,
      maxWaveHeightM: waveHeights.length ? round(Math.max(...waveHeights)) : null
    },
    tides: tides.events.filter((event) => event.time.startsWith(`${input.targetDate}T`)),
    quality: {
      coreReady: input.forecast.forecasts.length >= 3 && Object.keys(climate).length === metrics.length,
      enrichmentCoveragePct: Math.round(coverageBlocks.filter(Boolean).length / coverageBlocks.length * 100),
      missingBlocks,
      warnings
    }
  };
}

export function validateDailyInsightDataBundle(value: unknown): DailyInsightDataBundle {
  if (!value || typeof value !== "object") throw new Error("daily_insight_data_invalid");
  const bundle = value as Partial<DailyInsightDataBundle>;
  if (bundle.version !== DAILY_INSIGHT_DATA_VERSION || bundle.mode !== DAILY_INSIGHT_DATA_MODE) throw new Error("daily_insight_data_version_invalid");
  if (!bundle.id || !bundle.city?.slug || !bundle.targetDate || !validIsoDate(bundle.targetDate)) throw new Error("daily_insight_data_identity_invalid");
  if (!bundle.generatedAt || Number.isNaN(Date.parse(bundle.generatedAt))) throw new Error("daily_insight_data_generated_at_invalid");
  if (!bundle.sources?.forecast || !bundle.sources.localArchive || !bundle.quality) throw new Error("daily_insight_data_manifest_invalid");
  if (!Array.isArray(bundle.hourly) || bundle.hourly.length < 1 || !bundle.daily) throw new Error("daily_insight_data_forecast_invalid");
  if (!bundle.climate || !Array.isArray(bundle.recentObservations) || !bundle.solar || !bundle.calendar) throw new Error("daily_insight_data_context_invalid");
  if (!bundle.marine || !Array.isArray(bundle.tides)) throw new Error("daily_insight_data_local_blocks_invalid");
  return bundle as DailyInsightDataBundle;
}
