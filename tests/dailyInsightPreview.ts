import { CITIES } from "../src/config/cities";
import { buildDailyInsightPreview } from "../src/engine/dailyInsight/previewEngine";
import { buildDailyInsightReference } from "../src/engine/dailyInsight/referenceData";
import type { ClimateDailyObservation, ClimateProvenance } from "../src/engine/weekly/climateReferences";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { DisplayHour, ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderDailyInsightPreview } from "../src/ui/dailyInsightPreview";
import { buildDailyInsightStoryModel, dailyInsightStoryScenarios, renderDailyInsightScenarioGallery } from "../src/ui/dailyInsightStory";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_PREVIEW_FAIL:${label}`);
  passed++;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE", stationId: "64024001", stationName: "BIARRITZ-PAYS-BASQUE",
  resourceId: "daily-insight-preview-test", acquiredAt: "2026-08-17T03:00:00.000Z", referenceVersion: "1.0.0"
};

function archive(): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  const cursor = new Date("1991-01-01T00:00:00Z");
  const end = Date.parse("2026-08-17T00:00:00Z");
  while (cursor.getTime() <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const summer = cursor.getUTCMonth() >= 5 && cursor.getUTCMonth() <= 8;
    rows.push({
      stationId: "64024001", date,
      tminC: summer ? 17 : 9,
      tmaxC: summer ? 27 : 19,
      rainMm: cursor.getUTCDate() % 5 === 0 ? 2 : 0,
      gust3sMs: 10,
      quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 }, provenance
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  rows.find((row) => row.date === "2026-05-01")!.tmaxC = 34;
  return rows;
}

function payload(): OfficialPublicPayloadV24 {
  const points = canonicalPoints(1 as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test",
    latitude: 0, longitude: 0, hourly: []
  }));
  const product = buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
  product.editorial.facts.temperature = { minC: 12, maxC: 34, character: "VERY_HOT" };
  product.editorial.facts.precipitation = { kind: "DRY", hours: 0, totalMm: 0 };
  product.editorial.facts.wind = { kind: "NONE", maxGustKmh: 36 };
  product.editorial.facts.fog = { kind: "NONE", hours: 0 };
  product.editorial.facts.confidence = "HIGH";
  const temperatures = [14, 14, 16, 20, 28, 32, 31, 29, 22, 18];
  product.hourly = CITIES.tarnos.displayHours.map<DisplayHour>((hour, index) => ({
    hour, temperatureC: temperatures[index], condition: "peu nuageux", precipitationMm: 0
  }));
  product.temperatures = { minC: 12, maxC: 34 };
  return product;
}

const reference = buildDailyInsightReference({
  stationId: "64024001", stationName: "BIARRITZ-PAYS-BASQUE", sourceSnapshotId: "preview-test",
  generatedAt: "2026-08-18T04:00:00.000Z", observations: archive()
});

const strong = buildDailyInsightPreview(payload(), reference, "2026-08-18T05:00:00.000Z");
ok(strong.status === "SELECTED", "strong_local_fact_is_selected");
ok(strong.winner !== null && strong.winner.score.total >= 70, "winner_clears_publication_threshold");
ok(strong.candidates.filter((item) => item.id === strong.winner?.id).length === 1, "only_one_winner_is_designated");
ok(strong.candidates.some((item) => item.detectorId === "T02"), "historical_heat_detector_runs");
ok(strong.candidates.some((item) => item.detectorId === "T08"), "rapid_drop_detector_runs");
ok(strong.deferred.some((item) => item.detectorId === "T10"), "unproved_detector_is_explicitly_deferred");

const calmPayload = payload();
calmPayload.editorial.facts.temperature = { minC: 17, maxC: 27, character: "WARM" };
calmPayload.temperatures = { minC: 17, maxC: 27 };
const calmTemperatures = [17, 17, 18, 20, 23, 26, 27, 26, 24, 22];
calmPayload.hourly = CITIES.tarnos.displayHours.map((hour, index) => ({
  hour, temperatureC: calmTemperatures[index], condition: "peu nuageux", precipitationMm: 0
}));
const calm = buildDailyInsightPreview(calmPayload, reference, "2026-08-18T05:00:00.000Z");
ok(calm.status === "NO_DAILY_INSIGHT", "ordinary_day_produces_editorial_silence");
ok(calm.winner === null, "silence_has_no_winner");

const lowConfidence = payload();
lowConfidence.editorial.facts.confidence = "LOW";
const low = buildDailyInsightPreview(lowConfidence, reference, "2026-08-18T05:00:00.000Z");
ok(low.winner === null, "low_confidence_forecast_cannot_win");
ok(low.candidates.every((item) => !item.eligible), "low_confidence_candidates_are_rejected");

const futurePayload = payload();
futurePayload.date = "2026-09-18";
const stale = buildDailyInsightPreview(futurePayload, reference, "2026-09-18T05:00:00.000Z");
ok(stale.status === "REFERENCE_STALE", "stale_reference_blocks_selection");

const html = renderDailyInsightPreview(payload(), strong, "ready");
ok(html.includes("Daily Insight Preview") && html.includes("SÉLECTIONNÉ"), "audit_preview_renders_winner");
ok(html.includes("aucune publication") && !html.includes("canvas id=\"feed\""), "preview_is_not_a_daily_publication");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(script) && (() => { try { new Function(script!); return true; } catch { return false; } })(), "story_runtime_is_syntactically_valid");

const winnerModel = buildDailyInsightStoryModel(payload(), strong.winner!, "winnerStory", "Signal réel");
ok(winnerModel.canvasId === "winnerStory" && winnerModel.pictogramUrl.startsWith("data:image/"), "winner_maps_to_brand_story_model");
const scenarios = dailyInsightStoryScenarios(payload());
ok(scenarios.length === 6, "six_control_scenarios_are_available");
ok(new Set(scenarios.map((item) => item.format)).size === 5, "four_structures_cover_five_editorial_formats");
ok(["F1_RARETE_LOCALE", "F2_EVOLUTION_RAPIDE", "F3_SEQUENCE", "F4_REPERE_SAISONNIER", "F5_PHENOMENE_LOCAL"].every((format) => scenarios.some((item) => item.format === format)), "all_editorial_formats_are_tested");
const gallery = renderDailyInsightScenarioGallery(payload());
ok((gallery.match(/<canvas /g) ?? []).length === 6 && gallery.includes("Absence de signal pertinent"), "gallery_renders_six_cases_and_editorial_silence");
const galleryScript = gallery.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(galleryScript) && (() => { try { new Function(galleryScript!); return true; } catch { return false; } })(), "gallery_runtime_is_syntactically_valid");
ok(gallery.includes("1080 × 1920") && gallery.includes("aucune publication automatique"), "gallery_declares_story_format_and_shadow_mode");
ok(!gallery.includes("fetch(") && !gallery.includes("/api/publish"), "gallery_has_no_publication_transport");

const calmHtml = renderDailyInsightPreview(calmPayload, calm, "ready");
ok(calmHtml.includes("Aucune STORY comparative aujourd’hui") && !calmHtml.includes("id=\"dailyInsightStory\""), "no_signal_produces_no_story_canvas");

console.log(`DAILY_INSIGHT_PREVIEW ${passed}/23 PASS`);
