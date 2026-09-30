import { DAILY_INSIGHT_SELECTION_VERSION, type DailyInsightSelectionResult } from "../src/engine/dailyInsight/editorialSelection";
import { evaluateDailyInsightOp5 } from "../src/engine/dailyInsight/op5Rollout";
import { renderDailyInsightOp5Story } from "../src/ui/dailyInsightOp5Story";
import { CITIES } from "../src/config/cities";

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

ok(evaluateDailyInsightOp5({}, ready, now).mode === "LEGACY_FALLBACK", "disabled_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true", DAILY_INSIGHT_OP5_ROLLBACK: "true" }, ready, now).mode === "LEGACY_FALLBACK", "rollback_has_priority");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, { status: "UNAVAILABLE", detail: "missing", selection: null }, now).mode === "LEGACY_FALLBACK", "missing_cache_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true", DAILY_INSIGHT_OP5_MAX_DRAFT_AGE_HOURS: "12" }, ready, new Date("2026-10-01T00:00:00Z")).mode === "LEGACY_FALLBACK", "stale_cache_uses_legacy");
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, ready, now).mode === "ACTIVE", "validated_winner_is_active");
const silenceSelection = { ...selected, status: "NO_ELIGIBLE_CANDIDATE" as const, winner: null, candidates: [] };
ok(evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, { status: "READY", detail: "ready", selection: silenceSelection }, now).mode === "EDITORIAL_SILENCE", "explicit_no_signal_is_silence");

const active = evaluateDailyInsightOp5({ DAILY_INSIGHT_OP5_ENABLED: "true" }, ready, now);
const html = renderDailyInsightOp5Story(CITIES.tarnos, "2026-09-30", active);
ok(html.includes('width="1080" height="1920"') && html.includes("Enregistrer cette STORY"), "story_is_manual_1080x1920_export");
ok(!html.includes("fetch(") && !html.includes("instagram.com"), "story_has_no_automatic_publication");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(script) && (() => { try { new Function(script!); return true; } catch { return false; } })(), "story_runtime_is_valid");

console.log(`DAILY_INSIGHT_OP5 ${passed}/9 PASS`);

