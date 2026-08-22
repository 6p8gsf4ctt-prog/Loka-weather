import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_BRAND_V3_FAIL:${label}`);
  passed++;
}
function payloadFor(scene: number): OfficialPublicPayloadV24 {
  const points = canonicalPoints(scene as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test",
    latitude: 0, longitude: 0, hourly: []
  }));
  return buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
}
function functionLine(html: string, name: string): string {
  return html.split("\n").find((line) => line.startsWith(`function ${name}(`)) ?? "";
}

const html = renderInstagramOfficial24(payloadFor(21), CITIES.tarnos);
const logo = functionLine(html, "drawLokaLogo");
const storyHeader = functionLine(html, "drawHeader");
const feedHeader = functionLine(html, "drawFeedHeader");
const storyGeneral = functionLine(html, "drawStoryGeneral");
const feedGeneral = functionLine(html, "drawFeedGeneral");
const storyHours = functionLine(html, "drawStoryHours");
const feedHours = functionLine(html, "drawFeedHours");
const storyComments = functionLine(html, "drawStoryComments");
const feedComments = functionLine(html, "drawFeedComments");

ok(html.includes('"logoUrl":"data:image/png;base64,'), "new_logo_is_embedded_in_model_without_static_asset_dependency");
ok(logo.includes("ctx.drawImage(logo,x,centerY-dh/2,dw,dh)"), "new_logo_is_drawn_as_transparent_asset");
ok(logo.includes("scale=Math.min(maxWidth/iw,maxHeight/ih)"), "new_logo_preserves_aspect_ratio");
ok(storyHeader.includes("drawLokaLogo(logo,STORY_HEADER_SAFE.logoX,STORY_HEADER_SAFE.logoCenterY,STORY_HEADER_SAFE.logoWidth,STORY_HEADER_SAFE.logoHeight)"), "story_uses_new_logo_asset");
ok(html.includes("const STORY_HEADER_SAFE={logoX:50,logoCenterY:144,logoWidth:190,logoHeight:64,cityBaseline:158,dateBaseline:158}"), "story_logo_respects_safe_zone");
ok(feedHeader.includes("drawLokaLogo(logo,FEED_HEADER.logoX,FEED_HEADER.logoCenterY,FEED_HEADER.logoWidth,FEED_HEADER.logoHeight)"), "feed_uses_new_logo_asset");
ok(html.includes("const FEED_HEADER={logoX:50,logoCenterY:79,logoWidth:174,logoHeight:58,cityBaseline:94,dateBaseline:94}"), "feed_header_geometry_preserved_with_new_logo");
ok(storyGeneral.includes("x=44,y=200,w=992,h=150"), "story_box1_150");
ok(feedGeneral.includes("x=50,y=160,w=980,h=150"), "feed_box1_150");
ok(storyHours.includes("x=44,y=396,w=992,h=704"), "story_hour_grid_height_preserved_shifted");
ok(feedHours.includes("x=50,y=336,w=980,h=500"), "feed_hour_grid_height_preserved_shifted");
ok(storyComments.includes("x=44,y=1139,w=992,h=272"), "story_box3_272");
ok(feedComments.includes("x=50,y=865,w=980,h=210"), "feed_box3_210");
ok(!logo.includes("fillText") && !logo.includes("trackedText"), "logo_renderer_contains_no_reconstructed_text_wordmark");

if (passed !== 14) throw new Error(`instagram_brand_v3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_BRAND_V3 ${passed}/14 PASS`);
