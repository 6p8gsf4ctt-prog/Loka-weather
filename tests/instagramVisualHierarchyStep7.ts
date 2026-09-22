import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_VISUAL_HIERARCHY_STEP7_FAIL:${label}`);
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
const group = functionLine(html, "drawCenteredGeneralGroup");
const renderStory = functionLine(html, "renderStory");
const feedGeneral = functionLine(html, "drawFeedGeneral");
const summary = functionLine(html, "drawEditorialSummary");
const feedComments = functionLine(html, "drawFeedComments");


ok(html.includes('"logoUrl":"data:image/png;base64,'), "official_logo_asset_v2_embedded");
ok(logo.includes("ctx.drawImage(logo,x,centerY-dh/2,dw,dh)"), "logo_asset_drawn_without_reconstruction");
ok(logo.includes("scale=Math.min(maxWidth/iw,maxHeight/ih)"), "logo_asset_aspect_ratio_preserved");
ok(storyHeader.includes("drawLokaLogo(logo,LEGEND_STORY_HEADER_SAFE.logoX,LEGEND_STORY_HEADER_SAFE.logoCenterY,LEGEND_STORY_HEADER_SAFE.logoWidth,LEGEND_STORY_HEADER_SAFE.logoHeight)") && html.includes("logoCenterY:144") && !storyHeader.includes("text('LOKA!"), "legend_story_header_uses_logo_asset");
ok(feedHeader.includes("drawLokaLogo(logo,FEED_HEADER.logoX,layoutY(FEED_HEADER.logoCenterY,layout),visualSize(FEED_HEADER.logoWidth,layout),visualSize(FEED_HEADER.logoHeight,layout))") && !feedHeader.includes("text('LOKA!"), "feed_header_uses_logo_asset");
ok(group.includes("centerX=x+w/2,centerY=y+h/2"), "general_group_centered_both_axes");
ok(group.includes("startX=centerX-groupW/2"), "general_group_centered_by_measured_width");
ok(group.includes("drawImageCentered(mainIcon,startX+iconW/2,centerY"), "pictogram_on_vertical_axis");
ok(group.includes("firstBaseline=centerY-titleStep/2+titleLayout.size*.34"), "title_optically_centered_on_axis");
ok(group.includes("centerY+tempSize*.34"), "temperatures_optically_centered_on_axis");
ok(renderStory.includes("drawFeedGeneral(mainIcon,STORY_LAYOUT)"), "story_reuses_publication_general_group_contract");
ok(feedGeneral.includes("drawCenteredGeneralGroup(mainIcon,x,y,w,h,136*s,110*s,28,40,48*s,32,44*s)"), "feed_fluid_group_contract");
ok(!feedGeneral.includes("separator") && !html.includes("function drawStoryGeneral("), "general_group_has_one_renderer_and_no_visual_separator");
ok(summary.includes("left=x+68,maxWidth=w-136"), "summary_left_column");
ok(summary.includes("fittedFontSize(main,maxWidth") && !summary.includes("wrap(main"), "primary_kept_on_one_line");
ok(summary.includes("fitLines(secondary,maxWidth,2"), "secondary_limited_to_two_lines");
ok(summary.includes("editorialAccent(left,accentY,accentWidth)"), "summary_gold_hierarchy_accent");
ok(summary.includes("'left'"), "summary_text_left_aligned");
ok(renderStory.includes("drawFeedComments(STORY_LAYOUT)"), "story_reuses_publication_summary_contract");
ok(feedComments.includes("drawEditorialSummary(visual,x,y,w,h,29*s,20*s,21*s,17*s,52)"), "feed_summary_contract");

if (passed !== 20) throw new Error(`instagram_visual_hierarchy_step7_count_mismatch:${passed}`);
console.log(`INSTAGRAM_VISUAL_HIERARCHY_STEP7 ${passed}/20 PASS`);
