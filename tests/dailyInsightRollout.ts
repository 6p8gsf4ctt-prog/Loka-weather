import { evaluateDailyInsightStoryRollout, isDailyInsightStoryEnabled, isDailyInsightStoryRollbackRequested } from "../src/engine/dailyInsight/rollout";
import type { DailyInsightPreviewResult } from "../src/engine/dailyInsight/previewEngine";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_ROLLOUT_FAIL:${label}`);
  passed++;
}

const selected = {
  status: "SELECTED",
  winner: { id: "winner" }
} as unknown as DailyInsightPreviewResult;
const noSignal = { status: "NO_DAILY_INSIGHT", winner: null } as DailyInsightPreviewResult;

ok(!isDailyInsightStoryEnabled({}), "absent_flag_is_disabled");
ok(!isDailyInsightStoryEnabled({ DAILY_INSIGHT_STORY_ENABLED: "1" }), "unexpected_flag_value_is_disabled");
ok(isDailyInsightStoryEnabled({ DAILY_INSIGHT_STORY_ENABLED: " TRUE " }), "activation_is_explicit_and_normalized");
ok(isDailyInsightStoryRollbackRequested({ DAILY_INSIGHT_STORY_ROLLBACK: "true" }), "rollback_flag_is_detected");

const disabled = evaluateDailyInsightStoryRollout({}, selected, 2);
ok(disabled.mode === "DISABLED" && !disabled.exposeStory, "safe_default_hides_story");
const rollback = evaluateDailyInsightStoryRollout({ DAILY_INSIGHT_STORY_ENABLED: "true", DAILY_INSIGHT_STORY_ROLLBACK: "true" }, selected, 2);
ok(rollback.mode === "ROLLBACK" && !rollback.exposeStory, "rollback_wins_over_activation");
const active = evaluateDailyInsightStoryRollout({ DAILY_INSIGHT_STORY_ENABLED: "true", DAILY_INSIGHT_CPU_BUDGET_MS: "20" }, selected, 2);
ok(active.mode === "ACTIVE" && active.exposeStory, "selected_signal_is_exposed_after_all_gates");
const silence = evaluateDailyInsightStoryRollout({ DAILY_INSIGHT_STORY_ENABLED: "true" }, noSignal, 2);
ok(silence.mode === "NO_SIGNAL" && !silence.exposeStory, "editorial_silence_produces_no_story");
const cpuGuard = evaluateDailyInsightStoryRollout({ DAILY_INSIGHT_STORY_ENABLED: "true", DAILY_INSIGHT_CPU_BUDGET_MS: "10" }, selected, 10.01);
ok(cpuGuard.mode === "CPU_GUARD" && !cpuGuard.exposeStory, "cpu_budget_blocks_exposure");
const boundedBudget = evaluateDailyInsightStoryRollout({ DAILY_INSIGHT_STORY_ENABLED: "true", DAILY_INSIGHT_CPU_BUDGET_MS: "999" }, selected, 99);
ok(boundedBudget.cpuBudgetMs === 100 && boundedBudget.mode === "ACTIVE", "cpu_budget_is_bounded");

console.log(`DAILY_INSIGHT_ROLLOUT ${passed}/10 PASS`);
