import type { Env } from "../../types";

/**
 * Weekly generation is opt-in. An absent, empty or unexpected value keeps the
 * feature disabled so creating the module cannot change production behavior.
 */
export function isWeeklyEnabled(env: Pick<Env, "WEEKLY_ENABLED">): boolean {
  return env.WEEKLY_ENABLED?.trim().toLowerCase() === "true";
}
