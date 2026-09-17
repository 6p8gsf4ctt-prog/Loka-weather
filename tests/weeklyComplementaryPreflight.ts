import { assertWeeklyComplementaryPreflight, preflightWeeklyComplementarySlides, WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION } from "../src/engine/weekly";
import type { WeeklyComplementarySlidePlan } from "../src/engine/weekly";

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
ok(result.version === WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION && result.ok, "valid_plan_passes");
ok(result.checks.length === 8 && result.checks.every((item) => item.ok), "every_required_gate_is_checked");
ok(assertWeeklyComplementaryPreflight(valid).ok, "assertion_allows_valid_plan");

const badFrame = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, frame: "BROKEN" as "WEEKLY_SHARED_V1" }] });
ok(!badFrame.ok && !badFrame.checks.find((item) => item.id === "frame")?.ok, "shared_frame_is_mandatory");

const overflow = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, primaryLine: "x".repeat(81) }] });
ok(!overflow.ok && !overflow.checks.find((item) => item.id === "copy")?.ok, "bounded_copy_blocks_overflow_before_render");

const repeatedTheme = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]! }, { ...valid.slides[1]!, theme: "TEMPERATURE" }] });
ok(!repeatedTheme.ok && !repeatedTheme.checks.find((item) => item.id === "themes")?.ok, "same_theme_is_not_allowed_twice");

const observedAsForecast = preflightWeeklyComplementarySlides({ ...valid, slides: [{ ...valid.slides[0]!, claimStatus: "OBSERVED", primaryLine: "Jeudi pourrait être particulièrement chaud." }] });
ok(!observedAsForecast.ok && !observedAsForecast.checks.find((item) => item.id === "claim")?.ok, "observation_cannot_use_forecast_language");

console.log(`WEEKLY_COMPLEMENTARY_PREFLIGHT ${passed}/7 PASS`);
