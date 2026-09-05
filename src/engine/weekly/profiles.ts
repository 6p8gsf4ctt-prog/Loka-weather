import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { CityConfig, ConsensusHour, DayProfileV2, ModelForecast } from "../../types";
import { buildConsensus } from "../consensus";
import { countRuns, maxRun, mean } from "../math";
import { buildDayProfileV2 } from "../scenes24/profile";

export const WEEKLY_PROFILE_VERSION = "0.1.0" as const;

export interface WeeklyFullDayProfile {
  pointCount: number;
  minTemperatureC: number;
  maxTemperatureC: number;
  meanTemperatureC: number;
  minApparentTemperatureC: number;
  maxApparentTemperatureC: number;
  precipitation: {
    totalMm: number;
    wetHours: number;
    wetBlockMaxHours: number;
    wetBreakCount: number;
    dryGapMaxHours: number;
    maxHourlyMm: number;
    supportPeak: number;
  };
  wind: {
    notableHours: number;
    strongHours: number;
    notableBlockMaxHours: number;
    strongBlockMaxHours: number;
    maxGustKmh: number;
    maxSpeedKmh: number;
  };
  thunderHours: number;
  fogHours: number;
  modelCountMin: number;
  modelCountMean: number;
  temperatureSpreadMeanC: number;
  temperatureSpreadMaxC: number;
}

export interface WeeklyDayProfile {
  version: typeof WEEKLY_PROFILE_VERSION;
  citySlug: string;
  date: string;
  dayIndex: number;
  hours: ConsensusHour[];
  daylight: DayProfileV2;
  fullDay: WeeklyFullDayProfile;
}

export interface WeeklyProfileSet {
  version: typeof WEEKLY_PROFILE_VERSION;
  citySlug: string;
  forecastDays: 7;
  startDate: string;
  endDate: string;
  days: WeeklyDayProfile[];
}

function dateOf(time: string): string {
  return time.slice(0, 10);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function values(points: ConsensusHour[], key: "temperatureC" | "apparentTemperatureC"): number[] {
  return points.map((point) => point[key]).filter((value) => Number.isFinite(value));
}

function fullDayProfile(city: CityConfig, points: ConsensusHour[]): WeeklyFullDayProfile {
  if (!points.length) throw new Error("weekly_day_profile_no_points");
  const wet = points.map((point) =>
    (point.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm && point.precipitationSupport >= SCENE_THRESHOLDS.rain.supportMin)
    || point.rainCodeSupport >= SCENE_THRESHOLDS.rain.supportMin
  );
  const notableWind = points.map((point) => point.windGustKmh >= city.wind.gustNotableKmh);
  const strongWind = points.map((point) => point.windGustKmh >= city.wind.gustStrongKmh);
  const temperatures = values(points, "temperatureC");
  const apparentTemperatures = values(points, "apparentTemperatureC");

  return {
    pointCount: points.length,
    minTemperatureC: Math.min(...temperatures),
    maxTemperatureC: Math.max(...temperatures),
    meanTemperatureC: mean(temperatures),
    minApparentTemperatureC: Math.min(...apparentTemperatures),
    maxApparentTemperatureC: Math.max(...apparentTemperatures),
    precipitation: {
      totalMm: points.reduce((sum, point) => sum + point.precipitationMm, 0),
      wetHours: wet.filter(Boolean).length,
      wetBlockMaxHours: maxRun(wet),
      wetBreakCount: Math.max(0, countRuns(wet) - 1),
      dryGapMaxHours: maxRun(wet.map((value) => !value)),
      maxHourlyMm: Math.max(...points.map((point) => point.precipitationMm)),
      supportPeak: Math.max(...points.map((point) => point.precipitationSupport))
    },
    wind: {
      notableHours: notableWind.filter(Boolean).length,
      strongHours: strongWind.filter(Boolean).length,
      notableBlockMaxHours: maxRun(notableWind),
      strongBlockMaxHours: maxRun(strongWind),
      maxGustKmh: Math.max(...points.map((point) => point.windGustKmh)),
      maxSpeedKmh: Math.max(...points.map((point) => point.windSpeedKmh))
    },
    thunderHours: points.filter((point) => point.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin).length,
    fogHours: points.filter((point) => point.fogSupport >= SCENE_THRESHOLDS.fog.supportMin).length,
    modelCountMin: Math.min(...points.map((point) => point.modelCount)),
    modelCountMean: mean(points.map((point) => point.modelCount)),
    temperatureSpreadMeanC: mean(points.map((point) => point.temperatureSpreadC)),
    temperatureSpreadMaxC: Math.max(...points.map((point) => point.temperatureSpreadC))
  };
}

function validateDates(dates: string[]): void {
  if (dates.length !== 7 || dates.some((date) => !isIsoDate(date))) throw new Error(`weekly_profile_requires_7_dates:${dates.join(",")}`);
  for (let index = 1; index < dates.length; index++) {
    if (dates[index] !== nextDate(dates[index - 1])) throw new Error(`weekly_profile_dates_not_contiguous:${dates[index - 1]}:${dates[index]}`);
  }
}

export function buildWeeklyProfiles(city: CityConfig, forecasts: ModelForecast[]): WeeklyProfileSet {
  if (forecasts.length < 3) throw new Error(`LOKA_WEEKLY_PROFILES_NEEDS_3_MODELS:${forecasts.length}`);
  const consensus = buildConsensus(forecasts);
  const dates = [...new Set([...consensus.values()].map((point) => dateOf(point.time)))].sort();
  validateDates(dates);

  const days = dates.map((date, dayIndex): WeeklyDayProfile => {
    const points = [...consensus.values()]
      .filter((point) => dateOf(point.time) === date)
      .sort((a, b) => a.time.localeCompare(b.time));
    return {
      version: WEEKLY_PROFILE_VERSION,
      citySlug: city.slug,
      date,
      dayIndex,
      hours: points,
      daylight: buildDayProfileV2(city, date, points),
      fullDay: fullDayProfile(city, points)
    };
  });

  return {
    version: WEEKLY_PROFILE_VERSION,
    citySlug: city.slug,
    forecastDays: 7,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    days
  };
}
