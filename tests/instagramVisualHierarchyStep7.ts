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
const wordmark = functionLine(html, "drawLokaWordmark");
const storyHeader = functionLine(html, "drawHeader");
const feedHeader = functionLine(html, "drawFeedHeader");
const group = functionLine(html, "drawCenteredGeneralGroup");
const storyGeneral = functionLine(html, "drawStoryGeneral");
const feedGeneral = functionLine(html, "drawFeedGeneral");
const summary = functionLine(html, "drawEditorialSummary");
const storyComments = functionLine(html, "drawStoryComments");
const feedComments = functionLine(html, "drawFeedComments");


ok(wordmark.includes("const label='LOKA',logoInk='#051C3C',logoGold='#FDB31E'") && wordmark.includes("font(size,500)"), "wordmark_ab_medium_weight_official_colors");
ok(wordmark.includes("bodyH=overallH*.72,bodyW=bodyH*.30") && wordmark.includes("ctx.lineTo(markX+bodyW*.405,top+bodyH*.591)"), "wordmark_official_bolt_silhouette_refined");
ok(wordmark.includes("ctx.arc(markX+bodyW*.52,baseline-dotR,dotR") && wordmark.includes("ctx.fillStyle=logoGold"), "wordmark_gold_dot_separate");
ok(storyHeader.includes("drawLokaWordmark(50,STORY_HEADER_SAFE.logoBaseline,66)") && html.includes("const STORY_HEADER_SAFE={logoBaseline:184,cityBaseline:174,dateBaseline:174}") && !storyHeader.includes("text('LOKA!"), "story_header_uses_vector_wordmark");
ok(feedHeader.includes("drawLokaWordmark(50,100,60)") && !feedHeader.includes("text('LOKA!"), "feed_header_uses_vector_wordmark");
ok(group.includes("centerX=x+w/2,centerY=y+h/2"), "general_group_centered_both_axes");
ok(group.includes("startX=centerX-groupW/2"), "general_group_centered_by_measured_width");
ok(group.includes("drawImageCentered(mainIcon,startX+iconW/2,centerY"), "pictogram_on_vertical_axis");
ok(group.includes("firstBaseline=centerY-titleStep/2+titleLayout.size*.34"), "title_optically_centered_on_axis");
ok(group.includes("centerY+tempSize*.34"), "temperatures_optically_centered_on_axis");
ok(storyGeneral.includes("drawCenteredGeneralGroup(mainIcon,x,y,w,h,146,118,30,44,52,34,48)"), "story_fluid_group_contract");
ok(feedGeneral.includes("drawCenteredGeneralGroup(mainIcon,x,y,w,h,136,110,28,40,48,32,44)"), "feed_fluid_group_contract");
ok(!storyGeneral.includes("separator") && !feedGeneral.includes("separator"), "general_group_no_visual_separator");
ok(summary.includes("left=x+68,maxWidth=w-136"), "summary_left_column");
ok(summary.includes("fittedFontSize(main,maxWidth") && !summary.includes("wrap(main"), "primary_kept_on_one_line");
ok(summary.includes("fitLines(secondary,maxWidth,2"), "secondary_limited_to_two_lines");
ok(summary.includes("editorialAccent(left,accentY,accentWidth)"), "summary_gold_hierarchy_accent");
ok(summary.includes("'left'"), "summary_text_left_aligned");
ok(storyComments.includes("drawEditorialSummary(visual,x,y,w,h,34,23,25,19,58)"), "story_summary_contract");
ok(feedComments.includes("drawEditorialSummary(visual,x,y,w,h,29,20,21,17,52)"), "feed_summary_contract");

if (passed !== 20) throw new Error(`instagram_visual_hierarchy_step7_count_mismatch:${passed}`);
console.log(`INSTAGRAM_VISUAL_HIERARCHY_STEP7 ${passed}/20 PASS`);
