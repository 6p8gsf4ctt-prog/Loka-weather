import { CITIES } from "../src/config/cities";
import { selectWeeklyEvents } from "../src/engine/weekly";
import type { WeeklyEvent, WeeklyProfileSet } from "../src/engine/weekly";

const city = CITIES.tarnos;
const profiles: WeeklyProfileSet = {
  version: "0.1.0",
  citySlug: "tarnos",
  forecastDays: 7,
  startDate: "2026-09-07",
  endDate: "2026-09-13",
  days: []
};
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_SELECTION_FAIL:${label}`);
  passed++;
}

function raw(type: WeeklyEvent["type"], dayIndex: number, date: string, evidence: WeeklyEvent["evidence"]): WeeklyEvent {
  return { id: `${type.toLowerCase()}:${date}`, type, startDate: date, endDate: date, dayIndexes: [dayIndex], rule: "test_fixture", evidence };
}

const events: WeeklyEvent[] = [
  raw("HEAT", 0, "2026-09-07", { maxTemperatureC: 30, minTemperatureC: 18, thresholdC: 27 }),
  raw("HEAT", 1, "2026-09-08", { maxTemperatureC: 31, minTemperatureC: 19, thresholdC: 27 }),
  raw("RAIN", 3, "2026-09-10", { totalMm: 12, wetHours: 8, wetBlockMaxHours: 5, maxHourlyMm: 3 }),
  raw("WIND", 4, "2026-09-11", { maxGustKmh: 82, strongHours: 4, strongBlockMaxHours: 3 }),
  raw("IMPROVEMENT", 5, "2026-09-12", { earlyCloudPct: 90, lateCloudPct: 20, cloudTrend: -70, trendStrength: "STRONG" }),
  raw("BEST_WINDOW", 2, "2026-09-09", { startHour: 10, endHour: 12, hours: 3, meanTemperatureC: 21, maxGustKmh: 25, meanCloudPct: 40 }),
  raw("BEST_WINDOW", 6, "2026-09-13", { startHour: 9, endHour: 15, hours: 7, meanTemperatureC: 22, maxGustKmh: 20, meanCloudPct: 15 })
];

const selection = selectWeeklyEvents(profiles, events, city);
const heat = selection.events.find((item) => item.type === "HEAT");
const windows = selection.events.filter((item) => item.type === "BEST_WINDOW");

ok(selection.status === "EVENTS", "events_status");
ok(selection.rawCandidateCount === 7, "raw_count");
ok(selection.events.length === 5, "adaptive_count_without_fixed_cap");
ok(heat?.startDate === "2026-09-07" && heat.endDate === "2026-09-08", "merge_consecutive_heat");
ok(heat?.evidence.durationDays === 2, "merged_duration_evidence");
ok(windows.length === 1 && windows[0].startDate === "2026-09-13", "keep_best_window_only");
ok(selection.events.every((item) => item.score >= 55), "minimum_score");
ok(selection.events.every((item) => item.selectionReason.length > 0), "selection_reason");
ok(selection.events.every((item) => ["HIGH", "MEDIUM", "LOW"].includes(item.confidence)), "confidence_assigned");
ok(selection.events.every((item, index, all) => index === 0 || all[index - 1].score >= item.score), "ranked_output");
ok(selection.calm === null, "not_calm_with_selected_events");

const calm = selectWeeklyEvents(profiles, [], city);
ok(calm.status === "CALM" && calm.events.length === 0, "calm_week_status");
ok(calm.calm?.reason === "no_event_reached_selection_threshold", "calm_week_reason");

console.log(`WEEKLY_SELECTION ${passed}/13 PASS`);
