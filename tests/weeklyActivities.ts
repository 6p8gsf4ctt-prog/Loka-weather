import { CITIES } from "../src/config/cities";
import { buildWeeklyProfiles, translateWeeklyActivities } from "../src/engine/weekly";
import type { SelectedWeeklyEvent, WeeklySelection } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-07";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_ACTIVITIES_FAIL:${label}`);
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
    const wind = dayIndex === 2 && hour >= 10 && hour <= 12;
    return {
      time: `${nextDate(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: 22,
      apparentTemperatureC: 22,
      precipitationMm: rain ? 1 : 0,
      rainMm: rain ? 1 : 0,
      cloudCoverPct: rain ? 90 : 20,
      cloudCoverLowPct: rain ? 80 : 10,
      cloudCoverMidPct: 20,
      cloudCoverHighPct: 20,
      windSpeedKmh: wind ? 45 : 15,
      windGustKmh: wind ? 75 : 20,
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
    score: 75,
    confidence: "MEDIUM",
    selectionReason: "test_fixture"
  };
}

const profiles = buildWeeklyProfiles(city, forecasts);
const selection: WeeklySelection = {
  version: "0.1.0",
  citySlug: city.slug,
  startDate: startDate,
  endDate: "2026-09-13",
  status: "EVENTS",
  rawCandidateCount: 3,
  events: [
    event("BEST_WINDOW", 0, "2026-09-07", { startHour: 10, endHour: 15, hours: 6, meanTemperatureC: 22, maxGustKmh: 20, meanCloudPct: 20 }),
    event("RAIN", 1, "2026-09-08", { totalMm: 15, wetHours: 15, wetBlockMaxHours: 15, maxHourlyMm: 1 }),
    event("WIND", 2, "2026-09-09", { maxGustKmh: 75, strongHours: 3, strongBlockMaxHours: 3 })
  ],
  calm: null
};

const result = translateWeeklyActivities(profiles, selection, city);
const beachWindow = result.insights.find((item) => item.eventId.startsWith("best_window") && item.activity === "BEACH");
const rainyBeach = result.insights.find((item) => item.eventId.startsWith("rain") && item.activity === "BEACH");
const windyBeach = result.insights.find((item) => item.eventId.startsWith("wind") && item.activity === "BEACH");

ok(result.insights.length === 9, "three_activities_per_selected_event_day");
ok(new Set(result.insights.map((item) => item.activity)).size === 3, "exactly_three_activity_categories");
ok(beachWindow?.status === "FAVORABLE", "beach_favorable_window");
ok(beachWindow?.bestWindow?.startHour === 10 && beachWindow.bestWindow.endHour === 15, "window_is_preserved");
ok(rainyBeach?.status === "UNFAVORABLE" && rainyBeach.reasonCodes.includes("RAIN"), "rain_consequence");
ok(windyBeach?.status === "MIXED" && windyBeach.reasonCodes.includes("WIND"), "wind_consequence");
ok(result.insights.every((item) => item.evaluatedHours > 0 && item.evidence.maxGustKmh !== null), "factual_evidence_present");
ok(result.insights.every((item) => !("text" in item) && !("label" in item)), "structured_output_only");
ok(result.insights.every((item) => item.eventId.length > 0 && item.date.length === 10), "event_linkage");

const calm: WeeklySelection = { ...selection, status: "CALM", events: [], rawCandidateCount: 0, calm: { reason: "no_event_reached_selection_threshold" } };
ok(translateWeeklyActivities(profiles, calm, city).insights.length === 0, "calm_week_has_no_activity_advice");

console.log(`WEEKLY_ACTIVITIES ${passed}/10 PASS`);
