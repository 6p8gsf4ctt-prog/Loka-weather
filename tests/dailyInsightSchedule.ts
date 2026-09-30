import { DAILY_INSIGHT_BOOTSTRAP_CRON, dailyInsightOp5ScheduledAction, dailyInsightScheduledAction } from "../src/engine/dailyInsight/schedule";
import { renderDailyInsightControl } from "../src/ui/dailyInsightControl";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_SCHEDULE_FAIL:${label}`);
  passed++;
}

const summer = Date.parse("2026-09-29T02:45:00Z");
const summerOldFirstCron = Date.parse("2026-09-29T03:45:00Z");
const winter = Date.parse("2026-12-10T03:45:00Z");
ok(dailyInsightScheduledAction("45 2 * * *", "Europe/Paris", summer) === "REFRESH", "summer_0245_utc_hits_local_hour_four");
ok(dailyInsightScheduledAction("45 3 * * *", "Europe/Paris", summerOldFirstCron) === "NONE", "summer_old_first_cron_is_not_misclassified");
ok(dailyInsightScheduledAction("45 3 * * *", "Europe/Paris", winter) === "REFRESH", "winter_0345_utc_hits_local_hour_four");
ok(dailyInsightScheduledAction(DAILY_INSIGHT_BOOTSTRAP_CRON, "Europe/Paris", Date.parse("2026-09-29T18:15:00Z")) === "BOOTSTRAP_CHECK", "hourly_bootstrap_is_timezone_independent");
ok(dailyInsightScheduledAction("45 5 * * *", "Europe/Paris", summer) === "NONE", "unrelated_cron_does_not_refresh");
ok(dailyInsightOp5ScheduledAction("45 4 * * *", "Europe/Paris", Date.parse("2026-09-30T04:45:00Z")) === "GENERATE", "op5_summer_generation_at_local_six");
ok(dailyInsightOp5ScheduledAction("45 5 * * *", "Europe/Paris", Date.parse("2026-12-10T05:45:00Z")) === "GENERATE", "op5_winter_generation_at_local_six");
ok(dailyInsightOp5ScheduledAction(DAILY_INSIGHT_BOOTSTRAP_CRON, "Europe/Paris", Date.parse("2026-09-30T04:15:00Z")) === "NONE", "op5_ignores_hourly_bootstrap");

const control = renderDailyInsightControl();
ok(control.includes("/api/daily-insight/status") && control.includes("/api/admin/daily-insight/rebuild-reference"), "control_page_uses_status_and_protected_rebuild_routes");
ok(control.includes("authorization:'Bearer '+value") && control.includes("method:'POST'"), "manual_rebuild_requires_admin_bearer_token");
const script = control.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(script) && (() => { try { new Function(script!); return true; } catch { return false; } })(), "control_browser_runtime_is_valid");

console.log(`DAILY_INSIGHT_SCHEDULE ${passed}/11 PASS`);
