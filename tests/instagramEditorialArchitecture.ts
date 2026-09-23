import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { enhanceInstagramWithEditorialExport } from "../src/ui/instagramEditorialExport";
import { enhanceInstagramWithEditorialPersistence } from "../src/ui/instagramEditorialPersistence";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_ARCH_FAIL:${label}`);
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

const base = renderInstagramOfficial24(payloadFor(21), CITIES.tarnos);

ok(base.includes("function drawStoryGeneral(mainIcon){const x=44,y=200,w=992,h=150") && !functionLine(base, "drawStoryGeneral").includes("subtitle"), "story_general_no_subtitle");
ok(base.includes("function drawFeedGeneral(mainIcon){const x=50,y=160,w=980,h=150") && !functionLine(base, "drawFeedGeneral").includes("subtitle"), "feed_general_no_subtitle");
ok(base.includes("const visual=m.storyVisual||m.visual;const x=44,y=1139,w=992,h=272"), "story_comments_native_visual_slot");
ok(base.includes("const visual=m.feedVisual||m.visual;const x=50,y=865,w=980,h=210"), "feed_comments_native_visual_slot");
ok(base.includes('id="legendStory"') && functionLine(base, "renderLegendStory").includes("drawLegendPanel()"), "legend_story_native_renderer");
ok(base.includes("<!--LOKA_EDITORIAL_STYLE_MOUNT-->"), "style_mount_present");
ok(base.includes("<!--LOKA_EDITORIAL_STUDIO_MOUNT-->"), "studio_mount_present");
ok(base.includes("<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->"), "script_mount_present");

const rendererLinesBefore = [
  functionLine(base, "drawStoryGeneral"),
  functionLine(base, "drawFeedGeneral"),
  functionLine(base, "drawStoryComments"),
  functionLine(base, "drawFeedComments"),
  functionLine(base, "renderLegendStory")
];

const enhanced = enhanceInstagramWithEditorialStudio(base);
const rendererLinesAfter = [
  functionLine(enhanced, "drawStoryGeneral"),
  functionLine(enhanced, "drawFeedGeneral"),
  functionLine(enhanced, "drawStoryComments"),
  functionLine(enhanced, "drawFeedComments"),
  functionLine(enhanced, "renderLegendStory")
];

ok(rendererLinesBefore.every((line, index) => line === rendererLinesAfter[index]), "studio_does_not_rewrite_canvas_functions");
ok(enhanced.includes('id="editorialStudio"'), "studio_markup_injected");
ok(!enhanced.includes("<!--LOKA_EDITORIAL_STYLE_MOUNT-->") && !enhanced.includes("<!--LOKA_EDITORIAL_STUDIO_MOUNT-->") && !enhanced.includes("<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->"), "studio_mounts_consumed");

const persisted = enhanceInstagramWithEditorialPersistence(enhanced, "tarnos");
ok(persisted.includes('id="saveEditorialFeedback"') && persisted.includes("loadSaved()"), "persistence_hooks_preserved");

const exported = enhanceInstagramWithEditorialExport(persisted, "tarnos");
ok(exported.includes("exportEditorialFeedback") && exported.includes("__LOKA_EDITORIAL_EXPORT"), "export_hooks_preserved");

const activeFieldIds = ["sharedPrimary", "sharedSecondary", "sharedLegend", "sharedHashtags"];
ok(activeFieldIds.every((id) => exported.includes(`id="${id}"`)) && !exported.includes('id="storyPrimary"') && !exported.includes('id="engagementFormat"'), "single_shared_editor_contract");
ok(exported.includes('id="copySharedPublication"') && exported.includes("publicationFromFields()"), "single_publication_copy_action");

if (passed !== 15) throw new Error(`instagram_architecture_count_mismatch:${passed}`);
console.log(`INSTAGRAM_EDITORIAL_ARCHITECTURE ${passed}/15 PASS`);
