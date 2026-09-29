import type { Env } from "../../types";
import type { DailyInsightPreviewResult } from "./previewEngine";

export const DAILY_INSIGHT_STORY_ENABLED_ENV = "DAILY_INSIGHT_STORY_ENABLED" as const;
export const DAILY_INSIGHT_STORY_ROLLBACK_ENV = "DAILY_INSIGHT_STORY_ROLLBACK" as const;
export const DAILY_INSIGHT_CPU_BUDGET_ENV = "DAILY_INSIGHT_CPU_BUDGET_MS" as const;
export const DAILY_INSIGHT_DEFAULT_CPU_BUDGET_MS = 20;

export type DailyInsightStoryRolloutMode = "DISABLED" | "ROLLBACK" | "NO_SIGNAL" | "CPU_GUARD" | "ACTIVE";

export interface DailyInsightStoryRolloutDecision {
  mode: DailyInsightStoryRolloutMode;
  exposeStory: boolean;
  reason: string;
  engineDurationMs: number;
  cpuBudgetMs: number;
}

type RolloutEnv = Pick<Env, "DAILY_INSIGHT_STORY_ENABLED" | "DAILY_INSIGHT_STORY_ROLLBACK" | "DAILY_INSIGHT_CPU_BUDGET_MS">;

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isDailyInsightStoryEnabled(env: Pick<Env, "DAILY_INSIGHT_STORY_ENABLED">): boolean {
  return flag(env.DAILY_INSIGHT_STORY_ENABLED);
}

export function isDailyInsightStoryRollbackRequested(env: Pick<Env, "DAILY_INSIGHT_STORY_ROLLBACK">): boolean {
  return flag(env.DAILY_INSIGHT_STORY_ROLLBACK);
}

export function dailyInsightCpuBudgetMs(env: Pick<Env, "DAILY_INSIGHT_CPU_BUDGET_MS">): number {
  const parsed = Number(env.DAILY_INSIGHT_CPU_BUDGET_MS);
  if (!Number.isFinite(parsed)) return DAILY_INSIGHT_DEFAULT_CPU_BUDGET_MS;
  return Math.max(5, Math.min(100, Math.round(parsed)));
}

/** Rollback always wins; absence of a selected fact remains a valid silence. */
export function evaluateDailyInsightStoryRollout(
  env: RolloutEnv,
  preview: DailyInsightPreviewResult | null,
  engineDurationMs: number
): DailyInsightStoryRolloutDecision {
  const duration = Math.max(0, Math.round(engineDurationMs * 100) / 100);
  const budget = dailyInsightCpuBudgetMs(env);
  if (isDailyInsightStoryRollbackRequested(env)) {
    return { mode: "ROLLBACK", exposeStory: false, reason: "operator_rollback_requested", engineDurationMs: duration, cpuBudgetMs: budget };
  }
  if (!isDailyInsightStoryEnabled(env)) {
    return { mode: "DISABLED", exposeStory: false, reason: "daily_insight_story_disabled", engineDurationMs: duration, cpuBudgetMs: budget };
  }
  if (duration > budget) {
    return { mode: "CPU_GUARD", exposeStory: false, reason: "daily_insight_cpu_budget_exceeded", engineDurationMs: duration, cpuBudgetMs: budget };
  }
  if (!preview || preview.status !== "SELECTED" || !preview.winner) {
    return { mode: "NO_SIGNAL", exposeStory: false, reason: preview?.status.toLowerCase() ?? "reference_unavailable", engineDurationMs: duration, cpuBudgetMs: budget };
  }
  return { mode: "ACTIVE", exposeStory: true, reason: "selected_daily_insight_exposed", engineDurationMs: duration, cpuBudgetMs: budget };
}

export function logDailyInsightStoryRollout(
  decision: DailyInsightStoryRolloutDecision,
  context: { citySlug: string; date: string; cacheStatus: string }
): void {
  console.info("LOKA_DAILY_INSIGHT_STORY_ROLLOUT", JSON.stringify({ ...context, ...decision }));
}

