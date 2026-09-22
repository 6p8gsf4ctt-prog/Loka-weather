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

ok(html.includes("const STORY_PUBLICATION={x:0,y:240,width:1080,height:1440}"), "story_publication_frame_is_centered");
ok(renderStory.includes("ctx.clearRect(0,0,1080,1920)") && renderStory.includes("drawCover(bg,1080,1920)"), "story_draws_one_full_height_background");
ok(renderStory.includes("ctx.translate(STORY_PUBLICATION.x,STORY_PUBLICATION.y)"), "story_translates_to_the_publication_safe_area");
ok(renderStory.includes("drawFeedHeader(logo)"), "story_reuses_publication_header");
ok(renderStory.includes("drawFeedGeneral(mainIcon)"), "story_reuses_publication_title_box");
ok(renderStory.includes("drawFeedHours(slots,hourIcons)"), "story_reuses_publication_hour_grid");
ok(renderStory.includes("drawFeedComments()"), "story_reuses_publication_editorial_box");
ok(renderStory.includes("drawFeedSolar(solarIcons)"), "story_reuses_publication_solar_box");
ok(renderStory.includes("drawFeedSignature()"), "story_reuses_publication_signature");
ok(renderStory.includes("ctx.restore()"), "story_restores_the_canvas_after_publication_draw");
ok(!html.includes("function drawStoryGeneral("), "parallel_story_title_renderer_removed");
ok(!html.includes("function drawStoryHours("), "parallel_story_hour_renderer_removed");
ok(!html.includes("function drawStoryComments("), "parallel_story_editorial_renderer_removed");
ok(!html.includes("function drawStorySolar("), "parallel_story_solar_renderer_removed");
ok(feedGeneral.includes("x=50,y=160,w=980,h=150"), "feed_general_compact_150");
ok(html.includes("function drawFeedHours(slots,icons){const x=50,y=336,w=980,h=500"), "feed_hours_shifted_up_90");
ok(html.includes("function drawFeedComments(){const visual=m.feedVisual||m.visual;const x=50,y=865,w=980,h=210"), "feed_comments_expanded_210");
ok(html.includes("function drawFeedSolar(solarIcons){const x=50,y=1100,w=980,h=205") && html.includes("function drawFeedSignature(){text('Ici, aujourd’hui.',540,1368"), "feed_lower_modules_and_signature_preserved");

if (passed !== 18) throw new Error(`instagram_layout_step3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LAYOUT_STEP3 ${passed}/18 PASS`);
