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
ok(scenarios.every((scenario) => scenario.score >= 80 && scenario.model.city === "Tarnos"), "control_cases_are_strong_and_local");
ok(new Set(scenarios.map((scenario) => scenario.model.canvasId)).size === scenarios.length, "canvas_ids_are_unique");
ok(scenarios.some((scenario) => scenario.model.detectorId === "T08" && scenario.model.evidence.length === 3), "hourly_shift_has_explicit_before_after_proof");
ok(scenarios.some((scenario) => scenario.model.detectorId === "M01"), "coastal_local_signal_is_represented");

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
ok((html.match(/<canvas /g) ?? []).length === 8, "gallery_renders_all_eight_stories");
ok(["NIVEAU RARE", "BASCULE HORAIRE", "SÉRIE LOCALE", "REPÈRE UTILE"].every((label) => html.includes(label)), "gallery_labels_the_four_structures");
ok(html.includes("SILENCE ÉDITORIAL") && html.includes("AUCUNE PUBLICATION AUTOMATIQUE"), "real_silence_and_safety_are_visible");
ok(!html.includes("/api/publish") && !html.includes("fetch("), "gallery_has_no_publication_transport");
const runtime = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(runtime) && (() => { try { new Function(runtime!); return true; } catch { return false; } })(), "gallery_runtime_is_syntactically_valid");

console.log(`DAILY_INSIGHT_OP4 ${passed}/11 PASS`);
