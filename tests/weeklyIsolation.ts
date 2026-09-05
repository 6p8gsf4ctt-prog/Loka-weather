import { isWeeklyEnabled, WEEKLY_ENGINE_ENABLED_ENV, WEEKLY_ENGINE_VERSION } from "../src/engine/weekly";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_ISOLATION_FAIL:${label}`);
  passed++;
}

ok(WEEKLY_ENGINE_VERSION === "0.1.0", "version_declared");
ok(WEEKLY_ENGINE_ENABLED_ENV === "WEEKLY_ENABLED", "flag_name_declared");
ok(!isWeeklyEnabled({}), "disabled_when_absent");
ok(!isWeeklyEnabled({ WEEKLY_ENABLED: "" }), "disabled_when_empty");
ok(!isWeeklyEnabled({ WEEKLY_ENABLED: "false" }), "disabled_for_false");
ok(!isWeeklyEnabled({ WEEKLY_ENABLED: "1" }), "disabled_for_unexpected_value");
ok(isWeeklyEnabled({ WEEKLY_ENABLED: "true" }), "enabled_for_true");
ok(isWeeklyEnabled({ WEEKLY_ENABLED: " TRUE " }), "trimmed_case_insensitive_true");

console.log(`WEEKLY_ISOLATION ${passed}/8 PASS`);
