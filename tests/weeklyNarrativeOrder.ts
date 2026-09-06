import { orderWeeklyEvents } from "../src/engine/weekly";
import type { SelectedWeeklyEvent } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_NARRATIVE_ORDER_FAIL:${label}`);
  passed++;
}

function event(id: string, type: SelectedWeeklyEvent["type"], startDate: string, endDate = startDate): SelectedWeeklyEvent {
  return {
    id,
    type,
    startDate,
    endDate,
    dayIndexes: [0],
    rule: "test_fixture",
    evidence: {},
    score: 80,
    confidence: "HIGH",
    selectionReason: "test_fixture"
  };
}

const bestWindow = event("best_window:2026-09-13", "BEST_WINDOW", "2026-09-13");
const rain = event("rain:2026-09-08", "RAIN", "2026-09-08");
const wind = event("wind:2026-09-10", "WIND", "2026-09-10");
const selected = [bestWindow, wind, rain];
const ordered = orderWeeklyEvents(selected);

ok(ordered.map((item) => item.id).join(",") === "rain:2026-09-08,wind:2026-09-10,best_window:2026-09-13", "chronology_then_best_window");
ok(selected[0].id === "best_window:2026-09-13", "input_is_not_mutated");
ok(ordered[ordered.length - 1].type === "BEST_WINDOW", "best_window_closes_story");
ok(orderWeeklyEvents([wind, rain]).map((item) => item.id).join(",") === "rain:2026-09-08,wind:2026-09-10", "chronological_order_without_window");
ok(orderWeeklyEvents([]).length === 0, "empty_selection_is_supported");

console.log(`WEEKLY_NARRATIVE_ORDER ${passed}/5 PASS`);
