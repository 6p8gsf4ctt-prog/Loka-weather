import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramDailyGraphicPreview } from "../src/ui/instagramDailyGraphicPreview";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_DAILY_GRAPHIC_PREVIEW_FAIL:${label}`);
  passed++;
}

function payloadFor(scene: number): OfficialPublicPayloadV24 {
  const points = canonicalPoints(scene as never);
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

function modelFrom(html: string): unknown {
  const raw = html.match(/const m=(\{.*?\});\nconst storyCanvas=/s)?.[1];
  if (!raw) throw new Error("preview_model_missing");
  return JSON.parse(raw);
}

function functionLine(html: string, name: string): string {
  return html.split("\n").find((line) => line.startsWith(`function ${name}(`)) ?? "";
}

const payload = payloadFor(21);
const official = renderInstagramOfficial24(payload, CITIES.tarnos);
const preview = renderInstagramDailyGraphicPreview(payload, CITIES.tarnos);

ok(JSON.stringify(modelFrom(preview)) === JSON.stringify(modelFrom(official)), "preview_uses_the_exact_official_daily_content_model");
ok(preview.includes("Test graphique · parallèle") && preview.includes("mêmes données que la production"), "preview_is_clearly_identified_as_parallel");
ok(!official.includes("Test graphique · parallèle"), "official_surface_is_not_relabelled_or_replaced");
ok(preview.includes('<canvas id="story" width="1080" height="1920">') && preview.includes('<canvas id="feed" width="1080" height="1440">'), "preview_preserves_daily_export_dimensions");
ok(functionLine(preview, "drawFeedGeneral").includes("x=50,y=160,w=980,h=150"), "feed_title_box_geometry_is_unchanged");
ok(functionLine(preview, "drawFeedHours").includes("x=50,y=336,w=980,h=500") && functionLine(preview, "drawFeedHours").includes(",40,780,INK"), "hour_grid_keeps_geometry_with_stronger_values");
ok(functionLine(preview, "drawFeedComments").includes("x=50,y=865,w=980,h=210") && functionLine(preview, "drawFeedComments").includes("32,20,24,17"), "editorial_box_keeps_geometry_with_stronger_hierarchy");
ok(functionLine(preview, "drawFeedSolar").includes("x=50,y=1100,w=980,h=205") && functionLine(preview, "drawFeedSolar").includes(",31,700,INK"), "solar_box_keeps_geometry_with_stronger_times");
ok(functionLine(preview, "drawFeedHeader").includes(",195,65") && functionLine(preview, "drawFeedHeader").includes(",25,760,INK"), "preview_header_uses_weekly_inspired_presence");
ok(functionLine(preview, "drawFeedSignature").includes(",21,680,"), "preview_signature_is_more_legible");

const script = preview.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let scriptValid = true;
try { new Function(script); } catch { scriptValid = false; }
ok(scriptValid, "preview_browser_script_is_valid");

console.log(`INSTAGRAM_DAILY_GRAPHIC_PREVIEW ${passed}/11 PASS`);
