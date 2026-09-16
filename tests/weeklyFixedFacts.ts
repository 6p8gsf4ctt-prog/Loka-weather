import { CITIES } from "../src/config/cities";
import { buildWeeklyFixedFacts, buildWeeklyProfiles, WEEKLY_MORNING_END_HOUR, WEEKLY_MORNING_START_HOUR } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-14";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_FIXED_FACTS_FAIL:${label}`);
  passed++;
}

function dateAt(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function hourly(modelIndex: number): HourPoint[] {
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const dayIndex = Math.floor(index / 24);
    const hour = index % 24;
    let temperatureC = 12 + dayIndex + Math.sin((hour / 24) * Math.PI) * 8 + modelIndex * 0.1;
    // Friday morning is deliberately the coldest factual morning.
    if (dayIndex === 4 && hour === 7) temperatureC = 5 + modelIndex * 0.1;
    // Saturday afternoon is deliberately the hottest factual point.
    if (dayIndex === 5 && hour === 15) temperatureC = 29 + modelIndex * 0.1;
    return {
      time: `${dateAt(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC,
      apparentTemperatureC: temperatureC,
      precipitationMm: 0,
      rainMm: 0,
      cloudCoverPct: 35,
      cloudCoverLowPct: 20,
      cloudCoverMidPct: 10,
      cloudCoverHighPct: 10,
      windSpeedKmh: 14,
      windGustKmh: 24,
      weatherCode: 1
    };
  });
}

const forecasts: ModelForecast[] = modelIds.map((modelId, modelIndex) => ({
  modelId,
  family: "meteofrance",
  weight: 1 / modelIds.length,
  fetchedAt: "2026-09-13T18:00:00.000Z",
  latitude: city.latitude,
  longitude: city.longitude,
  hourly: hourly(modelIndex)
}));

const profiles = buildWeeklyProfiles(city, forecasts);
const facts = buildWeeklyFixedFacts(city, profiles);

ok(facts.version === "1.1.0", "version");
ok(facts.citySlug === city.slug, "city_identity");
ok(facts.startDate === "2026-09-14" && facts.endDate === "2026-09-20", "weekly_range");
ok(facts.coldestMorning.date === "2026-09-18" && facts.coldestMorning.dayIndex === 4, "coldest_morning_day");
ok(facts.coldestMorning.sourceHour === 7, "coldest_morning_source_hour");
ok(facts.coldestMorning.sourceHour >= WEEKLY_MORNING_START_HOUR && facts.coldestMorning.sourceHour <= WEEKLY_MORNING_END_HOUR, "coldest_morning_in_configured_window");
ok(Math.round(facts.coldestMorning.temperatureC) === 5, "coldest_morning_temperature");
ok(facts.hottestDay.date === "2026-09-19" && facts.hottestDay.dayIndex === 5, "hottest_day");
ok(facts.hottestDay.sourceHour === 15, "hottest_day_source_hour");
ok(Math.round(facts.hottestDay.temperatureC) === 29, "hottest_day_temperature");
ok(facts.daylight.start.date === facts.startDate && facts.daylight.end.date === facts.endDate, "daylight_endpoints");
ok(facts.daylight.start.durationMinutes === facts.daylight.start.sunsetMinutes - facts.daylight.start.sunriseMinutes, "monday_daylight_duration");
ok(facts.daylight.end.durationMinutes === facts.daylight.end.sunsetMinutes - facts.daylight.end.sunriseMinutes, "sunday_daylight_duration");
ok(facts.daylight.deltaMinutes === facts.daylight.end.durationMinutes - facts.daylight.start.durationMinutes, "daylight_delta_definition");
ok(facts.daylight.deltaMinutes < 0, "september_daylight_shortens");

const tiedForecasts: ModelForecast[] = modelIds.map((modelId, modelIndex) => ({
  modelId,
  family: "meteofrance",
  weight: 1 / modelIds.length,
  fetchedAt: "2026-09-13T18:00:00.000Z",
  latitude: city.latitude,
  longitude: city.longitude,
  hourly: hourly(modelIndex).map((point) => {
    const dayIndex = Math.floor((new Date(`${point.time}:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000);
    const hour = Number(point.time.slice(11, 13));
    const temperatureC = (dayIndex === 5 && hour === 7)
      ? 5 + modelIndex * 0.1
      : (dayIndex === 6 && hour === 15)
        ? 29 + modelIndex * 0.1
        : point.temperatureC;
    return { ...point, temperatureC, apparentTemperatureC: temperatureC };
  })
}));
const tiedFacts = buildWeeklyFixedFacts(city, buildWeeklyProfiles(city, tiedForecasts));
ok(tiedFacts.coldestMorning.matches.map((match) => match.dayIndex).join(",") === "4,5", "coldest_morning_keeps_every_exact_raw_tie");
ok(tiedFacts.hottestDay.matches.map((match) => match.dayIndex).join(",") === "5,6", "hottest_day_keeps_every_exact_raw_tie");
ok(tiedFacts.coldestMorning.matches.every((match) => match.temperatureC === tiedFacts.coldestMorning.temperatureC) && tiedFacts.hottestDay.matches.every((match) => match.temperatureC === tiedFacts.hottestDay.temperatureC), "ties_keep_the_unrounded_extreme_value");

const sameDisplayedDifferentRawForecasts: ModelForecast[] = modelIds.map((modelId, modelIndex) => ({
  modelId,
  family: "meteofrance",
  weight: 1 / modelIds.length,
  fetchedAt: "2026-09-13T18:00:00.000Z",
  latitude: city.latitude,
  longitude: city.longitude,
  hourly: Array.from({ length: 7 * 24 }, (_, index): HourPoint => {
    const dayIndex = Math.floor(index / 24);
    const hour = index % 24;
    let temperatureC = 22 + Math.sin((hour / 24) * Math.PI) * 4 + modelIndex * .1;
    if (hour >= WEEKLY_MORNING_START_HOUR && hour <= WEEKLY_MORNING_END_HOUR) {
      temperatureC = dayIndex === 0 ? 13.5 + modelIndex * .1 : dayIndex === 2 ? 13.9 + modelIndex * .1 : 18 + modelIndex * .1;
    }
    if (dayIndex === 6 && hour === 15) temperatureC = 29 + modelIndex * .1;
    return {
      time: `${dateAt(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC,
      apparentTemperatureC: temperatureC,
      precipitationMm: 0,
      rainMm: 0,
      cloudCoverPct: 35,
      cloudCoverLowPct: 20,
      cloudCoverMidPct: 10,
      cloudCoverHighPct: 10,
      windSpeedKmh: 14,
      windGustKmh: 24,
      weatherCode: 1
    };
  })
}));
const sameDisplayedDifferentRawProfiles = buildWeeklyProfiles(city, sameDisplayedDifferentRawForecasts);
const sameDisplayedDifferentRawFacts = buildWeeklyFixedFacts(city, sameDisplayedDifferentRawProfiles);
const mondayRaw = sameDisplayedDifferentRawProfiles.days[0]?.hours.find((point) => point.time.slice(11, 13) === "07")?.temperatureC ?? Number.NaN;
const wednesdayRaw = sameDisplayedDifferentRawProfiles.days[2]?.hours.find((point) => point.time.slice(11, 13) === "07")?.temperatureC ?? Number.NaN;
ok(Math.round(mondayRaw) === 14 && Math.round(wednesdayRaw) === 14 && mondayRaw < wednesdayRaw && sameDisplayedDifferentRawFacts.coldestMorning.matches.map((match) => match.dayIndex).join(",") === "0", "rounded_strip_values_never_create_a_false_tie");

console.log(`WEEKLY_FIXED_FACTS ${passed}/19 PASS`);
