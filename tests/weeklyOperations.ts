import worker from "../src/index";
import { localDateIsMonday, nextMondayOrSame, weeklyRangeForDate } from "../src/engine/weekly";
import { generateWeeklyCity } from "../src/weeklyPipeline";
import { CITIES } from "../src/config/cities";
import type { Env } from "../src/types";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_OPERATIONS_FAIL:${label}`);
  passed++;
}

function throws(fn: () => unknown, label: string): void {
  try { fn(); }
  catch { passed++; return; }
  throw new Error(`WEEKLY_OPERATIONS_FAIL:${label}`);
}

const monday = weeklyRangeForDate("2026-09-07");
ok(monday.startDate === "2026-09-07" && monday.endDate === "2026-09-13", "monday_range");
ok(weeklyRangeForDate("2026-09-09").startDate === "2026-09-07", "midweek_uses_same_monday");
ok(weeklyRangeForDate("2026-09-13").endDate === "2026-09-13", "sunday_closes_range");
throws(() => weeklyRangeForDate("not-a-date"), "invalid_date_rejected");
ok(localDateIsMonday("Europe/Paris", new Date("2026-09-07T03:00:00.000Z")), "monday_local_slot");
ok(!localDateIsMonday("Europe/Paris", new Date("2026-09-08T03:00:00.000Z")), "tuesday_not_monday");
ok(nextMondayOrSame("2026-09-05") === "2026-09-07", "preview_defaults_next_monday");

async function main(): Promise<void> {
  const disabledEnv = { DB: {}, ADMIN_TOKEN: "secret" } as unknown as Env;
  const publicDisabled = await worker.fetch(new Request("https://loka.test/api/weekly?city=tarnos"), disabledEnv);
  ok(publicDisabled.status === 404, "public_weekly_disabled_by_default");
  const previewPage = await worker.fetch(new Request("https://loka.test/weekly-preview"), disabledEnv);
  ok(previewPage.status === 200 && (await previewPage.text()).includes('name="token"'), "visual_preview_form_available");
  const invalidPreview = await worker.fetch(new Request("https://loka.test/weekly-preview", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "token=wrong"
  }), disabledEnv);
  ok(invalidPreview.status === 401, "visual_preview_requires_token");
  const unauthorized = await worker.fetch(new Request("https://loka.test/api/admin/weekly/run?city=tarnos", { method: "POST" }), disabledEnv);
  ok(unauthorized.status === 401, "manual_weekly_requires_authentication");
  const adminDisabled = await worker.fetch(new Request("https://loka.test/api/admin/weekly/run?city=tarnos", {
    method: "POST", headers: { authorization: "Bearer secret" }
  }), disabledEnv);
  ok(adminDisabled.status === 404, "manual_weekly_disabled_by_default");

  const tuesday = new Date("2026-09-08T08:00:00.000Z");
  await generateWeeklyCity({ ...disabledEnv, WEEKLY_ENABLED: "true" }, CITIES.tarnos, "test", tuesday)
    .then(() => { throw new Error("WEEKLY_OPERATIONS_FAIL:non_monday_generation_allowed"); })
    .catch((error: unknown) => ok(error instanceof Error && error.message === "weekly_generation_requires_monday", "manual_generation_requires_monday"));

  console.log(`WEEKLY_OPERATIONS ${passed}/13 PASS`);
}

main().catch((error: unknown) => { throw error; });
