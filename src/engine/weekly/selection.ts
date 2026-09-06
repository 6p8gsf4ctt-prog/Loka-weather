import { WEEKLY_SELECTION_RULES } from "../../config/weeklySelection";
import type { CityConfig } from "../../types";
import { detectWeeklyEvents, type WeeklyEvent } from "./events";
import { consolidateWeeklyEvents, type WeeklyStoryEpisode, type WeeklyStoryFamily, type WeeklyStoryDirection } from "./consolidation";
import type { WeeklyProfileSet } from "./profiles";

export type WeeklySelectionStatus = "EVENTS" | "CALM";
export type WeeklySelectionConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface SelectedWeeklyEvent extends WeeklyEvent {
  score: number;
  confidence: WeeklySelectionConfidence;
  selectionReason: string;
  storyFamily?: WeeklyStoryFamily;
  direction?: WeeklyStoryDirection;
  sourceCandidateIds?: string[];
  sourceCandidateTypes?: WeeklyEvent["type"][];
  representativeDayIndex?: number;
}

export interface WeeklySelection {
  version: "0.1.0";
  citySlug: string;
  startDate: string;
  endDate: string;
  status: WeeklySelectionStatus;
  rawCandidateCount: number;
  episodeCount?: number;
  events: SelectedWeeklyEvent[];
  calm: { reason: string } | null;
}

function numberValue(event: WeeklyEvent, key: string): number {
  const value = event.evidence[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function scoreEvent(event: WeeklyEvent, city: CityConfig): { score: number; reason: string } {
  const durationDays = Math.max(1, event.dayIndexes.length);
  const durationBonus = Math.min(12, (durationDays - 1) * 3);
  let score = 55 + durationBonus;
  let reason = "threshold_reached";

  if (event.type === "HEAT") {
    const excess = numberValue(event, "maxTemperatureC") - city.thermal.afternoonHotFromC;
    score += Math.min(25, Math.max(0, excess * 4));
    reason = "heat_intensity_and_duration";
  } else if (event.type === "COLD") {
    const excess = city.thermal.morningCoolBelowC - numberValue(event, "maxTemperatureC");
    score += Math.min(25, Math.max(0, excess * 5));
    reason = "cold_intensity_and_duration";
  } else if (event.type === "RAIN") {
    const total = numberValue(event, "totalMm") / 5;
    const hours = numberValue(event, "wetHours") / 6;
    const block = numberValue(event, "wetBlockMaxHours") / 4;
    score += Math.min(25, Math.max(total, hours, block) * 10);
    reason = "rain_amount_duration_and_continuity";
  } else if (event.type === "WIND") {
    const gust = (numberValue(event, "maxGustKmh") - city.wind.gustStrongKmh) / 2;
    const hours = numberValue(event, "strongHours") / 2 * 8;
    score += Math.min(25, Math.max(0, gust, hours));
    reason = "gust_intensity_and_duration";
  } else if (event.type === "IMPROVEMENT" || event.type === "DEGRADATION") {
    score += Math.min(25, Math.max(0, (Math.abs(numberValue(event, "cloudTrend")) - 25) / 2));
    reason = event.type === "IMPROVEMENT" ? "net_improvement_strength" : "net_degradation_strength";
  } else if (event.type === "BEST_WINDOW") {
    const hours = numberValue(event, "hours");
    const brightness = Math.max(0, (45 - numberValue(event, "meanCloudPct")) / 3);
    score += Math.min(25, Math.max(0, (hours - 3) * 2) + brightness);
    reason = "window_duration_and_sky_quality";
  } else if (event.type === "THUNDER") {
    const support = Math.max(0, (numberValue(event, "peakThunderSupport") - 0.55) * 35);
    const hours = Math.min(12, Math.max(0, numberValue(event, "thunderHours") - 2) * 3);
    score = 65 + durationBonus + support + hours;
    reason = "thunder_duration_and_model_support";
  }

  return { score: roundScore(score), reason };
}

function confidence(score: number): WeeklySelectionConfidence {
  return score >= 78 ? "HIGH" : score >= 63 ? "MEDIUM" : "LOW";
}

function bestWindow(events: WeeklyStoryEpisode[], city: CityConfig): SelectedWeeklyEvent | null {
  const candidates = events
    .filter((item) => item.type === "BEST_WINDOW")
    .map((item) => {
      const scored = scoreEvent(item, city);
      return { ...item, score: scored.score, confidence: confidence(scored.score), selectionReason: scored.reason };
    })
    .filter((item) => item.score >= WEEKLY_SELECTION_RULES.bestWindowMinimumScore)
    .sort((a, b) => b.score - a.score || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  return candidates[0] ?? null;
}

export function selectWeeklyEvents(
  profiles: WeeklyProfileSet,
  rawEvents: WeeklyEvent[],
  city: CityConfig
): WeeklySelection {
  if (profiles.citySlug !== city.slug) throw new Error(`weekly_selection_city_mismatch:${profiles.citySlug}:${city.slug}`);
  const merged = consolidateWeeklyEvents(rawEvents);
  const selected: SelectedWeeklyEvent[] = merged
    .filter((item) => item.type !== "BEST_WINDOW")
    .map((item): SelectedWeeklyEvent => {
      const scored = scoreEvent(item, city);
      return { ...item, score: scored.score, confidence: confidence(scored.score), selectionReason: scored.reason };
    })
    .filter((item) => item.score >= WEEKLY_SELECTION_RULES.minimumScore);
  const window = bestWindow(merged, city);
  if (window) selected.push(window);
  selected.sort((a, b) => b.score - a.score || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));

  return {
    version: "0.1.0",
    citySlug: profiles.citySlug,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    status: selected.length ? "EVENTS" : "CALM",
    rawCandidateCount: rawEvents.length,
    episodeCount: merged.length,
    events: selected,
    calm: selected.length ? null : { reason: WEEKLY_SELECTION_RULES.calmReason }
  };
}

export function selectWeeklyEventsFromProfiles(profiles: WeeklyProfileSet, city: CityConfig): WeeklySelection {
  return selectWeeklyEvents(profiles, detectWeeklyEvents(profiles, city), city);
}
