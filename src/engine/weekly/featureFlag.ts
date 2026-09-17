import type { Env } from "../../types";

/**
 * Weekly generation is opt-in. An absent, empty or unexpected value keeps the
 * feature disabled so creating the module cannot change production behavior.
 */
export function isWeeklyEnabled(env: Pick<Env, "WEEKLY_ENABLED">): boolean {
  return env.WEEKLY_ENABLED?.trim().toLowerCase() === "true";
}

/** N8 keeps contextual slides off in production until a staged activation. */
export function isWeeklyContextualSlidesEnabled(env: Pick<Env, "WEEKLY_CONTEXTUAL_SLIDES_ENABLED">): boolean {
  return env.WEEKLY_CONTEXTUAL_SLIDES_ENABLED?.trim().toLowerCase() === "true";
}

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Phase-4 kill switch and explicit public exposure gate. */
export function isWeeklyProgressivePublicationEnabled(env: Pick<Env, "WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED">): boolean {
  return flag(env.WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED);
}

export function isWeeklyProgressiveShadowModeEnabled(env: Pick<Env, "WEEKLY_PROGRESSIVE_SHADOW_MODE">): boolean {
  return flag(env.WEEKLY_PROGRESSIVE_SHADOW_MODE);
}

export function isWeeklyProgressiveRollbackEnabled(env: Pick<Env, "WEEKLY_PROGRESSIVE_ROLLBACK">): boolean {
  return flag(env.WEEKLY_PROGRESSIVE_ROLLBACK);
}
