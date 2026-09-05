import { WEEKLY_SELECTION_RULES } from "../../config/weeklySelection";
import type { CityConfig } from "../../types";
import { detectWeeklyEvents, type WeeklyEvent, type WeeklyEventEvidenceValue } from "./events";
import type { WeeklyProfileSet } from "./profiles";

export type WeeklySelectionStatus = "EVENTS" | "CALM";
export type WeeklySelectionConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface SelectedWeeklyEvent extends WeeklyEvent {
  score: number;
  confidence: WeeklySelectionConfidence;
  selectionReason: string;
}

export interface WeeklySelection {
  version: "0.1.0";
  citySlug: string;
  startDate: string;
  endDate: string;
  status: WeeklySelectionStatus;
  rawCandidateCount: number;
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

function mergeEvidence(type: WeeklyEvent["type"], events: WeeklyEvent[]): Record<string, WeeklyEventEvidenceValue> {
  const first = events[0];
  const last = events[events.length - 1];
  const values = events.map((item) => item.evidence);
  const evidence: Record<string, WeeklyEventEvidenceValue> = {
    durationDays: events.length,
    sourceEventCount: events.length
  };

  if (type === "HEAT") {
    evidence.maxTemperatureC = Math.max(...values.map((item) => typeof item.maxTemperatureC === "number" ? item.maxTemperatureC : 0));
    evidence.minTemperatureC = Math.min(...values.map((item) => typeof item.minTemperatureC === "number" ? item.minTemperatureC : 0));
    evidence.thresholdC = first.evidence.thresholdC ?? null;
  } else if (type === "COLD") {
    evidence.maxTemperatureC = Math.min(...values.map((item) => typeof item.maxTemperatureC === "number" ? item.maxTemperatureC : 0));
    evidence.minTemperatureC = Math.min(...values.map((item) => typeof item.minTemperatureC === "number" ? item.minTemperatureC : 0));
    evidence.thresholdC = first.evidence.thresholdC ?? null;
  } else if (type === "RAIN") {
    evidence.totalMm = values.reduce((sum, item) => sum + (typeof item.totalMm === "number" ? item.totalMm : 0), 0);
    evidence.wetHours = values.reduce((sum, item) => sum + (typeof item.wetHours === "number" ? item.wetHours : 0), 0);
    evidence.wetBlockMaxHours = Math.max(...values.map((item) => typeof item.wetBlockMaxHours === "number" ? item.wetBlockMaxHours : 0));
    evidence.maxHourlyMm = Math.max(...values.map((item) => typeof item.maxHourlyMm === "number" ? item.maxHourlyMm : 0));
  } else if (type === "WIND") {
    evidence.maxGustKmh = Math.max(...values.map((item) => typeof item.maxGustKmh === "number" ? item.maxGustKmh : 0));
    evidence.strongHours = values.reduce((sum, item) => sum + (typeof item.strongHours === "number" ? item.strongHours : 0), 0);
    evidence.strongBlockMaxHours = Math.max(...values.map((item) => typeof item.strongBlockMaxHours === "number" ? item.strongBlockMaxHours : 0));
  } else if (type === "THUNDER") {
    evidence.thunderHours = values.reduce((sum, item) => sum + (typeof item.thunderHours === "number" ? item.thunderHours : 0), 0);
    evidence.peakThunderSupport = Math.max(...values.map((item) => typeof item.peakThunderSupport === "number" ? item.peakThunderSupport : 0));
    evidence.minPeakSupport = first.evidence.minPeakSupport ?? null;
  } else if (type === "IMPROVEMENT" || type === "DEGRADATION") {
    const early = typeof first.evidence.earlyCloudPct === "number" ? first.evidence.earlyCloudPct : 0;
    const late = typeof last.evidence.lateCloudPct === "number" ? last.evidence.lateCloudPct : 0;
    evidence.earlyCloudPct = early;
    evidence.lateCloudPct = late;
    evidence.cloudTrend = late - early;
    evidence.trendStrength = last.evidence.trendStrength ?? null;
  }
  return evidence;
}

function mergeConsecutive(events: WeeklyEvent[]): WeeklyEvent[] {
  const mergeable = events.filter((item) => item.type !== "BEST_WINDOW");
  const grouped = new Map<WeeklyEvent["type"], WeeklyEvent[]>();
  for (const item of mergeable) grouped.set(item.type, [...(grouped.get(item.type) ?? []), item]);
  const merged: WeeklyEvent[] = [];
  for (const [type, items] of grouped) {
    const ordered = [...items].sort((a, b) => a.dayIndexes[0] - b.dayIndexes[0] || a.id.localeCompare(b.id));
    let current: WeeklyEvent[] = [];
    const flush = () => {
      if (!current.length) return;
      const first = current[0];
      const last = current[current.length - 1];
      merged.push({
        id: `${type.toLowerCase()}:${first.startDate}-${last.endDate}`,
        type,
        startDate: first.startDate,
        endDate: last.endDate,
        dayIndexes: current.flatMap((item) => item.dayIndexes),
        rule: current.length > 1 ? "merged_consecutive_days" : first.rule,
        evidence: current.length > 1 ? mergeEvidence(type, current) : first.evidence
      });
      current = [];
    };
    for (const item of ordered) {
      const previous = current[current.length - 1];
      const consecutive = previous ? item.dayIndexes[0] === previous.dayIndexes[previous.dayIndexes.length - 1] + 1 : true;
      if (consecutive) current.push(item);
      else { flush(); current = [item]; }
    }
    flush();
  }
  return [...merged, ...events.filter((item) => item.type === "BEST_WINDOW")];
}

function bestWindow(events: WeeklyEvent[], city: CityConfig): SelectedWeeklyEvent | null {
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
  const merged = mergeConsecutive(rawEvents);
  const selected = merged
    .filter((item) => item.type !== "BEST_WINDOW")
    .map((item) => {
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
    events: selected,
    calm: selected.length ? null : { reason: WEEKLY_SELECTION_RULES.calmReason }
  };
}

export function selectWeeklyEventsFromProfiles(profiles: WeeklyProfileSet, city: CityConfig): WeeklySelection {
  return selectWeeklyEvents(profiles, detectWeeklyEvents(profiles, city), city);
}
