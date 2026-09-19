import {
  buildWeeklyComplementarySlides,
  rankAndDeduplicateWeeklySignals,
  scoreWeeklySignalCandidate,
  WEEKLY_COMPLEMENTARY_SLIDES_VERSION,
  WEEKLY_EDITORIAL_SIGNAL_VERSION,
  WEEKLY_SIGNAL_DETECTOR_VERSION
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
  if (!value) throw new Error(`WEEKLY_COMPLEMENTARY_SLIDES_FAIL:${label}`);
  passed++;
}

function candidate(args: {
  id: string; detector: WeeklySignalDetectorKind; family: WeeklyEditorialSignalFamily; metric: WeeklyEditorialMetric;
  dayIndex: number; date: string; value: number; reference: number; facts: WeeklySignalCandidate["facts"];
  unit?: string; confidence?: WeeklyEditorialSignalConfidence; evidenceKind?: WeeklyEditorialEvidenceKind;
}): WeeklySignalCandidate {
  const unit = args.unit ?? (args.metric === "TEMPERATURE" ? "°C" : args.metric === "WIND_GUST" ? "km/h" : args.metric === "THUNDER" ? "h" : "mm");
  const basis = args.metric === "PRECIPITATION" || args.metric === "THUNDER" ? "DAILY_TOTAL" as const : "DAILY_EXTREME" as const;
  const evidenceKind = args.evidenceKind ?? (args.detector === "HISTORICAL_SINCE" ? "HISTORICAL_SINCE" : args.detector === "SEASONAL_FIRST" ? "SEASONAL_FIRST" : args.detector === "IMPACT_PHENOMENON" ? "PHENOMENON" : "INTRADAY_CHANGE");
  const direct = ["PHENOMENON", "REGIME_CHANGE", "INTRADAY_CHANGE"].includes(evidenceKind);
  return {
    detectorVersion: WEEKLY_SIGNAL_DETECTOR_VERSION, detector: args.detector, facts: args.facts,
    signal: {
      version: WEEKLY_EDITORIAL_SIGNAL_VERSION, id: args.id, role: "NUMBER", family: args.family, topicKey: args.id,
      mode: "FORECAST", confidence: args.confidence ?? "HIGH", representativeDayIndex: args.dayIndex,
      forecast: { metric: args.metric, value: args.value, unit, window: { startDate: args.date, endDate: args.date, basis } },
      evidence: [{ kind: evidenceKind, source: direct ? "CONSENSUS_FORECAST" : "LOCAL_ARCHIVE", direct, reference: { metric: args.metric, value: args.reference, unit, window: { startDate: args.date, endDate: args.date, basis } }, explanation: "Preuve comparable documentée." }]
    }
  };
}

const signature = candidate({ id: "signature-temp", detector: "HISTORICAL_SINCE", family: "HISTORICAL", metric: "TEMPERATURE", dayIndex: 0, date: "2026-09-21", value: 31, reference: 30, facts: { archiveSize: 5000, daysSince: 180, direction: "HIGH", previousDate: "2026-03-25" } });
const practical = candidate({ id: "practical-rain", detector: "IMPACT_PHENOMENON", family: "PHENOMENON", metric: "PRECIPITATION", dayIndex: 2, date: "2026-09-23", value: 28, reference: 20, facts: { phenomenon: "HEAVY_RAIN" }, evidenceKind: "PHENOMENON" });
const detail = candidate({ id: "detail-wind", detector: "SEASONAL_FIRST", family: "SEASONAL_THRESHOLD", metric: "WIND_GUST", dayIndex: 4, date: "2026-09-25", value: 75, reference: 70, facts: { historicalSeasons: 30, threshold: 70, operator: "GTE" }, evidenceKind: "SEASONAL_FIRST" });
const duplicateThemeDetail = candidate({ id: "detail-temp", detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", metric: "TEMPERATURE", dayIndex: 5, date: "2026-09-26", value: 16, reference: 14, facts: { change: "AMPLITUDE", minC: 10, maxC: 26 }, evidenceKind: "INTRADAY_CHANGE" });
const ranked = rankAndDeduplicateWeeklySignals([signature, practical, detail, duplicateThemeDetail]);
const plan = buildWeeklyComplementarySlides(ranked.selected);

ok(plan.version === WEEKLY_COMPLEMENTARY_SLIDES_VERSION && plan.inputSignals === 4, "plan_is_versioned_and_receives_ranked_signals");
ok(plan.slides.map((slide) => `${slide.position}:${slide.role}:${slide.signalId}`).join(",") === "2:NUMBER:signature-temp,3:PRACTICAL:practical-rain,4:DETAIL:detail-wind", "roles_are_assigned_in_complementary_order");
ok(plan.slides.map((slide) => slide.title).join(",") === "LE CHIFFRE DE LA SEMAINE,À SAVOIR CETTE SEMAINE,LE DÉTAIL À REMARQUER", "fixed_editorial_titles_are_applied");
ok(plan.slides.every((slide) => slide.frame === "WEEKLY_SHARED_V1"), "every_slide_requires_shared_graphic_frame");
ok(new Set(plan.slides.map((slide) => slide.theme)).size === plan.slides.length, "selected_slides_never_repeat_a_meteorological_theme");
ok(plan.omittedSignalIds.includes("detail-temp"), "same_theme_detail_is_omitted_after_number_temperature_signal");
ok(plan.slides[0].displayValue === "31 °C" && plan.slides[1].visual === "RAIN" && plan.slides[2].visual === "WIND", "display_value_and_visual_hints_follow_signal_data");
ok(plan.slides.every((slide) => slide.primaryLine.length <= 80 && slide.secondaryLine.length <= 120 && slide.sourceNote.length > 20), "copy_contract_is_preserved_through_slide_assignment");

const onlyPractical = rankAndDeduplicateWeeklySignals([practical]);
const onlyPracticalPlan = buildWeeklyComplementarySlides(onlyPractical.selected);
ok(onlyPracticalPlan.slides.length === 1 && onlyPracticalPlan.slides[0].position === 2 && onlyPracticalPlan.slides[0].role === "NUMBER", "single_important_phenomenon_becomes_adaptive_number_slide");

const signatureAndDetail = rankAndDeduplicateWeeklySignals([signature, detail]);
const compactPlan = buildWeeklyComplementarySlides(signatureAndDetail.selected);
ok(compactPlan.slides.map((slide) => `${slide.position}:${slide.role}`).join(",") === "2:NUMBER,3:DETAIL", "detail_moves_up_when_no_practical_signal_exists");

const rejected = scoreWeeklySignalCandidate(candidate({ id: "rejected", detector: "HISTORICAL_SINCE", family: "HISTORICAL", metric: "TEMPERATURE", dayIndex: 0, date: "2026-09-21", value: 20, reference: 20, facts: { archiveSize: 10, daysSince: 2, direction: "HIGH", previousDate: "2026-09-19" } }));
let rejectedBlocked = false;
try { buildWeeklyComplementarySlides([rejected]); } catch (error) { rejectedBlocked = error instanceof Error && error.message === "weekly_complementary_slides_requires_selected_signals"; }
ok(rejectedBlocked, "rejected_or_unranked_signal_cannot_reach_a_slide");

const empty = buildWeeklyComplementarySlides([]);
ok(empty.slides.length === 0 && empty.omittedSignalIds.length === 0, "calm_week_creates_no_complementary_slide");

const anomaly = candidate({ id: "anomaly", detector: "CLIMATE_ANOMALY", family: "CLIMATE_NORMAL", metric: "TEMPERATURE", dayIndex: 3, date: "2026-09-24", value: 28.5, reference: 22.6, facts: { anomalyC: 5.9, referenceMeanC: 22.6, sampleSize: 500 } });
const anomalyScored = scoreWeeklySignalCandidate(anomaly);
const anomalySlide = buildWeeklyComplementarySlides([{ ...anomalyScored, eligible: true, rejectionReasons: [], rank: 1 }]).slides[0]!;
ok(anomalySlide.presentation?.headline === "+5,9 °C" && anomalySlide.presentation.subtitle === "AU-DESSUS DE LA NORMALE À TARNOS" && anomalySlide.presentation.comparison?.left.value === "28,5 °C" && anomalySlide.presentation.comparison.right.value === "22,6 °C", "anomaly_promotes_the_difference_and_keeps_raw_values_as_comparison");

const amplitude = candidate({ id: "amplitude", detector: "INTRADAY_CHANGE", family: "INTRADAY_CHANGE", metric: "TEMPERATURE", dayIndex: 3, date: "2026-09-24", value: 15.3, reference: 12, facts: { change: "AMPLITUDE", minC: 14.7, maxC: 30 } });
const amplitudeScored = scoreWeeklySignalCandidate(amplitude);
const amplitudeSlide = buildWeeklyComplementarySlides([{ ...amplitudeScored, eligible: true, rejectionReasons: [], rank: 1 }]).slides[0]!;
ok(amplitudeSlide.presentation?.headline === "15,3 °C" && amplitudeSlide.presentation.subtitle.includes("MATIN") && amplitudeSlide.presentation.comparison?.left.value === "14,7 °C" && amplitudeSlide.presentation.comparison.right.value === "30 °C", "amplitude_explains_the_story_with_morning_and_afternoon_values");

ok([anomalySlide, amplitudeSlide].every((slide) => (slide.presentation?.editorialLine.split(/\s+/).length ?? 99) <= 25 && !slide.presentation?.editorialLine.includes("\n")), "social_slides_keep_one_short_editorial_sentence");

console.log(`WEEKLY_COMPLEMENTARY_SLIDES ${passed}/15 PASS`);
