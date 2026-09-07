import { buildWeeklyConclusion } from "../src/engine/weekly";
import type { SelectedWeeklyEvent } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_CONCLUSION_FAIL:${label}`);
  passed++;
}

function event(id: string, type: SelectedWeeklyEvent["type"], startDate: string): SelectedWeeklyEvent {
  return {
    id,
    type,
    startDate,
    endDate: startDate,
    dayIndexes: [0],
    rule: "test_fixture",
    evidence: {},
    score: 80,
    confidence: "HIGH",
    selectionReason: "test_fixture"
  };
}

const calm = buildWeeklyConclusion([]);
ok(calm.title === "Une semaine calme à Tarnos", "calm_title");
ok(calm.body.includes("stable") && calm.body.includes("Aucun changement"), "calm_body_is_short_and_factual");

const improvement = buildWeeklyConclusion([event("improvement", "IMPROVEMENT", "2026-09-09")]);
ok(improvement.body === "La semaine s’améliore progressivement à partir de mercredi.", "improvement_conclusion");

const degradation = buildWeeklyConclusion([event("degradation", "DEGRADATION", "2026-09-10")]);
ok(degradation.body === "La semaine se dégrade nettement à partir de jeudi.", "degradation_conclusion");

const turn = buildWeeklyConclusion([
  event("degradation", "DEGRADATION", "2026-09-07"),
  event("improvement", "IMPROVEMENT", "2026-09-10")
]);
ok(turn.body === "Une semaine perturbée au départ, nettement plus agréable ensuite.", "degradation_then_improvement_story");

const single = buildWeeklyConclusion([event("rain", "RAIN", "2026-09-08")]);
ok(single.body === "La semaine sera surtout marquée par un épisode pluvieux.", "single_event_conclusion");

const mixed = buildWeeklyConclusion([
  event("rain", "RAIN", "2026-09-08"),
  event("wind", "WIND", "2026-09-10"),
  event("best", "BEST_WINDOW", "2026-09-12")
]);
ok(mixed.body.includes("épisode pluvieux") && mixed.body.includes("vent fort") && mixed.body.endsWith("samedi."), "mixed_week_with_best_window");

const windowOnly = buildWeeklyConclusion([event("best", "BEST_WINDOW", "2026-09-13")]);
ok(windowOnly.body === "La semaine sera globalement stable, avec une fenêtre météo particulièrement favorable dimanche.", "window_only_conclusion");

console.log(`WEEKLY_CONCLUSION ${passed}/8 PASS`);
