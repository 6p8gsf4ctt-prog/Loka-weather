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
const storyGeneral = functionLine(html, "drawStoryGeneral");
const feedGeneral = functionLine(html, "drawFeedGeneral");

ok(storyGeneral.includes("x=44,y=224,w=992,h=190"), "story_general_compact_190");
ok(feedGeneral.includes("x=50,y=160,w=980,h=185"), "feed_general_compact_185");
ok(!storyGeneral.includes("drawSubtitleBlock") && !feedGeneral.includes("drawSubtitleBlock"), "subtitle_not_drawn_in_general_boxes");
ok(html.includes("function drawStoryHours(slots,icons){const x=44,y=460,w=992,h=704"), "story_hours_shifted_up_60");
ok(html.includes("function drawFeedHours(slots,icons){const x=50,y=371,w=980,h=500"), "feed_hours_shifted_up_55");
ok(html.includes("function drawStoryComments(){const visual=m.storyVisual||m.visual;const x=44,y=1203,w=992,h=232"), "story_comments_expanded_232");
ok(html.includes("function drawFeedComments(){const visual=m.feedVisual||m.visual;const x=50,y=900,w=980,h=175"), "feed_comments_expanded_175");
ok(html.includes("function drawStorySolar(solarIcons){const x=44,y=1479,w=992,h=279"), "story_solar_anchor_unchanged");
ok(html.includes("function drawFeedSolar(solarIcons){const x=50,y=1100,w=980,h=205"), "feed_solar_anchor_unchanged");
ok(html.includes("function drawStorySignature(){text('Ici, aujourd’hui.',540,1834"), "story_signature_anchor_unchanged");
ok(html.includes("function drawFeedSignature(){text('Ici, aujourd’hui.',540,1368"), "feed_signature_anchor_unchanged");

const story = { generalY: 224, generalH: 190, hoursY: 460, hoursH: 704, commentsY: 1203, commentsH: 232, solarY: 1479 };
const feed = { generalY: 160, generalH: 185, hoursY: 371, hoursH: 500, commentsY: 900, commentsH: 175, solarY: 1100 };
ok(story.hoursY - (story.generalY + story.generalH) === 46, "story_general_hours_gap_preserved");
ok(story.commentsY - (story.hoursY + story.hoursH) === 39, "story_hours_comments_gap_preserved");
ok(story.solarY - (story.commentsY + story.commentsH) === 44, "story_comments_solar_gap_preserved");
ok(feed.hoursY - (feed.generalY + feed.generalH) === 26, "feed_general_hours_gap_preserved");
ok(feed.commentsY - (feed.hoursY + feed.hoursH) === 29, "feed_hours_comments_gap_preserved");
ok(feed.solarY - (feed.commentsY + feed.commentsH) === 25, "feed_comments_solar_gap_preserved");
ok(story.commentsY + story.commentsH === 1435 && feed.commentsY + feed.commentsH === 1075, "lower_layout_anchors_preserved");

if (passed !== 18) throw new Error(`instagram_layout_step3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LAYOUT_STEP3 ${passed}/18 PASS`);
