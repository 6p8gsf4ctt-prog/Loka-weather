import {
  buildConsecutiveSeriesReference,
  buildDatedTemperatureReference,
  buildRollingRainfallReference,
  buildSeasonalThresholdReference,
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_DAILY_REFERENCE_END_YEAR,
  WEEKLY_DAILY_REFERENCE_START_YEAR
} from "./climateReferences";
import type { ClimateDailyMetric, ClimateDailyObservation, SeasonalThresholdReference } from "./climateReferences";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";
import {
  detectClimateDeparture,
  detectHistoricalExtreme,
  detectProjectedSeries,
  detectSeasonalFirst,
  detectWeeklyRainfallDeparture
} from "./signalDetectors";
import type { ForecastDailyFact, WeeklySignalCandidate } from "./signalDetectors";
import type { WeeklyEditorialSignalConfidence } from "./editorialSignals";

export const WEEKLY_EDITORIAL_ACTIVATION_VERSION = "1.0.0" as const;

interface SeasonalPolicy {
  metric: "tminC" | "tmaxC" | "rainMm";
  operator: SeasonalThresholdReference["operator"];
  threshold: number;
  seasonStartMonthDay: string;
}

interface SeriesPolicy {
  metric: "tminC" | "tmaxC" | "rainMm";
  operator: SeasonalThresholdReference["operator"];
  threshold: number;
}

export interface WeeklyEditorialActivationResult {
  version: typeof WEEKLY_EDITORIAL_ACTIVATION_VERSION;
  candidates: WeeklySignalCandidate[];
  evaluatedFamilies: string[];
  candidateCounts: Record<string, number>;
}

const SEASONAL_POLICIES: SeasonalPolicy[] = [
  { metric: "tmaxC", operator: "GTE", threshold: 30, seasonStartMonthDay: "01-01" },
  { metric: "tminC", operator: "GTE", threshold: 20, seasonStartMonthDay: "01-01" },
  { metric: "tminC", operator: "LTE", threshold: 0, seasonStartMonthDay: "07-01" },
  { metric: "rainMm", operator: "GTE", threshold: 20, seasonStartMonthDay: "01-01" }
];

const SERIES_POLICIES: SeriesPolicy[] = [
  { metric: "rainMm", operator: "LT", threshold: 1 },
  { metric: "tmaxC", operator: "GTE", threshold: 25 },
  { metric: "tmaxC", operator: "GTE", threshold: 30 },
  { metric: "tminC", operator: "LTE", threshold: 5 }
];

function dateAt(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function confidence(day: WeeklyDayProfile): WeeklyEditorialSignalConfidence {
  if (day.fullDay.modelCountMin >= 4 && day.fullDay.temperatureSpreadMeanC <= 2) return "HIGH";
  if (day.fullDay.modelCountMin >= 3 && day.fullDay.temperatureSpreadMeanC <= 4) return "MEDIUM";
  return "LOW";
}

function combinedConfidence(days: WeeklyDayProfile[]): WeeklyEditorialSignalConfidence {
  const values = days.map(confidence);
  if (values.includes("LOW")) return "LOW";
  return values.includes("MEDIUM") ? "MEDIUM" : "HIGH";
}

function profileValue(day: WeeklyDayProfile, metric: SeasonalPolicy["metric"]): number {
  if (metric === "tminC") return day.fullDay.minTemperatureC;
  if (metric === "tmaxC") return day.fullDay.maxTemperatureC;
  return day.fullDay.precipitation.totalMm;
}

function fact(day: WeeklyDayProfile, metric: SeasonalPolicy["metric"]): ForecastDailyFact {
  return { date: day.date, dayIndex: day.dayIndex, metric, value: profileValue(day, metric), confidence: confidence(day) };
}

function archiveValue(row: ClimateDailyObservation, metric: SeriesPolicy["metric"]): number | null {
  const value = row[metric];
  const quality = row.quality[metric];
  return value !== null && (quality === undefined || quality === null || quality === 1) ? value : null;
}

function matches(value: number, operator: SeasonalThresholdReference["operator"], threshold: number): boolean {
  if (operator === "LT") return value < threshold;
  if (operator === "LTE") return value <= threshold;
  if (operator === "GT") return value > threshold;
  return value >= threshold;
}

function seasonStart(date: string, monthDay: string): string {
  const year = Number(date.slice(0, 4));
  const sameYear = `${year}-${monthDay}`;
  return sameYear <= date ? sameYear : `${year - 1}-${monthDay}`;
}

function validateArchive(rows: ClimateDailyObservation[]): void {
  if (!rows.length) throw new Error("weekly_editorial_activation_empty_archive");
  const dates = new Set<string>();
  for (const row of rows) {
    if (row.stationId !== WEEKLY_CLIMATE_STATION_ID || row.provenance.stationId !== WEEKLY_CLIMATE_STATION_ID) {
      throw new Error("weekly_editorial_activation_station_mismatch");
    }
    if (dates.has(row.date)) throw new Error(`weekly_editorial_activation_duplicate_date:${row.date}`);
    dates.add(row.date);
  }
}

function temperatureCandidates(profiles: WeeklyProfileSet, archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const candidates: WeeklySignalCandidate[] = [];
  const facts = profiles.days.flatMap((day) => [fact(day, "tminC"), fact(day, "tmaxC")]);
  for (const forecast of facts) {
    const reference = buildDatedTemperatureReference(archive, { metric: forecast.metric as "tminC" | "tmaxC", targetDate: forecast.date });
    candidates.push(...detectClimateDeparture(forecast, reference));
    const direction = forecast.value >= reference.distribution.p95 ? "HIGH"
      : forecast.value <= reference.distribution.p05 ? "LOW" : null;
    if (direction) {
      const historical = detectHistoricalExtreme(forecast, archive, direction);
      if (historical) candidates.push(historical);
    }
  }
  return candidates;
}

function rainfallCandidate(profiles: WeeklyProfileSet, archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const totalMm = profiles.days.reduce((sum, day) => sum + day.fullDay.precipitation.totalMm, 0);
  const representative = [...profiles.days].sort((a, b) => b.fullDay.precipitation.totalMm - a.fullDay.precipitation.totalMm || a.dayIndex - b.dayIndex)[0];
  const reference = buildRollingRainfallReference(archive, { targetStartDate: profiles.startDate, durationDays: 7 });
  const candidate = detectWeeklyRainfallDeparture({
    totalMm,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    representativeDayIndex: representative.dayIndex,
    confidence: combinedConfidence(profiles.days),
    reference
  });
  return candidate ? [candidate] : [];
}

function seasonalCandidates(profiles: WeeklyProfileSet, archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const candidates: WeeklySignalCandidate[] = [];
  for (const policy of SEASONAL_POLICIES) {
    const first = profiles.days.find((day) => matches(profileValue(day, policy.metric), policy.operator, policy.threshold));
    if (!first) continue;
    const forecast = fact(first, policy.metric);
    const start = seasonStart(forecast.date, policy.seasonStartMonthDay);
    const occurrencesBeforeForecast = archive.filter((row) => {
      const value = archiveValue(row, policy.metric);
      return row.date >= start && row.date < forecast.date && value !== null && matches(value, policy.operator, policy.threshold);
    }).length;
    const reference = buildSeasonalThresholdReference(archive, {
      metric: policy.metric,
      operator: policy.operator,
      threshold: policy.threshold,
      seasonStartMonthDay: policy.seasonStartMonthDay,
      targetMonthDay: forecast.date.slice(5)
    });
    const candidate = detectSeasonalFirst({ forecast, operator: policy.operator, threshold: policy.threshold, occurrencesBeforeForecast, reference });
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

function observedPrefixLength(
  archiveByDate: Map<string, ClimateDailyObservation>,
  startDate: string,
  policy: SeriesPolicy
): number {
  let length = 0;
  let cursor = dateAt(startDate, -1);
  while (true) {
    const row = archiveByDate.get(cursor);
    const value = row ? archiveValue(row, policy.metric) : null;
    if (value === null || !matches(value, policy.operator, policy.threshold)) return length;
    length++;
    cursor = dateAt(cursor, -1);
  }
}

function forecastRuns(profiles: WeeklyProfileSet, policy: SeriesPolicy): WeeklyDayProfile[][] {
  const runs: WeeklyDayProfile[][] = [];
  let current: WeeklyDayProfile[] = [];
  for (const day of profiles.days) {
    if (matches(profileValue(day, policy.metric), policy.operator, policy.threshold)) current.push(day);
    else if (current.length) { runs.push(current); current = []; }
  }
  if (current.length) runs.push(current);
  return runs;
}

function seriesCandidates(profiles: WeeklyProfileSet, archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const candidates: WeeklySignalCandidate[] = [];
  const archiveByDate = new Map(archive.map((row) => [row.date, row]));
  for (const policy of SERIES_POLICIES) {
    const reference = buildConsecutiveSeriesReference(archive, {
      metric: policy.metric,
      operator: policy.operator,
      threshold: policy.threshold,
      startDate: `${WEEKLY_DAILY_REFERENCE_START_YEAR}-01-01`,
      endDate: `${WEEKLY_DAILY_REFERENCE_END_YEAR}-12-31`
    });
    for (const run of forecastRuns(profiles, policy)) {
      const prefix = run[0].dayIndex === 0 ? observedPrefixLength(archiveByDate, profiles.startDate, policy) : 0;
      const projectedLength = prefix + run.length;
      const candidate = detectProjectedSeries({
        metric: policy.metric,
        operator: policy.operator,
        threshold: policy.threshold,
        startDate: dateAt(run[0].date, -prefix),
        endDate: run.at(-1)!.date,
        representativeDayIndex: run.at(-1)!.dayIndex,
        projectedLength,
        confidence: combinedConfidence(run),
        reference
      });
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

/** Activates every archive-backed N2 detector through one validated path. */
export function activateWeeklyEditorialSignals(
  profiles: WeeklyProfileSet,
  archive: ClimateDailyObservation[]
): WeeklyEditorialActivationResult {
  validateArchive(archive);
  const rawCandidates = [
    ...temperatureCandidates(profiles, archive),
    ...rainfallCandidate(profiles, archive),
    ...seasonalCandidates(profiles, archive),
    ...seriesCandidates(profiles, archive)
  ];
  const resourceCount = new Set(archive.map((row) => row.provenance.resourceId)).size;
  const candidates = rawCandidates.map((candidate) => ({
    ...candidate,
    facts: {
      ...candidate.facts,
      stationId: WEEKLY_CLIMATE_STATION_ID,
      referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION,
      resourceCount
    }
  }));
  const candidateCounts = candidates.reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.detector] = (counts[candidate.detector] ?? 0) + 1;
    return counts;
  }, {});
  return {
    version: WEEKLY_EDITORIAL_ACTIVATION_VERSION,
    candidates,
    evaluatedFamilies: ["TEMPERATURE_CONTEXT", "WEEKLY_RAIN", "SEASONAL_THRESHOLDS", "PROJECTED_SERIES"],
    candidateCounts
  };
}
