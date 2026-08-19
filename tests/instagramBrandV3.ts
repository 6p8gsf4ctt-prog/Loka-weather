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
const wordmark = functionLine(html, "drawLokaWordmark");
const storyHeader = functionLine(html, "drawHeader");
const feedHeader = functionLine(html, "drawFeedHeader");
const storyGeneral = functionLine(html, "drawStoryGeneral");
const feedGeneral = functionLine(html, "drawFeedGeneral");
const storyHours = functionLine(html, "drawStoryHours");
const feedHours = functionLine(html, "drawFeedHours");
const storyComments = functionLine(html, "drawStoryComments");
const feedComments = functionLine(html, "drawFeedComments");

ok(wordmark.includes("font(size,500)"), "variant_ab_intermediate_weight");
ok(wordmark.includes("logoInk='#051C3C'") && wordmark.includes("logoGold='#FDB31E'"), "official_logo_colors");
ok(wordmark.includes("bodyW=bodyH*.30"), "official_bolt_optically_refined_width");
ok(wordmark.includes("ctx.lineTo(markX+bodyW*.405,top+bodyH*.591)"), "official_bolt_not_generic_zigzag");
ok(wordmark.includes("ctx.arc(markX+bodyW*.52,baseline-dotR,dotR"), "separate_gold_dot");
ok(storyHeader.includes("drawLokaWordmark(50,132,66)"), "story_wordmark_real_header_size");
ok(feedHeader.includes("drawLokaWordmark(50,100,60)"), "feed_wordmark_real_header_size");
ok(storyGeneral.includes("x=44,y=224,w=992,h=150"), "story_box1_150");
ok(feedGeneral.includes("x=50,y=160,w=980,h=150"), "feed_box1_150");
ok(storyHours.includes("x=44,y=420,w=992,h=704"), "story_hour_grid_height_preserved_shifted");
ok(feedHours.includes("x=50,y=336,w=980,h=500"), "feed_hour_grid_height_preserved_shifted");
ok(storyComments.includes("x=44,y=1163,w=992,h=272"), "story_box3_272");
ok(feedComments.includes("x=50,y=865,w=980,h=210"), "feed_box3_210");
ok(!wordmark.includes("LOKA!") && !wordmark.includes("TARNOS") && !wordmark.includes("arc(540"), "wordmark_only_no_round_logo_or_subbrand");

if (passed !== 14) throw new Error(`instagram_brand_v3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_BRAND_V3 ${passed}/14 PASS`);
