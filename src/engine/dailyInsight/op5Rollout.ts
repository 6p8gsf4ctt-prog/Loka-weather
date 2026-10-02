import { dailyInsightEditorialInterestFloor, type DailyInsightSelectionResult } from "./editorialSelection";
import type { DailyInsightEditorialDraftResult } from "../../storage/dailyInsightEditorialDrafts";
import type { Env } from "../../types";

export const DAILY_INSIGHT_OP5_VERSION = "1.0.0" as const;

export type DailyInsightOp5Mode = "ACTIVE" | "EDITORIAL_SILENCE" | "LEGACY_FALLBACK";

export interface DailyInsightOp5Decision {
  version: typeof DAILY_INSIGHT_OP5_VERSION;
  mode: DailyInsightOp5Mode;
  reason: string;
  exposeV2: boolean;
  selection: DailyInsightSelectionResult | null;
  maxDraftAgeHours: number;
  draftAgeHours: number | null;
}

type Op5Env = Pick<Env, "DAILY_INSIGHT_OP5_ENABLED" | "DAILY_INSIGHT_OP5_ROLLBACK" | "DAILY_INSIGHT_OP5_MAX_DRAFT_AGE_HOURS">;

function flag(value: string | undefined): boolean { return value?.trim().toLowerCase() === "true"; }

function maxDraftAgeHours(env: Op5Env): number {
  const configured = Number(env.DAILY_INSIGHT_OP5_MAX_DRAFT_AGE_HOURS ?? 30);
  return Number.isFinite(configured) ? Math.max(12, Math.min(48, configured)) : 30;
}

function decision(mode: DailyInsightOp5Mode, reason: string, maxAge: number, selection: DailyInsightSelectionResult | null, age: number | null): DailyInsightOp5Decision {
  return { version: DAILY_INSIGHT_OP5_VERSION, mode, reason, exposeV2: mode === "ACTIVE", selection, maxDraftAgeHours: maxAge, draftAgeHours: age };
}

/**
 * OP5 only exposes a previously persisted V2 editorial decision. A missing,
 * malformed or stale cache falls back to the already deployed story engine.
 * An explicit NO_ELIGIBLE_CANDIDATE remains an intentional editorial silence.
 */
export function evaluateDailyInsightOp5(
  env: Op5Env,
  draft: DailyInsightEditorialDraftResult,
  now = new Date()
): DailyInsightOp5Decision {
  const maxAge = maxDraftAgeHours(env);
  if (flag(env.DAILY_INSIGHT_OP5_ROLLBACK)) return decision("LEGACY_FALLBACK", "op5_rollback_requested", maxAge, null, null);
  if (!flag(env.DAILY_INSIGHT_OP5_ENABLED)) return decision("LEGACY_FALLBACK", "op5_not_enabled", maxAge, null, null);
  if (draft.status !== "READY" || !draft.selection) return decision("LEGACY_FALLBACK", `op5_draft_${draft.status.toLowerCase()}:${draft.detail}`, maxAge, null, null);

  const age = (now.getTime() - Date.parse(draft.selection.generatedAt)) / 3_600_000;
  if (!Number.isFinite(age) || age < -0.25 || age > maxAge) return decision("LEGACY_FALLBACK", "op5_draft_stale", maxAge, draft.selection, Number.isFinite(age) ? age : null);
  if (draft.selection.status === "NO_ELIGIBLE_CANDIDATE") return decision("EDITORIAL_SILENCE", "op5_no_eligible_candidate", maxAge, draft.selection, age);
  if (draft.selection.status !== "SELECTED" || !draft.selection.winner) return decision("LEGACY_FALLBACK", "op5_selection_not_publishable", maxAge, draft.selection, age);

  const winner = draft.selection.winner;
  if (draft.selection.manualOverride?.candidateId === winner.id) {
    return decision("ACTIVE", `op5_manual_${draft.selection.manualOverride.classification.toLowerCase()}`, maxAge, draft.selection, age);
  }
  const floor = dailyInsightEditorialInterestFloor(winner.detectorId);
  if (!winner.eligible || winner.score.final < floor) return decision("LEGACY_FALLBACK", "op5_winner_guard_rejected", maxAge, draft.selection, age);
  return decision("ACTIVE", "op5_cached_winner_validated", maxAge, draft.selection, age);
}

export function isDailyInsightOp5Enabled(env: Pick<Env, "DAILY_INSIGHT_OP5_ENABLED">): boolean {
  return flag(env.DAILY_INSIGHT_OP5_ENABLED);
}

export function isDailyInsightOp5RollbackRequested(env: Pick<Env, "DAILY_INSIGHT_OP5_ROLLBACK">): boolean {
  return flag(env.DAILY_INSIGHT_OP5_ROLLBACK);
}
