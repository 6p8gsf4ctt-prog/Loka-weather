import { buildWeeklyCarouselPlan, validateWeeklyActivation, WEEKLY_OVERVIEW_MASTER_URL } from "../src/engine/weekly";
import type { WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_ACTIVATION_FAIL:${label}`);
  passed++;
}

const scene: WeeklySceneReference = {
  source: "DAILY_V24_DECISION",
  date: "2026-09-07",
  dayIndex: 0,
  id: 1,
  key: "GRAND_SOLEIL",
  title: "GRAND SOLEIL",
  displayTitle: "PLEIN SOLEIL",
  family: "LIGHT",
  masterUrl: "/masters24/01_GRAND_SOLEIL.png",
  visualIcon: "sun",
  emoji: "☀️",
  decisionVersion: "2.0.3",
  doctrineVersion: "2.0.3",
  validity: "VALID",
  confidence: "HIGH",
  resolutionMode: "DIRECT"
};

function dailySummaries(): WeeklyEditorial["dailySummaries"] {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date("2026-09-07T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + dayIndex);
    return {
      date: date.toISOString().slice(0, 10),
      dayIndex,
      minTemperatureC: 12 + dayIndex,
      maxTemperatureC: 20 + dayIndex,
      scene: { ...scene, date: date.toISOString().slice(0, 10), dayIndex }
    };
  });
}

const base: WeeklyEditorial = {
  version: "0.1.0",
  citySlug: "tarnos",
  startDate: "2026-09-07",
  endDate: "2026-09-13",
  status: "CALM",
  overview: { title: "Une semaine calme à Tarnos", body: "Semaine stable.", scene },
  dailySummaries: dailySummaries(),
  dailyHighlights: [],
  dailyCardDetails: [],
  events: [],
  signature: "Ici, cette semaine."
};

const calmPlan = buildWeeklyCarouselPlan(base);
const calmValidation = validateWeeklyActivation(base, calmPlan);
ok(calmValidation.ok && calmValidation.status === "READY", "valid_calm_publication_ready");
ok(calmValidation.checks.every((check) => check.ok), "all_calm_checks_pass");
ok(calmPlan.slides.length === 1, "calm_plan_has_one_slide");
ok(calmPlan.slides[0].backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL, "weekly_overview_background_is_bound");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_summaries")?.ok === true, "daily_summaries_are_ready");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_pictograms")?.ok === true, "daily_pictograms_are_officially_bound");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_highlights")?.ok === true, "calm_week_has_no_daily_highlights");

const badCount = validateWeeklyActivation(base, { ...calmPlan, slides: [] });
ok(!badCount.ok && badCount.status === "BLOCKED", "slide_count_blocks_activation");

const tooManyEditorial: WeeklyEditorial = {
  ...base,
  status: "EVENTS",
  overview: { ...base.overview, title: "La semaine à Tarnos" },
  events: Array.from({ length: 5 }, (_, index): WeeklyEditorialEvent => ({
    id: `event-${index + 1}`,
    type: "WIND",
    startDate: "2026-09-07",
    endDate: "2026-09-07",
    title: "Vent fort",
    body: "Des rafales sont possibles.",
    activities: [],
    scene
  }))
};
const tooManyValidation = validateWeeklyActivation(tooManyEditorial, buildWeeklyCarouselPlan(tooManyEditorial));
ok(!tooManyValidation.checks.find((check) => check.id === "publication_limit")?.ok, "publication_limit_blocks_fifth_event");

const badDate = validateWeeklyActivation({ ...base, endDate: "2026-09-12" }, calmPlan);
ok(!badDate.checks.find((check) => check.id === "monday_to_sunday")?.ok, "monday_to_sunday_blocks_bad_range");

const badDailySummaries = validateWeeklyActivation({ ...base, dailySummaries: base.dailySummaries.slice(0, 6) }, calmPlan);
ok(!badDailySummaries.checks.find((check) => check.id === "weekly_daily_summaries")?.ok, "daily_summary_guard_requires_seven_days");

const badDailyPictogramPlan = {
  ...calmPlan,
  dailySummaries: calmPlan.dailySummaries.map((day, index) => index === 0
    ? { ...day, pictogram: { ...day.pictogram, kind: "rain" as const } }
    : day)
};
const badDailyPictogram = validateWeeklyActivation(base, badDailyPictogramPlan);
ok(!badDailyPictogram.checks.find((check) => check.id === "weekly_daily_pictograms")?.ok, "daily_pictogram_guard_blocks_non_v24_mapping");

const badScene = validateWeeklyActivation(base, {
  ...calmPlan,
  slides: [{ ...calmPlan.slides[0], scene: { ...scene, masterUrl: "/not-a-master.png" } }]
});
ok(!badScene.checks.find((check) => check.id === "scene_assets")?.ok, "scene_asset_guard");
ok(badScene.checks.find((check) => check.id === "daily_v24_scene_provenance")?.ok === true, "valid_scene_provenance_is_preserved");

const badStory = validateWeeklyActivation(base, {
  ...calmPlan,
  story: { ...calmPlan.story, relay: { ...calmPlan.story.relay, cta: "" } }
});
ok(!badStory.checks.find((check) => check.id === "story_relay")?.ok, "story_relay_guard");

const badWeeklyBackground = validateWeeklyActivation(base, {
  ...calmPlan,
  slides: [{ ...calmPlan.slides[0], backgroundUrl: "/not-a-master.png" }]
});
ok(!badWeeklyBackground.checks.find((check) => check.id === "weekly_background_assets")?.ok, "weekly_background_asset_guard");

const badOverviewBackground = validateWeeklyActivation(base, {
  ...calmPlan,
  story: { ...calmPlan.story, relay: { ...calmPlan.story.relay, backgroundUrl: scene.masterUrl } }
});
ok(!badOverviewBackground.checks.find((check) => check.id === "overview_background")?.ok, "weekly_overview_background_guard");

const event: WeeklyEditorialEvent = {
  id: "heat:2026-09-10",
  type: "HEAT",
  startDate: "2026-09-10",
  endDate: "2026-09-10",
  title: "Chaleur marquée",
  body: "La chaleur sera marquée jeudi.",
  activities: [],
  scene: { ...scene, date: "2026-09-10", dayIndex: 3 }
};
const eventEditorial: WeeklyEditorial = {
  ...base,
  status: "EVENTS",
  overview: { ...base.overview, title: "La semaine à Tarnos" },
  dailyHighlights: [{ kind: "WATCH", dayIndex: 3, date: "2026-09-10", sourceEventId: event.id, sourceEventType: event.type }],
  dailyCardDetails: [{
    kind: "WATCH",
    date: "2026-09-10",
    dayIndex: 3,
    sourceEventId: event.id,
    sourceEventType: event.type,
    weatherLabel: event.scene.displayTitle,
    minTemperatureC: 15,
    maxTemperatureC: 23,
    scene: event.scene,
    slots: ([8, 12, 16, 20] as const).map((hour) => ({ hour, sourceHour: hour, temperatureC: 18, condition: "soleil" }))
  }],
  events: [event]
};
const eventPlan = buildWeeklyCarouselPlan(eventEditorial);
const eventValidation = validateWeeklyActivation(eventEditorial, eventPlan);
ok(eventValidation.ok, "event_publication_ready");
ok(eventPlan.slides[1]?.eventId === event.id, "event_id_is_preserved");
ok(eventPlan.slides[1]?.backgroundUrl === event.scene.masterUrl, "event_background_keeps_daily_v24_master");
ok(eventPlan.dailySummaries[3]?.highlight === "WATCH", "event_watch_highlight_is_bound_to_daily_column");
ok(eventPlan.dailyCardDetails[0]?.pictogram.kind === "sun" && eventPlan.dailyCardDetails[0]?.slots.every((slot) => slot.pictogram.kind === "sun"), "central_card_pictograms_follow_daily_rules");
const badHighlightEditorial: WeeklyEditorial = {
  ...eventEditorial,
  dailyHighlights: [{ ...eventEditorial.dailyHighlights[0], kind: "PREFERRED" }]
};
const badHighlightValidation = validateWeeklyActivation(badHighlightEditorial, eventPlan);
ok(!badHighlightValidation.checks.find((check) => check.id === "weekly_daily_highlights")?.ok, "daily_highlight_guard_blocks_wrong_event_role");
const badMapping = validateWeeklyActivation(eventEditorial, {
  ...eventPlan,
  slides: [eventPlan.slides[0], { ...eventPlan.slides[1], eventId: "other-event" }]
});
ok(!badMapping.checks.find((check) => check.id === "event_mapping")?.ok, "event_mapping_guard");

console.log(`WEEKLY_ACTIVATION ${passed}/24 PASS`);
