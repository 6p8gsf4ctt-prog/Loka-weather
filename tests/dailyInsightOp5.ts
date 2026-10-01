import { DAILY_INSIGHT_SELECTION_VERSION, type DailyInsightSelectionResult } from "../src/engine/dailyInsight/editorialSelection";
import { evaluateDailyInsightOp5 } from "../src/engine/dailyInsight/op5Rollout";
import { renderDailyInsightOp5Story } from "../src/ui/dailyInsightOp5Story";
import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_OP5_FAIL:${label}`);
  passed++;
}

const candidate: DailyInsightSelectionResult["winner"] = {
  id: "2026-09-30:T08", detectorId: "T08", topicKey: "temperature_shift", family: "TEMPERATURE", priority: "P0",
  format: "F2_EVOLUTION_RAPIDE", claim: "EXPECTED_HIGH", valueLabel: "−10 °C", headline: "Grosse chute des températures ce soir.",
  proofLine: "10 °C de moins en seulement trois heures.", evidence: [{ source: "LOKA_CONSENSUS", metric: "variation", value: -10, unit: "°C", window: "20 h → 23 h", detail: "test" }],
  score: { rarity: 20, magnitude: 20, utility: 20, localSpecificity: 15, clarity: 10, confidence: 10, base: 95, penalties: [], final: 95 },
  eligible: true, rejectionReasons: [], trace: { threshold: "drop >= 8", observed: "-10", sourceKeys: ["forecast"] }
};
const selected: DailyInsightSelectionResult = {
  version: DAILY_INSIGHT_SELECTION_VERSION, mode: "LAB_ONLY", citySlug: "tarnos", targetDate: "2026-09-30",
  generatedAt: "2026-09-30T05:45:00.000Z", bundleId: "bundle-test", status: "SELECTED", publicationThreshold: 70,
  winner: candidate, candidates: [candidate!], audit: { generated: 1, eligible: 1, rejected: 0, rejectionCounts: {}, appliedRotationPenalties: 0 }
};
const ready = { status: "READY" as const, detail: "ready", selection: selected };
const now = new Date("2026-09-30T06:00:00.000Z");

function payload(): OfficialPublicPayloadV24 {
  const points = canonicalPoints(3 as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test", latitude: 0, longitude: 0, hourly: []
  }));
  const product = buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
  product.date = "2026-09-30";
  return product;
}

ok(evaluateDailyInsightOp5({}, ready, now).mode === "LEGACY_FALLBACK", "disabled_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true", DAILY_INSIGHT_OP5_ROLLBACK: "true" }, ready, now).mode === "LEGACY_FALLBACK", "rollback_has_priority");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, { status: "UNAVAILABLE", detail: "missing", selection: null }, now).mode === "LEGACY_FALLBACK", "missing_cache_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true", DAILY_INSIGHT_OP5_MAX_DRAFT_AGE_HOURS: "12" }, ready, new Date("2026-10-01T00:00:00Z")).mode === "LEGACY_FALLBACK", "stale_cache_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, ready, now).mode === "ACTIVE", "validated_winner_is_active");
const silenceSelection = { ...selected, status: "NO_ELIGIBLE_CANDIDATE" as const, winner: null, candidates: [] };
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, { status: "READY", detail: "ready", selection: silenceSelection }, now).mode === "EDITORIAL_SILENCE", "explicit_no_signal_is_silence");

const active = evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, ready, now);
const html = renderDailyInsightOp5Story(payload(), CITIES.tarnos, active);
ok(html.includes('<canvas id="comparisonStory" width="1080" height="1920">') && html.includes("Partager / enregistrer la Story comparative"), "story_is_manual_1080x1920_export");
ok(!html.includes("fetch(") && !html.includes("instagram.com"), "story_has_no_automatic_publication");
ok(html.includes("const GS=") && html.includes("function drawHeader(") && html.includes("function box("), "story_uses_canonical_daily_graphic_runtime");
ok(html.includes("À REMARQUER AUJOURD’HUI") && html.includes("DAILY_STORY_SHARED_V1"), "daily_insight_is_content_inside_shared_frame");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(script) && (() => { try { new Function(script!); return true; } catch { return false; } })(), "story_runtime_is_valid");

console.log(`DAILY_INSIGHT_OP5 ${passed}/11 PASS`);
