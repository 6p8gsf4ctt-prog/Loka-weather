import type { WeeklyEvent, WeeklyEventEvidenceValue, WeeklyEventType } from "./events";

export type WeeklyStoryFamily = "HEAT" | "COLD" | "RAIN" | "WIND" | "TRANSITION" | "BEST_WINDOW" | "THUNDER";
export type WeeklyStoryDirection = "NONE" | "IMPROVING" | "DEGRADING" | null;

export interface WeeklyStoryEpisode extends WeeklyEvent {
  storyFamily: WeeklyStoryFamily;
  direction: WeeklyStoryDirection;
  sourceCandidateIds: string[];
  sourceCandidateTypes: WeeklyEventType[];
  representativeDayIndex: number;
}

function storyFamily(type: WeeklyEventType): WeeklyStoryFamily {
  if (type === "IMPROVEMENT" || type === "DEGRADATION") return "TRANSITION";
  return type;
}

function direction(type: WeeklyEventType): WeeklyStoryDirection {
  if (type === "IMPROVEMENT") return "IMPROVING";
  if (type === "DEGRADATION") return "DEGRADING";
  return null;
}

function firstDay(event: WeeklyEvent): number {
  return Math.min(...event.dayIndexes);
}

function lastDay(event: WeeklyEvent): number {
  return Math.max(...event.dayIndexes);
}

function metric(event: WeeklyEvent): number {
  const value = (key: string): number => {
    const candidate = event.evidence[key];
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
  };
  switch (event.type) {
    case "HEAT": return value("maxTemperatureC");
    case "COLD": return -value("maxTemperatureC");
    case "RAIN": return Math.max(value("totalMm"), value("wetHours"), value("wetBlockMaxHours"));
    case "WIND": return Math.max(value("maxGustKmh"), value("strongHours") * 10);
    case "IMPROVEMENT":
    case "DEGRADATION": return Math.abs(value("cloudTrend"));
    case "BEST_WINDOW": return value("hours");
    case "THUNDER": return value("thunderHours") * 10 + value("peakThunderSupport");
  }
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function mergeEvidence(events: WeeklyEvent[]): Record<string, WeeklyEventEvidenceValue> {
  const first = events[0];
  const last = events[events.length - 1];
  const allValues = events.map((event) => event.evidence);
  const allDays = uniqueSorted(events.flatMap((event) => event.dayIndexes));
  const numericMax = (key: string): number | null => {
    const values = allValues
      .map((evidence) => evidence[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values.length ? Math.max(...values) : null;
  };
  const numericMin = (key: string): number | null => {
    const values = allValues
      .map((evidence) => evidence[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values.length ? Math.min(...values) : null;
  };
  const numericSum = (key: string): number => allValues.reduce(
    (sum, evidence) => sum + (typeof evidence[key] === "number" && Number.isFinite(evidence[key]) ? evidence[key] as number : 0),
    0
  );
  const evidence: Record<string, WeeklyEventEvidenceValue> = {
    durationDays: allDays.length,
    sourceEventCount: events.length,
    sourceCandidateIds: events.map((event) => event.id).join(","),
    startDayIndex: firstDay(events[0]),
    endDayIndex: lastDay(events[events.length - 1])
  };

  if (first.type === "HEAT") {
    evidence.maxTemperatureC = numericMax("maxTemperatureC");
    evidence.minTemperatureC = numericMin("minTemperatureC");
    evidence.thresholdC = first.evidence.thresholdC ?? null;
  } else if (first.type === "COLD") {
    evidence.maxTemperatureC = numericMin("maxTemperatureC");
    evidence.minTemperatureC = numericMin("minTemperatureC");
    evidence.thresholdC = first.evidence.thresholdC ?? null;
  } else if (first.type === "RAIN") {
    evidence.totalMm = numericSum("totalMm");
    evidence.wetHours = numericSum("wetHours");
    evidence.wetBlockMaxHours = numericMax("wetBlockMaxHours");
    evidence.maxHourlyMm = numericMax("maxHourlyMm");
  } else if (first.type === "WIND") {
    evidence.maxGustKmh = numericMax("maxGustKmh");
    evidence.strongHours = numericSum("strongHours");
    evidence.strongBlockMaxHours = numericMax("strongBlockMaxHours");
  } else if (first.type === "THUNDER") {
    evidence.thunderHours = numericSum("thunderHours");
    evidence.peakThunderSupport = numericMax("peakThunderSupport");
    evidence.minPeakSupport = first.evidence.minPeakSupport ?? null;
  } else if (first.type === "IMPROVEMENT" || first.type === "DEGRADATION") {
    const early = typeof first.evidence.earlyCloudPct === "number" ? first.evidence.earlyCloudPct : null;
    const late = typeof last.evidence.lateCloudPct === "number" ? last.evidence.lateCloudPct : null;
    evidence.earlyCloudPct = early;
    evidence.lateCloudPct = late;
    evidence.cloudTrend = early !== null && late !== null ? late - early : null;
    evidence.trendStrength = last.evidence.trendStrength ?? first.evidence.trendStrength ?? null;
  } else if (first.type === "BEST_WINDOW") {
    evidence.startHour = typeof first.evidence.startHour === "number" ? first.evidence.startHour : null;
    evidence.endHour = typeof first.evidence.endHour === "number" ? first.evidence.endHour : null;
    evidence.hours = numericMax("hours");
    evidence.meanTemperatureC = typeof first.evidence.meanTemperatureC === "number" ? first.evidence.meanTemperatureC : null;
    evidence.maxGustKmh = numericMax("maxGustKmh");
    evidence.meanCloudPct = typeof first.evidence.meanCloudPct === "number" ? first.evidence.meanCloudPct : null;
  }
  return evidence;
}

function representativeDay(events: WeeklyEvent[]): number {
  return [...events].sort((a, b) => metric(b) - metric(a) || firstDay(a) - firstDay(b) || a.id.localeCompare(b.id))[0].dayIndexes[0];
}

function oppositeTrendExists(events: WeeklyEvent[], item: WeeklyEvent, next: WeeklyEvent): boolean {
  if (item.type !== "IMPROVEMENT" && item.type !== "DEGRADATION") return false;
  const opposite = item.type === "IMPROVEMENT" ? "DEGRADATION" : "IMPROVEMENT";
  return events.some((candidate) => candidate.type === opposite
    && firstDay(candidate) > lastDay(item)
    && firstDay(candidate) < firstDay(next));
}

function canJoin(events: WeeklyEvent[], current: WeeklyEvent[], next: WeeklyEvent): boolean {
  const previous = current[current.length - 1];
  if (!previous || next.type !== previous.type) return false;
  const gap = firstDay(next) - lastDay(previous);
  if (gap === 1) return true;
  // A one-day gap is allowed only for a directional trend. This absorbs
  // repeated improvement/degradation signals while preventing separated rain,
  // wind or heat episodes from becoming one story.
  return gap === 2
    && (next.type === "IMPROVEMENT" || next.type === "DEGRADATION")
    && !oppositeTrendExists(events, previous, next);
}

function episode(events: WeeklyEvent[]): WeeklyStoryEpisode {
  const ordered = [...events].sort((a, b) => firstDay(a) - firstDay(b) || a.id.localeCompare(b.id));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const dayIndexes = uniqueSorted(ordered.flatMap((event) => event.dayIndexes));
  const family = storyFamily(first.type);
  return {
    id: `${family.toLowerCase()}:${first.startDate}-${last.endDate}`,
    type: first.type,
    startDate: first.startDate,
    endDate: last.endDate,
    dayIndexes,
    rule: ordered.length > 1
      ? family === "TRANSITION" ? "merged_directional_trend_episode" : "merged_consecutive_days"
      : first.rule,
    evidence: ordered.length > 1 ? mergeEvidence(ordered) : first.evidence,
    storyFamily: family,
    direction: direction(first.type),
    sourceCandidateIds: ordered.map((event) => event.id),
    sourceCandidateTypes: [...new Set(ordered.map((event) => event.type))],
    representativeDayIndex: representativeDay(ordered)
  };
}

/**
 * Consolidates raw candidates into factual episodes without applying the
 * publication cap or the final narrative order. Those responsibilities belong
 * to the next selection and narrative stages.
 */
export function consolidateWeeklyEvents(rawEvents: WeeklyEvent[]): WeeklyStoryEpisode[] {
  const ordered = [...rawEvents].sort((a, b) => firstDay(a) - firstDay(b) || a.id.localeCompare(b.id));
  const grouped = new Map<WeeklyEvent["type"], WeeklyEvent[]>();
  for (const item of ordered) grouped.set(item.type, [...(grouped.get(item.type) ?? []), item]);

  const episodes: WeeklyStoryEpisode[] = [];
  for (const items of grouped.values()) {
    let current: WeeklyEvent[] = [];
    const flush = () => {
      if (current.length) episodes.push(episode(current));
      current = [];
    };
    for (const item of items) {
      if (item.type === "BEST_WINDOW") {
        flush();
        episodes.push(episode([item]));
        continue;
      }
      if (!current.length || canJoin(ordered, current, item)) current.push(item);
      else { flush(); current = [item]; }
    }
    flush();
  }

  return episodes.sort((a, b) => a.dayIndexes[0] - b.dayIndexes[0] || a.id.localeCompare(b.id));
}
