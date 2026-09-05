import { SCENE_THRESHOLDS } from "../../config/scenes24";
import { WEEKLY_ACTIVITY_RULES } from "../../config/weeklyActivities";
import type { CityConfig } from "../../types";
import type { SelectedWeeklyEvent, WeeklySelection } from "./selection";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";
import { hourOf } from "../math";

export type WeeklyActivity = "BEACH" | "OUTDOOR_WALK" | "OUTDOOR_SPORT";
export type WeeklyActivityStatus = "FAVORABLE" | "MIXED" | "UNFAVORABLE";
export type WeeklyActivityReasonCode =
  | "DRY"
  | "RAIN"
  | "WIND"
  | "THUNDER"
  | "FOG"
  | "COLD"
  | "HEAT"
  | "CLOUD"
  | "FAVORABLE_WINDOW";

export interface WeeklyActivityWindow {
  startHour: number;
  endHour: number;
  hours: number;
}

export interface WeeklyActivityInsight {
  id: string;
  eventId: string;
  date: string;
  dayIndex: number;
  activity: WeeklyActivity;
  status: WeeklyActivityStatus;
  reasonCodes: WeeklyActivityReasonCode[];
  evaluatedHours: number;
  favorableHours: number;
  mixedHours: number;
  unfavorableHours: number;
  bestWindow: WeeklyActivityWindow | null;
  evidence: Record<string, number | boolean | null>;
}

export interface WeeklyActivitySet {
  version: "0.1.0";
  citySlug: string;
  insights: WeeklyActivityInsight[];
}

interface ActivityLimits {
  favorableMinTemperatureC: number;
  favorableMaxTemperatureC: number;
  hardMinTemperatureC: number;
  hardMaxTemperatureC: number;
  favorableMaxCloudPct: number;
  mixedMaxCloudPct: number;
}

type ConsensusPoint = WeeklyDayProfile["hours"][number];

function limits(activity: WeeklyActivity): ActivityLimits {
  if (activity === "BEACH") return WEEKLY_ACTIVITY_RULES.beach;
  if (activity === "OUTDOOR_WALK") return WEEKLY_ACTIVITY_RULES.outdoorWalk;
  return WEEKLY_ACTIVITY_RULES.outdoorSport;
}

function wet(point: ConsensusPoint): boolean {
  return (point.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm && point.precipitationSupport >= SCENE_THRESHOLDS.rain.supportMin)
    || point.rainCodeSupport >= SCENE_THRESHOLDS.rain.supportMin;
}

function classifyPoint(point: ConsensusPoint, city: CityConfig, activity: WeeklyActivity): WeeklyActivityStatus {
  const rule = limits(activity);
  if (point.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin
    || point.fogSupport >= SCENE_THRESHOLDS.fog.supportMin
    || wet(point)
    || point.windGustKmh >= city.wind.gustStrongKmh
    || point.temperatureC < rule.hardMinTemperatureC
    || point.temperatureC > rule.hardMaxTemperatureC) return "UNFAVORABLE";
  if (point.windGustKmh >= city.wind.gustNotableKmh
    || point.temperatureC < rule.favorableMinTemperatureC
    || point.temperatureC > rule.favorableMaxTemperatureC
    || point.cloudCoverPct > rule.favorableMaxCloudPct) return "MIXED";
  return "FAVORABLE";
}

function bestWindow(points: ConsensusPoint[], city: CityConfig, activity: WeeklyActivity): WeeklyActivityWindow | null {
  let best: ConsensusPoint[] = [];
  let run: ConsensusPoint[] = [];
  for (const point of points) {
    const previous = run[run.length - 1];
    const consecutive = previous ? hourOf(point.time) === hourOf(previous.time) + 1 : true;
    if (classifyPoint(point, city, activity) === "FAVORABLE" && consecutive) run.push(point);
    else {
      if (run.length > best.length) best = run;
      run = classifyPoint(point, city, activity) === "FAVORABLE" ? [point] : [];
    }
  }
  if (run.length > best.length) best = run;
  if (best.length < WEEKLY_ACTIVITY_RULES.minFavorableWindowHours) return null;
  return { startHour: hourOf(best[0].time), endHour: hourOf(best[best.length - 1].time), hours: best.length };
}

function reasonCodes(points: ConsensusPoint[], statuses: WeeklyActivityStatus[], city: CityConfig, activity: WeeklyActivity): WeeklyActivityReasonCode[] {
  const rule = limits(activity);
  const codes: WeeklyActivityReasonCode[] = [];
  if (points.every((point) => !wet(point))) codes.push("DRY");
  if (points.some(wet)) codes.push("RAIN");
  if (points.some((point) => point.windGustKmh >= city.wind.gustNotableKmh)) codes.push("WIND");
  if (points.some((point) => point.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin)) codes.push("THUNDER");
  if (points.some((point) => point.fogSupport >= SCENE_THRESHOLDS.fog.supportMin)) codes.push("FOG");
  if (points.some((point) => point.temperatureC < rule.favorableMinTemperatureC)) codes.push("COLD");
  if (points.some((point) => point.temperatureC > rule.favorableMaxTemperatureC)) codes.push("HEAT");
  if (points.some((point) => point.cloudCoverPct > rule.favorableMaxCloudPct)) codes.push("CLOUD");
  if (statuses.includes("FAVORABLE") && bestWindow(points, city, activity)) codes.push("FAVORABLE_WINDOW");
  return codes;
}

function insight(day: WeeklyDayProfile, event: SelectedWeeklyEvent, activity: WeeklyActivity, points: ConsensusPoint[], city: CityConfig): WeeklyActivityInsight {
  const statuses = points.map((point) => classifyPoint(point, city, activity));
  const favorableHours = statuses.filter((status) => status === "FAVORABLE").length;
  const mixedHours = statuses.filter((status) => status === "MIXED").length;
  const unfavorableHours = statuses.filter((status) => status === "UNFAVORABLE").length;
  const best = bestWindow(points, city, activity);
  const status: WeeklyActivityStatus = favorableHours === points.length && favorableHours > 0
    ? "FAVORABLE"
    : favorableHours >= WEEKLY_ACTIVITY_RULES.minFavorableWindowHours
      ? "MIXED"
      : unfavorableHours >= Math.max(3, Math.ceil(points.length / 2))
        ? "UNFAVORABLE"
        : "MIXED";
  return {
    id: `${event.id}:${day.date}:${activity.toLowerCase()}`,
    eventId: event.id,
    date: day.date,
    dayIndex: day.dayIndex,
    activity,
    status,
    reasonCodes: reasonCodes(points, statuses, city, activity),
    evaluatedHours: points.length,
    favorableHours,
    mixedHours,
    unfavorableHours,
    bestWindow: best,
    evidence: {
      minTemperatureC: Math.min(...points.map((point) => point.temperatureC)),
      maxTemperatureC: Math.max(...points.map((point) => point.temperatureC)),
      maxGustKmh: Math.max(...points.map((point) => point.windGustKmh)),
      maxCloudPct: Math.max(...points.map((point) => point.cloudCoverPct)),
      wetHours: points.filter(wet).length,
      thunderHours: points.filter((point) => point.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin).length,
      fogHours: points.filter((point) => point.fogSupport >= SCENE_THRESHOLDS.fog.supportMin).length
    }
  };
}

function pointsForEvent(day: WeeklyDayProfile, event: SelectedWeeklyEvent): ConsensusPoint[] {
  const daylight = day.hours.filter((point) => {
    const hour = hourOf(point.time);
    return hour >= day.daylight.period.startHour && hour <= day.daylight.period.endHour;
  });
  if (event.type !== "BEST_WINDOW") return daylight;
  const startHour = typeof event.evidence.startHour === "number" ? event.evidence.startHour : day.daylight.period.startHour;
  const endHour = typeof event.evidence.endHour === "number" ? event.evidence.endHour : day.daylight.period.endHour;
  return daylight.filter((point) => hourOf(point.time) >= startHour && hourOf(point.time) <= endHour);
}

export function translateWeeklyActivities(
  profiles: WeeklyProfileSet,
  selection: WeeklySelection,
  city: CityConfig
): WeeklyActivitySet {
  if (profiles.citySlug !== city.slug || selection.citySlug !== city.slug) throw new Error(`weekly_activity_city_mismatch:${profiles.citySlug}:${selection.citySlug}:${city.slug}`);
  const byIndex = new Map(profiles.days.map((day) => [day.dayIndex, day]));
  const insights: WeeklyActivityInsight[] = [];
  for (const event of selection.events) {
    for (const dayIndex of event.dayIndexes) {
      const day = byIndex.get(dayIndex);
      if (!day) throw new Error(`weekly_activity_unknown_day:${dayIndex}`);
      const points = pointsForEvent(day, event);
      if (!points.length) continue;
      for (const activity of ["BEACH", "OUTDOOR_WALK", "OUTDOOR_SPORT"] as const) {
        insights.push(insight(day, event, activity, points, city));
      }
    }
  }
  return { version: "0.1.0", citySlug: profiles.citySlug, insights };
}
