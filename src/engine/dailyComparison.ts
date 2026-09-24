import type { OfficialPublicPayloadV24 } from "../types";
import {
  buildDatedDailyMetricReference,
  buildDatedTemperatureReference,
  buildSeasonalThresholdReference,
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  type ClimateDailyMetric,
  type ClimateDailyObservation,
  type DatedDailyMetricReference,
  type SeasonalThresholdReference
} from "./weekly/climateReferences";
import {
  detectClimateDeparture,
  detectHistoricalExtreme,
  detectRecentExtreme,
  detectSeasonalFirst,
  WEEKLY_SIGNAL_DETECTOR_VERSION,
  type ForecastDailyFact,
  type WeeklySignalCandidate
} from "./weekly/signalDetectors";
import { rankAndDeduplicateWeeklySignals } from "./weekly/signalRanking";
import {
  buildWeeklyComplementaryPresentation,
  type WeeklyComplementaryPresentation,
  type WeeklyComplementaryTheme,
  type WeeklyComplementaryVisual
} from "./weekly/complementarySlides";
import { complementaryPictogramDataUrl } from "./weekly/complementaryPictograms";
import { buildWeeklySignalCopy, type WeeklySignalClaimStatus } from "./weekly/signalCopy";
import {
  validateWeeklyEditorialSignal,
  WEEKLY_EDITORIAL_SIGNAL_VERSION,
  type WeeklyEditorialSignal,
  type WeeklyEditorialSignalFamily,
  type WeeklySignalMeasurement
} from "./weekly/editorialSignals";

export const DAILY_COMPARISON_VERSION = "2.0.0" as const;

const DAILY_THRESHOLDS = {
  temperatureChangeC: 7,
  rainArrivalMm: 8,
  gustIncreaseKmh: 25,
  amplitudeC: 14,
  fourHourDropC: 7,
  minimumRainPercentileMm: 5,
  minimumGustPercentileKmh: 40
} as const;

const SEASONAL_POLICIES: Array<{
  metric: "tminC" | "tmaxC" | "rainMm";
  operator: SeasonalThresholdReference["operator"];
  threshold: number;
  seasonStartMonthDay: string;
}> = [
  { metric: "tmaxC", operator: "GTE", threshold: 30, seasonStartMonthDay: "01-01" },
  { metric: "tminC", operator: "GTE", threshold: 20, seasonStartMonthDay: "01-01" },
  { metric: "tminC", operator: "LTE", threshold: 0, seasonStartMonthDay: "07-01" },
  { metric: "rainMm", operator: "GTE", threshold: 20, seasonStartMonthDay: "01-01" }
];

export interface DailyComparisonStory {
  version: typeof DAILY_COMPARISON_VERSION;
  title: "LE REPÈRE DU JOUR";
  signalId: string;
  detector: WeeklySignalCandidate["detector"];
  theme: WeeklyComplementaryTheme;
  visual: WeeklyComplementaryVisual;
  pictogramUrl: string;
  presentation: WeeklyComplementaryPresentation;
  claimStatus: WeeklySignalClaimStatus;
  sourceNote: string;
  candidateCount: number;
  frame: "DAILY_STORY_SHARED_V1";
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function rawValue(row: ClimateDailyObservation, metric: ClimateDailyMetric): number | null {
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
  const candidate = `${year}-${monthDay}`;
  return candidate <= date ? candidate : `${year - 1}-${monthDay}`;
}

function measurement(fact: ForecastDailyFact): WeeklySignalMeasurement {
  const temperature = fact.metric === "tminC" || fact.metric === "tmaxC";
  return {
    metric: temperature ? "TEMPERATURE" : fact.metric === "rainMm" ? "PRECIPITATION" : "WIND_GUST",
    value: fact.metric === "gust3sMs" ? fact.value * 3.6 : fact.value,
    unit: temperature ? "°C" : fact.metric === "rainMm" ? "mm" : "km/h",
    window: { startDate: fact.date, endDate: fact.date, basis: fact.metric === "rainMm" ? "DAILY_TOTAL" : "DAILY_EXTREME" }
  };
}

function makeCandidate(args: {
  detector: WeeklySignalCandidate["detector"];
  family: WeeklyEditorialSignalFamily;
  topicKey: string;
  fact: ForecastDailyFact;
  forecast?: WeeklySignalMeasurement;
  evidence: WeeklyEditorialSignal["evidence"];
  facts: WeeklySignalCandidate["facts"];
}): WeeklySignalCandidate {
  const signal: WeeklyEditorialSignal = {
    version: WEEKLY_EDITORIAL_SIGNAL_VERSION,
    id: `${args.detector.toLowerCase()}:${args.topicKey}`,
    role: "NUMBER",
    family: args.family,
    topicKey: args.topicKey,
    mode: "FORECAST",
    confidence: args.fact.confidence,
    representativeDayIndex: 0,
    forecast: args.forecast ?? measurement(args.fact),
    evidence: args.evidence
  };
  const validation = validateWeeklyEditorialSignal(signal);
  if (!validation.ok) throw new Error(`daily_comparison_contract:${validation.issues.join(",")}`);
  return { detectorVersion: WEEKLY_SIGNAL_DETECTOR_VERSION, detector: args.detector, signal, facts: args.facts };
}

function theme(candidate: WeeklySignalCandidate): WeeklyComplementaryTheme {
  const metric = candidate.signal.forecast.metric;
  if (metric === "TEMPERATURE" || metric === "FROST") return "TEMPERATURE";
  if (metric === "PRECIPITATION" || metric === "THUNDER") return "WET_WEATHER";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "VISIBILITY";
  if (metric === "SUNLIGHT" || metric === "DAYLIGHT" || metric === "CLOUD_COVER") return "LIGHT";
  return "OTHER";
}

function visual(candidate: WeeklySignalCandidate): WeeklyComplementaryVisual {
  const metric = candidate.signal.forecast.metric;
  if (metric === "TEMPERATURE" || metric === "FROST") return "THERMOMETER";
  if (metric === "PRECIPITATION") return "RAIN";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "FOG";
  return "TREND";
}

function forecastFacts(payload: OfficialPublicPayloadV24): ForecastDailyFact[] {
  const facts = payload.editorial.facts;
  const confidence = facts.confidence;
  return [
    { date: payload.date, dayIndex: 0, metric: "tminC", value: facts.temperature.minC, confidence },
    { date: payload.date, dayIndex: 0, metric: "tmaxC", value: facts.temperature.maxC, confidence },
    { date: payload.date, dayIndex: 0, metric: "rainMm", value: facts.precipitation.totalMm, confidence },
    { date: payload.date, dayIndex: 0, metric: "gust3sMs", value: facts.wind.maxGustKmh / 3.6, confidence }
  ];
}

function percentileCandidate(fact: ForecastDailyFact, reference: DatedDailyMetricReference): WeeklySignalCandidate | null {
  const forecast = measurement(fact);
  const high = fact.value >= reference.distribution.p95;
  const low = (fact.metric === "tminC" || fact.metric === "tmaxC") && fact.value <= reference.distribution.p05;
  if (!high && !low) return null;
  if (fact.metric === "rainMm" && forecast.value < DAILY_THRESHOLDS.minimumRainPercentileMm) return null;
  if (fact.metric === "gust3sMs" && forecast.value < DAILY_THRESHOLDS.minimumGustPercentileKmh) return null;
  const rawThreshold = high ? reference.distribution.p95 : reference.distribution.p05;
  const threshold = fact.metric === "gust3sMs" ? rawThreshold * 3.6 : rawThreshold;
  return makeCandidate({
    detector: "EXTREME_PERCENTILE", family: "PERCENTILE",
    topicKey: `${fact.metric}:daily-percentile-${high ? "high" : "low"}:${fact.date}`, fact, forecast,
    evidence: [{ kind: "PERCENTILE", source: "LOCAL_ARCHIVE", reference: { ...forecast, value: threshold, window: { ...forecast.window, startDate: `${reference.startYear}-01-01`, endDate: `${reference.endYear}-12-31` } }, explanation: `Seuil ${high ? "P95" : "P5"} calculé sur ${reference.distribution.count} observations locales comparables.` }],
    facts: { tail: high ? "HIGH" : "LOW", percentile: high ? 95 : 5, thresholdValue: threshold, sampleSize: reference.distribution.count }
  });
}

function previousDayCandidate(fact: ForecastDailyFact, previous: ClimateDailyObservation): WeeklySignalCandidate | null {
  const priorRaw = rawValue(previous, fact.metric);
  if (priorRaw === null || previous.date !== shiftDate(fact.date, -1)) return null;
  const current = measurement(fact);
  const prior = fact.metric === "gust3sMs" ? priorRaw * 3.6 : priorRaw;
  const delta = current.value - prior;
  let direction: "COOLING" | "WARMING" | "RAIN_ARRIVAL" | "WIND_INCREASE" | null = null;
  let threshold = 0;
  if (fact.metric === "tminC" || fact.metric === "tmaxC") {
    if (Math.abs(delta) < DAILY_THRESHOLDS.temperatureChangeC) return null;
    direction = delta < 0 ? "COOLING" : "WARMING";
    threshold = delta < 0 ? -DAILY_THRESHOLDS.temperatureChangeC : DAILY_THRESHOLDS.temperatureChangeC;
  } else if (fact.metric === "rainMm") {
    if (current.value < DAILY_THRESHOLDS.rainArrivalMm || prior >= 1 || delta < DAILY_THRESHOLDS.rainArrivalMm) return null;
    direction = "RAIN_ARRIVAL";
    threshold = DAILY_THRESHOLDS.rainArrivalMm;
  } else {
    if (delta < DAILY_THRESHOLDS.gustIncreaseKmh) return null;
    direction = "WIND_INCREASE";
    threshold = DAILY_THRESHOLDS.gustIncreaseKmh;
  }
  const forecast: WeeklySignalMeasurement = { ...current, value: delta, window: { ...current.window, startDate: previous.date, endDate: fact.date } };
  return makeCandidate({
    detector: "REGIME_CHANGE", family: "REGIME_CHANGE", topicKey: `${fact.metric}:day-to-day:${previous.date}:${fact.date}`, fact, forecast,
    evidence: [{ kind: "REGIME_CHANGE", source: "LOCAL_ARCHIVE", reference: { ...forecast, value: threshold }, explanation: `Évolution entre l'observation locale du ${previous.date} et la prévision du ${fact.date}.` }],
    facts: { direction, previousValue: prior, currentValue: current.value, delta, previousDate: previous.date }
  });
}

function intradayCandidates(payload: OfficialPublicPayloadV24): WeeklySignalCandidate[] {
  const fact: ForecastDailyFact = { date: payload.date, dayIndex: 0, metric: "tmaxC", value: payload.temperatures.maxC, confidence: payload.editorial.facts.confidence };
  const result: WeeklySignalCandidate[] = [];
  const amplitude = payload.temperatures.maxC - payload.temperatures.minC;
  if (amplitude >= DAILY_THRESHOLDS.amplitudeC) {
    const forecast: WeeklySignalMeasurement = { metric: "TEMPERATURE", value: amplitude, unit: "°C", window: { startDate: payload.date, endDate: payload.date, basis: "HOURLY", startHour: 0, endHour: 23 } };
    result.push(makeCandidate({ detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", topicKey: `daily-amplitude:${payload.date}`, fact, forecast, evidence: [{ kind: "INTRADAY_CHANGE", source: "CONSENSUS_FORECAST", direct: true, reference: { ...forecast, value: DAILY_THRESHOLDS.amplitudeC }, explanation: `Seuil moteur documenté : ${DAILY_THRESHOLDS.amplitudeC} °C.` }], facts: { change: "AMPLITUDE", minC: payload.temperatures.minC, maxC: payload.temperatures.maxC } }));
  }
  const hours = [...payload.hourly].sort((a, b) => a.hour - b.hour);
  let strongest: { drop: number; startHour: number; endHour: number } | null = null;
  for (let start = 0; start < hours.length; start++) {
    for (let end = start + 1; end < hours.length; end++) {
      if (hours[end].hour - hours[start].hour > 4) break;
      const drop = hours[start].temperatureC - hours[end].temperatureC;
      if (!strongest || drop > strongest.drop) strongest = { drop, startHour: hours[start].hour, endHour: hours[end].hour };
    }
  }
  if (strongest && strongest.drop >= DAILY_THRESHOLDS.fourHourDropC) {
    const forecast: WeeklySignalMeasurement = { metric: "TEMPERATURE", value: strongest.drop, unit: "°C", window: { startDate: payload.date, endDate: payload.date, basis: "HOURLY", startHour: strongest.startHour, endHour: strongest.endHour } };
    result.push(makeCandidate({ detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", topicKey: `daily-drop:${payload.date}:${strongest.startHour}-${strongest.endHour}`, fact, forecast, evidence: [{ kind: "INTRADAY_CHANGE", source: "CONSENSUS_FORECAST", direct: true, reference: { ...forecast, value: DAILY_THRESHOLDS.fourHourDropC }, explanation: `Seuil moteur documenté : ${DAILY_THRESHOLDS.fourHourDropC} °C en quatre heures maximum.` }], facts: { change: "RAPID_DROP", startHour: strongest.startHour, endHour: strongest.endHour } }));
  }
  return result;
}

function seasonalCandidates(facts: ForecastDailyFact[], archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const result: WeeklySignalCandidate[] = [];
  const byMetric = new Map(facts.map((fact) => [fact.metric, fact]));
  for (const policy of SEASONAL_POLICIES) {
    const fact = byMetric.get(policy.metric);
    if (!fact || !matches(fact.value, policy.operator, policy.threshold)) continue;
    const start = seasonStart(fact.date, policy.seasonStartMonthDay);
    const yesterday = shiftDate(fact.date, -1);
    const expectedDays = Math.max(0, Math.round((Date.parse(`${fact.date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000));
    const observed = archive.filter((row) => row.date >= start && row.date <= yesterday && rawValue(row, policy.metric) !== null);
    if (expectedDays > 0 && observed.length / expectedDays < 0.9) continue;
    const occurrencesBeforeForecast = observed.filter((row) => matches(rawValue(row, policy.metric)!, policy.operator, policy.threshold)).length;
    const reference = buildSeasonalThresholdReference(archive, { metric: policy.metric, operator: policy.operator, threshold: policy.threshold, seasonStartMonthDay: policy.seasonStartMonthDay, targetMonthDay: fact.date.slice(5) });
    const candidate = detectSeasonalFirst({ forecast: fact, operator: policy.operator, threshold: policy.threshold, occurrencesBeforeForecast, reference });
    if (candidate) result.push(candidate);
  }
  return result;
}

/** Builds one optional Story from every defensible daily comparison. */
export function buildDailyComparisonStory(payload: OfficialPublicPayloadV24, archive: ClimateDailyObservation[]): DailyComparisonStory | null {
  if (!archive.length || payload.citySlug !== "tarnos") return null;
  const facts = forecastFacts(payload);
  const candidates: WeeklySignalCandidate[] = [...intradayCandidates(payload)];
  const previous = archive.find((row) => row.date === shiftDate(payload.date, -1));

  for (const fact of facts) {
    const recent = detectRecentExtreme(fact, archive);
    if (recent) candidates.push(recent);
    if (previous) {
      const evolution = previousDayCandidate(fact, previous);
      if (evolution) candidates.push(evolution);
    }
    try {
      if (fact.metric === "tminC" || fact.metric === "tmaxC") {
        const reference = buildDatedTemperatureReference(archive, { metric: fact.metric, targetDate: fact.date });
        candidates.push(...detectClimateDeparture(fact, reference));
        const direction = fact.value >= reference.distribution.p95 ? "HIGH" : fact.value <= reference.distribution.p05 ? "LOW" : null;
        if (direction) {
          const history = detectHistoricalExtreme(fact, archive, direction);
          if (history) candidates.push(history);
        }
      } else {
        const reference = buildDatedDailyMetricReference(archive, { metric: fact.metric, targetDate: fact.date });
        const percentile = percentileCandidate(fact, reference);
        if (percentile) {
          candidates.push(percentile);
          const history = detectHistoricalExtreme(fact, archive, "HIGH");
          if (history) candidates.push(history);
        }
      }
    } catch {
      // An incomplete reference suppresses only the affected comparison.
    }
  }

  try { candidates.push(...seasonalCandidates(facts, archive)); } catch { /* fail closed */ }
  const enriched = candidates.map((candidate) => ({ ...candidate, facts: { ...candidate.facts, stationId: WEEKLY_CLIMATE_STATION_ID, referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION } }));
  const ranking = rankAndDeduplicateWeeklySignals(enriched);
  const winner = ranking.selected[0];
  if (!winner) return null;
  const copy = buildWeeklySignalCopy(winner);
  const chosenVisual = visual(winner.candidate);
  return {
    version: DAILY_COMPARISON_VERSION,
    title: "LE REPÈRE DU JOUR",
    signalId: winner.candidate.signal.id,
    detector: winner.candidate.detector,
    theme: theme(winner.candidate),
    visual: chosenVisual,
    pictogramUrl: complementaryPictogramDataUrl(chosenVisual),
    presentation: buildWeeklyComplementaryPresentation(winner, copy),
    claimStatus: copy.claimStatus,
    sourceNote: copy.sourceNote,
    candidateCount: candidates.length,
    frame: "DAILY_STORY_SHARED_V1"
  };
}

export { DAILY_THRESHOLDS };
