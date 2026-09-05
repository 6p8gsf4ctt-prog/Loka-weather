import { WEEKLY_EVENT_THRESHOLDS } from "../../config/weeklyEvents";
import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { CityConfig } from "../../types";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";
import { hourOf } from "../math";

export type WeeklyEventType =
  | "HEAT"
  | "COLD"
  | "RAIN"
  | "WIND"
  | "IMPROVEMENT"
  | "DEGRADATION"
  | "BEST_WINDOW"
  | "THUNDER";

export type WeeklyEventEvidenceValue = number | string | boolean | null;

export interface WeeklyEvent {
  id: string;
  type: WeeklyEventType;
  startDate: string;
  endDate: string;
  dayIndexes: number[];
  rule: string;
  evidence: Record<string, WeeklyEventEvidenceValue>;
}

function event(
  type: WeeklyEventType,
  day: WeeklyDayProfile,
  rule: string,
  evidence: Record<string, WeeklyEventEvidenceValue>,
  suffix = ""
): WeeklyEvent {
  const idSuffix = suffix ? `:${suffix}` : "";
  return {
    id: `${type.toLowerCase()}:${day.date}${idSuffix}`,
    type,
    startDate: day.date,
    endDate: day.date,
    dayIndexes: [day.dayIndex],
    rule,
    evidence
  };
}

function detectHeat(day: WeeklyDayProfile, city: CityConfig): WeeklyEvent | null {
  const thresholdC = city.thermal.afternoonHotFromC;
  const { maxTemperatureC, minTemperatureC } = day.fullDay;
  return maxTemperatureC >= thresholdC
    ? event("HEAT", day, "daily_max_temperature_reaches_marked_heat_threshold", {
      maxTemperatureC, minTemperatureC, thresholdC
    })
    : null;
}

function detectCold(day: WeeklyDayProfile, city: CityConfig): WeeklyEvent | null {
  const maxTemperatureC = day.fullDay.maxTemperatureC;
  const thresholdC = city.thermal.morningCoolBelowC;
  return maxTemperatureC <= thresholdC
    ? event("COLD", day, "daily_max_temperature_remains_at_or_below_cold_threshold", {
      maxTemperatureC, minTemperatureC: day.fullDay.minTemperatureC, thresholdC
    })
    : null;
}

function detectRain(day: WeeklyDayProfile): WeeklyEvent | null {
  const rain = day.fullDay.precipitation;
  const threshold = WEEKLY_EVENT_THRESHOLDS.rain;
  const totalTrigger = rain.totalMm >= threshold.minTotalMm;
  const hoursTrigger = rain.wetHours >= threshold.minWetHours;
  const blockTrigger = rain.wetBlockMaxHours >= threshold.minWetBlockHours;
  if (!totalTrigger && !hoursTrigger && !blockTrigger) return null;
  return event("RAIN", day, "precipitation_reaches_significant_weekly_event_threshold", {
    totalMm: rain.totalMm,
    wetHours: rain.wetHours,
    wetBlockMaxHours: rain.wetBlockMaxHours,
    maxHourlyMm: rain.maxHourlyMm,
    trigger: totalTrigger ? "total_mm" : hoursTrigger ? "wet_hours" : "wet_block"
  });
}

function detectWind(day: WeeklyDayProfile): WeeklyEvent | null {
  const wind = day.fullDay.wind;
  const threshold = WEEKLY_EVENT_THRESHOLDS.wind;
  const sustainedTrigger = wind.strongHours >= threshold.minStrongHours;
  const extremeTrigger = wind.maxGustKmh >= threshold.extremeGustKmh;
  if (!sustainedTrigger && !extremeTrigger) return null;
  return event("WIND", day, "strong_gusts_reach_sustained_or_extreme_threshold", {
    maxGustKmh: wind.maxGustKmh,
    strongHours: wind.strongHours,
    strongBlockMaxHours: wind.strongBlockMaxHours,
    trigger: sustainedTrigger ? "strong_hours" : "extreme_gust"
  });
}

function detectTrend(day: WeeklyDayProfile): WeeklyEvent[] {
  const evolution = day.daylight.evolution;
  const threshold = WEEKLY_EVENT_THRESHOLDS.trend.minCloudDeltaPct;
  const events: WeeklyEvent[] = [];
  if (evolution.cloudTrend <= -threshold) {
    events.push(event("IMPROVEMENT", day, "daylight_cloud_cover_drops_by_net_threshold", {
      earlyCloudPct: evolution.earlyCloudPct,
      lateCloudPct: evolution.lateCloudPct,
      cloudTrend: evolution.cloudTrend,
      trendStrength: evolution.trendStrength
    }));
  }
  if (evolution.cloudTrend >= threshold) {
    events.push(event("DEGRADATION", day, "daylight_cloud_cover_rises_by_net_threshold", {
      earlyCloudPct: evolution.earlyCloudPct,
      lateCloudPct: evolution.lateCloudPct,
      cloudTrend: evolution.cloudTrend,
      trendStrength: evolution.trendStrength
    }));
  }
  return events;
}

function detectThunder(day: WeeklyDayProfile): WeeklyEvent | null {
  const thunderHours = day.fullDay.thunderHours;
  const peakThunderSupport = Math.max(...day.hours.map((point) => point.thunderstormSupport));
  const threshold = WEEKLY_EVENT_THRESHOLDS.thunder;
  if (thunderHours < threshold.minHours || peakThunderSupport < threshold.minPeakSupport) return null;
  return event("THUNDER", day, "thunder_signal_has_minimum_duration_and_model_support", {
    thunderHours, peakThunderSupport, minHours: threshold.minHours, minPeakSupport: threshold.minPeakSupport,
    modelCountMin: day.fullDay.modelCountMin
  });
}

function isFavorable(point: WeeklyDayProfile["hours"][number], city: CityConfig): boolean {
  return point.cloudCoverPct <= WEEKLY_EVENT_THRESHOLDS.bestWindow.maxCloudPct
    && point.precipitationMm < SCENE_THRESHOLDS.rain.wetHourMinMm
    && point.precipitationSupport < SCENE_THRESHOLDS.rain.supportMin
    && point.rainCodeSupport < SCENE_THRESHOLDS.rain.supportMin
    && point.windGustKmh < city.wind.gustNotableKmh
    && point.thunderstormSupport < SCENE_THRESHOLDS.thunder.supportMin
    && point.fogSupport < SCENE_THRESHOLDS.fog.supportMin;
}

function detectBestWindows(day: WeeklyDayProfile, city: CityConfig): WeeklyEvent[] {
  const { startHour, endHour } = day.daylight.period;
  const daylight = day.hours.filter((point) => {
    const hour = hourOf(point.time);
    return hour >= startHour && hour <= endHour;
  });
  const events: WeeklyEvent[] = [];
  let run: typeof daylight = [];
  const flush = () => {
    if (run.length < WEEKLY_EVENT_THRESHOLDS.bestWindow.minConsecutiveHours) return;
    const startHour = hourOf(run[0].time);
    const endHour = hourOf(run[run.length - 1].time);
    events.push(event("BEST_WINDOW", day, "consecutive_daylight_hours_are_dry_bright_and_not_windy", {
      startHour, endHour, hours: run.length,
      meanTemperatureC: run.reduce((sum, point) => sum + point.temperatureC, 0) / run.length,
      maxGustKmh: Math.max(...run.map((point) => point.windGustKmh)),
      meanCloudPct: run.reduce((sum, point) => sum + point.cloudCoverPct, 0) / run.length
    }, `${String(startHour).padStart(2, "0")}-${String(endHour).padStart(2, "0")}`));
  };
  for (const point of daylight) {
    const previous = run[run.length - 1];
    const consecutive = previous ? hourOf(point.time) === hourOf(previous.time) + 1 : true;
    if (isFavorable(point, city) && consecutive) run.push(point);
    else {
      flush();
      run = isFavorable(point, city) ? [point] : [];
    }
  }
  flush();
  return events;
}

function detectDayEvents(day: WeeklyDayProfile, city: CityConfig): WeeklyEvent[] {
  return [detectHeat(day, city), detectCold(day, city), detectRain(day), detectWind(day), detectThunder(day)]
    .filter((value): value is WeeklyEvent => value !== null)
    .concat(detectTrend(day), detectBestWindows(day, city));
}

/** Detects raw weekly signals only. Selection, merging, ranking and editorial text belong to later steps. */
export function detectWeeklyEvents(profiles: WeeklyProfileSet, city: CityConfig): WeeklyEvent[] {
  if (profiles.citySlug !== city.slug) throw new Error(`weekly_event_city_mismatch:${profiles.citySlug}:${city.slug}`);
  return profiles.days.flatMap((day) => detectDayEvents(day, city));
}
