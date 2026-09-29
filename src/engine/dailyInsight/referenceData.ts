import {
  distribution,
  type ClimateDailyObservation,
  type ClimateDistribution
} from "../weekly/climateReferences";

export const DAILY_INSIGHT_REFERENCE_VERSION = "1.0.0" as const;
export const DAILY_INSIGHT_RECENT_DAYS = 400;
export const DAILY_INSIGHT_CALENDAR_RADIUS_DAYS = 7;
export const DAILY_INSIGHT_CLIMATE_START_YEAR = 1991;
export const DAILY_INSIGHT_CLIMATE_END_YEAR = 2020;

export type DailyInsightMetric = "tminC" | "tmaxC" | "rainMm" | "gustKmh";
export type DailyInsightDirection = "HIGH" | "LOW";

export type DailyInsightRecentTuple = [
  date: string,
  tminC: number | null,
  tmaxC: number | null,
  rainMm: number | null,
  gustKmh: number | null
];

export interface DailyInsightComparableEntry {
  threshold: number;
  date: string;
  value: number;
}

export interface DailyInsightComparableIndex {
  high: DailyInsightComparableEntry[];
  low: DailyInsightComparableEntry[];
}

export interface DailyInsightExtreme {
  value: number;
  date: string;
}

export interface DailyInsightMetricExtremes {
  min: DailyInsightExtreme | null;
  max: DailyInsightExtreme | null;
}

export interface DailyInsightCalendarReference {
  monthDay: string;
  radiusDays: number;
  metrics: Partial<Record<DailyInsightMetric, ClimateDistribution>>;
}

export interface DailyInsightSeriesReference {
  id: string;
  metric: DailyInsightMetric;
  operator: "LT" | "LTE" | "GT" | "GTE";
  threshold: number;
  longestRun: number;
  longestStartDate: string | null;
  longestEndDate: string | null;
}

export interface DailyInsightSeasonOccurrence {
  year: number;
  count: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface DailyInsightSeasonalReference {
  id: string;
  metric: DailyInsightMetric;
  operator: DailyInsightSeriesReference["operator"];
  threshold: number;
  seasonStartMonthDay: string;
  seasons: DailyInsightSeasonOccurrence[];
}

export interface DailyInsightReferenceSnapshot {
  version: typeof DAILY_INSIGHT_REFERENCE_VERSION;
  stationId: string;
  stationName: string;
  sourceSnapshotId: string;
  generatedAt: string;
  firstDate: string;
  lastDate: string;
  rowCount: number;
  validCounts: Record<DailyInsightMetric, number>;
  climateStartYear: number;
  climateEndYear: number;
  calendarRadiusDays: number;
  calendar: Record<string, DailyInsightCalendarReference>;
  comparable: Record<DailyInsightMetric, DailyInsightComparableIndex>;
  extremes: Record<DailyInsightMetric, DailyInsightMetricExtremes>;
  series: DailyInsightSeriesReference[];
  seasonal: DailyInsightSeasonalReference[];
  recent: DailyInsightRecentTuple[];
}

export interface DailyInsightReferenceBuildInput {
  stationId: string;
  stationName: string;
  sourceSnapshotId: string;
  generatedAt: string;
  observations: ClimateDailyObservation[];
}

const METRICS: DailyInsightMetric[] = ["tminC", "tmaxC", "rainMm", "gustKmh"];

const SERIES_POLICIES: Array<Pick<DailyInsightSeriesReference, "id" | "metric" | "operator" | "threshold">> = [
  { id: "tmax-gte-25", metric: "tmaxC", operator: "GTE", threshold: 25 },
  { id: "tmax-gte-30", metric: "tmaxC", operator: "GTE", threshold: 30 },
  { id: "tmax-gte-35", metric: "tmaxC", operator: "GTE", threshold: 35 },
  { id: "tmin-lte-5", metric: "tminC", operator: "LTE", threshold: 5 },
  { id: "tmin-lte-0", metric: "tminC", operator: "LTE", threshold: 0 },
  { id: "tmin-gte-20", metric: "tminC", operator: "GTE", threshold: 20 },
  { id: "rain-gte-1", metric: "rainMm", operator: "GTE", threshold: 1 }
];

const SEASONAL_POLICIES: Array<Pick<DailyInsightSeasonalReference, "id" | "metric" | "operator" | "threshold" | "seasonStartMonthDay">> = [
  { id: "first-tmax-25", metric: "tmaxC", operator: "GTE", threshold: 25, seasonStartMonthDay: "01-01" },
  { id: "first-tmax-30", metric: "tmaxC", operator: "GTE", threshold: 30, seasonStartMonthDay: "01-01" },
  { id: "first-tmax-35", metric: "tmaxC", operator: "GTE", threshold: 35, seasonStartMonthDay: "01-01" },
  { id: "first-tmin-20", metric: "tminC", operator: "GTE", threshold: 20, seasonStartMonthDay: "01-01" },
  { id: "first-tmin-5-cold-season", metric: "tminC", operator: "LTE", threshold: 5, seasonStartMonthDay: "07-01" },
  { id: "first-frost-cold-season", metric: "tminC", operator: "LTE", threshold: 0, seasonStartMonthDay: "07-01" },
  { id: "first-gust-70-cold-season", metric: "gustKmh", operator: "GTE", threshold: 70, seasonStartMonthDay: "07-01" }
];

function qualityValid(value: number | null | undefined): boolean {
  return value === null || value === undefined || value === 1;
}

function metricValue(row: ClimateDailyObservation, metric: DailyInsightMetric): number | null {
  if (metric === "gustKmh") {
    return row.gust3sMs !== null && qualityValid(row.quality.gust3sMs) ? row.gust3sMs * 3.6 : null;
  }
  const value = row[metric];
  return value !== null && qualityValid(row.quality[metric]) ? value : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function monthDay(value: string): string { return value.slice(5); }

function allMonthDays(): string[] {
  const result: string[] = [];
  const cursor = new Date("2000-01-01T00:00:00Z");
  while (cursor.getUTCFullYear() === 2000) {
    result.push(cursor.toISOString().slice(5, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function thresholdLevels(metric: DailyInsightMetric): { high: number[]; low: number[] } {
  const range = (start: number, end: number, step: number): number[] => {
    const values: number[] = [];
    for (let value = start; value <= end + 1e-9; value += step) values.push(Number(value.toFixed(4)));
    return values;
  };
  if (metric === "tminC" || metric === "tmaxC") return { high: range(-20, 50, 1), low: range(-20, 50, 1) };
  if (metric === "rainMm") return { high: range(1, 200, 1), low: [] };
  return { high: range(20, 200, 5), low: [] };
}

function compare(value: number, operator: DailyInsightSeriesReference["operator"], threshold: number): boolean {
  if (operator === "LT") return value < threshold;
  if (operator === "LTE") return value <= threshold;
  if (operator === "GT") return value > threshold;
  return value >= threshold;
}

function buildComparableIndex(
  ordered: ClimateDailyObservation[],
  metric: DailyInsightMetric
): DailyInsightComparableIndex {
  const levels = thresholdLevels(metric);
  const highBuckets = new Map<number, DailyInsightExtreme>();
  const lowBuckets = new Map<number, DailyInsightExtreme>();
  const step = metric === "gustKmh" ? 5 : 1;
  for (const row of ordered) {
    const value = metricValue(row, metric);
    if (value === null) continue;
    // Integer (or 5 km/h) display thresholds remain exact: floor(value)
    // identifies every HIGH threshold reached, while ceil(value) identifies
    // every LOW threshold reached. The newest row overwrites the bucket.
    highBuckets.set(Math.floor(value / step) * step, { date: row.date, value });
    lowBuckets.set(Math.ceil(value / step) * step, { date: row.date, value });
  }
  const latest = (
    direction: DailyInsightDirection,
    thresholds: number[],
    buckets: Map<number, DailyInsightExtreme>
  ): DailyInsightComparableEntry[] => thresholds.flatMap((threshold) => {
    let match: DailyInsightExtreme | null = null;
    for (const [bucket, candidate] of buckets) {
      if ((direction === "HIGH" && bucket < threshold) || (direction === "LOW" && bucket > threshold)) continue;
      if (!match || candidate.date > match.date) match = candidate;
    }
    return match ? [{ threshold, ...match }] : [];
  });
  return {
    high: latest("HIGH", levels.high, highBuckets),
    low: latest("LOW", levels.low, lowBuckets)
  };
}

function buildExtremes(ordered: ClimateDailyObservation[], metric: DailyInsightMetric): DailyInsightMetricExtremes {
  let min: DailyInsightExtreme | null = null;
  let max: DailyInsightExtreme | null = null;
  for (const row of ordered) {
    const value = metricValue(row, metric);
    if (value === null) continue;
    if (!min || value < min.value) min = { value, date: row.date };
    if (!max || value > max.value) max = { value, date: row.date };
  }
  return { min, max };
}

function buildSeries(ordered: ClimateDailyObservation[]): DailyInsightSeriesReference[] {
  return SERIES_POLICIES.map((policy) => {
    let currentStart: string | null = null;
    let currentEnd: string | null = null;
    let currentLength = 0;
    let previousDate: string | null = null;
    let best: Pick<DailyInsightSeriesReference, "longestRun" | "longestStartDate" | "longestEndDate"> = {
      longestRun: 0,
      longestStartDate: null,
      longestEndDate: null
    };
    for (const row of ordered) {
      const value = metricValue(row, policy.metric);
      const consecutive = previousDate === null
        || Date.parse(`${row.date}T00:00:00Z`) - Date.parse(`${previousDate}T00:00:00Z`) === 86_400_000;
      if (value !== null && compare(value, policy.operator, policy.threshold)) {
        if (!consecutive || currentLength === 0) {
          currentStart = row.date;
          currentLength = 0;
        }
        currentLength++;
        currentEnd = row.date;
        if (currentLength > best.longestRun) {
          best = { longestRun: currentLength, longestStartDate: currentStart, longestEndDate: currentEnd };
        }
      } else {
        currentLength = 0;
        currentStart = null;
        currentEnd = null;
      }
      previousDate = row.date;
    }
    return { ...policy, ...best };
  });
}

function seasonYear(date: string, startMonthDay: string): number {
  const year = Number(date.slice(0, 4));
  return monthDay(date) >= startMonthDay ? year : year - 1;
}

function seasonBounds(year: number, startMonthDay: string): { start: string; end: string } {
  const start = `${year}-${startMonthDay}`;
  const next = new Date(`${year + 1}-${startMonthDay}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() - 1);
  return { start, end: next.toISOString().slice(0, 10) };
}

function buildSeasonal(ordered: ClimateDailyObservation[]): DailyInsightSeasonalReference[] {
  const archiveStart = ordered[0].date;
  const archiveEnd = ordered.at(-1)!.date;
  return SEASONAL_POLICIES.map((policy) => {
    const buckets = new Map<number, DailyInsightSeasonOccurrence>();
    for (const row of ordered) {
      const year = seasonYear(row.date, policy.seasonStartMonthDay);
      const bucket = buckets.get(year) ?? { year, count: 0, firstDate: null, lastDate: null };
      const value = metricValue(row, policy.metric);
      if (value !== null && compare(value, policy.operator, policy.threshold)) {
        bucket.count++;
        bucket.firstDate ??= row.date;
        bucket.lastDate = row.date;
      }
      buckets.set(year, bucket);
    }
    const seasons = [...buckets.values()]
      .filter((item) => {
        const bounds = seasonBounds(item.year, policy.seasonStartMonthDay);
        return archiveStart <= bounds.start && archiveEnd >= bounds.end;
      })
      .sort((a, b) => a.year - b.year);
    return { ...policy, seasons };
  });
}

function assertBuildInput(input: DailyInsightReferenceBuildInput): ClimateDailyObservation[] {
  if (!input.stationId || !input.stationName || !input.sourceSnapshotId) throw new Error("daily_insight_reference_identity_invalid");
  if (Number.isNaN(Date.parse(input.generatedAt))) throw new Error("daily_insight_reference_generated_at_invalid");
  if (!input.observations.length) throw new Error("daily_insight_reference_empty");
  const ordered = [...input.observations].sort((a, b) => a.date.localeCompare(b.date));
  for (const row of ordered) {
    if (row.stationId !== input.stationId) throw new Error("daily_insight_reference_mixed_station");
    if (!validDate(row.date)) throw new Error("daily_insight_reference_date_invalid");
  }
  return ordered;
}

/** Heavy, background-only computation. Never call this from an interactive route. */
export function buildDailyInsightReference(input: DailyInsightReferenceBuildInput): DailyInsightReferenceSnapshot {
  const ordered = assertBuildInput(input);
  const monthDays = allMonthDays();
  const monthDayIndexes = new Map(monthDays.map((value, index) => [value, index]));
  const buckets: Array<Partial<Record<DailyInsightMetric, number[]>>> = Array.from({ length: monthDays.length }, () => ({}));
  const validCounts = { tminC: 0, tmaxC: 0, rainMm: 0, gustKmh: 0 };
  for (const row of ordered) {
    const year = Number(row.date.slice(0, 4));
    if (year < DAILY_INSIGHT_CLIMATE_START_YEAR || year > DAILY_INSIGHT_CLIMATE_END_YEAR) continue;
    const index = monthDayIndexes.get(monthDay(row.date));
    if (index === undefined) throw new Error("daily_insight_reference_month_day_invalid");
    const bucket = buckets[index];
    for (const metric of METRICS) {
      const value = metricValue(row, metric);
      if (value === null) continue;
      (bucket[metric] ??= []).push(value);
      validCounts[metric]++;
    }
  }

  const calendar: Record<string, DailyInsightCalendarReference> = {};
  for (let targetIndex = 0; targetIndex < monthDays.length; targetIndex++) {
    const target = monthDays[targetIndex];
    const metrics: DailyInsightCalendarReference["metrics"] = {};
    for (const metric of METRICS) {
      const values: number[] = [];
      for (let offset = -DAILY_INSIGHT_CALENDAR_RADIUS_DAYS; offset <= DAILY_INSIGHT_CALENDAR_RADIUS_DAYS; offset++) {
        const candidateIndex = (targetIndex + offset + monthDays.length) % monthDays.length;
        values.push(...(buckets[candidateIndex][metric] ?? []));
      }
      if (values.length) metrics[metric] = distribution(values);
    }
    calendar[target] = { monthDay: target, radiusDays: DAILY_INSIGHT_CALENDAR_RADIUS_DAYS, metrics };
  }

  const comparable = Object.fromEntries(METRICS.map((metric) => [metric, buildComparableIndex(ordered, metric)])) as Record<DailyInsightMetric, DailyInsightComparableIndex>;
  const extremes = Object.fromEntries(METRICS.map((metric) => [metric, buildExtremes(ordered, metric)])) as Record<DailyInsightMetric, DailyInsightMetricExtremes>;
  const recent = ordered.slice(-DAILY_INSIGHT_RECENT_DAYS).map<DailyInsightRecentTuple>((row) => [
    row.date,
    metricValue(row, "tminC"),
    metricValue(row, "tmaxC"),
    metricValue(row, "rainMm"),
    metricValue(row, "gustKmh")
  ]);

  return {
    version: DAILY_INSIGHT_REFERENCE_VERSION,
    stationId: input.stationId,
    stationName: input.stationName,
    sourceSnapshotId: input.sourceSnapshotId,
    generatedAt: input.generatedAt,
    firstDate: ordered[0].date,
    lastDate: ordered.at(-1)!.date,
    rowCount: ordered.length,
    validCounts,
    climateStartYear: DAILY_INSIGHT_CLIMATE_START_YEAR,
    climateEndYear: DAILY_INSIGHT_CLIMATE_END_YEAR,
    calendarRadiusDays: DAILY_INSIGHT_CALENDAR_RADIUS_DAYS,
    calendar,
    comparable,
    extremes,
    series: buildSeries(ordered),
    seasonal: buildSeasonal(ordered),
    recent
  };
}

export function validateDailyInsightReference(value: unknown): DailyInsightReferenceSnapshot {
  if (!value || typeof value !== "object") throw new Error("daily_insight_reference_invalid");
  const snapshot = value as Partial<DailyInsightReferenceSnapshot>;
  if (snapshot.version !== DAILY_INSIGHT_REFERENCE_VERSION) throw new Error("daily_insight_reference_version_invalid");
  if (!snapshot.stationId || !snapshot.stationName || !snapshot.sourceSnapshotId) throw new Error("daily_insight_reference_identity_invalid");
  if (!snapshot.generatedAt || Number.isNaN(Date.parse(snapshot.generatedAt))) throw new Error("daily_insight_reference_generated_at_invalid");
  if (!snapshot.firstDate || !snapshot.lastDate || !validDate(snapshot.firstDate) || !validDate(snapshot.lastDate)) throw new Error("daily_insight_reference_period_invalid");
  if (!Number.isInteger(snapshot.rowCount) || (snapshot.rowCount ?? 0) < 1) throw new Error("daily_insight_reference_row_count_invalid");
  if (snapshot.climateStartYear !== DAILY_INSIGHT_CLIMATE_START_YEAR || snapshot.climateEndYear !== DAILY_INSIGHT_CLIMATE_END_YEAR) throw new Error("daily_insight_reference_climate_period_invalid");
  if (!snapshot.calendar || Object.keys(snapshot.calendar).length !== 366) throw new Error("daily_insight_reference_calendar_invalid");
  if (!snapshot.comparable || !snapshot.extremes || !Array.isArray(snapshot.series) || !Array.isArray(snapshot.seasonal) || !Array.isArray(snapshot.recent)) throw new Error("daily_insight_reference_sections_invalid");
  if (snapshot.recent.length > DAILY_INSIGHT_RECENT_DAYS) throw new Error("daily_insight_reference_recent_invalid");
  return snapshot as DailyInsightReferenceSnapshot;
}

export function calendarReferenceForDate(
  snapshot: DailyInsightReferenceSnapshot,
  date: string,
  metric: DailyInsightMetric
): ClimateDistribution | null {
  if (!validDate(date)) return null;
  return snapshot.calendar[monthDay(date)]?.metrics[metric] ?? null;
}

export function lastComparable(
  snapshot: DailyInsightReferenceSnapshot,
  metric: DailyInsightMetric,
  direction: DailyInsightDirection,
  displayedTargetValue: number
): DailyInsightComparableEntry | null {
  const threshold = direction === "HIGH"
    ? (metric === "gustKmh" ? Math.ceil(displayedTargetValue / 5) * 5 : Math.ceil(displayedTargetValue))
    : Math.floor(displayedTargetValue);
  const entries = direction === "HIGH" ? snapshot.comparable[metric].high : snapshot.comparable[metric].low;
  return entries.find((entry) => entry.threshold === threshold) ?? null;
}

export function recentDrySpellDays(snapshot: DailyInsightReferenceSnapshot, rainThresholdMm = 1): number {
  let days = 0;
  for (let index = snapshot.recent.length - 1; index >= 0; index--) {
    const rain = snapshot.recent[index][3];
    if (rain === null || rain >= rainThresholdMm) break;
    days++;
  }
  return days;
}
