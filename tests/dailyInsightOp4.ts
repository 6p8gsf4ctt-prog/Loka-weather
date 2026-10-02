import { CITIES } from "../src/config/cities";
import type { DailyInsightLabPreviewResult } from "../src/dailyInsightLab";
import { dailyInsightOp4Scenarios, renderDailyInsightOp4Gallery } from "../src/ui/dailyInsightOp4Gallery";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_OP4_FAIL:${label}`);
  passed++;
}

const date = "2026-09-30";
const scenarios = dailyInsightOp4Scenarios(CITIES.tarnos, date);
ok(scenarios.length === 8, "eight_editorial_control_cases_exist");
ok(new Set(scenarios.map((scenario) => scenario.group)).size === 4, "four_graphic_structures_are_covered");
ok(scenarios.every((scenario) => scenario.score >= 80 && scenario.story.frame === "DAILY_STORY_SHARED_V1"), "control_cases_use_shared_daily_frame");
ok(new Set(scenarios.map((scenario) => scenario.story.signalId)).size === scenarios.length, "signal_ids_are_unique");
ok(scenarios.some((scenario) => scenario.story.detector === "T08" && scenario.story.presentation.comparison?.right.value === "17 °C"), "hourly_shift_has_explicit_before_after_proof");
ok(scenarios.some((scenario) => scenario.story.detector === "M01"), "coastal_local_signal_is_represented");
ok(scenarios.some((scenario) => scenario.story.detector === "T05" && scenario.story.presentation.headline === "8 °C CE MATIN"), "percentile_case_uses_plain_public_wording");
ok(scenarios.some((scenario) => scenario.story.detector === "T08" && scenario.story.presentation.headline === "10 °C DE MOINS CE SOIR"), "thermal_drop_cannot_be_read_as_minus_ten_degrees");
ok(scenarios.some((scenario) => scenario.story.detector === "T02" && scenario.story.presentation.headline === "34 °C" && scenario.story.presentation.editorialLine === "Une chaleur remarquable pour un début octobre." && scenario.story.sourceNote === "Valeur comparable observée le 18 mars."), "rare_heat_uses_the_validated_reference_composition");

const actual = {
  version: "1.0.0", mode: "LAB_ONLY", citySlug: "tarnos", targetDate: date,
  generatedAt: `${date}T05:00:00.000Z`, status: "READY", detail: "no_eligible_candidate",
  bundle: null,
  selection: {
    version: "1.1.0", mode: "LAB_ONLY", citySlug: "tarnos", targetDate: date,
    generatedAt: `${date}T05:00:00.000Z`, bundleId: "bundle-op4", status: "NO_ELIGIBLE_CANDIDATE",
    publicationThreshold: 70, winner: null, candidates: [],
    audit: { generated: 2, eligible: 0, rejected: 2, rejectionCounts: { SCORE_BELOW_THRESHOLD: 2 }, appliedRotationPenalties: 0 }
  },
  forecast: { snapshotId: "forecast-op4", modelCount: 5, failures: {} },
  persistence: { bundleSaved: true, draftSaved: true, warnings: [] },
  timings: { referenceMs: 1, forecastMs: 5, enrichmentMs: 5, selectionMs: 1, persistenceMs: 1, totalMs: 8 }
} as DailyInsightLabPreviewResult;

const html = renderDailyInsightOp4Gallery(CITIES.tarnos, date, actual);
ok((html.match(/<iframe /g) ?? []).length === 8, "gallery_embeds_all_eight_shared_renderer_stories");
ok(["NIVEAU RARE", "BASCULE HORAIRE", "SÉRIE LOCALE", "REPÈRE UTILE"].every((label) => html.includes(label)), "gallery_labels_the_four_structures");
ok(html.includes("SILENCE ÉDITORIAL") && html.includes("AUCUNE PUBLICATION AUTOMATIQUE"), "real_silence_and_safety_are_visible");
ok(!html.includes("/api/publish") && !html.includes("fetch("), "gallery_has_no_publication_transport");
ok(html.includes("moteur graphique Daily partagé") && !html.includes("dailyInsightStoryRuntime"), "gallery_has_no_independent_graphic_runtime");

console.log(`DAILY_INSIGHT_OP4 ${passed}/14 PASS`);
