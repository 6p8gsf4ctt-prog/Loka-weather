import { CITIES } from "../src/config/cities";
import { buildWeeklyProfiles } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-07";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_PROFILES_FAIL:${label}`);
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
    const rainyDay = dayIndex === 2;
    const windyDay = dayIndex === 4;
    return {
      time: `${nextDate(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: 14 + dayIndex + Math.sin((hour / 24) * Math.PI) * 10 + modelIndex * 0.1,
      apparentTemperatureC: 13.5 + dayIndex + Math.sin((hour / 24) * Math.PI) * 10 + modelIndex * 0.1,
      precipitationMm: rainyDay && hour >= 8 && hour <= 12 ? 1.5 : 0,
      rainMm: rainyDay && hour >= 8 && hour <= 12 ? 1.5 : 0,
      cloudCoverPct: rainyDay ? 90 : 30,
      cloudCoverLowPct: rainyDay ? 80 : 10,
      cloudCoverMidPct: 20,
      cloudCoverHighPct: 20,
      windSpeedKmh: windyDay ? 45 : 15,
      windGustKmh: windyDay ? 75 : 25,
      weatherCode: rainyDay && hour >= 8 && hour <= 12 ? 63 : 1
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

const profiles = buildWeeklyProfiles(city, forecasts);

ok(profiles.citySlug === "tarnos", "city_identity");
ok(profiles.forecastDays === 7, "seven_day_horizon");
ok(profiles.startDate === "2026-09-07" && profiles.endDate === "2026-09-13", "date_range");
ok(profiles.days.length === 7, "seven_profiles");
ok(profiles.days.every((day, index) => day.dayIndex === index), "ordered_day_indexes");
ok(profiles.days.every((day) => day.hours.length === 24), "full_hourly_consensus");
ok(profiles.days.every((day) => day.fullDay.modelCountMin === 5), "five_model_consensus");
ok(profiles.days[2].fullDay.precipitation.wetHours === 5, "rain_profile");
ok(profiles.days[2].fullDay.precipitation.wetBlockMaxHours === 5, "rain_continuity_profile");
ok(profiles.days[4].fullDay.wind.strongHours === 24, "wind_profile");
ok(profiles.days[0].daylight.version === "2.0", "reuses_v2_daylight_profile");
ok(profiles.days.every((day) => day.citySlug === city.slug && day.version === "0.1.0"), "profile_identity");
ok(profiles.days.every((day) => day.fullDay.pointCount === 24), "full_day_point_count");
ok(profiles.days[0].fullDay.minTemperatureC < profiles.days[0].fullDay.maxTemperatureC, "thermal_range");
ok(profiles.days.every((day) => day.fullDay.temperatureSpreadMaxC >= 0), "model_spread_available");

console.log(`WEEKLY_PROFILES ${passed}/15 PASS`);
