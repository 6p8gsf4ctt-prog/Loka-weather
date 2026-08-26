import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";
import { enhanceInstagramWithEditorialPersistence } from "../src/ui/instagramEditorialPersistence";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_LEGEND_STORY_FAIL:${label}`);
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
ok(payload.editorial.engagement.question.length > 0, "compatibility_question_still_generated");
ok(payload.editorial.engagement.format === "QUESTION" && payload.editorial.engagement.options === null, "polls_disabled_in_engine");

const base = renderInstagramOfficial24(payload, CITIES.tarnos);
ok(base.includes('id="legendStory"') && base.includes('id="shareLegendStory"'), "legend_story_canvas_and_download");
ok(base.includes("STORY · LÉGENDE DU JOUR") && base.includes("identique à celle de la publication"), "legend_story_ui_contract");
ok(!base.includes('id="engagementStory"') && !base.includes('id="shareEngagementStory"'), "old_interaction_canvas_removed");
const renderLine = functionLine(base, "renderLegendStory");
ok(renderLine.includes("drawCover(bg,1080,1920)") && renderLine.includes("drawHeader(logo)") && renderLine.includes("drawLegendPanel()") && renderLine.includes("drawStorySignature()"), "legend_story_header_body_footer_contract");
ok(functionLine(base, "drawLegendPanel").includes("m.legendText") && base.includes('"legendText":') && base.includes(payload.editorial.social.paragraph1), "legend_story_uses_editorial_caption_body");
ok(base.includes("const LEGEND_FONT='Georgia,\"Times New Roman\",serif'") && base.includes("function drawLegendSerifLine"), "legend_story_serif_editorial_typography");
ok(functionLine(base, "drawLegendPanel").includes("box(panelX,panelY,panelW,panelH)") && functionLine(base, "drawLegendPanel").includes("panelX=44") && functionLine(base, "drawLegendPanel").includes("panelW=992"), "legend_story_liquid_glass_panel");
ok(base.includes("function drawLegendAccent") && functionLine(base, "drawLegendAccent").includes("ctx.lineWidth=4") && functionLine(base, "drawLegendAccent").includes("ctx.moveTo(455,y)") && functionLine(base, "drawLegendAccent").includes("ctx.lineTo(625,y)"), "legend_story_larger_gold_separator");
ok(functionLine(base, "legendLayout").includes("separatorSpace=Math.round(size*1.82)") && functionLine(base, "drawLegendPanel").includes("layout.separatorSpace*.24"), "legend_story_more_space_after_separator");
ok(base.includes("function splitLegendEmoji") && base.includes("function drawLegendEmoji") && functionLine(base, "drawLegendPanel").includes("drawLegendEmoji"), "legend_story_leading_weather_emoji");
ok(base.includes("story-legende"), "legend_story_filename_suffix");

const enhanced = enhanceInstagramWithEditorialStudio(base);
ok(enhanced.includes('id="sharedLegend"') && enhanced.includes('id="sharedHashtags"'), "shared_legend_editor_fields");
ok(enhanced.includes('id="sharedPrimary"') && enhanced.includes('id="sharedSecondary"'), "shared_visual_editor_fields");
ok(!enhanced.includes('id="engagementFormat"') && !enhanced.includes('id="engagementQuestion"') && !enhanced.includes('id="engagementOptionA"'), "interaction_editor_removed");
ok(enhanced.includes("renderLegendStory(a.bg,a.logo)") && enhanced.includes("m.legendText=legend"), "editor_rerenders_legend_story");
ok(enhanced.includes("publicationCaption(m.legendText)") && enhanced.includes("activeSharedFields:['legend','hashtags']"), "publication_and_story_share_legend");

const persisted = enhanceInstagramWithEditorialPersistence(enhanced, "tarnos");
ok(persisted.includes("legend=field('sharedLegend')") && persisted.includes("hashtags=field('sharedHashtags')"), "shared_fields_saved");
ok(persisted.includes("feedbackLegend(feed)") && persisted.includes("document.getElementById('sharedLegend').value"), "shared_legend_reloaded");
ok(persisted.includes("legacyEngagement:'PRESERVED_HIDDEN'"), "legacy_engagement_kept_only_for_storage_compatibility");

const legacy: any = structuredClone(payload);
delete legacy.editorial.engagement;
const legacyHtml = renderInstagramOfficial24(legacy as OfficialPublicPayloadV24, CITIES.tarnos);
ok(legacyHtml.includes('id="legendStory"') && legacyHtml.includes('"engagement":'), "legacy_payload_runtime_compatibility_preserved");

if (passed !== 22) throw new Error(`instagram_legend_story_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LEGEND_STORY ${passed}/22 PASS`);
