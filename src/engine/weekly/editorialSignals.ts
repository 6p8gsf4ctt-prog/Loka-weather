/**
 * Contract-only layer for contextual weekly editorial signals.
 *
 * It deliberately does not fetch or calculate history. A detector may create
 * a signal only once a future reference layer has supplied comparable proof.
 */
export const WEEKLY_EDITORIAL_SIGNAL_VERSION = "1.0.0" as const;

export type WeeklyEditorialSignalRole = "NUMBER" | "PRACTICAL" | "DETAIL";
export type WeeklyEditorialSignalMode = "FORECAST" | "OBSERVATION";
export type WeeklyEditorialSignalConfidence = "HIGH" | "MEDIUM" | "LOW";
export type WeeklyEditorialSignalFamily =
  | "HISTORICAL"
  | "CLIMATE_NORMAL"
  | "PERCENTILE"
  | "SEASONAL_THRESHOLD"
  | "PHENOMENON"
  | "REGIME_CHANGE"
  | "SERIES"
  | "RECENT_CONTEXT"
  | "INTRADAY_CHANGE";

export type WeeklyEditorialMetric =
  | "TEMPERATURE"
  | "PRECIPITATION"
  | "WIND_GUST"
  | "WIND_SPEED"
  | "CLOUD_COVER"
  | "SUNLIGHT"
  | "VISIBILITY"
  | "THUNDER"
  | "FROST"
  | "DAYLIGHT";

export type WeeklySignalWindowBasis = "HOURLY" | "DAILY_EXTREME" | "DAILY_TOTAL" | "WEEKLY_TOTAL" | "SEASON_TO_DATE";
export type WeeklyEditorialEvidenceKind =
  | "HISTORICAL_SINCE"
  | "RECORD_PROXIMITY"
  | "CLIMATE_NORMAL"
  | "PERCENTILE"
  | "SEASONAL_FIRST"
  | "SERIES"
  | "RECENT_EXTREME"
  | "INTRADAY_CHANGE"
  | "PHENOMENON"
  | "REGIME_CHANGE";
export type WeeklyEditorialEvidenceSource = "LOCAL_ARCHIVE" | "CLIMATE_NORMALS_1991_2020" | "CONSENSUS_FORECAST";

export interface WeeklySignalWindow {
  startDate: string;
  endDate: string;
  basis: WeeklySignalWindowBasis;
  /** Required for a comparable hourly value, such as a temperature at 22 h. */
  startHour?: number;
  endHour?: number;
}

export interface WeeklySignalMeasurement {
  metric: WeeklyEditorialMetric;
  value: number;
  unit: string;
  window: WeeklySignalWindow;
}

export interface WeeklyEditorialEvidence {
  kind: WeeklyEditorialEvidenceKind;
  source: WeeklyEditorialEvidenceSource;
  /** The reference compared to the forecast must measure the same phenomenon. */
  reference: WeeklySignalMeasurement;
  explanation: string;
  /** A direct signal is used for phenomenon or regime proof without a normal. */
  direct?: boolean;
}

export interface WeeklyEditorialSignal {
  version: typeof WEEKLY_EDITORIAL_SIGNAL_VERSION;
  id: string;
  role: WeeklyEditorialSignalRole;
  family: WeeklyEditorialSignalFamily;
  /** Used later to make competing claims mutually exclusive. */
  topicKey: string;
  mode: WeeklyEditorialSignalMode;
  confidence: WeeklyEditorialSignalConfidence;
  representativeDayIndex: number;
  forecast: WeeklySignalMeasurement;
  evidence: WeeklyEditorialEvidence[];
}

export interface WeeklyEditorialSignalValidation {
  ok: boolean;
  issues: string[];
}

function isoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validWindow(window: WeeklySignalWindow): boolean {
  const hoursAreBothAbsent = window.startHour === undefined && window.endHour === undefined;
  const hoursAreValid = Number.isInteger(window.startHour) && Number.isInteger(window.endHour)
    && (window.startHour ?? -1) >= 0 && (window.endHour ?? 24) <= 23
    && (window.startHour ?? 24) <= (window.endHour ?? -1);
  return isoDate(window.startDate)
    && isoDate(window.endDate)
    && window.startDate <= window.endDate
    && (hoursAreBothAbsent || hoursAreValid)
    && (window.basis !== "HOURLY" || hoursAreValid);
}

function comparable(forecast: WeeklySignalMeasurement, reference: WeeklySignalMeasurement): boolean {
  const sameMetric = forecast.metric === reference.metric;
  const sameUnit = forecast.unit === reference.unit;
  const sameBasis = forecast.window.basis === reference.window.basis;
  const sameHourlyWindow = forecast.window.basis !== "HOURLY"
    || (forecast.window.startHour === reference.window.startHour && forecast.window.endHour === reference.window.endHour);
  return sameMetric && sameUnit && sameBasis && sameHourlyWindow;
}

/** Blocks raw values, incompatible comparisons and cross-day pseudo-amplitudes. */
export function validateWeeklyEditorialSignal(signal: WeeklyEditorialSignal): WeeklyEditorialSignalValidation {
  const issues: string[] = [];
  if (signal.version !== WEEKLY_EDITORIAL_SIGNAL_VERSION) issues.push("version");
  if (!signal.id.trim() || !signal.topicKey.trim()) issues.push("identity");
  if (signal.representativeDayIndex < 0 || signal.representativeDayIndex > 6 || !Number.isInteger(signal.representativeDayIndex)) issues.push("representative_day");
  if (!Number.isFinite(signal.forecast.value) || !signal.forecast.unit.trim() || !validWindow(signal.forecast.window)) issues.push("forecast_measurement");
  if (!signal.evidence.length) issues.push("context_required");

  for (const proof of signal.evidence) {
    if (!proof.explanation.trim() || !validWindow(proof.reference.window) || !Number.isFinite(proof.reference.value) || !proof.reference.unit.trim()) {
      issues.push(`evidence_shape:${proof.kind}`);
      continue;
    }
    if (!comparable(signal.forecast, proof.reference)) issues.push(`non_comparable:${proof.kind}`);
    if (proof.kind === "INTRADAY_CHANGE" && signal.forecast.window.startDate !== signal.forecast.window.endDate) {
      issues.push("intraday_must_stay_within_one_day");
    }
    if (proof.kind === "PHENOMENON" || proof.kind === "REGIME_CHANGE" || proof.kind === "INTRADAY_CHANGE") {
      const observedDayComparison = proof.kind === "REGIME_CHANGE" && proof.source === "LOCAL_ARCHIVE" && proof.direct !== true;
      if (!observedDayComparison && (!proof.direct || proof.source !== "CONSENSUS_FORECAST")) issues.push(`direct_consensus_proof_required:${proof.kind}`);
    } else if (proof.source === "CONSENSUS_FORECAST") {
      issues.push(`reference_source_required:${proof.kind}`);
    }
  }
  return { ok: issues.length === 0, issues };
}
