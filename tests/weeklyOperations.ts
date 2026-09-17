import worker from "../src/index";
import { localDateIsMonday, nextMondayOrSame, weeklyRangeForDate } from "../src/engine/weekly";
import { generateWeeklyCalmVisualPreview, generateWeeklyCity } from "../src/weeklyPipeline";
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

function previewPayload(): Record<string, unknown> {
  const times = Array.from({ length: 168 }, (_, index) => {
    const day = String(Math.floor(index / 24) + 7).padStart(2, "0");
    const hour = String(index % 24).padStart(2, "0");
    return `2026-09-${day}T${hour}:00`;
  });
  const hourly: Record<string, unknown> = { time: times };
  for (const variable of [
    "temperature_2m", "apparent_temperature", "precipitation", "rain", "cloud_cover",
    "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m",
    "wind_gusts_10m", "weather_code"
  ]) hourly[variable] = times.map(() => variable === "weather_code" ? 0 : 20);
  return { latitude: 43.5417, longitude: -1.4628, hourly };
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
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(previewPayload()), { status: 200, headers: { "content-type": "application/json" } });
  const disabledEnv = { DB: {}, ADMIN_TOKEN: "secret" } as unknown as Env;
  const publicDisabled = await worker.fetch(new Request("https://loka.test/api/weekly?city=tarnos"), disabledEnv);
  ok(publicDisabled.status === 404, "public_weekly_disabled_by_default");
  const previewPage = await worker.fetch(new Request("https://loka.test/weekly-preview?start=2026-09-07"), disabledEnv);
  ok(previewPage.status === 200 && (await previewPage.text()).includes("Publication à télécharger"), "public_preview_renders_real_slides_without_token");
  const invalidPreview = await worker.fetch(new Request("https://loka.test/weekly-preview?start=2026-09-07", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "token=ignored"
  }), disabledEnv);
  ok(invalidPreview.status === 200, "public_preview_post_does_not_require_token");
  const calmPreview = generateWeeklyCalmVisualPreview(CITIES.tarnos, new Date("2026-09-05T08:00:00.000Z"));
  ok(calmPreview.editorial.status === "CALM" && calmPreview.editorial.events.length === 0 && calmPreview.source === "admin_weekly_calm_visual_preview", "calm_visual_preview_uses_weekly_engine_without_live_data");
  const calmPreviewPage = await worker.fetch(new Request("https://loka.test/weekly-preview", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "token=secret&mode=CALM_DEMO&start=2026-09-07"
  }), disabledEnv);
  ok(calmPreviewPage.status === 200 && (await calmPreviewPage.text()).includes("UNE SEMAINE CALME"), "calm_visual_preview_renders_short_weekly_summary");
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

  globalThis.fetch = originalFetch;

  console.log(`WEEKLY_OPERATIONS ${passed}/15 PASS`);
}

main().catch((error: unknown) => { throw error; });
