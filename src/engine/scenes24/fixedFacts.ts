import { solarWindow } from "../solar";
import { hourOf } from "../math";
import type { CityConfig } from "../../types";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";

export const WEEKLY_FIXED_FACTS_VERSION = "1.0.0" as const;
export const WEEKLY_MORNING_START_HOUR = 5 as const;
export const WEEKLY_MORNING_END_HOUR = 10 as const;

export interface WeeklyTemperatureReference {
  date: string;
  dayIndex: number;
  temperatureC: number;
  sourceHour: number;
}

export interface WeeklyDaylightEndpoint {
  date: string;
  sunriseMinutes: number;
  sunsetMinutes: number;
  durationMinutes: number;
}

export interface WeeklyFixedFacts {
  version: typeof WEEKLY_FIXED_FACTS_VERSION;
  citySlug: string;
  startDate: string;
  endDate: string;
  /** Lowest consensus temperature observed within 05:00-10:00 local time. */
  coldestMorning: WeeklyTemperatureReference;
  /** Highest consensus temperature observed during a complete local day. */
  hottestDay: WeeklyTemperatureReference;
  /** Astronomical daylight evolution from Monday to Sunday, never sunshine duration. */
  daylight: {
    start: WeeklyDaylightEndpoint;
    end: WeeklyDaylightEndpoint;
    deltaMinutes: number;
  };
}

function orderedDays(profiles: WeeklyProfileSet): WeeklyDayProfile[] {
  const days = [...profiles.days].sort((left, right) => left.dayIndex - right.dayIndex);
  if (days.length !== 7 || days.some((day, index) => day.dayIndex !== index)) {
    throw new Error(`weekly_fixed_facts_requires_ordered_7_days:${days.length}`);
  }
  if (profiles.startDate !== days[0]?.date || profiles.endDate !== days[6]?.date) {
    throw new Error(`weekly_fixed_facts_range_mismatch:${profiles.startDate}:${profiles.endDate}`);
  }
  return days;
}

function betterMinimum(candidate: WeeklyTemperatureReference, current: WeeklyTemperatureReference | null): boolean {
  if (!current) return true;
  return candidate.temperatureC < current.temperatureC
    || (candidate.temperatureC === current.temperatureC && candidate.dayIndex < current.dayIndex)
    || (candidate.temperatureC === current.temperatureC && candidate.dayIndex === current.dayIndex && candidate.sourceHour < current.sourceHour);
}

function betterMaximum(candidate: WeeklyTemperatureReference, current: WeeklyTemperatureReference | null): boolean {
  if (!current) return true;
  return candidate.temperatureC > current.temperatureC
    || (candidate.temperatureC === current.temperatureC && candidate.dayIndex < current.dayIndex)
    || (candidate.temperatureC === current.temperatureC && candidate.dayIndex === current.dayIndex && candidate.sourceHour < current.sourceHour);
}

function coldestMorning(days: WeeklyDayProfile[]): WeeklyTemperatureReference {
  let selected: WeeklyTemperatureReference | null = null;
  for (const day of days) {
    const morningHours = day.hours.filter((point) => {
      const hour = hourOf(point.time);
      return hour >= WEEKLY_MORNING_START_HOUR && hour <= WEEKLY_MORNING_END_HOUR;
    });
    if (!morningHours.length) throw new Error(`weekly_fixed_facts_missing_morning_hours:${day.date}`);
    for (const point of morningHours) {
      const candidate: WeeklyTemperatureReference = {
        date: day.date,
        dayIndex: day.dayIndex,
        temperatureC: point.temperatureC,
        sourceHour: hourOf(point.time)
      };
      if (betterMinimum(candidate, selected)) selected = candidate;
    }
  }
  if (!selected) throw new Error("weekly_fixed_facts_missing_coldest_morning");
  return selected;
}

function hottestDay(days: WeeklyDayProfile[]): WeeklyTemperatureReference {
  let selected: WeeklyTemperatureReference | null = null;
  for (const day of days) {
    if (!day.hours.length) throw new Error(`weekly_fixed_facts_missing_day_hours:${day.date}`);
    for (const point of day.hours) {
      const candidate: WeeklyTemperatureReference = {
        date: day.date,
        dayIndex: day.dayIndex,
        temperatureC: point.temperatureC,
        sourceHour: hourOf(point.time)
      };
      if (betterMaximum(candidate, selected)) selected = candidate;
    }
  }
  if (!selected) throw new Error("weekly_fixed_facts_missing_hottest_day");
  return selected;
}

function minutes(value: number): number {
  return Math.round(value * 60);
}

function daylightEndpoint(city: CityConfig, date: string): WeeklyDaylightEndpoint {
  const solar = solarWindow(city, date);
  const sunriseMinutes = minutes(solar.sunriseLocalHour);
  const sunsetMinutes = minutes(solar.sunsetLocalHour);
  return {
    date,
    sunriseMinutes,
    sunsetMinutes,
    durationMinutes: sunsetMinutes - sunriseMinutes
  };
}

/**
 * Computes the permanent factual anchors of weekly slide 1. This module only
 * reads the seven-day consensus and the existing LOKA solar calculator; it has
 * no editorial, visual, storage or publication side effect.
 */
export function buildWeeklyFixedFacts(city: CityConfig, profiles: WeeklyProfileSet): WeeklyFixedFacts {
  if (profiles.citySlug !== city.slug) {
    throw new Error(`weekly_fixed_facts_city_mismatch:${profiles.citySlug}:${city.slug}`);
  }
  const days = orderedDays(profiles);
  const start = daylightEndpoint(city, profiles.startDate);
  const end = daylightEndpoint(city, profiles.endDate);
  return {
    version: WEEKLY_FIXED_FACTS_VERSION,
    citySlug: city.slug,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    coldestMorning: coldestMorning(days),
    hottestDay: hottestDay(days),
    daylight: {
      start,
      end,
      deltaMinutes: end.durationMinutes - start.durationMinutes
    }
  };
}
