import { assertWeeklyComplementaryPreflight, preflightWeeklyComplementarySlides, WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION } from "../src/engine/weekly";
import type { WeeklyComplementaryPreflightContext, WeeklyComplementarySlidePlan, WeeklyProfileSet } from "../src/engine/weekly";
import { CITIES } from "../src/config/cities";
import { generateWeeklyContextualVisualPreview } from "../src/weeklyPipeline";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_COMPLEMENTARY_PREFLIGHT_FAIL:${label}`);
  passed++;
}

const valid: WeeklyComplementarySlidePlan = {
  version: "1.0.0", inputSignals: 3, omittedSignalIds: [], slides: [
    { version: "1.0.0", position: 2, role: "NUMBER", title: "LE CHIFFRE DE LA SEMAINE", signalId: "warm", detector: "HISTORICAL_SINCE", theme: "TEMPERATURE", visual: "THERMOMETER", displayValue: "31 °C", primaryLine: "Jeudi devrait être particulièrement chaud.", secondaryLine: "Référence locale cohérente à cette date.", claimStatus: "EXPECTED", sourceNote: "Archive locale comparable et consensus multi-modèles.", frame: "WEEKLY_SHARED_V1" },
    { version: "1.0.0", position: 3, role: "PRACTICAL", title: "À SAVOIR CETTE SEMAINE", signalId: "rain", detector: "IMPACT_PHENOMENON", theme: "WET_WEATHER", visual: "RAIN", displayValue: "28 mm", primaryLine: "Des pluies marquées sont attendues mercredi.", secondaryLine: "Le cumul quotidien pourrait devenir notable.", claimStatus: "POSSIBLE", sourceNote: "Consensus de prévision et seuil d'impact local documenté.", frame: "WEEKLY_SHARED_V1" },
    { version: "1.0.0", position: 4, role: "DETAIL", title: "LE DÉTAIL À REMARQUER", signalId: "series", detector: "REMARKABLE_SERIES", theme: "LIGHT", visual: "SUN", displayValue: "6 jours", primaryLine: "Une série sèche devrait se prolonger.", secondaryLine: "Le compteur repose sur les observations comparables.", claimStatus: "EXPECTED", sourceNote: "Série locale définie sur un seuil journalier documenté.", frame: "WEEKLY_SHARED_V1" }
  ]
};

const result = preflightWeeklyComplementarySlides(valid);
ok(result.version === WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION && result.ok && !result.comprehensive, "valid_structural_plan_passes_without_authorizing_publication");
ok(result.checks.length === 12 && result.checks.every((item) => item.ok), "every_required_gate_is_checked");
ok(assertWeeklyComplementaryPreflight(valid).ok, "assertion_allows_valid_plan");

const badFrame = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, frame: "BROKEN" as "WEEKLY_SHARED_V1" }] });
ok(!badFrame.ok && !badFrame.checks.find((item) => item.id === "frame")?.ok, "shared_frame_is_mandatory");

const overflow = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, primaryLine: "x".repeat(81) }] });
ok(!overflow.ok && !overflow.checks.find((item) => item.id === "copy")?.ok, "bounded_copy_blocks_overflow_before_render");

const repeatedTheme = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]! }, { ...valid.slides[1]!, theme: "TEMPERATURE" }] });
ok(!repeatedTheme.ok && !repeatedTheme.checks.find((item) => item.id === "themes")?.ok, "same_theme_is_not_allowed_twice");

const observedAsForecast = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, claimStatus: "OBSERVED", primaryLine: "Jeudi pourrait être particulièrement chaud." }] });
ok(!observedAsForecast.ok && !observedAsForecast.checks.find((item) => item.id === "claim")?.ok, "observation_cannot_use_forecast_language");

const wrongPictogram = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, visual: "RAIN" }] });
ok(!wrongPictogram.ok && !wrongPictogram.checks.find((item) => item.id === "pictograms")?.ok, "pictogram_must_be_official_and_match_its_theme");

const canvasOverflow = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, primaryLine: "W".repeat(80) }] });
ok(!canvasOverflow.ok && canvasOverflow.checks.find((item) => item.id === "copy")?.ok === false && !canvasOverflow.checks.find((item) => item.id === "overflow")?.ok, "social_copy_and_canvas_both_block_unbreakable_text");

let fingerprintBlocked = false;
try {
  assertWeeklyComplementaryPreflight({ ...valid, slides: [{ ...valid.slides[0]!, displayValue: "32 °C" }] }, undefined, result);
} catch (error) {
  fingerprintBlocked = error instanceof Error && error.message === "weekly_complementary_preflight_failed:fingerprint";
}
ok(fingerprintBlocked, "prepared_report_cannot_be_reused_for_a_modified_plan");

const generated = generateWeeklyContextualVisualPreview(CITIES.tarnos!, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
const integrated = generated.contextual.preflight;
ok(integrated.ok && integrated.comprehensive, "real_contextual_pipeline_produces_comprehensive_preflight");
ok(["weather", "ties", "source", "pictograms", "overflow"].every((id) => integrated.checks.find((item) => item.id === id)?.ok), "data_and_render_guards_pass_together_before_render");

const signalValue = (date: string, metric: string): number => generated.contextual.ranking.selected
  .find((item) => item.candidate.signal.forecast.window.startDate === date && item.candidate.signal.forecast.metric === metric)
  ?.candidate.signal.forecast.value ?? 0;
const profiles = {
  version: "0.1.0", citySlug: "tarnos", forecastDays: 7,
  startDate: generated.editorial.startDate, endDate: generated.editorial.endDate,
  days: generated.editorial.dailySummaries.map((day) => ({
    version: "0.1.0", citySlug: "tarnos", date: day.date, dayIndex: day.dayIndex,
    hours: [], daylight: {}, sceneDecision: {},
    fullDay: {
      pointCount: 24, minTemperatureC: day.minTemperatureC, maxTemperatureC: day.maxTemperatureC,
      meanTemperatureC: (day.minTemperatureC + day.maxTemperatureC) / 2,
      minApparentTemperatureC: day.minTemperatureC, maxApparentTemperatureC: day.maxTemperatureC,
      precipitation: { totalMm: signalValue(day.date, "PRECIPITATION"), wetHours: 0, wetBlockMaxHours: 0, wetBreakCount: 0, dryGapMaxHours: 24, maxHourlyMm: 0, supportPeak: 0 },
      wind: { notableHours: 0, strongHours: 0, notableBlockMaxHours: 0, strongBlockMaxHours: 0, maxGustKmh: signalValue(day.date, "WIND_GUST"), maxSpeedKmh: 0 },
      thunderHours: signalValue(day.date, "THUNDER"), fogHours: signalValue(day.date, "VISIBILITY"),
      modelCountMin: 5, modelCountMean: 5, temperatureSpreadMeanC: 0, temperatureSpreadMaxC: 0
    }
  }))
} as unknown as WeeklyProfileSet;
const context: WeeklyComplementaryPreflightContext = {
  profiles, ranking: generated.contextual.ranking, climateStatus: generated.contextual.climateStatus
};
const reconstructed = preflightWeeklyComplementarySlides(generated.contextual.slides, context);
ok(reconstructed.ok && reconstructed.comprehensive, "complete_report_can_be_reproduced_from_profiles_and_ranking");

const weatherMismatch = structuredClone(context);
const heatSignal = generated.contextual.slides.slides.find((slide) => slide.theme === "TEMPERATURE")!;
const heatRanked = weatherMismatch.ranking.selected.find((item) => item.candidate.signal.id === heatSignal.signalId)!;
weatherMismatch.profiles.days[heatRanked.candidate.signal.representativeDayIndex]!.fullDay.maxTemperatureC += 1;
const badWeather = preflightWeeklyComplementarySlides(generated.contextual.slides, weatherMismatch);
ok(!badWeather.checks.find((item) => item.id === "weather")?.ok, "weather_mismatch_blocks_render");

const badSourceContext = structuredClone(context);
const firstSignal = badSourceContext.ranking.selected.find((item) => item.candidate.signal.id === generated.contextual.slides.slides[0]!.signalId)!;
firstSignal.candidate.signal.evidence[0]!.source = "LOCAL_ARCHIVE";
firstSignal.candidate.signal.evidence[0]!.direct = false;
const badSource = preflightWeeklyComplementarySlides(generated.contextual.slides, badSourceContext);
ok(!badSource.checks.find((item) => item.id === "source")?.ok, "untraceable_source_blocks_render");

const tieContext = structuredClone(context);
const tiePlan = structuredClone(generated.contextual.slides);
const tieHeatSlide = tiePlan.slides.find((slide) => slide.theme === "TEMPERATURE")!;
const tieHeatSignal = tieContext.ranking.selected.find((item) => item.candidate.signal.id === tieHeatSlide.signalId)!;
const tieValue = tieHeatSignal.candidate.signal.forecast.value;
const otherDay = tieContext.profiles.days.find((day) => day.dayIndex !== tieHeatSignal.candidate.signal.representativeDayIndex)!;
otherDay.fullDay.maxTemperatureC = tieValue;
tieHeatSlide.primaryLine = "Mardi devrait être le plus chaud de la semaine.";
const maskedTie = preflightWeeklyComplementarySlides(tiePlan, tieContext);
ok(!maskedTie.checks.find((item) => item.id === "ties")?.ok, "masked_exact_tie_blocks_superlative_copy");

console.log(`WEEKLY_COMPLEMENTARY_PREFLIGHT ${passed}/16 PASS`);
