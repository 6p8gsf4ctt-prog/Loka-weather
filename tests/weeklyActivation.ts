import { buildWeeklyCarouselPlan, validateWeeklyActivation } from "../src/engine/weekly";
import type { WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_ACTIVATION_FAIL:${label}`);
  passed++;
}

const scene: WeeklySceneReference = {
  id: 1,
  key: "GRAND_SOLEIL",
  title: "GRAND SOLEIL",
  displayTitle: "PLEIN SOLEIL",
  family: "LIGHT",
  masterUrl: "/masters24/01_GRAND_SOLEIL.png",
  visualIcon: "sun",
  emoji: "☀️"
};

const base: WeeklyEditorial = {
  version: "0.1.0",
  citySlug: "tarnos",
  startDate: "2026-09-07",
  endDate: "2026-09-13",
  status: "CALM",
  overview: { title: "Une semaine calme à Tarnos", body: "Semaine stable.", scene },
  events: [],
  signature: "Ici, cette semaine."
};

const calmPlan = buildWeeklyCarouselPlan(base);
const calmValidation = validateWeeklyActivation(base, calmPlan);
ok(calmValidation.ok && calmValidation.status === "READY", "valid_calm_publication_ready");
ok(calmValidation.checks.every((check) => check.ok), "all_calm_checks_pass");
ok(calmPlan.slides.length === 1, "calm_plan_has_one_slide");

const badCount = validateWeeklyActivation(base, { ...calmPlan, slides: [] });
ok(!badCount.ok && badCount.status === "BLOCKED", "slide_count_blocks_activation");

const badDate = validateWeeklyActivation({ ...base, endDate: "2026-09-12" }, calmPlan);
ok(!badDate.checks.find((check) => check.id === "monday_to_sunday")?.ok, "monday_to_sunday_blocks_bad_range");

const badScene = validateWeeklyActivation(base, {
  ...calmPlan,
  slides: [{ ...calmPlan.slides[0], scene: { ...scene, masterUrl: "/not-a-master.png" } }]
});
ok(!badScene.checks.find((check) => check.id === "scene_assets")?.ok, "scene_asset_guard");

const badStory = validateWeeklyActivation(base, {
  ...calmPlan,
  story: { ...calmPlan.story, relay: { ...calmPlan.story.relay, cta: "" } }
});
ok(!badStory.checks.find((check) => check.id === "story_relay")?.ok, "story_relay_guard");

const event: WeeklyEditorialEvent = {
  id: "heat:2026-09-10",
  type: "HEAT",
  startDate: "2026-09-10",
  endDate: "2026-09-10",
  title: "Chaleur marquée",
  body: "La chaleur sera marquée jeudi.",
  activities: [],
  scene
};
const eventEditorial: WeeklyEditorial = { ...base, status: "EVENTS", overview: { ...base.overview, title: "La semaine à Tarnos" }, events: [event] };
const eventPlan = buildWeeklyCarouselPlan(eventEditorial);
const eventValidation = validateWeeklyActivation(eventEditorial, eventPlan);
ok(eventValidation.ok, "event_publication_ready");
ok(eventPlan.slides[1]?.eventId === event.id, "event_id_is_preserved");
const badMapping = validateWeeklyActivation(eventEditorial, {
  ...eventPlan,
  slides: [eventPlan.slides[0], { ...eventPlan.slides[1], eventId: "other-event" }]
});
ok(!badMapping.checks.find((check) => check.id === "event_mapping")?.ok, "event_mapping_guard");

console.log(`WEEKLY_ACTIVATION ${passed}/10 PASS`);
