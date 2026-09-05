import { CITIES } from "../src/config/cities";
import { buildWeeklyProfiles, detectWeeklyEvents } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-07";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_EVENTS_FAIL:${label}`);
  passed++;
}

function nextDate(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function points(modelIndex: number): HourPoint[] {
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const dayIndex = Math.floor(index / 24);
    const hour = index % 24;
    const sine = Math.sin((hour / 24) * Math.PI);
    const heat = dayIndex === 1;
    const cold = dayIndex === 2;
    const rain = dayIndex === 3 && hour >= 8 && hour <= 13;
    const wind = dayIndex === 4 && hour >= 10 && hour <= 12;
    const improvement = dayIndex === 5 && hour < 12;
    const degradation = dayIndex === 6 && hour >= 12;
    const thunder = dayIndex === 6 && hour >= 14 && hour <= 15;
    const cloudCoverPct = improvement ? 90 : degradation ? 90 : dayIndex === 6 ? 20 : rain ? 90 : 25;
    return {
      time: `${nextDate(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: (heat ? 25 : cold ? 8 : 18) + sine * (heat ? 8 : cold ? 3 : 4) + modelIndex * 0.05,
      apparentTemperatureC: (heat ? 24.5 : cold ? 7.5 : 17.5) + sine * (heat ? 8 : cold ? 3 : 4) + modelIndex * 0.05,
      precipitationMm: rain ? 1 : 0,
      rainMm: rain ? 1 : 0,
      cloudCoverPct,
      cloudCoverLowPct: cloudCoverPct,
      cloudCoverMidPct: cloudCoverPct,
      cloudCoverHighPct: cloudCoverPct,
      windSpeedKmh: wind ? 45 : 15,
      windGustKmh: wind ? 75 : 25,
      weatherCode: thunder ? 95 : rain ? 63 : 1
    };
  });
}

const forecasts: ModelForecast[] = modelIds.map((modelId, modelIndex) => ({
  modelId,
  family: "meteofrance",
  weight: 1 / modelIds.length,
  fetchedAt: "2026-09-07T05:00:00.000Z",
  latitude: city.latitude,
  longitude: city.longitude,
  hourly: points(modelIndex)
}));

const events = detectWeeklyEvents(buildWeeklyProfiles(city, forecasts), city);
const types = new Set(events.map((item) => item.type));

ok(types.has("HEAT"), "heat_detected");
ok(types.has("COLD"), "cold_detected");
ok(types.has("RAIN"), "rain_detected");
ok(types.has("WIND"), "wind_detected");
ok(types.has("IMPROVEMENT"), "improvement_detected");
ok(types.has("DEGRADATION"), "degradation_detected");
ok(types.has("BEST_WINDOW"), "best_window_detected");
ok(types.has("THUNDER"), "reliable_thunder_detected");
ok(events.some((item) => item.type === "RAIN" && item.evidence.wetHours === 6), "rain_evidence");
ok(events.some((item) => item.type === "WIND" && item.evidence.strongHours === 3), "wind_evidence");
ok(events.some((item) => item.type === "THUNDER" && item.evidence.peakThunderSupport === 1), "thunder_support_evidence");
ok(events.every((item) => item.startDate <= item.endDate && item.dayIndexes.length === 1), "event_scope");
ok(events.every((item) => !("score" in item) && !("rank" in item)), "no_selection_stage");

console.log(`WEEKLY_EVENTS ${passed}/13 PASS`);
