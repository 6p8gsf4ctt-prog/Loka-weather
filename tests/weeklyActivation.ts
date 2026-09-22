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

function slide1Content(days: WeeklyEditorial["dailySummaries"]): WeeklyEditorial["slide1"] {
  const coldestMorningReference = { date: "2026-09-07", dayIndex: 0, temperatureC: 12, sourceHour: 7 };
  const hottestDayReference = { date: "2026-09-13", dayIndex: 6, temperatureC: 26, sourceHour: 15 };
  const coldestMorning = { ...coldestMorningReference, matches: [coldestMorningReference] };
  const hottestDay = { ...hottestDayReference, matches: [hottestDayReference] };
  return {
    title: "LA SEMAINE À TARNOS",
    synthesis: {
      primaryLine: "Temps chaud et sec · Soleil bien présent cette semaine",
      secondaryLine: "Les maximales évolueront de 20 à 26 °C.",
      primaryMaximumLines: 1,
      secondaryMaximumLines: 2,
      evidence: {
        thermalClass: "WARM", maximumTemperatureC: 26, minimumDailyMaximumC: 20, maximumDayIndexes: [6],
        totalPrecipitationMm: 0, wetHours: 0, wetDays: 0, wetDayIndexes: [], maxDailyPrecipitationMm: 0, dryWeek: true, meanBrightFraction: .7,
        startBrightFraction: .6, endBrightFraction: .7, startCloudCoverPct: 30, endCloudCoverPct: 25,
        measuredBrightening: false, measuredClouding: false
      }
    },
    coldestMorning: { ...coldestMorning, label: "MATIN LE PLUS FRAIS", dateLabel: "LUN. 7", temperatureLabel: "12 °C", timeLabel: "07 H" },
    hottestDay: { ...hottestDay, label: "JOURNÉE LA PLUS CHAUDE", dateLabel: "DIM. 13", temperatureLabel: "26 °C", timeLabel: "15 H" },
    daylight: {
      label: "LUMIÈRE DE LA SEMAINE", direction: "SHORTER", deltaMinutes: -18, deltaLabel: "−18 min de jour", periodLabel: "LUN. 7 → DIM. 13",
      start: { date: "2026-09-07", weekdayLabel: "LUN.", sunriseMinutes: 440, sunsetMinutes: 1220, durationMinutes: 780, sunriseLabel: "07:20", sunsetLabel: "20:20" },
      end: { date: "2026-09-13", weekdayLabel: "DIM.", sunriseMinutes: 449, sunsetMinutes: 1211, durationMinutes: 762, sunriseLabel: "07:29", sunsetLabel: "20:11" }
    },
    dailyStrip: days,
    facts: {
      version: "1.1.0", citySlug: "tarnos", startDate: "2026-09-07", endDate: "2026-09-13", coldestMorning, hottestDay,
      daylight: {
        start: { date: "2026-09-07", sunriseMinutes: 440, sunsetMinutes: 1220, durationMinutes: 780 },
        end: { date: "2026-09-13", sunriseMinutes: 449, sunsetMinutes: 1211, durationMinutes: 762 },
        deltaMinutes: -18
      }
    }
  };
}

const baseDailySummaries = dailySummaries();

const base: WeeklyEditorial = {
  version: "0.1.0",
  citySlug: "tarnos",
  startDate: "2026-09-07",
  endDate: "2026-09-13",
  status: "CALM",
  overview: { title: "Une semaine calme à Tarnos", body: "Semaine stable.", scene },
  slide1: slide1Content(baseDailySummaries),
  dailySummaries: baseDailySummaries,
  dailyHighlights: [],
  dailyCardDetails: [],
  events: [],
  signature: "Ici, cette semaine."
};

const calmPlan = buildWeeklyCarouselPlan(base);
const calmValidation = validateWeeklyActivation(base, calmPlan);
ok(calmValidation.ok && calmValidation.status === "READY", "valid_calm_publication_ready");
ok(calmValidation.checks.every((check) => check.ok), "all_calm_checks_pass");
ok(calmPlan.slides.length === 1, "calm_plan_has_no_uncontextualized_number_slide");
ok(calmPlan.slides[0].backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL, "weekly_overview_background_is_bound");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_summaries")?.ok === true, "daily_summaries_are_ready");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_pictograms")?.ok === true, "daily_pictograms_are_officially_bound");
ok(calmValidation.checks.find((check) => check.id === "weekly_daily_highlights")?.ok === true, "calm_week_has_no_daily_highlights");
ok(calmValidation.checks.find((check) => check.id === "weekly_slide1_content")?.ok === true, "stable_first_slide_content_is_ready");
ok(calmValidation.checks.find((check) => check.id === "weekly_slide1_preflight_copy")?.ok === true, "slide1_preflight_copy_is_ready");

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

const badSlide1Copy = validateWeeklyActivation({
  ...base,
  slide1: { ...base.slide1, daylight: { ...base.slide1.daylight, deltaLabel: "" } }
}, calmPlan);
ok(!badSlide1Copy.checks.find((check) => check.id === "weekly_slide1_preflight_copy")?.ok, "preflight_blocks_empty_slide1_copy");

const badThermalCopy = validateWeeklyActivation({
  ...base,
  slide1: { ...base.slide1, synthesis: { ...base.slide1.synthesis, primaryLine: "Temps doux · Temps sec cette semaine" } }
}, calmPlan);
ok(!badThermalCopy.checks.find((check) => check.id === "weekly_slide1_content")?.ok, "preflight_blocks_thermal_vocabulary_that_contradicts_the_peak");

const coldTieReference = { date: "2026-09-09", dayIndex: 2, temperatureC: 12, sourceHour: 7 };
const maskedTie = validateWeeklyActivation({
  ...base,
  slide1: {
    ...base.slide1,
    coldestMorning: { ...base.slide1.coldestMorning, matches: [base.slide1.coldestMorning, coldTieReference], dateLabel: "LUN. 7" }
  }
}, calmPlan);
ok(!maskedTie.checks.find((check) => check.id === "weekly_slide1_content")?.ok, "preflight_blocks_a_real_tie_missing_from_the_fact_card_label");

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
ok(eventPlan.slides[1] === undefined, "events_do_not_create_an_uncontextualized_number_slide");
ok(eventPlan.dailySummaries[3]?.highlight === "WATCH", "event_watch_highlight_is_bound_to_daily_column");
ok(eventPlan.dailyCardDetails[0]?.pictogram.kind === "sun" && eventPlan.dailyCardDetails[0]?.slots.every((slot) => slot.pictogram.kind === "sun"), "central_card_pictograms_follow_daily_rules");
const badHighlightEditorial: WeeklyEditorial = {
  ...eventEditorial,
  dailyHighlights: [{ ...eventEditorial.dailyHighlights[0], kind: "PREFERRED" }]
};
const badHighlightValidation = validateWeeklyActivation(badHighlightEditorial, eventPlan);
ok(!badHighlightValidation.checks.find((check) => check.id === "weekly_daily_highlights")?.ok, "daily_highlight_guard_blocks_wrong_event_role");
const badNumber = validateWeeklyActivation(eventEditorial, {
  ...eventPlan,
  slides: [eventPlan.slides[0], { ...eventPlan.slides[0], index: 1, kind: "WEEKLY_NUMBER" }]
});
ok(!badNumber.checks.find((check) => check.id === "editorial_signal_gate")?.ok, "weekly_number_gate_blocks_a_raw_slide");

console.log(`WEEKLY_ACTIVATION ${passed}/28 PASS`);
