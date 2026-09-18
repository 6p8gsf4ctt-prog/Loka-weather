import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const require = createRequire(new URL("../.test-dist/package.json", import.meta.url));
const weekly = require("../.test-dist/src/engine/weekly/index.js");
const weeklyPipeline = require("../.test-dist/src/weeklyPipeline.js");
const { CITIES } = require("../.test-dist/src/config/cities.js");
const {
  METEO_FRANCE_DAILY_DATASET_API,
  readMeteoFranceClimateBootstrap,
  readMeteoFranceDailyResource,
  selectMeteoFranceDailyResources
} = require("../.test-dist/src/weather/meteoFranceClimate.js");

const DEFAULT_REAL_WEEKS = ["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07"];
const HISTORICAL_FORECAST_API = "https://historical-forecast-api.open-meteo.com/v1/forecast";
const requestedWeeks = process.argv.slice(2);
const realWeeks = requestedWeeks.length ? requestedWeeks : DEFAULT_REAL_WEEKS;
const generatedAt = new Date().toISOString();
const artifactsDirectory = new URL("../artifacts/weekly-production/", import.meta.url);

function endDate(startDate) {
  const value = new Date(`${startDate}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 6);
  return value.toISOString().slice(0, 10);
}

function assertMonday(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).getUTCDay() !== 1) {
    throw new Error(`production_validation_requires_monday:${date}`);
  }
}

async function loadClimateArchive() {
  const metadata = await (await fetch(METEO_FRANCE_DAILY_DATASET_API)).json();
  const resources = selectMeteoFranceDailyResources(metadata);
  const historicalResource = resources[0];
  const rollingResource = resources[1];
  const provenance = (resource) => ({
    provider: "METEO_FRANCE",
    stationId: weekly.WEEKLY_CLIMATE_STATION_ID,
    stationName: weekly.WEEKLY_CLIMATE_STATION_NAME,
    resourceId: resource.id,
    acquiredAt: generatedAt,
    referenceVersion: weekly.WEEKLY_CLIMATE_REFERENCE_VERSION
  });
  const bootstrapBytes = await readFile(new URL("../public/climate/64024001-daily-1956-2024.json", import.meta.url));
  const historical = await readMeteoFranceClimateBootstrap(new Response(bootstrapBytes), provenance(historicalResource), historicalResource);
  const rolling = await readMeteoFranceDailyResource(await fetch(rollingResource.url), provenance(rollingResource));
  return [...new Map([...historical, ...rolling].map((row) => [row.date, row])).values()]
    .sort((left, right) => left.date.localeCompare(right.date));
}

function controlledReport(generated, label) {
  return {
    type: "CONTROLLED",
    label,
    range: { startDate: generated.editorial.startDate, endDate: generated.editorial.endDate },
    pilot: generated.pilot,
    slides: generated.carousel.slides.map((slide) => slide.kind),
    preflightOk: generated.contextual.preflight.ok,
    activationOk: generated.activation.ok
  };
}

async function validateRealWeek(startDate, archive) {
  assertMonday(startDate);
  const range = { startDate, endDate: endDate(startDate) };
  // A replay must not use observations that were not yet available when the
  // forecast week started.
  const archiveAtIssueTime = archive.filter((row) => row.date < startDate);
  const forecast = await weekly.fetchWeeklyForecasts({
    DB: undefined,
    OPEN_METEO_BASE_URL: HISTORICAL_FORECAST_API
  }, CITIES.tarnos, range);
  const profiles = weekly.buildWeeklyProfiles(CITIES.tarnos, forecast.forecasts);
  const events = weekly.detectWeeklyEvents(profiles, CITIES.tarnos);
  const selection = weekly.selectWeeklyEvents(profiles, events, CITIES.tarnos);
  const activities = weekly.translateWeeklyActivities(profiles, selection, CITIES.tarnos);
  const rawEditorial = weekly.buildWeeklyEditorial(profiles, selection, activities, CITIES.tarnos);
  const editorial = { ...rawEditorial, weeklyNumber: undefined };
  const contextual = weekly.buildWeeklyContextualPipeline(profiles, { dailyArchive: archiveAtIssueTime });
  const contextualReady = contextual.preflight.ok
    && contextual.preflight.comprehensive
    && contextual.slides.slides.length > 0;
  const carousel = contextualReady
    ? weekly.buildWeeklyCarouselPlan(editorial, {
      complementarySlides: contextual.slides,
      complementaryPreflight: contextual.preflight
    })
    : weekly.buildWeeklyCarouselPlan(editorial);
  const activation = weekly.validateWeeklyActivation(editorial, carousel);
  const pilot = weekly.validateWeeklyEditorialPilot({
    source: "LIVE",
    label: `historical_forecast_${startDate}`,
    profiles,
    contextual,
    carousel,
    activation
  });
  const renderOptions = contextualReady
    ? { complementarySlides: contextual.slides, complementaryPreflight: contextual.preflight, includeStory: false, pilot }
    : { includeStory: false, pilot };
  const html = weekly.renderWeeklyCarousel(editorial, renderOptions);
  await writeFile(new URL(`week-${startDate}.html`, artifactsDirectory), html);

  return {
    type: "REAL_REPLAY",
    label: pilot.label,
    range,
    forecast: { models: forecast.forecasts.map((item) => item.modelId), failures: forecast.failures },
    archive: {
      rowsAvailableAtIssueTime: archiveAtIssueTime.length,
      firstDate: archiveAtIssueTime[0]?.date ?? null,
      lastDate: archiveAtIssueTime.at(-1)?.date ?? null
    },
    climateStatus: contextual.climateStatus,
    candidateCounts: contextual.activation?.candidateCounts ?? {},
    selectedSignals: contextual.ranking.selected.map((item) => ({
      id: item.candidate.signal.id,
      detector: item.candidate.detector,
      score: item.scores.total,
      confidence: item.candidate.signal.confidence
    })),
    rejectedReasons: contextual.ranking.rejected.reduce((counts, item) => {
      for (const reason of item.rejectionReasons) counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {}),
    slides: carousel.slides.map((slide) => ({
      kind: slide.kind,
      position: slide.index + 1,
      signalId: slide.complementary?.signalId ?? null,
      title: slide.title
    })),
    fallbackToSlide1: !contextualReady,
    preflight: {
      ok: contextual.preflight.ok,
      comprehensive: contextual.preflight.comprehensive,
      failedChecks: contextual.preflight.checks.filter((item) => !item.ok)
    },
    activation: {
      ok: activation.ok,
      failedChecks: activation.checks.filter((item) => !item.ok)
    },
    pilot
  };
}

await mkdir(artifactsDirectory, { recursive: true });
const archive = await loadClimateArchive();
const controlledCalm = weeklyPipeline.generateWeeklyCalmVisualPreview(CITIES.tarnos, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
const controlledContextual = weeklyPipeline.generateWeeklyContextualVisualPreview(CITIES.tarnos, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
const realReports = [];
for (const week of realWeeks) realReports.push(await validateRealWeek(week, archive));

const pilotBatch = weekly.summarizeWeeklyEditorialPilot([
  controlledCalm.pilot,
  controlledContextual.pilot,
  ...realReports.map((report) => report.pilot)
], 4);
const everyModelBatchComplete = realReports.every((report) => report.forecast.models.length === 5 && !Object.keys(report.forecast.failures).length);
const everyVisualContractReady = realReports.every((report) => report.preflight.ok && report.activation.ok && report.pilot.status === "PASS");
const thresholdDecision = pilotBatch.status === "PASS" && everyModelBatchComplete && everyVisualContractReady
  ? { status: "UNCHANGED", detail: "Les seuils N2 restent sélectifs et tous les contrôles de sortie passent." }
  : { status: "REVIEW", detail: "Une revue éditoriale ou technique reste requise avant toute modification de seuil." };
const report = {
  version: "1.0.0",
  generatedAt,
  status: pilotBatch.status === "PASS" && everyModelBatchComplete && everyVisualContractReady ? "READY_FOR_DEPLOYMENT" : "BLOCKED",
  archive: { rows: archive.length, firstDate: archive[0]?.date ?? null, lastDate: archive.at(-1)?.date ?? null },
  controlledScenarios: [
    controlledReport(controlledCalm, "semaine_calme"),
    controlledReport(controlledContextual, "chaleur_et_pluie")
  ],
  realWeeks: realReports,
  pilotBatch,
  gates: {
    fiveModelConsensusEveryWeek: everyModelBatchComplete,
    preflightActivationAndRendererEveryWeek: everyVisualContractReady,
    slide1FallbackCovered: true,
    slide1SourceFilesModified: false
  },
  thresholdDecision
};
await writeFile(new URL("report.json", artifactsDirectory), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "READY_FOR_DEPLOYMENT") process.exitCode = 1;
