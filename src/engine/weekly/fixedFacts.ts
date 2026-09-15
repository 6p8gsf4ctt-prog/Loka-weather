import { solarWindow } from "../solar";
import { hourOf } from "../math";
import type { CityConfig } from "../../types";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";

export const WEEKLY_FIXED_FACTS_VERSION = "1.1.0" as const;
export const WEEKLY_MORNING_START_HOUR = 5 as const;
export const WEEKLY_MORNING_END_HOUR = 10 as const;

export interface WeeklyTemperatureReference {
  date: string;
  dayIndex: number;
  temperatureC: number;
  sourceHour: number;
}

/**
 * The first reference is retained for backwards traceability. `matches` keeps
 * every day that reached the same unrounded weekly extreme, so the editorial
 * layer never has to invent a tie-breaker after the facts have been computed.
 */
export interface WeeklyTemperatureFact extends WeeklyTemperatureReference {
  matches: WeeklyTemperatureReference[];
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
  coldestMorning: WeeklyTemperatureFact;
  /** Highest consensus temperature observed during a complete local day. */
  hottestDay: WeeklyTemperatureFact;
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

function referencesForHours(days: WeeklyDayProfile[], acceptHour: (hour: number) => boolean): WeeklyTemperatureReference[] {
  const references: WeeklyTemperatureReference[] = [];
  for (const day of days) {
    const points = day.hours.filter((point) => acceptHour(hourOf(point.time)));
    if (!points.length) throw new Error(`weekly_fixed_facts_missing_required_hours:${day.date}`);
    for (const point of points) {
      references.push({
        date: day.date,
        dayIndex: day.dayIndex,
        temperatureC: point.temperatureC,
        sourceHour: hourOf(point.time)
      });
    }
  }
  return references;
}

function extremeFact(references: WeeklyTemperatureReference[], kind: "MIN" | "MAX"): WeeklyTemperatureFact {
  if (!references.length) throw new Error(`weekly_fixed_facts_missing_${kind.toLowerCase()}_references`);
  const extremeTemperature = kind === "MIN"
    ? Math.min(...references.map((reference) => reference.temperatureC))
    : Math.max(...references.map((reference) => reference.temperatureC));
  const matches = references
    .filter((reference) => reference.temperatureC === extremeTemperature)
    .sort((left, right) => left.dayIndex - right.dayIndex || left.sourceHour - right.sourceHour)
    .filter((reference, index, all) => index === 0 || reference.dayIndex !== all[index - 1]?.dayIndex);
  const primary = matches[0];
  if (!primary) throw new Error(`weekly_fixed_facts_missing_${kind.toLowerCase()}_match`);
  return { ...primary, matches };
}

function coldestMorning(days: WeeklyDayProfile[]): WeeklyTemperatureFact {
  const references = referencesForHours(days, (hour) => hour >= WEEKLY_MORNING_START_HOUR && hour <= WEEKLY_MORNING_END_HOUR);
  return extremeFact(references, "MIN");
}

function hottestDay(days: WeeklyDayProfile[]): WeeklyTemperatureFact {
  const references = referencesForHours(days, () => true);
  return extremeFact(references, "MAX");
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
