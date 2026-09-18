import {
  buildWeeklySignalCopy,
  scoreWeeklySignalCandidate,
  WEEKLY_EDITORIAL_SIGNAL_VERSION,
  WEEKLY_SIGNAL_COPY_VERSION,
  WEEKLY_SIGNAL_DETECTOR_VERSION
} from "../src/engine/weekly";
import type {
  RankedWeeklySignalCandidate,
  WeeklyEditorialEvidenceKind,
  WeeklyEditorialMetric,
  WeeklyEditorialSignalConfidence,
  WeeklyEditorialSignalFamily,
  WeeklyEditorialSignalMode,
  WeeklySignalCandidate,
  WeeklySignalDetectorKind,
  WeeklySignalWindowBasis
} from "../src/engine/weekly";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_SIGNAL_COPY_FAIL:${label}`);
  passed++;
}

function raw(args: {
  id: string; detector: WeeklySignalDetectorKind; family: WeeklyEditorialSignalFamily;
  facts: WeeklySignalCandidate["facts"];
  metric?: WeeklyEditorialMetric; value?: number; reference?: number; unit?: string;
  date?: string; dayIndex?: number; confidence?: WeeklyEditorialSignalConfidence;
  mode?: WeeklyEditorialSignalMode; evidenceKind?: WeeklyEditorialEvidenceKind;
  basis?: WeeklySignalWindowBasis; startHour?: number; endHour?: number;
  referenceDate?: string;
}): WeeklySignalCandidate {
  const metric = args.metric ?? "TEMPERATURE";
  const unit = args.unit ?? (metric === "TEMPERATURE" ? "°C" : metric === "WIND_GUST" ? "km/h" : metric === "THUNDER" || metric === "VISIBILITY" ? "h" : "mm");
  const date = args.date ?? "2026-09-21";
  const basis = args.basis ?? (metric === "PRECIPITATION" || metric === "THUNDER" || metric === "VISIBILITY" ? "DAILY_TOTAL" : "DAILY_EXTREME");
  const evidenceKind = args.evidenceKind ?? (args.detector === "RECORD_PROXIMITY" ? "RECORD_PROXIMITY" : args.detector === "HISTORICAL_SINCE" ? "HISTORICAL_SINCE" : args.detector === "CLIMATE_ANOMALY" ? "CLIMATE_NORMAL" : args.detector === "EXTREME_PERCENTILE" ? "PERCENTILE" : args.detector === "SEASONAL_FIRST" ? "SEASONAL_FIRST" : args.detector === "IMPACT_PHENOMENON" ? "PHENOMENON" : args.detector === "REGIME_CHANGE" ? "REGIME_CHANGE" : args.detector === "REMARKABLE_SERIES" ? "SERIES" : "INTRADAY_CHANGE");
  const direct = ["PHENOMENON", "REGIME_CHANGE", "INTRADAY_CHANGE"].includes(evidenceKind);
  return {
    detectorVersion: WEEKLY_SIGNAL_DETECTOR_VERSION,
    detector: args.detector,
    facts: args.facts,
    signal: {
      version: WEEKLY_EDITORIAL_SIGNAL_VERSION, id: args.id, role: "NUMBER", family: args.family,
      topicKey: args.id, mode: args.mode ?? "FORECAST", confidence: args.confidence ?? "HIGH", representativeDayIndex: args.dayIndex ?? 0,
      forecast: { metric, value: args.value ?? 31, unit, window: { startDate: date, endDate: date, basis, startHour: args.startHour, endHour: args.endHour } },
      evidence: [{ kind: evidenceKind, source: direct ? "CONSENSUS_FORECAST" : "LOCAL_ARCHIVE", direct, reference: { metric, value: args.reference ?? 29, unit, window: { startDate: args.referenceDate ?? date, endDate: args.referenceDate ?? date, basis, startHour: args.startHour, endHour: args.endHour } }, explanation: "Preuve comparable documentée." }]
    }
  };
}

function selected(candidate: WeeklySignalCandidate): RankedWeeklySignalCandidate {
  const ranked = scoreWeeklySignalCandidate(candidate);
  if (!ranked.eligible) throw new Error(`TEST_CANDIDATE_NOT_ELIGIBLE:${ranked.rejectionReasons.join(",")}`);
  ranked.rank = 1;
  return ranked;
}

const recordForecast = buildWeeklySignalCopy(selected(raw({
  id: "record", detector: "RECORD_PROXIMITY", family: "HISTORICAL", value: 33, reference: 32,
  referenceDate: "2026-06-18", facts: { archiveSize: 12000, recordDate: "2026-06-18", recordValue: 32, forecastBeyondRecord: true }
})));
ok(recordForecast.claimStatus === "IF_CONFIRMED", "future_record_uses_strictest_status");
ok(recordForecast.primaryLine.startsWith("Si les") && recordForecast.primaryLine.includes("pourrait"), "future_record_is_explicitly_conditional");
ok(!/record (battu|établi)/i.test(recordForecast.accessibilityText), "future_record_is_never_announced_as_acquired");

const recordObservation = buildWeeklySignalCopy(selected(raw({
  id: "record-observed", detector: "RECORD_PROXIMITY", family: "HISTORICAL", value: 33, reference: 32,
  mode: "OBSERVATION", referenceDate: "2026-06-18", facts: { archiveSize: 12000, recordDate: "2026-06-18", recordValue: 32, forecastBeyondRecord: true }
})));
ok(recordObservation.claimStatus === "OBSERVED" && recordObservation.primaryLine.includes("ont été observés"), "observation_uses_assertive_past_tense");
ok(!recordObservation.accessibilityText.includes("pourrait"), "observation_has_no_forecast_modal");

const historical = buildWeeklySignalCopy(selected(raw({
  id: "tmaxC:high", detector: "HISTORICAL_SINCE", family: "HISTORICAL", value: 31, reference: 31,
  referenceDate: "2026-06-18", facts: { archiveSize: 12000, daysSince: 95, direction: "HIGH", previousDate: "2026-06-18" }
})));
ok(historical.primaryLine.includes("pourrait") || historical.primaryLine.includes("devrait"), "historical_forecast_remains_modal");
ok(historical.secondaryLine.includes("prévus"), "historical_forecast_identifies_predicted_value");

const anomalyHigh = buildWeeklySignalCopy(selected(raw({
  id: "anomaly", detector: "CLIMATE_ANOMALY", family: "CLIMATE_NORMAL", value: 31, reference: 25,
  facts: { sampleSize: 450, anomalyC: 6, referenceMeanC: 25 }, evidenceKind: "CLIMATE_NORMAL"
})));
ok(anomalyHigh.claimStatus === "EXPECTED" && anomalyHigh.primaryLine.includes("devrait"), "high_confidence_anomaly_uses_expected_modal");
ok(anomalyHigh.primaryLine.includes("référence locale") && !anomalyHigh.primaryLine.includes("normale officielle"), "derived_reference_is_not_called_official_normal");

const anomalyMedium = buildWeeklySignalCopy(selected(raw({
  id: "anomaly-medium", detector: "CLIMATE_ANOMALY", family: "CLIMATE_NORMAL", value: 31, reference: 25,
  confidence: "MEDIUM", facts: { sampleSize: 450, anomalyC: 6, referenceMeanC: 25 }, evidenceKind: "CLIMATE_NORMAL"
})));
ok(anomalyMedium.claimStatus === "POSSIBLE" && anomalyMedium.primaryLine.includes("pourrait"), "medium_confidence_uses_possible_modal");

const percentile = buildWeeklySignalCopy(selected(raw({
  id: "percentile", detector: "EXTREME_PERCENTILE", family: "PERCENTILE", value: 31, reference: 29,
  facts: { sampleSize: 450, percentile: 95, tail: "HIGH" }, evidenceKind: "PERCENTILE"
})));
ok(percentile.primaryLine.includes("5 % des valeurs les plus élevées"), "percentile_is_translated_for_general_public");

const seasonal = buildWeeklySignalCopy(selected(raw({
  id: "seasonal", detector: "SEASONAL_FIRST", family: "SEASONAL_THRESHOLD", value: 31, reference: 30,
  facts: { historicalSeasons: 30, threshold: 30, operator: "GTE" }, evidenceKind: "SEASONAL_FIRST"
})));
ok(seasonal.primaryLine.includes("premier passage au-dessus de 30 °C"), "seasonal_threshold_is_explicit");

const heat = buildWeeklySignalCopy(selected(raw({
  id: "heat", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", value: 38, reference: 35,
  facts: { phenomenon: "STRONG_HEAT" }, evidenceKind: "PHENOMENON"
})));
ok(heat.primaryLine.includes("forte chaleur") && heat.secondaryLine.includes("38 °C"), "impact_heat_copy_is_factual");

const regime = buildWeeklySignalCopy(selected(raw({
  id: "cooling", detector: "REGIME_CHANGE", family: "REGIME_CHANGE", value: -8, reference: -7,
  facts: { direction: "COOLING" }, evidenceKind: "REGIME_CHANGE"
})));
ok(regime.primaryLine.includes("refroidissement") && regime.secondaryLine.includes("8 °C"), "regime_change_copy_keeps_magnitude");

const series = buildWeeklySignalCopy(selected(raw({
  id: "dry-series", detector: "REMARKABLE_SERIES", family: "SERIES", metric: "PRECIPITATION", value: 14, reference: 12, unit: "jours", basis: "SEASON_TO_DATE",
  facts: { operator: "LT", threshold: 1, projectedLength: 14, historicalLongestRun: 12, referenceDays: 10958 }, evidenceKind: "SERIES"
})));
ok(series.primaryLine.includes("14 jours sans pluie significative"), "dry_series_copy_defines_the_sequence");
ok(series.secondaryLine.includes("12 jours"), "series_copy_keeps_historical_reference");
ok(series.claimStatus === "EXPECTED" && series.primaryLine.includes("devrait"), "high_confidence_series_uses_expected_modal");

const intraday = buildWeeklySignalCopy(selected(raw({
  id: "rapid-drop", detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", value: 8, reference: 7,
  basis: "HOURLY", startHour: 15, endHour: 19, facts: { change: "RAPID_DROP", startHour: 15, endHour: 19 }, evidenceKind: "INTRADAY_CHANGE"
})));
ok(intraday.primaryLine.includes("8 °C en quelques heures"), "intraday_copy_stays_within_day_experience");
ok(intraday.secondaryLine.includes("15 h") && intraday.secondaryLine.includes("19 h"), "intraday_copy_keeps_hours");

for (const copy of [recordForecast, recordObservation, historical, anomalyHigh, anomalyMedium, percentile, seasonal, heat, regime, series, intraday]) {
  ok(copy.version === WEEKLY_SIGNAL_COPY_VERSION && copy.primaryLine.length <= 80 && copy.secondaryLine.length <= 120, `copy_contract:${copy.signalId}`);
  ok(copy.accessibilityText === `${copy.primaryLine} ${copy.secondaryLine}`, `accessibility_copy:${copy.signalId}`);
  ok(copy.sourceNote.length > 20, `source_note:${copy.signalId}`);
}

let rejectedBlocked = false;
const rejected = scoreWeeklySignalCandidate(raw({ id: "weak", detector: "HISTORICAL_SINCE", family: "HISTORICAL", facts: { archiveSize: 10, daysSince: 2 } }));
try { buildWeeklySignalCopy(rejected); } catch (error) { rejectedBlocked = error instanceof Error && error.message === "weekly_signal_copy_requires_selected_candidate"; }
ok(rejectedBlocked, "rejected_candidate_cannot_be_written");

let falseObservationBlocked = false;
const falseObservation = selected(raw({
  id: "false-observation", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", mode: "OBSERVATION",
  value: 38, reference: 35, facts: { phenomenon: "STRONG_HEAT" }, evidenceKind: "PHENOMENON"
}));
try { buildWeeklySignalCopy(falseObservation); } catch (error) { falseObservationBlocked = error instanceof Error && error.message === "weekly_signal_copy_observation_requires_observed_source"; }
ok(falseObservationBlocked, "forecast_consensus_cannot_be_relabelled_as_observation");

console.log(`WEEKLY_SIGNAL_COPY ${passed}/54 PASS`);
