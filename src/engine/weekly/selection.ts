import { WEEKLY_SELECTION_RULES } from "../../config/weeklySelection";
import type { CityConfig } from "../../types";
import { detectWeeklyEvents, type WeeklyEvent } from "./events";
import { consolidateWeeklyEvents, type WeeklyStoryEpisode, type WeeklyStoryFamily, type WeeklyStoryDirection } from "./consolidation";
import type { WeeklyProfileSet } from "./profiles";

export type WeeklySelectionStatus = "EVENTS" | "CALM";
export type WeeklySelectionConfidence = "HIGH" | "MEDIUM" | "LOW";
export type WeeklySelectionRejectionReason = "LOW_SCORE" | "REDUNDANT" | "UNCERTAIN" | "LESS_RELEVANT" | "CAP_REACHED" | "CONFLICTING_STORY";

export interface WeeklySelectionRejection {
  id: string;
  source: "EPISODE";
  reason: WeeklySelectionRejectionReason;
  score: number | null;
  relatedSelectedEventId: string | null;
}

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
  normalMaximum?: number;
  absoluteMaximum?: number;
  exceptionalFourthEventId?: string | null;
  rejected?: WeeklySelectionRejection[];
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

function selectedEvent(episode: WeeklyStoryEpisode, city: CityConfig): SelectedWeeklyEvent {
  const scored = scoreEvent(episode, city);
  return {
    ...episode,
    score: scored.score,
    confidence: confidence(scored.score),
    selectionReason: scored.reason
  };
}

function sortByImportance(a: SelectedWeeklyEvent, b: SelectedWeeklyEvent): number {
  return b.score - a.score || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id);
}

function sameStoryFamily(a: SelectedWeeklyEvent, b: SelectedWeeklyEvent): boolean {
  return (a.storyFamily ?? a.type) === (b.storyFamily ?? b.type);
}

function overlapsDays(a: SelectedWeeklyEvent, b: SelectedWeeklyEvent): boolean {
  return a.dayIndexes.some((dayIndex) => b.dayIndexes.includes(dayIndex));
}

function isIndependentFourth(candidate: SelectedWeeklyEvent, selected: SelectedWeeklyEvent[]): boolean {
  return candidate.score >= WEEKLY_SELECTION_RULES.exceptionalFourthMinimumScore
    && candidate.confidence === WEEKLY_SELECTION_RULES.exceptionalFourthConfidence
    && selected.every((item) => !sameStoryFamily(candidate, item) && !overlapsDays(candidate, item));
}

export function selectWeeklyEvents(
  profiles: WeeklyProfileSet,
  rawEvents: WeeklyEvent[],
  city: CityConfig
): WeeklySelection {
  if (profiles.citySlug !== city.slug) throw new Error(`weekly_selection_city_mismatch:${profiles.citySlug}:${city.slug}`);
  const merged = consolidateWeeklyEvents(rawEvents);
  const scored = merged.map((item) => selectedEvent(item, city));
  const bestWindow = [...scored]
    .filter((item) => item.type === "BEST_WINDOW" && item.score >= WEEKLY_SELECTION_RULES.bestWindowMinimumScore)
    .sort(sortByImportance)[0] ?? null;
  const eligible = scored
    .filter((item) => item.score >= WEEKLY_SELECTION_RULES.minimumScore)
    .filter((item) => item.type !== "BEST_WINDOW" || item.id === bestWindow?.id)
    .sort(sortByImportance);
  const selected = eligible.slice(0, WEEKLY_SELECTION_RULES.normalMaximum);
  let exceptionalFourthEventId: string | null = null;
  if (selected.length === WEEKLY_SELECTION_RULES.normalMaximum) {
    const fourth = eligible.find((item) => !selected.some((chosen) => chosen.id === item.id)
      && isIndependentFourth(item, selected));
    if (fourth && selected.length < WEEKLY_SELECTION_RULES.absoluteMaximum) {
      fourth.selectionReason += ";exceptional_fourth_independent_high_confidence";
      selected.push(fourth);
      exceptionalFourthEventId = fourth.id;
    }
  }

  const selectedIds = new Set(selected.map((item) => item.id));
  const rejected: WeeklySelectionRejection[] = scored
    .filter((item) => !selectedIds.has(item.id))
    .map((item): WeeklySelectionRejection => {
      const related = selected.find((chosen) => sameStoryFamily(chosen, item) || overlapsDays(chosen, item))?.id ?? null;
      const reason: WeeklySelectionRejectionReason = item.score < WEEKLY_SELECTION_RULES.minimumScore
        ? "LOW_SCORE"
        : item.type === "BEST_WINDOW" && item.id !== bestWindow?.id
          ? "LESS_RELEVANT"
          : selected.length >= WEEKLY_SELECTION_RULES.normalMaximum
            ? "CAP_REACHED"
            : "LESS_RELEVANT";
      return { id: item.id, source: "EPISODE", reason, score: item.score, relatedSelectedEventId: related };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    version: "0.1.0",
    citySlug: profiles.citySlug,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    status: selected.length ? "EVENTS" : "CALM",
    rawCandidateCount: rawEvents.length,
    episodeCount: merged.length,
    normalMaximum: WEEKLY_SELECTION_RULES.normalMaximum,
    absoluteMaximum: WEEKLY_SELECTION_RULES.absoluteMaximum,
    exceptionalFourthEventId,
    rejected,
    events: selected,
    calm: selected.length ? null : { reason: WEEKLY_SELECTION_RULES.calmReason }
  };
}

export function selectWeeklyEventsFromProfiles(profiles: WeeklyProfileSet, city: CityConfig): WeeklySelection {
  return selectWeeklyEvents(profiles, detectWeeklyEvents(profiles, city), city);
}
