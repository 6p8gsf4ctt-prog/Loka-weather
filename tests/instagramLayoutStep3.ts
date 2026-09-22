import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_LAYOUT_STEP3_FAIL:${label}`);
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

function functionLine(html: string, name: string): string {
  return html.split("\n").find((line) => line.startsWith(`function ${name}(`)) ?? "";
}

const html = renderInstagramOfficial24(payloadFor(21), CITIES.tarnos);
const feedGeneral = functionLine(html, "drawFeedGeneral");
const renderStory = functionLine(html, "renderStory");

ok(html.includes("const STORY_LAYOUT={offsetY:170,scaleY:1.0972222222222223,visualScale:1.04}"), "story_responsive_frame_is_centered");
ok(renderStory.includes("ctx.clearRect(0,0,1080,1920)") && renderStory.includes("drawCover(bg,1080,1920)"), "story_draws_one_full_height_background");
ok(!renderStory.includes("ctx.translate") && renderStory.includes("STORY_LAYOUT"), "story_uses_coordinate_based_reflow_without_canvas_distortion");
ok(renderStory.includes("drawFeedHeader(logo,STORY_LAYOUT)"), "story_reuses_publication_header");
ok(renderStory.includes("drawFeedGeneral(mainIcon,STORY_LAYOUT)"), "story_reuses_publication_title_box");
ok(renderStory.includes("drawFeedHours(slots,hourIcons,STORY_LAYOUT)"), "story_reuses_publication_hour_grid");
ok(renderStory.includes("drawFeedComments(STORY_LAYOUT)"), "story_reuses_publication_editorial_box");
ok(renderStory.includes("drawFeedSolar(solarIcons,STORY_LAYOUT)"), "story_reuses_publication_solar_box");
ok(renderStory.includes("drawFeedSignature(STORY_LAYOUT)"), "story_reuses_publication_signature");
ok(html.includes("function layoutY(value,layout)") && html.includes("function layoutH(value,layout)"), "story_reflows_positions_and_heights_with_shared_helpers");
ok(!html.includes("function drawStoryGeneral("), "parallel_story_title_renderer_removed");
ok(!html.includes("function drawStoryHours("), "parallel_story_hour_renderer_removed");
ok(!html.includes("function drawStoryComments("), "parallel_story_editorial_renderer_removed");
ok(!html.includes("function drawStorySolar("), "parallel_story_solar_renderer_removed");
ok(feedGeneral.includes("y=layoutY(160,layout),w=980,h=layoutH(150,layout)"), "title_box_height_is_layout_driven");
ok(html.includes("function drawFeedHours(slots,icons,layout=FEED_LAYOUT){const x=50,y=layoutY(336,layout),w=980,h=layoutH(500,layout)"), "hour_grid_height_is_layout_driven");
ok(html.includes("function drawFeedComments(layout=FEED_LAYOUT){const visual=m.feedVisual||m.visual;const x=50,y=layoutY(865,layout),w=980,h=layoutH(210,layout)"), "editorial_box_height_is_layout_driven");
ok(html.includes("function drawFeedSolar(solarIcons,layout=FEED_LAYOUT)") && html.includes("function drawFeedSignature(layout=FEED_LAYOUT)"), "lower_modules_and_signature_are_layout_driven");

if (passed !== 18) throw new Error(`instagram_layout_step3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LAYOUT_STEP3 ${passed}/18 PASS`);
