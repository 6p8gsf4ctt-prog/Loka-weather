/** Pure reference layer for Météo-France station 64024001. */

export const WEEKLY_CLIMATE_REFERENCE_VERSION = "1.0.0" as const;
export const WEEKLY_CLIMATE_STATION_ID = "64024001" as const;
export const WEEKLY_CLIMATE_STATION_NAME = "BIARRITZ-PAYS-BASQUE" as const;
export const WEEKLY_DAILY_REFERENCE_START_YEAR = 1991;
export const WEEKLY_DAILY_REFERENCE_END_YEAR = 2020;
export const WEEKLY_HOURLY_REFERENCE_START_YEAR = 2000;
export const WEEKLY_HOURLY_REFERENCE_END_YEAR = 2024;
export const WEEKLY_CLIMATE_CALENDAR_RADIUS_DAYS = 7;
export const WEEKLY_CLIMATE_MIN_COVERAGE = 0.9;
export const WEEKLY_CLIMATE_MIN_HOURLY_YEARS = 20;

export type ClimateDailyMetric = "tminC" | "tmaxC" | "rainMm" | "gust3sMs";
export type ClimateHourlyMetric = "temperatureC" | "rainMm" | "gust3sMs";

export interface ClimateProvenance {
  provider: "METEO_FRANCE";
  stationId: typeof WEEKLY_CLIMATE_STATION_ID;
  stationName: typeof WEEKLY_CLIMATE_STATION_NAME;
  resourceId: string;
  acquiredAt: string;
  referenceVersion: typeof WEEKLY_CLIMATE_REFERENCE_VERSION;
}

export interface ClimateDailyObservation {
  stationId: string;
  date: string;
  tminC: number | null;
  tmaxC: number | null;
  rainMm: number | null;
  gust3sMs: number | null;
  quality: Partial<Record<ClimateDailyMetric, number | null>>;
  provenance: ClimateProvenance;
}

export interface ClimateHourlyObservation {
  stationId: string;
  /** Source timestamp retained verbatim until its time basis is documented. */
  sourceTimestamp: string;
  localDate: string;
  localHour: number;
  temperatureC: number | null;
  rainMm: number | null;
  gust3sMs: number | null;
  quality: Partial<Record<ClimateHourlyMetric, number | null>>;
  provenance: ClimateProvenance;
}

export interface ClimateCoverageReport {
  metric: ClimateDailyMetric | ClimateHourlyMetric;
  startYear: number;
  endYear: number;
  expected: number;
  valid: number;
  coverage: number;
  acceptable: boolean;
  distinctYears: number;
}

export interface ClimateDistribution {
  count: number;
  min: number;
  max: number;
  mean: number;
  p01: number;
  p05: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface DatedClimateReference {
  kind: "DERIVED_DAILY_CLIMATOLOGY";
  metric: "tminC" | "tmaxC";
  targetDate: string;
  calendarRadiusDays: number;
  startYear: number;
  endYear: number;
  coverage: ClimateCoverageReport;
  distribution: ClimateDistribution;
  provenance: ClimateProvenance[];
}

export interface DatedDailyMetricReference {
  kind: "DERIVED_DAILY_METRIC_CLIMATOLOGY";
  metric: ClimateDailyMetric;
  targetDate: string;
  calendarRadiusDays: number;
  startYear: number;
  endYear: number;
  coverage: ClimateCoverageReport;
  distribution: ClimateDistribution;
  provenance: ClimateProvenance[];
}

export interface RainfallReference {
  kind: "DERIVED_ROLLING_RAINFALL";
  targetStartDate: string;
  durationDays: number;
  calendarRadiusDays: number;
  startYear: number;
  endYear: number;
  completeWindows: number;
  candidateWindows: number;
  coverage: number;
  distribution: ClimateDistribution;
  provenance: ClimateProvenance[];
}

export interface HourlyClimateReference {
  kind: "DERIVED_HOURLY_CLIMATOLOGY";
  metric: ClimateHourlyMetric;
  targetDate: string;
  localHour: number;
  calendarRadiusDays: number;
  startYear: number;
  endYear: number;
  distinctYears: number;
  distribution: ClimateDistribution;
  provenance: ClimateProvenance[];
}

export interface SeasonalThresholdReference {
  metric: ClimateDailyMetric;
  operator: "LT" | "LTE" | "GT" | "GTE";
  threshold: number;
  seasonStartMonthDay: string;
  targetMonthDay: string;
  yearlyCounts: Array<{ year: number; count: number; firstDate: string | null }>;
  countDistribution: ClimateDistribution;
  firstOccurrenceDates: string[];
  provenance: ClimateProvenance[];
}

export interface ConsecutiveSeriesReference {
  metric: ClimateDailyMetric;
  operator: "LT" | "LTE" | "GT" | "GTE";
  threshold: number;
  startDate: string;
  endDate: string;
  longestRun: number;
  latestRun: number;
  runCount: number;
  provenance: ClimateProvenance[];
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function compactDate(value: string): string | null {
  const digits = value.trim().replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return validIsoDate(iso) ? iso : null;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validProvenance(value: ClimateProvenance): void {
  if (value.stationId !== WEEKLY_CLIMATE_STATION_ID || value.stationName !== WEEKLY_CLIMATE_STATION_NAME) throw new Error("climate_reference_station_mismatch");
  if (!value.resourceId.trim() || Number.isNaN(Date.parse(value.acquiredAt))) throw new Error("climate_reference_provenance_invalid");
}

export function parseSemicolonArchive(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(";").map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

export function normalizeDailyArchiveRow(row: Record<string, string>, provenance: ClimateProvenance): ClimateDailyObservation | null {
  validProvenance(provenance);
  const stationId = row.NUM_POSTE?.trim();
  const date = compactDate(row.AAAAMMJJ ?? "");
  if (stationId !== WEEKLY_CLIMATE_STATION_ID || !date) return null;
  return {
    stationId,
    date,
    tminC: finite(row.TN),
    tmaxC: finite(row.TX),
    rainMm: finite(row.RR),
    gust3sMs: finite(row.FXI3S),
    quality: { tminC: finite(row.QTN), tmaxC: finite(row.QTX), rainMm: finite(row.QRR), gust3sMs: finite(row.QFXI3S) },
    provenance
  };
}

export function normalizeHourlyArchiveRow(row: Record<string, string>, args: {
  provenance: ClimateProvenance;
  /** Explicit converter; ingestion must never guess whether the source is UTC or civil time. */
  toLocalDateHour: (sourceTimestamp: string) => { date: string; hour: number };
}): ClimateHourlyObservation | null {
  validProvenance(args.provenance);
  const stationId = row.NUM_POSTE?.trim();
  const raw = (row.AAAAMMJJHH ?? "").trim().replace(/[^0-9]/g, "");
  if (stationId !== WEEKLY_CLIMATE_STATION_ID || raw.length < 10) return null;
  const local = args.toLocalDateHour(raw.slice(0, 10));
  if (!validIsoDate(local.date) || !Number.isInteger(local.hour) || local.hour < 0 || local.hour > 23) throw new Error("climate_hourly_timezone_conversion_invalid");
  return {
    stationId,
    sourceTimestamp: raw.slice(0, 10),
    localDate: local.date,
    localHour: local.hour,
    temperatureC: finite(row.T),
    rainMm: finite(row.RR1),
    gust3sMs: finite(row.FXI3S),
    quality: { temperatureC: finite(row.QT), rainMm: finite(row.QRR1), gust3sMs: finite(row.QFXI3S) },
    provenance: args.provenance
  };
}

function qualityValid(value: number | null | undefined): boolean {
  return value === undefined || value === null || value === 1;
}

function dailyValue(row: ClimateDailyObservation, metric: ClimateDailyMetric): number | null {
  const value = row[metric];
  return value !== null && qualityValid(row.quality[metric]) ? value : null;
}

function hourlyValue(row: ClimateHourlyObservation, metric: ClimateHourlyMetric): number | null {
  const value = row[metric];
  return value !== null && qualityValid(row.quality[metric]) ? value : null;
}

function dateAtYear(monthDay: string, year: number): Date | null {
  const value = `${year}-${monthDay}`;
  if (validIsoDate(value)) return new Date(`${value}T00:00:00Z`);
  if (monthDay === "02-29") return new Date(`${year}-02-28T00:00:00Z`);
  return null;
}

function iso(date: Date): string { return date.toISOString().slice(0, 10); }
function shift(date: Date, days: number): Date { return new Date(date.getTime() + days * 86_400_000); }
function yearOf(date: string): number { return Number(date.slice(0, 4)); }

function referenceProvenance(rows: Array<{ stationId: string; provenance: ClimateProvenance }>): ClimateProvenance[] {
  if (!rows.length) throw new Error("climate_reference_empty_archive");
  for (const row of rows) {
    validProvenance(row.provenance);
    if (row.stationId !== WEEKLY_CLIMATE_STATION_ID || row.provenance.stationId !== WEEKLY_CLIMATE_STATION_ID) throw new Error("climate_reference_mixed_station");
  }
  const unique = new Map<string, ClimateProvenance>();
  for (const row of rows) unique.set(`${row.provenance.resourceId}:${row.provenance.acquiredAt}`, row.provenance);
  return [...unique.values()].sort((a, b) => a.resourceId.localeCompare(b.resourceId));
}

export function percentile(values: number[], probability: number): number {
  if (!values.length || probability < 0 || probability > 1) throw new Error("climate_percentile_invalid");
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function distribution(values: number[]): ClimateDistribution {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error("climate_distribution_invalid");
  return {
    count: values.length,
    min: Math.min(...values), max: Math.max(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p01: percentile(values, .01), p05: percentile(values, .05), p10: percentile(values, .1),
    p50: percentile(values, .5), p90: percentile(values, .9), p95: percentile(values, .95), p99: percentile(values, .99)
  };
}

export function dailyCoverage(rows: ClimateDailyObservation[], metric: ClimateDailyMetric, startYear: number, endYear: number): ClimateCoverageReport {
  const expectedStart = new Date(`${startYear}-01-01T00:00:00Z`);
  const expectedEnd = new Date(`${endYear + 1}-01-01T00:00:00Z`);
  const expected = Math.round((expectedEnd.getTime() - expectedStart.getTime()) / 86_400_000);
  const selected = rows.filter((row) => yearOf(row.date) >= startYear && yearOf(row.date) <= endYear && dailyValue(row, metric) !== null);
  const validDates = new Set(selected.map((row) => row.date));
  const coverage = validDates.size / expected;
  return { metric, startYear, endYear, expected, valid: validDates.size, coverage, acceptable: coverage >= WEEKLY_CLIMATE_MIN_COVERAGE, distinctYears: new Set(selected.map((row) => yearOf(row.date))).size };
}

function calendarCandidates(targetDate: string, startYear: number, endYear: number, radius: number): string[] {
  if (!validIsoDate(targetDate) || radius < 0 || !Number.isInteger(radius)) throw new Error("climate_calendar_window_invalid");
  const monthDay = targetDate.slice(5);
  const dates: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const center = dateAtYear(monthDay, year);
    if (!center) continue;
    for (let offset = -radius; offset <= radius; offset++) dates.push(iso(shift(center, offset)));
  }
  return dates;
}

export function buildDatedTemperatureReference(rows: ClimateDailyObservation[], args: {
  metric: "tminC" | "tmaxC";
  targetDate: string;
  startYear?: number;
  endYear?: number;
  calendarRadiusDays?: number;
}): DatedClimateReference {
  const startYear = args.startYear ?? WEEKLY_DAILY_REFERENCE_START_YEAR;
  const endYear = args.endYear ?? WEEKLY_DAILY_REFERENCE_END_YEAR;
  const radius = args.calendarRadiusDays ?? WEEKLY_CLIMATE_CALENDAR_RADIUS_DAYS;
  const provenance = referenceProvenance(rows);
  const coverage = dailyCoverage(rows, args.metric, startYear, endYear);
  if (!coverage.acceptable) throw new Error("climate_daily_coverage_insufficient");
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const values = calendarCandidates(args.targetDate, startYear, endYear, radius)
    .map((date) => byDate.get(date)).filter((row): row is ClimateDailyObservation => Boolean(row))
    .map((row) => dailyValue(row, args.metric)).filter((value): value is number => value !== null);
  if (!values.length) throw new Error("climate_daily_window_empty");
  return { kind: "DERIVED_DAILY_CLIMATOLOGY", metric: args.metric, targetDate: args.targetDate, calendarRadiusDays: radius, startYear, endYear, coverage, distribution: distribution(values), provenance };
}

/** Dated climatology for rain, wind or temperature without changing legacy temperature contracts. */
export function buildDatedDailyMetricReference(rows: ClimateDailyObservation[], args: {
  metric: ClimateDailyMetric;
  targetDate: string;
  startYear?: number;
  endYear?: number;
  calendarRadiusDays?: number;
}): DatedDailyMetricReference {
  const startYear = args.startYear ?? WEEKLY_DAILY_REFERENCE_START_YEAR;
  const endYear = args.endYear ?? WEEKLY_DAILY_REFERENCE_END_YEAR;
  const radius = args.calendarRadiusDays ?? WEEKLY_CLIMATE_CALENDAR_RADIUS_DAYS;
  const provenance = referenceProvenance(rows);
  const coverage = dailyCoverage(rows, args.metric, startYear, endYear);
  if (!coverage.acceptable) throw new Error("climate_daily_metric_coverage_insufficient");
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const values = calendarCandidates(args.targetDate, startYear, endYear, radius)
    .map((date) => byDate.get(date)).filter((row): row is ClimateDailyObservation => Boolean(row))
    .map((row) => dailyValue(row, args.metric)).filter((value): value is number => value !== null);
  if (!values.length) throw new Error("climate_daily_metric_window_empty");
  return { kind: "DERIVED_DAILY_METRIC_CLIMATOLOGY", metric: args.metric, targetDate: args.targetDate, calendarRadiusDays: radius, startYear, endYear, coverage, distribution: distribution(values), provenance };
}

export function buildRollingRainfallReference(rows: ClimateDailyObservation[], args: {
  targetStartDate: string;
  durationDays?: number;
  startYear?: number;
  endYear?: number;
  calendarRadiusDays?: number;
}): RainfallReference {
  const startYear = args.startYear ?? WEEKLY_DAILY_REFERENCE_START_YEAR;
  const endYear = args.endYear ?? WEEKLY_DAILY_REFERENCE_END_YEAR;
  const durationDays = args.durationDays ?? 7;
  const radius = args.calendarRadiusDays ?? WEEKLY_CLIMATE_CALENDAR_RADIUS_DAYS;
  if (durationDays < 1 || !Number.isInteger(durationDays)) throw new Error("climate_rain_duration_invalid");
  const provenance = referenceProvenance(rows);
  const coverageReport = dailyCoverage(rows, "rainMm", startYear, endYear);
  if (!coverageReport.acceptable) throw new Error("climate_rain_coverage_insufficient");
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const starts = calendarCandidates(args.targetStartDate, startYear, endYear, radius);
  const totals: number[] = [];
  for (const start of starts) {
    const base = new Date(`${start}T00:00:00Z`);
    const window = Array.from({ length: durationDays }, (_, index) => byDate.get(iso(shift(base, index))));
    const values = window.map((row) => row ? dailyValue(row, "rainMm") : null);
    if (values.every((value): value is number => value !== null)) totals.push(values.reduce((sum, value) => sum + value, 0));
  }
  const coverage = totals.length / starts.length;
  if (coverage < WEEKLY_CLIMATE_MIN_COVERAGE) throw new Error("climate_rain_windows_insufficient");
  return { kind: "DERIVED_ROLLING_RAINFALL", targetStartDate: args.targetStartDate, durationDays, calendarRadiusDays: radius, startYear, endYear, completeWindows: totals.length, candidateWindows: starts.length, coverage, distribution: distribution(totals), provenance };
}

export function buildHourlyClimateReference(rows: ClimateHourlyObservation[], args: {
  metric: ClimateHourlyMetric;
  targetDate: string;
  localHour: number;
  startYear?: number;
  endYear?: number;
  calendarRadiusDays?: number;
}): HourlyClimateReference {
  const startYear = args.startYear ?? WEEKLY_HOURLY_REFERENCE_START_YEAR;
  const endYear = args.endYear ?? WEEKLY_HOURLY_REFERENCE_END_YEAR;
  const radius = args.calendarRadiusDays ?? WEEKLY_CLIMATE_CALENDAR_RADIUS_DAYS;
  if (!Number.isInteger(args.localHour) || args.localHour < 0 || args.localHour > 23) throw new Error("climate_hour_invalid");
  const provenance = referenceProvenance(rows);
  const allowedDates = new Set(calendarCandidates(args.targetDate, startYear, endYear, radius));
  const selected = rows.filter((row) => allowedDates.has(row.localDate) && row.localHour === args.localHour && hourlyValue(row, args.metric) !== null);
  const distinctYears = new Set(selected.map((row) => yearOf(row.localDate))).size;
  if (distinctYears < WEEKLY_CLIMATE_MIN_HOURLY_YEARS) throw new Error("climate_hourly_years_insufficient");
  const values = selected.map((row) => hourlyValue(row, args.metric)).filter((value): value is number => value !== null);
  return { kind: "DERIVED_HOURLY_CLIMATOLOGY", metric: args.metric, targetDate: args.targetDate, localHour: args.localHour, calendarRadiusDays: radius, startYear, endYear, distinctYears, distribution: distribution(values), provenance };
}

function compare(value: number, operator: SeasonalThresholdReference["operator"], threshold: number): boolean {
  if (operator === "LT") return value < threshold;
  if (operator === "LTE") return value <= threshold;
  if (operator === "GT") return value > threshold;
  return value >= threshold;
}

function monthDayValid(value: string): boolean { return /^\d{2}-\d{2}$/.test(value) && Boolean(dateAtYear(value, 2000)); }

export function buildSeasonalThresholdReference(rows: ClimateDailyObservation[], args: {
  metric: ClimateDailyMetric;
  operator: SeasonalThresholdReference["operator"];
  threshold: number;
  seasonStartMonthDay: string;
  targetMonthDay: string;
  startYear?: number;
  endYear?: number;
}): SeasonalThresholdReference {
  const startYear = args.startYear ?? WEEKLY_DAILY_REFERENCE_START_YEAR;
  const endYear = args.endYear ?? WEEKLY_DAILY_REFERENCE_END_YEAR;
  if (!monthDayValid(args.seasonStartMonthDay) || !monthDayValid(args.targetMonthDay) || !Number.isFinite(args.threshold)) throw new Error("climate_threshold_invalid");
  const provenance = referenceProvenance(rows);
  const coverage = dailyCoverage(rows, args.metric, startYear, endYear);
  if (!coverage.acceptable) throw new Error("climate_threshold_coverage_insufficient");
  const yearlyCounts: SeasonalThresholdReference["yearlyCounts"] = [];
  for (let year = startYear; year <= endYear; year++) {
    const start = dateAtYear(args.seasonStartMonthDay, year);
    let end = dateAtYear(args.targetMonthDay, year);
    if (!start || !end) continue;
    if (end < start) end = dateAtYear(args.targetMonthDay, year + 1);
    if (!end) continue;
    const matching = rows.filter((row) => {
      const date = new Date(`${row.date}T00:00:00Z`);
      const value = dailyValue(row, args.metric);
      return date >= start && date <= end && value !== null && compare(value, args.operator, args.threshold);
    });
    yearlyCounts.push({ year, count: matching.length, firstDate: matching[0]?.date ?? null });
  }
  return { metric: args.metric, operator: args.operator, threshold: args.threshold, seasonStartMonthDay: args.seasonStartMonthDay, targetMonthDay: args.targetMonthDay, yearlyCounts, countDistribution: distribution(yearlyCounts.map((item) => item.count)), firstOccurrenceDates: yearlyCounts.map((item) => item.firstDate).filter((value): value is string => value !== null), provenance };
}

export function buildConsecutiveSeriesReference(rows: ClimateDailyObservation[], args: {
  metric: ClimateDailyMetric;
  operator: ConsecutiveSeriesReference["operator"];
  threshold: number;
  startDate: string;
  endDate: string;
}): ConsecutiveSeriesReference {
  if (!validIsoDate(args.startDate) || !validIsoDate(args.endDate) || args.startDate > args.endDate || !Number.isFinite(args.threshold)) throw new Error("climate_series_window_invalid");
  const provenance = referenceProvenance(rows);
  const byDate = new Map(rows.map((row) => [row.date, row]));
  let cursor = new Date(`${args.startDate}T00:00:00Z`);
  const end = new Date(`${args.endDate}T00:00:00Z`);
  let current = 0;
  let longest = 0;
  let runCount = 0;
  let inRun = false;
  while (cursor <= end) {
    const row = byDate.get(iso(cursor));
    const value = row ? dailyValue(row, args.metric) : null;
    const matches = value !== null && compare(value, args.operator, args.threshold);
    if (matches) {
      current++;
      longest = Math.max(longest, current);
      if (!inRun) runCount++;
      inRun = true;
    } else {
      current = 0;
      inRun = false;
    }
    cursor = shift(cursor, 1);
  }
  return { metric: args.metric, operator: args.operator, threshold: args.threshold, startDate: args.startDate, endDate: args.endDate, longestRun: longest, latestRun: current, runCount, provenance };
}
