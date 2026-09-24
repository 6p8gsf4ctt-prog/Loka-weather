import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";
import type {
  ClimateDailyMetric,
  ClimateDailyObservation,
  ConsecutiveSeriesReference,
  DatedClimateReference,
  RainfallReference,
  SeasonalThresholdReference
} from "./climateReferences";
import {
  validateWeeklyEditorialSignal,
  WEEKLY_EDITORIAL_SIGNAL_VERSION
} from "./editorialSignals";
import type {
  WeeklyEditorialMetric,
  WeeklyEditorialSignal,
  WeeklyEditorialSignalConfidence,
  WeeklyEditorialSignalFamily,
  WeeklyEditorialSignalRole,
  WeeklySignalMeasurement,
  WeeklySignalWindowBasis
} from "./editorialSignals";

export const WEEKLY_SIGNAL_DETECTOR_VERSION = "1.0.0" as const;

export type WeeklySignalDetectorKind =
  | "HISTORICAL_SINCE"
  | "RECENT_EXTREME"
  | "RECORD_PROXIMITY"
  | "CLIMATE_ANOMALY"
  | "EXTREME_PERCENTILE"
  | "SEASONAL_FIRST"
  | "IMPACT_PHENOMENON"
  | "REGIME_CHANGE"
  | "REMARKABLE_SERIES"
  | "INTRADAY_CHANGE";

export interface WeeklySignalCandidate {
  detectorVersion: typeof WEEKLY_SIGNAL_DETECTOR_VERSION;
  detector: WeeklySignalDetectorKind;
  signal: WeeklyEditorialSignal;
  /** Machine-readable reasons; scoring and copy are deliberately deferred. */
  facts: Record<string, string | number | boolean | null>;
}

export interface ForecastDailyFact {
  date: string;
  dayIndex: number;
  metric: ClimateDailyMetric;
  value: number;
  confidence: WeeklyEditorialSignalConfidence;
}

export interface SeasonalFirstInput {
  forecast: ForecastDailyFact;
  operator: SeasonalThresholdReference["operator"];
  threshold: number;
  occurrencesBeforeForecast: number;
  reference: SeasonalThresholdReference;
}

export interface ProjectedSeriesInput {
  metric: ClimateDailyMetric;
  operator: ConsecutiveSeriesReference["operator"];
  threshold: number;
  startDate: string;
  endDate: string;
  representativeDayIndex: number;
  projectedLength: number;
  confidence: WeeklyEditorialSignalConfidence;
  reference: ConsecutiveSeriesReference;
}

const PHENOMENON_THRESHOLDS = {
  hotC: 35,
  frostC: 0,
  dailyRainMm: 20,
  hourlyRainMm: 5,
  gustKmh: 70,
  thunderHours: 2,
  fogHours: 4
} as const;

const REGIME_THRESHOLDS = {
  dailyTemperatureDropC: 7,
  dailyTemperatureRiseC: 7,
  rainArrivalMm: 8,
  gustIncreaseKmh: 25
} as const;

const INTRADAY_THRESHOLDS = {
  amplitudeC: 14,
  fourHourDropC: 7
} as const;

const RECENT_EXTREME_THRESHOLDS = {
  minimumGapDays: 14,
  lookbackDays: 365,
  minimumRainMm: 5,
  minimumGustKmh: 40
} as const;

function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error("weekly_signal_detector_invalid_date");
}

function metricContract(metric: ClimateDailyMetric): { metric: WeeklyEditorialMetric; unit: string; basis: WeeklySignalWindowBasis } {
  if (metric === "tminC" || metric === "tmaxC") return { metric: "TEMPERATURE", unit: "°C", basis: "DAILY_EXTREME" };
  if (metric === "rainMm") return { metric: "PRECIPITATION", unit: "mm", basis: "DAILY_TOTAL" };
  return { metric: "WIND_GUST", unit: "km/h", basis: "DAILY_EXTREME" };
}

function archiveValue(row: ClimateDailyObservation, metric: ClimateDailyMetric): number | null {
  const quality = row.quality[metric];
  const value = row[metric];
  if (value === null || (quality !== null && quality !== undefined && quality !== 1)) return null;
  return metric === "gust3sMs" ? value * 3.6 : value;
}

function measurement(fact: ForecastDailyFact): WeeklySignalMeasurement {
  assertIsoDate(fact.date);
  const contract = metricContract(fact.metric);
  return { metric: contract.metric, value: fact.metric === "gust3sMs" ? fact.value * 3.6 : fact.value, unit: contract.unit, window: { startDate: fact.date, endDate: fact.date, basis: contract.basis } };
}

function candidate(args: {
  detector: WeeklySignalDetectorKind;
  role: WeeklyEditorialSignalRole;
  family: WeeklyEditorialSignalFamily;
  topicKey: string;
  confidence: WeeklyEditorialSignalConfidence;
  representativeDayIndex: number;
  forecast: WeeklySignalMeasurement;
  evidence: WeeklyEditorialSignal["evidence"];
  facts: WeeklySignalCandidate["facts"];
}): WeeklySignalCandidate {
  const signal: WeeklyEditorialSignal = {
    version: WEEKLY_EDITORIAL_SIGNAL_VERSION,
    id: `${args.detector.toLowerCase()}:${args.topicKey}`,
    role: args.role,
    family: args.family,
    topicKey: args.topicKey,
    mode: "FORECAST",
    confidence: args.confidence,
    representativeDayIndex: args.representativeDayIndex,
    forecast: args.forecast,
    evidence: args.evidence
  };
  const validation = validateWeeklyEditorialSignal(signal);
  if (!validation.ok) throw new Error(`weekly_signal_detector_contract:${validation.issues.join(",")}`);
  return { detectorVersion: WEEKLY_SIGNAL_DETECTOR_VERSION, detector: args.detector, signal, facts: args.facts };
}

/** Finds a record proximity or the most recent comparable historical value. */
export function detectHistoricalExtreme(forecast: ForecastDailyFact, archive: ClimateDailyObservation[], direction: "HIGH" | "LOW"): WeeklySignalCandidate | null {
  const predicted = measurement(forecast);
  const comparable = archive
    .filter((row) => row.date < forecast.date)
    .map((row) => ({ row, value: archiveValue(row, forecast.metric) }))
    .filter((item): item is { row: ClimateDailyObservation; value: number } => item.value !== null);
  if (!comparable.length) return null;
  const beatsForecast = (value: number) => direction === "HIGH" ? value >= predicted.value : value <= predicted.value;
  const matching = comparable.filter((item) => beatsForecast(item.value)).sort((a, b) => b.row.date.localeCompare(a.row.date));
  const contract = metricContract(forecast.metric);
  if (matching.length) {
    const previous = matching[0];
    return candidate({
      detector: "HISTORICAL_SINCE", role: "NUMBER", family: "HISTORICAL",
      topicKey: `${forecast.metric}:${direction.toLowerCase()}:${forecast.date}`,
      confidence: forecast.confidence, representativeDayIndex: forecast.dayIndex, forecast: predicted,
      evidence: [{ kind: "HISTORICAL_SINCE", source: "LOCAL_ARCHIVE", reference: { metric: contract.metric, value: previous.value, unit: contract.unit, window: { startDate: previous.row.date, endDate: previous.row.date, basis: contract.basis } }, explanation: `Dernière valeur historique comparable atteignant ce niveau : ${previous.row.date}.` }],
      facts: { direction, previousDate: previous.row.date, previousValue: previous.value, daysSince: Math.floor((Date.parse(`${forecast.date}T00:00:00Z`) - Date.parse(`${previous.row.date}T00:00:00Z`)) / 86_400_000), archiveSize: comparable.length }
    });
  }
  const extreme = comparable.reduce((best, item) => direction === "HIGH" ? (item.value > best.value ? item : best) : (item.value < best.value ? item : best));
  return candidate({
    detector: "RECORD_PROXIMITY", role: "NUMBER", family: "HISTORICAL",
    topicKey: `${forecast.metric}:record-${direction.toLowerCase()}:${forecast.date}`,
    confidence: forecast.confidence, representativeDayIndex: forecast.dayIndex, forecast: predicted,
    evidence: [{ kind: "RECORD_PROXIMITY", source: "LOCAL_ARCHIVE", reference: { metric: contract.metric, value: extreme.value, unit: contract.unit, window: { startDate: extreme.row.date, endDate: extreme.row.date, basis: contract.basis } }, explanation: `Extrême observé dans l'archive disponible : ${extreme.row.date}.` }],
    facts: { direction, recordDate: extreme.row.date, recordValue: extreme.value, forecastBeyondRecord: true, archiveSize: comparable.length }
  });
}

/** Finds recent local observations beaten by a forecast, with a variable lookback. */
export function detectRecentExtreme(forecast: ForecastDailyFact, archive: ClimateDailyObservation[]): WeeklySignalCandidate | null {
  const forecastMeasurement = measurement(forecast);
  const forecastValue = forecastMeasurement.value;
  const cutoff = new Date(`${forecast.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_EXTREME_THRESHOLDS.lookbackDays);
  const comparable = archive
    .filter((row) => row.date < forecast.date && row.date >= cutoff.toISOString().slice(0, 10))
    .map((row) => ({ row, value: archiveValue(row, forecast.metric) }))
    .filter((item): item is { row: ClimateDailyObservation; value: number } => item.value !== null)
    .sort((a, b) => a.row.date.localeCompare(b.row.date));
  if (comparable.length < 14) return null;
  const minimumValue = Math.min(...comparable.map((item) => item.value));
  const maximumValue = Math.max(...comparable.map((item) => item.value));
  const direction: "HIGH" | "LOW" = forecast.metric === "tminC" ? "LOW" : "HIGH";
  const beatsRecentExtreme = direction === "LOW" ? forecastValue < minimumValue : forecastValue > maximumValue;
  if (!beatsRecentExtreme) return null;
  if (forecast.metric === "rainMm" && forecastValue < RECENT_EXTREME_THRESHOLDS.minimumRainMm) return null;
  if (forecast.metric === "gust3sMs" && forecastValue < RECENT_EXTREME_THRESHOLDS.minimumGustKmh) return null;
  const lastComparable = [...comparable].reverse().find((item) => direction === "LOW" ? item.value <= forecastValue : item.value >= forecastValue);
  const reference = lastComparable ?? comparable[0];
  const lowerBound = !lastComparable;
  if (!reference) return null;
  const daysSince = Math.floor((Date.parse(`${forecast.date}T00:00:00Z`) - Date.parse(`${reference.row.date}T00:00:00Z`)) / 86_400_000);
  if (daysSince < RECENT_EXTREME_THRESHOLDS.minimumGapDays) return null;
  const label = direction === "LOW" ? "minimum" : "maximum";
  return candidate({
    detector: "RECENT_EXTREME", role: "NUMBER", family: "RECENT_CONTEXT",
    topicKey: `${forecast.metric}:recent-${direction.toLowerCase()}:${forecast.date}`,
    confidence: forecast.confidence, representativeDayIndex: forecast.dayIndex, forecast: forecastMeasurement,
    evidence: [{ kind: "RECENT_EXTREME", source: "LOCAL_ARCHIVE", reference: { ...forecastMeasurement, value: reference.value, window: { ...forecastMeasurement.window, startDate: reference.row.date, endDate: reference.row.date } }, explanation: lowerBound ? `Aucune valeur comparable n'a atteint le ${label} prévu depuis le début de la fenêtre récente : ${reference.row.date}.` : `Dernière valeur comparable atteignant le ${label} récent : ${reference.row.date}.` }],
    facts: { direction, referenceDate: reference.row.date, referenceValue: reference.value, daysSince, lowerBound, recentWindowDays: RECENT_EXTREME_THRESHOLDS.lookbackDays, archiveSize: comparable.length, minimumGapDays: RECENT_EXTREME_THRESHOLDS.minimumGapDays }
  });
}

/** Produces anomaly and/or extreme-percentile candidates from a dated reference. */
export function detectClimateDeparture(forecast: ForecastDailyFact, reference: DatedClimateReference, minimumAnomalyC = 3): WeeklySignalCandidate[] {
  if (forecast.metric !== reference.metric) throw new Error("weekly_signal_detector_reference_metric_mismatch");
  const predicted = measurement(forecast);
  const anomaly = forecast.value - reference.distribution.mean;
  const result: WeeklySignalCandidate[] = [];
  if (Math.abs(anomaly) >= minimumAnomalyC) {
    result.push(candidate({
      detector: "CLIMATE_ANOMALY", role: "NUMBER", family: "CLIMATE_NORMAL",
      topicKey: `${forecast.metric}:anomaly:${forecast.date}`,
      confidence: forecast.confidence, representativeDayIndex: forecast.dayIndex, forecast: predicted,
      evidence: [{ kind: "CLIMATE_NORMAL", source: "LOCAL_ARCHIVE", reference: { ...predicted, value: reference.distribution.mean, window: { ...predicted.window, startDate: `${reference.startYear}-01-01`, endDate: `${reference.endYear}-12-31` } }, explanation: `Moyenne dérivée de ${reference.distribution.count} observations comparables dans une fenêtre calendaire de ±${reference.calendarRadiusDays} jours.` }],
      facts: { anomalyC: anomaly, referenceMeanC: reference.distribution.mean, sampleSize: reference.distribution.count }
    }));
  }
  const high = forecast.value >= reference.distribution.p95;
  const low = forecast.value <= reference.distribution.p05;
  if (high || low) {
    const percentileValue = high ? reference.distribution.p95 : reference.distribution.p05;
    result.push(candidate({
      detector: "EXTREME_PERCENTILE", role: "NUMBER", family: "PERCENTILE",
      topicKey: `${forecast.metric}:percentile-${high ? "high" : "low"}:${forecast.date}`,
      confidence: forecast.confidence, representativeDayIndex: forecast.dayIndex, forecast: predicted,
      evidence: [{ kind: "PERCENTILE", source: "LOCAL_ARCHIVE", reference: { ...predicted, value: percentileValue, window: { ...predicted.window, startDate: `${reference.startYear}-01-01`, endDate: `${reference.endYear}-12-31` } }, explanation: `Seuil ${high ? "P95" : "P5"} dérivé de ${reference.distribution.count} observations comparables.` }],
      facts: { tail: high ? "HIGH" : "LOW", percentile: high ? 95 : 5, thresholdValue: percentileValue, sampleSize: reference.distribution.count }
    }));
  }
  return result;
}

export function detectWeeklyRainfallDeparture(args: {
  totalMm: number;
  startDate: string;
  endDate: string;
  representativeDayIndex: number;
  confidence: WeeklyEditorialSignalConfidence;
  reference: RainfallReference;
}): WeeklySignalCandidate | null {
  assertIsoDate(args.startDate); assertIsoDate(args.endDate);
  if (args.totalMm < args.reference.distribution.p95) return null;
  const forecast: WeeklySignalMeasurement = { metric: "PRECIPITATION", value: args.totalMm, unit: "mm", window: { startDate: args.startDate, endDate: args.endDate, basis: "WEEKLY_TOTAL" } };
  return candidate({
    detector: "EXTREME_PERCENTILE", role: "NUMBER", family: "PERCENTILE", topicKey: `rain:weekly:p95:${args.startDate}`,
    confidence: args.confidence, representativeDayIndex: args.representativeDayIndex, forecast,
    evidence: [{ kind: "PERCENTILE", source: "LOCAL_ARCHIVE", reference: { ...forecast, value: args.reference.distribution.p95, window: { ...forecast.window, startDate: `${args.reference.startYear}-01-01`, endDate: `${args.reference.endYear}-12-31` } }, explanation: `P95 des cumuls glissants comparables sur ${args.reference.durationDays} jours.` }],
    facts: { percentile: 95, thresholdMm: args.reference.distribution.p95, sampleSize: args.reference.distribution.count }
  });
}

export function detectSeasonalFirst(input: SeasonalFirstInput): WeeklySignalCandidate | null {
  if (input.reference.metric !== input.forecast.metric || input.reference.operator !== input.operator || input.reference.threshold !== input.threshold) throw new Error("weekly_signal_detector_threshold_reference_mismatch");
  const matched = input.operator === "LT" ? input.forecast.value < input.threshold
    : input.operator === "LTE" ? input.forecast.value <= input.threshold
      : input.operator === "GT" ? input.forecast.value > input.threshold : input.forecast.value >= input.threshold;
  if (!matched || input.occurrencesBeforeForecast > 0) return null;
  const forecast = measurement(input.forecast);
  return candidate({
    detector: "SEASONAL_FIRST", role: "DETAIL", family: "SEASONAL_THRESHOLD",
    topicKey: `${input.forecast.metric}:first:${input.operator}:${input.threshold}:${input.forecast.date}`,
    confidence: input.forecast.confidence, representativeDayIndex: input.forecast.dayIndex, forecast,
    evidence: [{ kind: "SEASONAL_FIRST", source: "LOCAL_ARCHIVE", reference: { ...forecast, value: input.threshold }, explanation: `Première occurrence prévue cette saison ; ${input.reference.firstOccurrenceDates.length} saisons historiques documentent ce seuil.` }],
    facts: { operator: input.operator, threshold: input.threshold, occurrencesBeforeForecast: 0, historicalSeasons: input.reference.yearlyCounts.length, medianHistoricalCount: input.reference.countDistribution.p50 }
  });
}

function directCandidate(args: {
  detector: "IMPACT_PHENOMENON" | "REGIME_CHANGE" | "INTRADAY_CHANGE";
  family: "PHENOMENON" | "REGIME_CHANGE" | "INTRADAY_CHANGE";
  topicKey: string;
  dayIndex: number;
  confidence: WeeklyEditorialSignalConfidence;
  forecast: WeeklySignalMeasurement;
  threshold: number;
  facts: WeeklySignalCandidate["facts"];
}): WeeklySignalCandidate {
  const evidenceKind = args.detector === "IMPACT_PHENOMENON" ? "PHENOMENON" : args.detector;
  return candidate({ detector: args.detector, role: "PRACTICAL", family: args.family, topicKey: args.topicKey,
    confidence: args.confidence, representativeDayIndex: args.dayIndex, forecast: args.forecast,
    evidence: [{ kind: evidenceKind, source: "CONSENSUS_FORECAST", direct: true, reference: { ...args.forecast, value: args.threshold }, explanation: `Seuil moteur documenté : ${args.threshold} ${args.forecast.unit}.` }], facts: args.facts });
}

function dayConfidence(day: WeeklyDayProfile): WeeklyEditorialSignalConfidence {
  if (day.fullDay.modelCountMin >= 4 && day.fullDay.temperatureSpreadMeanC <= 2) return "HIGH";
  if (day.fullDay.modelCountMin >= 3 && day.fullDay.temperatureSpreadMeanC <= 4) return "MEDIUM";
  return "LOW";
}

/** Important phenomena only; ordinary weekly extrema are intentionally absent. */
export function detectImpactPhenomena(profiles: WeeklyProfileSet): WeeklySignalCandidate[] {
  const result: WeeklySignalCandidate[] = [];
  for (const day of profiles.days) {
    const confidence = dayConfidence(day);
    const daily = (metric: WeeklyEditorialMetric, value: number, unit: string, basis: WeeklySignalWindowBasis): WeeklySignalMeasurement => ({ metric, value, unit, window: { startDate: day.date, endDate: day.date, basis } });
    if (day.fullDay.maxTemperatureC >= PHENOMENON_THRESHOLDS.hotC) result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `heat:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("TEMPERATURE", day.fullDay.maxTemperatureC, "°C", "DAILY_EXTREME"), threshold: PHENOMENON_THRESHOLDS.hotC, facts: { phenomenon: "STRONG_HEAT" } }));
    if (day.fullDay.minTemperatureC <= PHENOMENON_THRESHOLDS.frostC) result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `frost:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("TEMPERATURE", day.fullDay.minTemperatureC, "°C", "DAILY_EXTREME"), threshold: PHENOMENON_THRESHOLDS.frostC, facts: { phenomenon: "FROST" } }));
    if (day.fullDay.precipitation.totalMm >= PHENOMENON_THRESHOLDS.dailyRainMm) {
      result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `heavy-rain:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("PRECIPITATION", day.fullDay.precipitation.totalMm, "mm", "DAILY_TOTAL"), threshold: PHENOMENON_THRESHOLDS.dailyRainMm, facts: { phenomenon: "HEAVY_RAIN", maxHourlyMm: day.fullDay.precipitation.maxHourlyMm } }));
    } else if (day.fullDay.precipitation.maxHourlyMm >= PHENOMEN_THRESHOLDS_SAFE.hourlyRainMm) {
      const peak = day.hours.reduce((best, hour) => hour.precipitationMm > best.precipitationMm ? hour : best);
      const peakHour = Number(peak.time.slice(11, 13));
      result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `intense-rain:${day.date}:${peakHour}`, dayIndex: day.dayIndex, confidence,
        forecast: { metric: "PRECIPITATION", value: peak.precipitationMm, unit: "mm/h", window: { startDate: day.date, endDate: day.date, basis: "HOURLY", startHour: peakHour, endHour: peakHour } },
        threshold: PHENOMEN_THRESHOLDS_SAFE.hourlyRainMm, facts: { phenomenon: "INTENSE_RAIN", peakHour } }));
    }
    if (day.fullDay.wind.maxGustKmh >= PHENOMENON_THRESHOLDS.gustKmh) result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `strong-wind:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("WIND_GUST", day.fullDay.wind.maxGustKmh, "km/h", "DAILY_EXTREME"), threshold: PHENOMENON_THRESHOLDS.gustKmh, facts: { phenomenon: "STRONG_WIND" } }));
    if (day.fullDay.thunderHours >= PHENOMENON_THRESHOLDS.thunderHours) result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `thunder:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("THUNDER", day.fullDay.thunderHours, "h", "DAILY_TOTAL"), threshold: PHENOMENON_THRESHOLDS.thunderHours, facts: { phenomenon: "THUNDER" } }));
    if (day.fullDay.fogHours >= PHENOMENON_THRESHOLDS.fogHours) result.push(directCandidate({ detector: "IMPACT_PHENOMENON", family: "PHENOMENON", topicKey: `fog:${day.date}`, dayIndex: day.dayIndex, confidence, forecast: daily("VISIBILITY", day.fullDay.fogHours, "h", "DAILY_TOTAL"), threshold: PHENOMENON_THRESHOLDS.fogHours, facts: { phenomenon: "FOG" } }));
  }
  return result;
}

// Separate alias prevents accidental use of the hourly threshold as daily proof.
const PHENOMEN_THRESHOLDS_SAFE = { hourlyRainMm: PHENOMENON_THRESHOLDS.hourlyRainMm } as const;

export function detectRegimeChanges(profiles: WeeklyProfileSet): WeeklySignalCandidate[] {
  const result: WeeklySignalCandidate[] = [];
  for (let index = 1; index < profiles.days.length; index++) {
    const previous = profiles.days[index - 1];
    const day = profiles.days[index];
    const confidence = dayConfidence(day);
    const temperatureChange = day.fullDay.meanTemperatureC - previous.fullDay.meanTemperatureC;
    const dateWindow = { startDate: previous.date, endDate: day.date, basis: "DAILY_EXTREME" as const };
    if (Math.abs(temperatureChange) >= REGIME_THRESHOLDS.dailyTemperatureDropC) {
      const threshold = temperatureChange < 0 ? -REGIME_THRESHOLDS.dailyTemperatureDropC : REGIME_THRESHOLDS.dailyTemperatureRiseC;
      result.push(directCandidate({ detector: "REGIME_CHANGE", family: "REGIME_CHANGE", topicKey: `temperature-shift:${previous.date}:${day.date}`, dayIndex: day.dayIndex, confidence,
        forecast: { metric: "TEMPERATURE", value: temperatureChange, unit: "°C", window: dateWindow }, threshold,
        facts: { direction: temperatureChange < 0 ? "COOLING" : "WARMING", previousMeanC: previous.fullDay.meanTemperatureC, currentMeanC: day.fullDay.meanTemperatureC } }));
    }
    const rainIncrease = day.fullDay.precipitation.totalMm - previous.fullDay.precipitation.totalMm;
    if (day.fullDay.precipitation.totalMm >= REGIME_THRESHOLDS.rainArrivalMm && previous.fullDay.precipitation.totalMm < 1 && rainIncrease >= REGIME_THRESHOLDS.rainArrivalMm) {
      result.push(directCandidate({ detector: "REGIME_CHANGE", family: "REGIME_CHANGE", topicKey: `rain-arrival:${previous.date}:${day.date}`, dayIndex: day.dayIndex, confidence,
        forecast: { metric: "PRECIPITATION", value: rainIncrease, unit: "mm", window: { startDate: previous.date, endDate: day.date, basis: "DAILY_TOTAL" } }, threshold: REGIME_THRESHOLDS.rainArrivalMm,
        facts: { direction: "RAIN_ARRIVAL", previousRainMm: previous.fullDay.precipitation.totalMm, currentRainMm: day.fullDay.precipitation.totalMm } }));
    }
    const gustIncrease = day.fullDay.wind.maxGustKmh - previous.fullDay.wind.maxGustKmh;
    if (gustIncrease >= REGIME_THRESHOLDS.gustIncreaseKmh) result.push(directCandidate({ detector: "REGIME_CHANGE", family: "REGIME_CHANGE", topicKey: `wind-increase:${previous.date}:${day.date}`, dayIndex: day.dayIndex, confidence,
      forecast: { metric: "WIND_GUST", value: gustIncrease, unit: "km/h", window: dateWindow }, threshold: REGIME_THRESHOLDS.gustIncreaseKmh,
      facts: { direction: "WIND_INCREASE", previousGustKmh: previous.fullDay.wind.maxGustKmh, currentGustKmh: day.fullDay.wind.maxGustKmh } }));
  }
  return result;
}

export function detectProjectedSeries(input: ProjectedSeriesInput): WeeklySignalCandidate | null {
  if (input.reference.metric !== input.metric || input.reference.operator !== input.operator || input.reference.threshold !== input.threshold) throw new Error("weekly_signal_detector_series_reference_mismatch");
  if (input.projectedLength < 3 || input.projectedLength <= input.reference.longestRun) return null;
  const contract = metricContract(input.metric);
  const forecast: WeeklySignalMeasurement = { metric: contract.metric, value: input.projectedLength, unit: "jours", window: { startDate: input.startDate, endDate: input.endDate, basis: "SEASON_TO_DATE" } };
  return candidate({ detector: "REMARKABLE_SERIES", role: "DETAIL", family: "SERIES", topicKey: `${input.metric}:series:${input.operator}:${input.threshold}:${input.endDate}`,
    confidence: input.confidence, representativeDayIndex: input.representativeDayIndex, forecast,
    evidence: [{ kind: "SERIES", source: "LOCAL_ARCHIVE", reference: { ...forecast, value: input.reference.longestRun, window: { ...forecast.window, startDate: input.reference.startDate, endDate: input.reference.endDate } }, explanation: "Plus longue série comparable de la période historique fournie." }],
    facts: { operator: input.operator, threshold: input.threshold, projectedLength: input.projectedLength, historicalLongestRun: input.reference.longestRun, referenceDays: Math.floor((Date.parse(`${input.reference.endDate}T00:00:00Z`) - Date.parse(`${input.reference.startDate}T00:00:00Z`)) / 86_400_000) + 1 } });
}

export function detectIntradayChanges(profiles: WeeklyProfileSet): WeeklySignalCandidate[] {
  const result: WeeklySignalCandidate[] = [];
  for (const day of profiles.days) {
    const ordered = [...day.hours].sort((a, b) => a.time.localeCompare(b.time));
    const confidence = dayConfidence(day);
    const amplitude = day.fullDay.maxTemperatureC - day.fullDay.minTemperatureC;
    if (amplitude >= INTRADAY_THRESHOLDS.amplitudeC) result.push(directCandidate({ detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", topicKey: `intraday-amplitude:${day.date}`, dayIndex: day.dayIndex, confidence,
      forecast: { metric: "TEMPERATURE", value: amplitude, unit: "°C", window: { startDate: day.date, endDate: day.date, basis: "HOURLY", startHour: 0, endHour: 23 } }, threshold: INTRADAY_THRESHOLDS.amplitudeC,
      facts: { change: "AMPLITUDE", minC: day.fullDay.minTemperatureC, maxC: day.fullDay.maxTemperatureC } }));
    let strongestDrop: { value: number; startHour: number; endHour: number } | null = null;
    for (let start = 0; start < ordered.length; start++) {
      const startHour = Number(ordered[start].time.slice(11, 13));
      for (let end = start + 1; end < ordered.length; end++) {
        const endHour = Number(ordered[end].time.slice(11, 13));
        if (endHour - startHour > 4) break;
        const drop = ordered[start].temperatureC - ordered[end].temperatureC;
        if (!strongestDrop || drop > strongestDrop.value) strongestDrop = { value: drop, startHour, endHour };
      }
    }
    if (strongestDrop && strongestDrop.value >= INTRADAY_THRESHOLDS.fourHourDropC) result.push(directCandidate({ detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", topicKey: `intraday-drop:${day.date}:${strongestDrop.startHour}-${strongestDrop.endHour}`, dayIndex: day.dayIndex, confidence,
      forecast: { metric: "TEMPERATURE", value: strongestDrop.value, unit: "°C", window: { startDate: day.date, endDate: day.date, basis: "HOURLY", startHour: strongestDrop.startHour, endHour: strongestDrop.endHour } }, threshold: INTRADAY_THRESHOLDS.fourHourDropC,
      facts: { change: "RAPID_DROP", startHour: strongestDrop.startHour, endHour: strongestDrop.endHour } }));
  }
  return result;
}

/** N4 orchestrator: no scoring, deduplication, copy or slide assignment. */
export function detectWeeklySignalCandidates(args: {
  profiles: WeeklyProfileSet;
  intraday?: boolean;
}): WeeklySignalCandidate[] {
  return [
    ...detectImpactPhenomena(args.profiles),
    ...detectRegimeChanges(args.profiles),
    ...(args.intraday === false ? [] : detectIntradayChanges(args.profiles))
  ];
}

export { INTRADAY_THRESHOLDS, PHENOMENON_THRESHOLDS, RECENT_EXTREME_THRESHOLDS, REGIME_THRESHOLDS };
