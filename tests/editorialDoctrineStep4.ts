import { CITIES } from "../src/config/cities";
import { buildEditorialProductV2 } from "../src/engine/editorial24/index";
import type { Scene24Id } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { canonicalPoints, classify } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`EDITORIAL_DOCTRINE_STEP4_FAIL:${label}`);
  passed++;
}
function editorial(id: Scene24Id) {
  const base = classify(id);
  return buildEditorialProductV2(CITIES.tarnos, base.profile, base.decision, 15, 26);
}
function payloadFor(id: Scene24Id): OfficialPublicPayloadV24 {
  const points = canonicalPoints(id);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`,
    family: "noaa",
    weight: 0.2,
    fetchedAt: "test",
    latitude: 0,
    longitude: 0,
    hourly: []
  }));
  return buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
}
function count(source: string, value: string): number {
  return source.split(value).length - 1;
}

const all = Array.from({ length: 24 }, (_, index) => editorial((index + 1) as Scene24Id));
ok(all.every((p) => p.visual.subtitle === ""), "subtitle_retired_all_24");
ok(all.every((p) => p.visual.primaryLine.length > 0 && p.visual.primaryLine.length <= 80), "primary_bounds_all_24");
ok(all.every((p) => p.visual.secondaryLine.length > 0 && p.visual.secondaryLine.length <= 120), "secondary_bounds_all_24");
ok(new Set(all.map((p) => p.visual.primaryLine)).size === 24, "primary_identity_unique_24");
ok(all.every((p) => p.visual.secondaryLine !== "Aucune pluie significative n’est attendue."), "generic_dry_fallback_removed");

ok(editorial(1).visual.secondaryLine.includes("l’ensemble de la journée"), "scene1_all_day_light");
ok(editorial(5).visual.secondaryLine.includes("première partie de journée"), "scene5_degrading_timing");
ok(editorial(9).visual.secondaryLine.includes("couverture nuageuse"), "scene9_cloud_context");
ok(editorial(10).visual.secondaryLine.includes("km/h"), "scene10_wind_context");
ok(editorial(12).visual.secondaryLine.includes("mm"), "scene12_rain_context");
ok(editorial(13).visual.secondaryLine.includes("Averses intermittentes"), "scene13_showers_context");
ok(editorial(15).visual.secondaryLine.includes("seconde partie de journée"), "scene15_improving_timing");
ok(editorial(17).visual.secondaryLine.includes("Brouillard dense"), "scene17_fog_context");
ok(editorial(18).visual.secondaryLine.includes("sans pluie annoncée"), "scene18_dry_temperature_context");
ok(editorial(21).visual.secondaryLine.startsWith("Temps sec"), "scene21_dry_context");
ok(editorial(22).visual.secondaryLine.startsWith("Risque orageux"), "scene22_thunder_context");
ok(editorial(24).visual.secondaryLine.includes("mm") && editorial(24).visual.secondaryLine.includes("km/h"), "scene24_rain_wind_context");

const studioPayload = payloadFor(21);
const studio = renderInstagramOfficial24(studioPayload, CITIES.tarnos);
ok(count(studio, studioPayload.editorial.visual.primaryLine) === 1, "studio_primary_once");
ok(count(studio, studioPayload.editorial.visual.secondaryLine) === 1, "studio_secondary_once");
ok(studio.includes("drawEditorialSummary(visual"), "studio_editorial_summary_renderer_present");

if (passed !== 20) throw new Error(`editorial_doctrine_step4_count_mismatch:${passed}`);
console.log(`EDITORIAL_DOCTRINE_STEP4 ${passed}/20 PASS`);
