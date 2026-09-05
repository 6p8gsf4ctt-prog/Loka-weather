import { buildWeeklyCarouselPlan, buildWeeklyEditorial, buildWeeklyProfiles, detectWeeklyEvents, fetchWeeklyForecasts, selectWeeklyEvents, translateWeeklyActivities, WEEKLY_ENGINE_VERSION } from "./engine/weekly";
import { isWeeklyEnabled } from "./engine/weekly/featureFlag";
import { localDateIsMonday, weeklyRangeForDate } from "./engine/weekly/schedule";
import { saveWeeklyPublication, weeklyPublicationForRange, type WeeklyPublicationRecord } from "./storage/weeklyPublications";
import type { CityConfig, Env } from "./types";

export interface GeneratedWeekly {
  generatedAt: string;
  source: string;
  editorial: ReturnType<typeof buildWeeklyEditorial>;
  carousel: ReturnType<typeof buildWeeklyCarouselPlan>;
}

export interface WeeklyRunResult {
  skipped: boolean;
  saved: boolean;
  publication?: WeeklyPublicationRecord;
}

function assertMonday(city: CityConfig, instant: Date): string {
  if (!localDateIsMonday(city.timezone, instant)) throw new Error("weekly_generation_requires_monday");
  return localDateForCity(city, instant);
}

function localDateForCity(city: CityConfig, instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: city.timezone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function generateWeeklyCity(
  env: Env,
  city: CityConfig,
  source: string,
  instant = new Date()
): Promise<GeneratedWeekly> {
  const localDate = assertMonday(city, instant);
  const expected = weeklyRangeForDate(localDate);
  const batch = await fetchWeeklyForecasts(env, city);
  const profiles = buildWeeklyProfiles(city, batch.forecasts);
  if (profiles.startDate !== expected.startDate || profiles.endDate !== expected.endDate) {
    throw new Error(`weekly_forecast_range_mismatch:${profiles.startDate}:${profiles.endDate}:${expected.startDate}:${expected.endDate}`);
  }
  const rawEvents = detectWeeklyEvents(profiles, city);
  const selection = selectWeeklyEvents(profiles, rawEvents, city);
  const activities = translateWeeklyActivities(profiles, selection, city);
  const editorial = buildWeeklyEditorial(profiles, selection, activities, city.name);
  return {
    generatedAt: new Date().toISOString(),
    source,
    editorial,
    carousel: buildWeeklyCarouselPlan(editorial)
  };
}

export async function runManualWeeklyCity(env: Env, city: CityConfig, instant = new Date()): Promise<WeeklyPublicationRecord> {
  if (!isWeeklyEnabled(env)) throw new Error("weekly_disabled");
  const generated = await generateWeeklyCity(env, city, "manual_weekly", instant);
  return saveWeeklyPublication(env.DB, {
    citySlug: city.slug,
    startDate: generated.editorial.startDate,
    endDate: generated.editorial.endDate,
    generatedAt: generated.generatedAt,
    source: generated.source,
    status: generated.editorial.status,
    engineVersion: WEEKLY_ENGINE_VERSION,
    editorial: generated.editorial,
    carousel: generated.carousel
  });
}

export async function runScheduledWeeklyCity(
  env: Env,
  city: CityConfig,
  instant = new Date()
): Promise<WeeklyRunResult> {
  if (!isWeeklyEnabled(env) || !localDateIsMonday(city.timezone, instant)) return { skipped: true, saved: false };
  const localDate = localDateForCity(city, instant);
  const range = weeklyRangeForDate(localDate);
  const existing = await weeklyPublicationForRange(env.DB, city.slug, range.startDate, range.endDate);
  if (existing) return { skipped: true, saved: false, publication: existing };
  const generated = await generateWeeklyCity(env, city, "cron_weekly", instant);
  const publication = await saveWeeklyPublication(env.DB, {
    citySlug: city.slug,
    startDate: generated.editorial.startDate,
    endDate: generated.editorial.endDate,
    generatedAt: generated.generatedAt,
    source: generated.source,
    status: generated.editorial.status,
    engineVersion: WEEKLY_ENGINE_VERSION,
    editorial: generated.editorial,
    carousel: generated.carousel
  });
  return { skipped: false, saved: true, publication };
}

export { localDateIsMonday, weeklyRangeForDate } from "./engine/weekly/schedule";
