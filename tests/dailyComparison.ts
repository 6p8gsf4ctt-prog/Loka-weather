import { CITIES } from "../src/config/cities";
import { buildDailyComparisonStory } from "../src/engine/dailyComparison";
import type { ClimateDailyObservation, ClimateProvenance } from "../src/engine/weekly/climateReferences";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramDailyGraphicPreview } from "../src/ui/instagramDailyGraphicPreview";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_COMPARISON_FAIL:${label}`);
  passed++;
}

function payload(): OfficialPublicPayloadV24 {
  const points = canonicalPoints(1 as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test",
    latitude: 0, longitude: 0, hourly: []
  }));
  const product = buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
  product.editorial.facts.temperature.minC = 19;
  product.editorial.facts.temperature.maxC = 34;
  product.temperatures = { minC: 19, maxC: 34 };
  product.editorial.facts.confidence = "HIGH";
  return product;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE", stationId: "64024001", stationName: "BIARRITZ-PAYS-BASQUE",
  resourceId: "daily-comparison-test", acquiredAt: "2026-08-17T00:00:00.000Z", referenceVersion: "1.0.0"
};

function archive(): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  for (let year = 1991; year <= 2020; year++) {
    const date = new Date(`${year}-01-01T00:00:00Z`);
    while (date.getUTCFullYear() === year) {
      const variation = date.getUTCDate() % 9;
      rows.push({
        stationId: "64024001", date: date.toISOString().slice(0, 10),
        tminC: 8 + variation, tmaxC: 22 + variation, rainMm: date.getUTCDate() % 5, gust3sMs: 6 + variation / 2,
        quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 }, provenance
      });
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }
  return rows;
}

const dailyPayload = payload();
const story = buildDailyComparisonStory(dailyPayload, archive());
ok(story !== null, "strong_temperature_departure_creates_a_story");
ok(story?.title === "LE REPÈRE DU JOUR", "daily_title_is_not_weekly");
ok(story?.frame === "DAILY_STORY_SHARED_V1", "story_uses_shared_daily_frame");
ok(story !== null && ["EXPECTED", "POSSIBLE", "IF_CONFIRMED"].includes(story.claimStatus), "forecast_copy_remains_cautious");
ok(story?.pictogramUrl.startsWith("data:image/svg+xml") === true, "official_pictogram_is_embedded");
ok((story?.candidateCount ?? 0) >= 2, "all_daily_candidates_are_ranked_before_one_is_selected");

const html = renderInstagramDailyGraphicPreview(dailyPayload, CITIES.tarnos, story);
ok(html.includes('<canvas id="comparisonStory" width="1080" height="1920">'), "comparison_is_an_additional_story");
ok((html.match(/<canvas id="feed"/g) ?? []).length === 1, "no_second_publication_is_created");
ok(html.includes("shareComparisonStory") && html.includes("story-comparaison"), "comparison_story_is_exportable");
const browserScript = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let browserScriptValid = true;
try { new Function(browserScript); } catch { browserScriptValid = false; }
ok(browserScriptValid, "comparison_story_browser_script_is_valid");

const calmPayload = payload();
calmPayload.editorial.facts.temperature = { minC: 12, maxC: 24, character: "WARM" };
calmPayload.temperatures = { minC: 12, maxC: 24 };
calmPayload.editorial.facts.precipitation = { kind: "DRY", hours: 0, totalMm: 1 };
calmPayload.editorial.facts.wind = { kind: "NONE", maxGustKmh: 28.8 };
ok(buildDailyComparisonStory(calmPayload, archive()) === null, "no_signal_means_no_artificial_story");

const rainPayload = payload();
rainPayload.editorial.facts.temperature = { minC: 12, maxC: 26, character: "WARM" };
rainPayload.temperatures = { minC: 12, maxC: 26 };
rainPayload.editorial.facts.precipitation = { kind: "RAIN", hours: 5, totalMm: 15 };
rainPayload.editorial.facts.wind = { kind: "NONE", maxGustKmh: 28.8 };
const rainStory = buildDailyComparisonStory(rainPayload, archive());
ok(rainStory?.theme === "WET_WEATHER", "daily_rain_uses_local_percentile_and_history");

const windPayload = payload();
windPayload.editorial.facts.temperature = { minC: 12, maxC: 26, character: "WARM" };
windPayload.temperatures = { minC: 12, maxC: 26 };
windPayload.editorial.facts.precipitation = { kind: "DRY", hours: 0, totalMm: 1 };
windPayload.editorial.facts.wind = { kind: "STRONG", maxGustKmh: 80 };
const windStory = buildDailyComparisonStory(windPayload, archive());
ok(windStory?.theme === "WIND", "daily_wind_uses_local_percentile_and_history");

const evolutionArchive = archive();
evolutionArchive.push({ stationId: "64024001", date: "2026-08-17", tminC: 12, tmaxC: 15, rainMm: 1, gust3sMs: 8, quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 }, provenance });
const evolutionPayload = payload();
evolutionPayload.editorial.facts.temperature = { minC: 12, maxC: 24, character: "WARM" };
evolutionPayload.temperatures = { minC: 12, maxC: 24 };
evolutionPayload.editorial.facts.precipitation = { kind: "DRY", hours: 0, totalMm: 1 };
evolutionPayload.editorial.facts.wind = { kind: "NONE", maxGustKmh: 28.8 };
const evolutionStory = buildDailyComparisonStory(evolutionPayload, evolutionArchive);
ok(evolutionStory?.detector === "REGIME_CHANGE" && evolutionStory.presentation.layout === "COMPARISON", "daily_change_compares_forecast_with_yesterday_observation");

const amplitudePayload = payload();
amplitudePayload.editorial.facts.temperature = { minC: 10, maxC: 24, character: "WARM" };
amplitudePayload.temperatures = { minC: 10, maxC: 24 };
amplitudePayload.editorial.facts.precipitation = { kind: "DRY", hours: 0, totalMm: 1 };
amplitudePayload.editorial.facts.wind = { kind: "NONE", maxGustKmh: 28.8 };
const amplitudeStory = buildDailyComparisonStory(amplitudePayload, archive());
ok(amplitudeStory?.detector === "INTRADAY_CHANGE", "daily_intraday_amplitude_is_detected");

console.log(`DAILY_COMPARISON ${passed}/15 PASS`);
