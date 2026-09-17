import {
  rankAndDeduplicateWeeklySignals,
  scoreWeeklySignalCandidate,
  WEEKLY_EDITORIAL_SIGNAL_VERSION,
  WEEKLY_SIGNAL_DETECTOR_VERSION,
  WEEKLY_SIGNAL_MIN_TOTAL_SCORE,
  WEEKLY_SIGNAL_RANKING_VERSION
} from "../src/engine/weekly";
import type {
  WeeklyEditorialEvidenceKind,
  WeeklyEditorialMetric,
  WeeklyEditorialSignalConfidence,
  WeeklyEditorialSignalFamily,
  WeeklySignalCandidate,
  WeeklySignalDetectorKind
} from "../src/engine/weekly";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_SIGNAL_RANKING_FAIL:${label}`);
  passed++;
}

function candidate(args: {
  id: string;
  detector: WeeklySignalDetectorKind;
  family: WeeklyEditorialSignalFamily;
  metric?: WeeklyEditorialMetric;
  dayIndex?: number;
  date?: string;
  value?: number;
  reference?: number;
  confidence?: WeeklyEditorialSignalConfidence;
  facts?: WeeklySignalCandidate["facts"];
  evidenceKind?: WeeklyEditorialEvidenceKind;
  direct?: boolean;
}): WeeklySignalCandidate {
  const metric = args.metric ?? "TEMPERATURE";
  const date = args.date ?? "2026-09-21";
  const unit = metric === "TEMPERATURE" ? "°C" : metric === "WIND_GUST" ? "km/h" : metric === "THUNDER" ? "h" : "mm";
  const basis = metric === "PRECIPITATION" || metric === "THUNDER" ? "DAILY_TOTAL" as const : "DAILY_EXTREME" as const;
  const evidenceKind = args.evidenceKind ?? (args.detector === "IMPACT_PHENOMENON" ? "PHENOMENON" : args.detector === "REGIME_CHANGE" ? "REGIME_CHANGE" : args.detector === "CLIMATE_ANOMALY" ? "CLIMATE_NORMAL" : args.detector === "EXTREME_PERCENTILE" ? "PERCENTILE" : args.detector === "RECORD_PROXIMITY" ? "RECORD_PROXIMITY" : "HISTORICAL_SINCE");
  const direct = args.direct ?? ["PHENOMENON", "REGIME_CHANGE", "INTRADAY_CHANGE"].includes(evidenceKind);
  return {
    detectorVersion: WEEKLY_SIGNAL_DETECTOR_VERSION,
    detector: args.detector,
    facts: args.facts ?? {},
    signal: {
      version: WEEKLY_EDITORIAL_SIGNAL_VERSION,
      id: args.id,
      role: args.detector === "IMPACT_PHENOMENON" ? "PRACTICAL" : "NUMBER",
      family: args.family,
      topicKey: args.id,
      mode: "FORECAST",
      confidence: args.confidence ?? "HIGH",
      representativeDayIndex: args.dayIndex ?? 0,
      forecast: { metric, value: args.value ?? 35, unit, window: { startDate: date, endDate: date, basis } },
      evidence: [{ kind: evidenceKind, source: direct ? "CONSENSUS_FORECAST" : "LOCAL_ARCHIVE", direct, reference: { metric, value: args.reference ?? 30, unit, window: { startDate: date, endDate: date, basis } }, explanation: "Preuve comparable de test." }]
    }
  };
}

const heat = candidate({ id: "heat", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", value: 38, reference: 35, facts: { phenomenon: "STRONG_HEAT" } });
const heatScore = scoreWeeklySignalCandidate(heat);
ok(heatScore.scores.importance === 5 && heatScore.priorityTier === 1, "impact_signal_has_top_importance");
ok(heatScore.scores.total >= WEEKLY_SIGNAL_MIN_TOTAL_SCORE && heatScore.eligible, "strong_high_confidence_signal_is_eligible");
ok(Object.values(heatScore.scores).every((value) => value >= 0 && value <= 25), "score_values_are_bounded");
ok(Object.values(heatScore.scoringReasons).every((value) => value.length > 0), "every_dimension_is_explained");

const lowConfidence = scoreWeeklySignalCandidate(candidate({ ...{ id: "low", detector: "IMPACT_PHENOMENON", family: "PHENOMENON" as const }, confidence: "LOW", facts: { phenomenon: "STRONG_WIND" } }));
ok(!lowConfidence.eligible && lowConfidence.rejectionReasons.includes("LOW_CONFIDENCE"), "low_confidence_is_a_hard_rejection");

const shallowRecord = scoreWeeklySignalCandidate(candidate({ id: "record-shallow", detector: "RECORD_PROXIMITY", family: "HISTORICAL", facts: { archiveSize: 100, forecastBeyondRecord: true } }));
ok(!shallowRecord.eligible && shallowRecord.rejectionReasons.includes("INSUFFICIENT_REFERENCE_DEPTH"), "record_requires_sufficient_archive_depth");

const undocumentedPercentile = scoreWeeklySignalCandidate(candidate({ id: "percentile-no-sample", detector: "EXTREME_PERCENTILE", family: "PERCENTILE", facts: { percentile: 95 }, evidenceKind: "PERCENTILE" }));
ok(!undocumentedPercentile.eligible && undocumentedPercentile.rejectionReasons.includes("INSUFFICIENT_REFERENCE_DEPTH"), "percentile_requires_documented_sample_size");

const trivialSince = scoreWeeklySignalCandidate(candidate({ id: "since-short", detector: "HISTORICAL_SINCE", family: "HISTORICAL", facts: { archiveSize: 2000, daysSince: 12 } }));
ok(!trivialSince.eligible && trivialSince.rejectionReasons.includes("TRIVIAL_HISTORICAL_INTERVAL"), "short_historical_interval_is_rejected");

const substantialSince = scoreWeeklySignalCandidate(candidate({ id: "since-long", detector: "HISTORICAL_SINCE", family: "HISTORICAL", facts: { archiveSize: 2000, daysSince: 400 } }));
ok(substantialSince.eligible && substantialSince.scores.rarity === 5, "long_historical_interval_is_rare_and_eligible");

const anomaly = candidate({ id: "temp-anomaly", detector: "CLIMATE_ANOMALY", family: "CLIMATE_NORMAL", value: 31, reference: 20, facts: { anomalyC: 11, referenceMeanC: 20, sampleSize: 450 }, evidenceKind: "CLIMATE_NORMAL" });
const percentile = candidate({ id: "temp-percentile", detector: "EXTREME_PERCENTILE", family: "PERCENTILE", value: 31, reference: 29, facts: { percentile: 95, sampleSize: 450 }, evidenceKind: "PERCENTILE" });
const climateResult = rankAndDeduplicateWeeklySignals([percentile, anomaly]);
ok(climateResult.selected.length === 1, "same_temperature_event_keeps_one_context");
ok(climateResult.rejected[0].rejectionReasons.includes("COMPETING_EVENT"), "competing_context_is_traceably_suppressed");
ok(climateResult.rejected[0].suppressedById === climateResult.selected[0].candidate.signal.id, "suppressed_candidate_points_to_winner");

const duplicateHeat = { ...heat, signal: { ...heat.signal, id: "heat-copy", topicKey: "heat-copy" } };
const duplicateResult = rankAndDeduplicateWeeklySignals([heat, duplicateHeat]);
ok(duplicateResult.selected.length === 1 && duplicateResult.rejected.some((item) => item.rejectionReasons.includes("DUPLICATE_PROOF")), "identical_proof_is_deduplicated");

const rain = candidate({ id: "rain", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", metric: "PRECIPITATION", dayIndex: 2, date: "2026-09-23", value: 28, reference: 20, facts: { phenomenon: "HEAVY_RAIN" } });
const thunder = candidate({ id: "thunder", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", metric: "THUNDER", dayIndex: 2, date: "2026-09-23", value: 4, reference: 2, facts: { phenomenon: "THUNDER" } });
const wetResult = rankAndDeduplicateWeeklySignals([rain, thunder]);
ok(wetResult.selected.length === 1 && wetResult.rejected[0].rejectionReasons.includes("COMPETING_EVENT"), "rain_and_thunder_same_day_share_wet_event");

const wind = candidate({ id: "wind", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", metric: "WIND_GUST", dayIndex: 3, date: "2026-09-24", value: 90, reference: 70, facts: { phenomenon: "STRONG_WIND" } });
const diverse = rankAndDeduplicateWeeklySignals([heat, rain, wind]);
ok(diverse.selected.length === 3, "distinct_days_and_themes_survive_deduplication");
ok(diverse.selected.every((item, index) => item.rank === index + 1), "selected_candidates_receive_contiguous_ranks");
ok(diverse.version === WEEKLY_SIGNAL_RANKING_VERSION && diverse.inputCount === 3, "ranking_result_is_versioned_and_auditable");

const reversed = rankAndDeduplicateWeeklySignals([wind, rain, heat]);
ok(diverse.selected.map((item) => item.candidate.signal.id).join() === reversed.selected.map((item) => item.candidate.signal.id).join(), "ranking_is_input_order_independent");

console.log(`WEEKLY_SIGNAL_RANKING ${passed}/18 PASS`);
