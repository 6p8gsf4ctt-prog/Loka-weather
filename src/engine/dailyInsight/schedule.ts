export const DAILY_INSIGHT_BOOTSTRAP_CRON = "15 * * * *" as const;
const DAILY_INSIGHT_REFRESH_CRONS = new Set(["45 2 * * *", "45 3 * * *"]);
const DAILY_INSIGHT_OP5_CRONS = new Set(["45 4 * * *", "45 5 * * *"]);

export type DailyInsightScheduledAction = "REFRESH" | "BOOTSTRAP_CHECK" | "NONE";
export type DailyInsightOp5ScheduledAction = "GENERATE" | "NONE";

function hourInTimezone(timezone: string, epochMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(epochMs));
  return Number(parts.find((part) => part.type === "hour")?.value ?? -1);
}

/** Prepare one V2 editorial draft at 06:45 local time across DST. */
export function dailyInsightOp5ScheduledAction(cron: string, timezone: string, epochMs: number): DailyInsightOp5ScheduledAction {
  if (!DAILY_INSIGHT_OP5_CRONS.has(cron)) return "NONE";
  return hourInTimezone(timezone, epochMs) === 6 ? "GENERATE" : "NONE";
}

/**
 * The hourly bootstrap is only a cheap cache-status check. The complete
 * reference refresh remains anchored at 04:xx local time across DST.
 */
export function dailyInsightScheduledAction(
  cron: string,
  timezone: string,
  epochMs: number
): DailyInsightScheduledAction {
  if (cron === DAILY_INSIGHT_BOOTSTRAP_CRON) return "BOOTSTRAP_CHECK";
  if (!DAILY_INSIGHT_REFRESH_CRONS.has(cron)) return "NONE";
  return hourInTimezone(timezone, epochMs) === 4 ? "REFRESH" : "NONE";
}
