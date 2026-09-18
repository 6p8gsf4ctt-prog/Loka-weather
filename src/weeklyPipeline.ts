import { buildWeeklyCarouselPlan, buildWeeklyContextualPipeline, buildWeeklyContextualSelection, buildWeeklyEditorial, buildWeeklyProfiles, detectWeeklyEvents, fetchWeeklyForecasts, selectWeeklyEvents, translateWeeklyActivities, validateWeeklyActivation, validateWeeklyEditorialPilot, WEEKLY_ENGINE_VERSION } from "./engine/weekly";
import type { WeeklyCarouselRenderOptions } from "./engine/weekly";
import { MODELS } from "./config/models";
import { isWeeklyEnabled } from "./engine/weekly/featureFlag";
import { localDateIsMonday, nextMondayOrSame, weeklyRangeForDate, type WeeklyDateRange } from "./engine/weekly/schedule";
import { saveWeeklyPublication, weeklyPublicationForRange, type WeeklyPublicationRecord } from "./storage/weeklyPublications";
import type { CityConfig, Env, HourPoint, ModelForecast } from "./types";
import { ensureMeteoFranceDailyArchive } from "./weather/meteoFranceClimate";

export interface GeneratedWeekly {
  generatedAt: string;
  source: string;
  profiles: ReturnType<typeof buildWeeklyProfiles>;
  editorial: ReturnType<typeof buildWeeklyEditorial>;
  contextual: ReturnType<typeof buildWeeklyContextualPipeline>;
  carousel: ReturnType<typeof buildWeeklyCarouselPlan>;
  activation: ReturnType<typeof validateWeeklyActivation>;
  pilot: ReturnType<typeof validateWeeklyEditorialPilot>;
}

export interface WeeklyRunResult {
  skipped: boolean;
  saved: boolean;
  publication?: WeeklyPublicationRecord;
}

export function applyWeeklyManualSelection(generated: GeneratedWeekly, signalIds: string[]): GeneratedWeekly {
  const contextual = buildWeeklyContextualSelection(generated.contextual, generated.profiles, signalIds);
  if (signalIds.length > 0 && (!contextual.preflight.ok || !contextual.preflight.comprehensive)) {
    const failed = contextual.preflight.checks
      .filter((item) => !item.ok)
      .map((item) => `${item.id}:${item.detail}`)
      .join("|");
    throw new Error(`weekly_manual_selection_preflight_blocked:${failed || "unknown"}`);
  }
  const publication = buildSafeWeeklyPublication(generated.editorial, contextual);
  const activation = validateWeeklyActivation(publication.editorial, publication.carousel);
  if (!activation.ok) throw new Error(`weekly_manual_selection_blocked:${activation.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  const pilot = validateWeeklyEditorialPilot({ source: "LIVE", label: "manual_weekly_selection", profiles: generated.profiles, contextual, carousel: publication.carousel, activation });
  return { ...generated, editorial: publication.editorial, contextual, carousel: publication.carousel, activation, pilot };
}

function buildSafeWeeklyPublication(
  editorial: ReturnType<typeof buildWeeklyEditorial>,
  contextual: ReturnType<typeof buildWeeklyContextualPipeline>
): { editorial: ReturnType<typeof buildWeeklyEditorial>; carousel: ReturnType<typeof buildWeeklyCarouselPlan> } {
  // Raw weekly numbers pre-date the contextual engine. Phase 3 never exposes
  // them: only a complete contextual preflight may add slides after slide 1.
  const publishableEditorial = { ...editorial, weeklyNumber: undefined };
  const contextualReady = contextual.preflight.ok
    && contextual.preflight.comprehensive;
  const carousel = contextualReady
    ? buildWeeklyCarouselPlan(publishableEditorial, {
      complementarySlides: contextual.slides,
      complementaryPreflight: contextual.preflight
    })
    : buildWeeklyCarouselPlan(publishableEditorial);
  return { editorial: publishableEditorial, carousel };
}

/**
 * Resolves the exact preview renderer input. Any missing or failed contextual
 * control produces slide 1 only; the slide itself is never rewritten.
 */
export function weeklyPreviewRenderOptions(generated: GeneratedWeekly): WeeklyCarouselRenderOptions {
  const contextualReady = generated.activation.ok
    && generated.contextual.preflight.ok
    && generated.contextual.preflight.comprehensive
    && generated.contextual.slides.slides.length > 0;
  return {
    ...(contextualReady ? {
      complementarySlides: generated.contextual.slides,
      complementaryPreflight: generated.contextual.preflight
    } : {}),
    includeStory: false,
    pilot: generated.pilot
  };
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
  return generateWeeklyForRange(env, city, source, weeklyRangeForDate(localDate), instant);
}

async function generateWeeklyForRange(
  env: Env,
  city: CityConfig,
  source: string,
  expected: WeeklyDateRange,
  instant = new Date()
): Promise<GeneratedWeekly> {
  const climatePromise = city.slug === "tarnos"
    ? ensureMeteoFranceDailyArchive(env, instant)
    : Promise.resolve({ status: "UNAVAILABLE" as const, detail: "climate_reference_not_configured_for_city", observations: [], state: null });
  const batch = await fetchWeeklyForecasts(env, city, expected);
  const profiles = buildWeeklyProfiles(city, batch.forecasts);
  if (profiles.startDate !== expected.startDate || profiles.endDate !== expected.endDate) {
    throw new Error(`weekly_forecast_range_mismatch:${profiles.startDate}:${profiles.endDate}:${expected.startDate}:${expected.endDate}`);
  }
  const rawEvents = detectWeeklyEvents(profiles, city);
  const selection = selectWeeklyEvents(profiles, rawEvents, city);
  const activities = translateWeeklyActivities(profiles, selection, city);
  const rawEditorial = buildWeeklyEditorial(profiles, selection, activities, city);
  const climate = await climatePromise;
  const contextual = buildWeeklyContextualPipeline(
    profiles,
    climate.status === "READY" ? { dailyArchive: climate.observations } : {}
  );
  const publication = buildSafeWeeklyPublication(rawEditorial, contextual);
  const { editorial, carousel } = publication;
  const activation = validateWeeklyActivation(editorial, carousel);
  if (!activation.ok) throw new Error(`weekly_activation_blocked:${activation.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  const pilot = validateWeeklyEditorialPilot({ source: "LIVE", label: source, profiles, contextual, carousel, activation });
  return {
    generatedAt: new Date().toISOString(),
    source,
    profiles,
    editorial,
    contextual,
    carousel,
    activation,
    pilot
  };
}

/**
 * Preview-only generation. It may be called before Monday and never writes to
 * D1; by default it previews the next Monday-to-Sunday window.
 */
export async function generateWeeklyPreviewCity(
  env: Env,
  city: CityConfig,
  instant = new Date(),
  requestedStartDate?: string
): Promise<GeneratedWeekly> {
  const localDate = localDateForCity(city, instant);
  const startDate = requestedStartDate || nextMondayOrSame(localDate);
  const expected = weeklyRangeForDate(startDate);
  if (expected.startDate !== startDate) throw new Error("weekly_preview_start_requires_monday");
  return generateWeeklyForRange(env, city, "admin_weekly_preview", expected, instant);
}

function dateAt(startDate: string, offset: number): string {
  const value = new Date(`${startDate}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

/**
 * Deterministic internal visual scenario. It runs through the same profiles,
 * V24 daily decisions, event detection, selection, editorial and carousel
 * layers as a real week, but never fetches weather data or writes to D1.
 */
function calmScenarioForecasts(city: CityConfig, startDate: string): ModelForecast[] {
  const hourly: HourPoint[] = Array.from({ length: 7 * 24 }, (_, index) => {
    const dayIndex = Math.floor(index / 24);
    const hour = index % 24;
    const temperatureC = hour < 7 ? 16 : hour < 12 ? 18 : hour < 18 ? 22 : 18;
    return {
      time: `${dateAt(startDate, dayIndex)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC,
      apparentTemperatureC: temperatureC,
      precipitationMm: 0,
      rainMm: 0,
      cloudCoverPct: 70,
      cloudCoverLowPct: 45,
      cloudCoverMidPct: 35,
      cloudCoverHighPct: 20,
      windSpeedKmh: 16,
      windGustKmh: 26,
      weatherCode: 3
    };
  });
  return MODELS.map((model) => ({
    modelId: `preview_${model.id}`,
    family: model.family,
    weight: model.baseWeight,
    fetchedAt: "preview",
    latitude: city.latitude,
    longitude: city.longitude,
    hourly
  }));
}

/** Controlled preview only: verifies the contextual path without claiming it is a real forecast. */
function contextualScenarioForecasts(city: CityConfig, startDate: string): ModelForecast[] {
  return calmScenarioForecasts(city, startDate).map((forecast) => ({
    ...forecast,
    modelId: `contextual_${forecast.modelId}`,
    hourly: forecast.hourly.map((point) => {
      const dayIndex = Math.floor((Date.parse(`${point.time.slice(0, 10)}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
      const hour = Number(point.time.slice(11, 13));
      if (dayIndex === 1) {
        const temperatureC = hour < 7 ? 21 : hour < 12 ? 29 : hour < 18 ? 36 : 27;
        return { ...point, temperatureC, apparentTemperatureC: temperatureC, cloudCoverPct: 20, weatherCode: 1 };
      }
      if (dayIndex === 3) {
        const precipitationMm = hour >= 9 && hour <= 15 ? 4 : 0;
        return { ...point, precipitationMm, rainMm: precipitationMm, cloudCoverPct: 88, weatherCode: 63 };
      }
      return point;
    })
  }));
}

/**
 * Preview-only calm-week scenario for visual verification of the adaptive
 * layout. It is explicitly separate from the live forecast preview.
 */
export function generateWeeklyCalmVisualPreview(
  city: CityConfig,
  instant = new Date(),
  requestedStartDate?: string
): GeneratedWeekly {
  const localDate = localDateForCity(city, instant);
  const startDate = requestedStartDate || nextMondayOrSame(localDate);
  const expected = weeklyRangeForDate(startDate);
  if (expected.startDate !== startDate) throw new Error("weekly_preview_start_requires_monday");
  const profiles = buildWeeklyProfiles(city, calmScenarioForecasts(city, expected.startDate));
  const rawEvents = detectWeeklyEvents(profiles, city);
  const selection = selectWeeklyEvents(profiles, rawEvents, city);
  if (selection.status !== "CALM") throw new Error("weekly_calm_preview_scenario_not_calm");
  const activities = translateWeeklyActivities(profiles, selection, city);
  const rawEditorial = buildWeeklyEditorial(profiles, selection, activities, city);
  const contextual = buildWeeklyContextualPipeline(profiles);
  const { editorial, carousel } = buildSafeWeeklyPublication(rawEditorial, contextual);
  const activation = validateWeeklyActivation(editorial, carousel);
  if (!activation.ok) throw new Error(`weekly_activation_blocked:${activation.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  const pilot = validateWeeklyEditorialPilot({ source: "CONTROLLED", label: "semaine_calme_controlee", profiles, contextual, carousel, activation });
  return {
    generatedAt: new Date().toISOString(),
    source: "admin_weekly_calm_visual_preview",
    profiles,
    editorial,
    contextual,
    carousel,
    activation,
    pilot
  };
}

/** Preview-only non-calm scenario exercising the exact contextual pipeline and renderer. */
export function generateWeeklyContextualVisualPreview(
  city: CityConfig,
  instant = new Date(),
  requestedStartDate?: string
): GeneratedWeekly {
  const localDate = localDateForCity(city, instant);
  const startDate = requestedStartDate || nextMondayOrSame(localDate);
  const expected = weeklyRangeForDate(startDate);
  if (expected.startDate !== startDate) throw new Error("weekly_preview_start_requires_monday");
  const profiles = buildWeeklyProfiles(city, contextualScenarioForecasts(city, expected.startDate));
  const rawEvents = detectWeeklyEvents(profiles, city);
  const selection = selectWeeklyEvents(profiles, rawEvents, city);
  const activities = translateWeeklyActivities(profiles, selection, city);
  const rawEditorial = buildWeeklyEditorial(profiles, selection, activities, city);
  const contextual = buildWeeklyContextualPipeline(profiles);
  const { editorial, carousel } = buildSafeWeeklyPublication(rawEditorial, contextual);
  const activation = validateWeeklyActivation(editorial, carousel);
  if (!activation.ok) throw new Error(`weekly_activation_blocked:${activation.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  const pilot = validateWeeklyEditorialPilot({ source: "CONTROLLED", label: "chaleur_pluie_controlee", profiles, contextual, carousel, activation });
  return {
    generatedAt: new Date().toISOString(),
    source: "admin_weekly_contextual_visual_preview",
    profiles,
    editorial,
    contextual,
    carousel,
    activation,
    pilot
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

export { localDateIsMonday, nextMondayOrSame, weeklyRangeForDate } from "./engine/weekly/schedule";
