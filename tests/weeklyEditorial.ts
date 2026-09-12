import { CITIES } from "../src/config/cities";
import { buildWeeklyEditorial, buildWeeklyProfiles, translateWeeklyActivities } from "../src/engine/weekly";
import type { SelectedWeeklyEvent, WeeklySelection } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-07";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_EDITORIAL_FAIL:${label}`);
  passed++;
}

function nextDate(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function points(): HourPoint[] {
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const dayIndex = Math.floor(index / 24);
    const hour = index % 24;
    const rain = dayIndex === 1 && hour >= 7 && hour <= 21;
    return {
      time: `${nextDate(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: rain ? 16 : 22,
      apparentTemperatureC: rain ? 15 : 22,
      precipitationMm: rain ? 1 : 0,
      rainMm: rain ? 1 : 0,
      cloudCoverPct: rain ? 90 : 15,
      cloudCoverLowPct: rain ? 80 : 5,
      cloudCoverMidPct: 15,
      cloudCoverHighPct: 15,
      windSpeedKmh: 15,
      windGustKmh: 20,
      weatherCode: rain ? 63 : 1
    };
  });
}

const forecasts: ModelForecast[] = modelIds.map((modelId) => ({
  modelId,
  family: "meteofrance",
  weight: 1 / modelIds.length,
  fetchedAt: "2026-09-07T05:00:00.000Z",
  latitude: city.latitude,
  longitude: city.longitude,
  hourly: points()
}));

function event(type: SelectedWeeklyEvent["type"], dayIndex: number, date: string, evidence: SelectedWeeklyEvent["evidence"]): SelectedWeeklyEvent {
  return {
    id: `${type.toLowerCase()}:${date}`,
    type,
    startDate: date,
    endDate: date,
    dayIndexes: [dayIndex],
    rule: "test_fixture",
    evidence,
    score: 80,
    confidence: "HIGH",
    selectionReason: "test_fixture"
  };
}

const profiles = buildWeeklyProfiles(city, forecasts);
const selection: WeeklySelection = {
  version: "0.1.0",
  citySlug: city.slug,
  startDate,
  endDate: "2026-09-13",
  status: "EVENTS",
  rawCandidateCount: 2,
  events: [
    event("BEST_WINDOW", 0, "2026-09-07", { startHour: 10, endHour: 15, hours: 6, meanTemperatureC: 22, maxGustKmh: 20, meanCloudPct: 15 }),
    event("RAIN", 1, "2026-09-08", { totalMm: 15.4, wetHours: 15, wetBlockMaxHours: 15, maxHourlyMm: 1 })
  ],
  calm: null
};

const activities = translateWeeklyActivities(profiles, selection, city);
const editorial = buildWeeklyEditorial(profiles, selection, activities, city.name);

ok(editorial.overview.title === "La semaine à Tarnos", "overview_title");
ok(editorial.overview.body.includes("épisode pluvieux") && editorial.overview.body.includes("lundi"), "overview_is_a_conclusion");
ok(editorial.events.length === 2, "event_cards_count");
ok(editorial.events[0].title === "Épisode pluvieux", "chronological_event_first");
ok(editorial.events[1].title === "Meilleure fenêtre météo", "best_window_is_narrative_conclusion");
ok(editorial.events.every((item) => item.scene.id >= 1 && item.scene.id <= 24), "scene_ids_are_v24");
ok(editorial.events.every((item) => item.scene.masterUrl.startsWith("/masters24/")), "scene_assets_are_v24");
ok(editorial.events.every((item) => item.scene.displayTitle.length > 0), "display_titles_present");
ok(editorial.events[0].scene.id === profiles.days[1].sceneDecision.sceneId, "editorial_reuses_daily_scene_for_first_event");
ok(editorial.events[1].scene.id === profiles.days[0].sceneDecision.sceneId, "editorial_reuses_daily_scene_for_best_window");
ok(editorial.events.every((item) => !/undefined|null|NaN/.test(`${item.title} ${item.body}`)), "no_invalid_text_values");
ok(editorial.events.every((item) => item.activities.length === 3 && item.activities.every((activity) => activity.text.length > 0)), "activity_texts_attached");
ok(editorial.events.find((item) => item.type === "RAIN")?.body.includes("15,4 mm") === true, "french_decimal_format");
ok(editorial.signature === "Ici, cette semaine.", "weekly_signature");
ok(editorial.dailySummaries.length === 7 && editorial.dailySummaries.every((day, index) => day.dayIndex === index), "seven_ordered_daily_summaries");
ok(editorial.dailySummaries.every((day, index) => day.date === profiles.days[index]?.date && day.minTemperatureC === profiles.days[index]?.fullDay.minTemperatureC && day.maxTemperatureC === profiles.days[index]?.fullDay.maxTemperatureC), "daily_summary_temperatures_reuse_profiles");
ok(editorial.dailySummaries.every((day, index) => day.scene.id === profiles.days[index]?.sceneDecision.sceneId && day.scene.source === "DAILY_V24_DECISION"), "daily_summary_scenes_reuse_daily_v24_decisions");
ok(editorial.dailyHighlights.map((highlight) => `${highlight.kind}:${highlight.dayIndex}:${highlight.sourceEventType}`).join(",") === "PREFERRED:0:BEST_WINDOW,WATCH:1:RAIN", "daily_highlights_follow_selected_best_and_rain_events");

const unrelatedEventSelection: WeeklySelection = {
  ...selection,
  events: [event("DEGRADATION", 0, startDate, { earlyCloudPct: 15, lateCloudPct: 15, cloudTrend: 0 })]
};
const unrelatedEventActivities = translateWeeklyActivities(profiles, unrelatedEventSelection, city);
const unrelatedEditorial = buildWeeklyEditorial(profiles, unrelatedEventSelection, unrelatedEventActivities, city.name);
ok(unrelatedEditorial.events[0].activities.length === 0, "activity_advice_requires_direct_weather_evidence");

const calmSelection: WeeklySelection = { ...selection, status: "CALM", events: [], rawCandidateCount: 0, calm: { reason: "no_event_reached_selection_threshold" } };
const calmEditorial = buildWeeklyEditorial(profiles, calmSelection, { insights: [] }, city.name);
ok(calmEditorial.overview.title === "Une semaine calme à Tarnos", "calm_overview_title");
ok(calmEditorial.events.length === 0, "calm_has_no_event_cards");
ok(calmEditorial.overview.scene.id >= 1 && calmEditorial.overview.scene.id <= 24, "calm_has_v24_scene");
ok(calmEditorial.dailyHighlights.length === 0, "calm_week_has_no_artificial_daily_highlights");

console.log(`WEEKLY_EDITORIAL ${passed}/23 PASS`);
