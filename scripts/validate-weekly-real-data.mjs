import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const require = createRequire(new URL("../.test-dist/package.json", import.meta.url));
const weekly = require("../.test-dist/src/engine/weekly/index.js");
const { CITIES } = require("../.test-dist/src/config/cities.js");
const { readMeteoFranceClimateBootstrap, readMeteoFranceDailyResource, selectMeteoFranceDailyResources, METEO_FRANCE_DAILY_DATASET_API } = require("../.test-dist/src/weather/meteoFranceClimate.js");

const startDate = process.argv[2] ?? "2026-09-21";
const end = new Date(`${startDate}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + 6);
const endDate = end.toISOString().slice(0, 10);
const acquiredAt = new Date().toISOString();

const metadata = await (await fetch(METEO_FRANCE_DAILY_DATASET_API)).json();
const resources = selectMeteoFranceDailyResources(metadata);
const historicalResource = resources[0];
const rollingResource = resources[1];
const provenance = (resource) => ({
  provider: "METEO_FRANCE",
  stationId: weekly.WEEKLY_CLIMATE_STATION_ID,
  stationName: weekly.WEEKLY_CLIMATE_STATION_NAME,
  resourceId: resource.id,
  acquiredAt,
  referenceVersion: weekly.WEEKLY_CLIMATE_REFERENCE_VERSION
});

const bootstrapBytes = await readFile(new URL("../public/climate/64024001-daily-1956-2024.json", import.meta.url));
const historical = await readMeteoFranceClimateBootstrap(new Response(bootstrapBytes), provenance(historicalResource), historicalResource);
const rollingResponse = await fetch(rollingResource.url);
const rolling = await readMeteoFranceDailyResource(rollingResponse, provenance(rollingResource));
const archive = [...new Map([...historical, ...rolling].map((row) => [row.date, row])).values()].sort((a, b) => a.date.localeCompare(b.date));

const batch = await weekly.fetchWeeklyForecasts({ DB: undefined, OPEN_METEO_BASE_URL: "https://api.open-meteo.com/v1/forecast" }, CITIES.tarnos, { startDate, endDate });
const profiles = weekly.buildWeeklyProfiles(CITIES.tarnos, batch.forecasts);
const events = weekly.detectWeeklyEvents(profiles, CITIES.tarnos);
const selection = weekly.selectWeeklyEvents(profiles, events, CITIES.tarnos);
const activities = weekly.translateWeeklyActivities(profiles, selection, CITIES.tarnos);
const editorial = weekly.buildWeeklyEditorial(profiles, selection, activities, CITIES.tarnos);
const contextual = weekly.buildWeeklyContextualPipeline(profiles, { dailyArchive: archive });
const carousel = contextual.preflight.ok
  ? weekly.buildWeeklyCarouselPlan(editorial, { complementarySlides: contextual.slides, complementaryPreflight: contextual.preflight })
  : weekly.buildWeeklyCarouselPlan({ ...editorial, weeklyNumber: undefined });
const activation = weekly.validateWeeklyActivation(editorial, carousel);
const html = weekly.renderWeeklyCarousel(editorial, {
  complementarySlides: contextual.preflight.ok ? contextual.slides : undefined,
  complementaryPreflight: contextual.preflight.ok ? contextual.preflight : undefined,
  includeStory: false
});

const report = {
  generatedAt: acquiredAt,
  range: { startDate, endDate },
  archive: { rows: archive.length, firstDate: archive[0]?.date, lastDate: archive.at(-1)?.date },
  forecast: { models: batch.forecasts.map((item) => item.modelId), failures: batch.failures },
  climateStatus: contextual.climateStatus,
  candidateCounts: contextual.activation?.candidateCounts ?? {},
  selectedSignals: contextual.ranking.selected.map((item) => ({ id: item.candidate.signal.id, detector: item.candidate.detector, score: item.scores.total })),
  slides: carousel.slides.map((slide) => ({ kind: slide.kind, title: slide.title, signalId: slide.complementary?.signalId ?? null })),
  preflight: { ok: contextual.preflight.ok, checks: contextual.preflight.checks },
  activation: { ok: activation.ok, failedChecks: activation.checks.filter((item) => !item.ok) }
};

await mkdir(new URL("../artifacts", import.meta.url), { recursive: true });
await writeFile(new URL("../artifacts/weekly-real-preview.html", import.meta.url), html);
await writeFile(new URL("../artifacts/weekly-real-report.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
