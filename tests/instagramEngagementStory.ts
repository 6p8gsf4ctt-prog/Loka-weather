import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";
import { enhanceInstagramWithEditorialPersistence } from "../src/ui/instagramEditorialPersistence";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_ENGAGEMENT_STORY_FAIL:${label}`);
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

const payload = payloadFor(12);
ok(payload.editorial.engagement.question.length > 0, "engine_generates_question");
ok(payload.editorial.engagement.format === "POLL" || payload.editorial.engagement.format === "QUESTION", "engine_generates_interaction_format");

const base = renderInstagramOfficial24(payload, CITIES.tarnos);
ok(base.includes('id="engagementStory"') && base.includes('id="shareEngagementStory"'), "second_story_canvas_and_download");
ok(base.includes("STORY 2 · INTERACTION") && base.includes("sticker Instagram reste volontairement hors image"), "second_story_ui_explains_blank_sticker_area");
const renderLine = functionLine(base, "renderEngagementStory");
ok(renderLine.includes("drawCover(bg,1080,1920)") && renderLine.includes("drawHeader(logo)") && renderLine.includes("drawStorySignature()"), "second_story_header_footer_contract");
ok(!renderLine.includes("drawStoryGeneral") && !renderLine.includes("drawStoryHours") && !renderLine.includes("drawStoryComments") && !renderLine.includes("drawStorySolar"), "second_story_center_is_blank");
ok(base.includes("const STORY_HEADER_SAFE={logoX:50,logoCenterY:144,logoWidth:190,logoHeight:64,cityBaseline:158,dateBaseline:158}"), "story_safe_header_coordinates_are_centralized");
const storyHeaderLine = functionLine(base, "drawHeader");
const feedHeaderLine = functionLine(base, "drawFeedHeader");
ok(storyHeaderLine.includes("STORY_HEADER_SAFE.logoCenterY") && storyHeaderLine.includes("STORY_HEADER_SAFE.cityBaseline") && storyHeaderLine.includes("STORY_HEADER_SAFE.dateBaseline"), "story_uses_safe_header_coordinates");
ok(feedHeaderLine.includes("drawLokaLogo(logo,FEED_HEADER.logoX,FEED_HEADER.logoCenterY,FEED_HEADER.logoWidth,FEED_HEADER.logoHeight)") && feedHeaderLine.includes("FEED_HEADER.cityBaseline") && feedHeaderLine.includes("FEED_HEADER.dateBaseline"), "feed_header_geometry_is_unchanged");
ok(base.includes("story-interaction"), "second_story_filename_suffix");

const enhanced = enhanceInstagramWithEditorialStudio(base);
ok(enhanced.includes('id="engagementFormat"') && enhanced.includes('id="engagementQuestion"'), "engagement_editor_fields");
ok(enhanced.includes('id="engagementOptionA"') && enhanced.includes('id="engagementOptionB"'), "poll_option_fields");
ok(enhanced.includes("m.engagement=engagementFromFields()"), "editor_updates_engagement_draft");
ok(enhanced.includes("copyEngagementQuestion"), "question_copy_action");

const persisted = enhanceInstagramWithEditorialPersistence(enhanced, "tarnos");
ok(persisted.includes("engagementQuestion:field('engagementQuestion')"), "question_saved_in_editorial_feedback");
ok(persisted.includes("story.engagementQuestion??m.engagement?.question"), "saved_question_reloaded");

const legacy: any = structuredClone(payload);
delete legacy.editorial.engagement;
const legacyHtml = renderInstagramOfficial24(legacy as OfficialPublicPayloadV24, CITIES.tarnos);
ok(legacyHtml.includes('id="engagementStory"') && legacyHtml.includes('"engagement":'), "legacy_official_payload_gets_runtime_engagement_fallback");

if (passed !== 17) throw new Error(`instagram_engagement_story_count_mismatch:${passed}`);
console.log(`INSTAGRAM_ENGAGEMENT_STORY ${passed}/17 PASS`);
