import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { LOKA_INSTAGRAM_STORY_SAFE_FRAME } from "../src/ui/instagramStorySafeFrame";
import { LOKA_WEEKLY_STORY_FRAME } from "../src/ui/weeklyStoryFrame";
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

ok(storyGeneral.includes("frame=STORY_FRAME.content.general"), "story_general_uses_shared_story_frame");
ok(feedGeneral.includes("x=50,y=160,w=980,h=150"), "feed_general_compact_150");
ok(!storyGeneral.includes("drawSubtitleBlock") && !feedGeneral.includes("drawSubtitleBlock"), "subtitle_not_drawn_in_general_boxes");
ok(functionLine(html, "drawStoryHours").includes("frame=STORY_FRAME.content.hours") && functionLine(html, "drawStoryHours").includes("sy=h/704"), "story_hours_are_proportionally_distributed_in_shared_frame");
ok(html.includes("function drawFeedHours(slots,icons){const x=50,y=336,w=980,h=500"), "feed_hours_shifted_up_90");
ok(functionLine(html, "drawStoryComments").includes("frame=STORY_FRAME.content.editorial"), "story_comments_use_shared_frame");
ok(html.includes("function drawFeedComments(){const visual=m.feedVisual||m.visual;const x=50,y=865,w=980,h=210"), "feed_comments_expanded_210");
ok(functionLine(html, "drawStorySolar").includes("frame=STORY_FRAME.content.solar") && functionLine(html, "drawStorySolar").includes("sy=h/279"), "story_solar_uses_shared_lower_anchor");
ok(html.includes("function drawFeedSolar(solarIcons){const x=50,y=1100,w=980,h=205"), "feed_solar_anchor_unchanged");
ok(functionLine(html, "drawStorySignature").includes("const s=STORY_FRAME.signature") && functionLine(html, "drawStorySignature").includes("s.baseline"), "story_signature_uses_shared_weekly_anchor");
ok(html.includes("function drawFeedSignature(){text('Ici, aujourd’hui.',540,1368"), "feed_signature_anchor_unchanged");

const story = LOKA_INSTAGRAM_STORY_SAFE_FRAME.content;
const feed = { generalY: 160, generalH: 150, hoursY: 336, hoursH: 500, commentsY: 865, commentsH: 210, solarY: 1100 };
ok(story.hours.y - (story.general.y + story.general.height) > 0, "story_general_hours_gap_preserved");
ok(story.editorial.y - (story.hours.y + story.hours.height) > 0, "story_hours_comments_gap_preserved");
ok(story.solar.y - (story.editorial.y + story.editorial.height) > 0, "story_comments_solar_gap_preserved");
ok(feed.hoursY - (feed.generalY + feed.generalH) === 26, "feed_general_hours_gap_preserved");
ok(feed.commentsY - (feed.hoursY + feed.hoursH) === 29, "feed_hours_comments_gap_preserved");
ok(feed.solarY - (feed.commentsY + feed.commentsH) === 25, "feed_comments_solar_gap_preserved");
ok(LOKA_INSTAGRAM_STORY_SAFE_FRAME.safeArea === LOKA_WEEKLY_STORY_FRAME.safeArea, "daily_and_weekly_stories_share_the_same_safe_areas");

if (passed !== 18) throw new Error(`instagram_layout_step3_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LAYOUT_STEP3 ${passed}/18 PASS`);
