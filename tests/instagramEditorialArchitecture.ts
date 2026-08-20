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

ok(base.includes("function drawStoryGeneral(mainIcon){const x=44,y=224,w=992,h=150") && !functionLine(base, "drawStoryGeneral").includes("subtitle"), "story_general_step3_no_subtitle");
ok(base.includes("function drawFeedGeneral(mainIcon){const x=50,y=160,w=980,h=150") && !functionLine(base, "drawFeedGeneral").includes("subtitle"), "feed_general_step3_no_subtitle");
ok(base.includes("const visual=m.storyVisual||m.visual;const x=44,y=1163,w=992,h=272"), "story_comments_native_visual_slot");
ok(base.includes("const visual=m.feedVisual||m.visual;const x=50,y=865,w=980,h=210"), "feed_comments_native_visual_slot");
ok(base.includes("<!--LOKA_EDITORIAL_STYLE_MOUNT-->"), "style_mount_present");
ok(base.includes("<!--LOKA_EDITORIAL_STUDIO_MOUNT-->"), "studio_mount_present");
ok(base.includes("<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->"), "script_mount_present");

const rendererLinesBefore = [
  functionLine(base, "drawStoryGeneral"),
  functionLine(base, "drawFeedGeneral"),
  functionLine(base, "drawStoryComments"),
  functionLine(base, "drawFeedComments")
];

const enhanced = enhanceInstagramWithEditorialStudio(base);
const rendererLinesAfter = [
  functionLine(enhanced, "drawStoryGeneral"),
  functionLine(enhanced, "drawFeedGeneral"),
  functionLine(enhanced, "drawStoryComments"),
  functionLine(enhanced, "drawFeedComments")
];

ok(rendererLinesBefore.every((line, index) => line === rendererLinesAfter[index]), "studio_does_not_rewrite_canvas_functions");
ok(enhanced.includes('id="editorialStudio"'), "studio_markup_injected");
ok(!enhanced.includes("<!--LOKA_EDITORIAL_STYLE_MOUNT-->") && !enhanced.includes("<!--LOKA_EDITORIAL_STUDIO_MOUNT-->") && !enhanced.includes("<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->"), "studio_mounts_consumed");

const geometryVariant = base
  .replace("const x=44,y=224,w=992,h=150", "const x=44,y=225,w=992,h=149")
  .replace("const x=50,y=865,w=980,h=210", "const x=50,y=866,w=980,h=209");
const geometryEnhanced = enhanceInstagramWithEditorialStudio(geometryVariant);
ok(geometryEnhanced.includes('id="editorialStudio"'), "studio_independent_from_renderer_geometry");

const persisted = enhanceInstagramWithEditorialPersistence(enhanced, "tarnos");
ok(persisted.includes('id="saveEditorialFeedback"') && persisted.includes("loadSaved()"), "persistence_hooks_preserved");

const exported = enhanceInstagramWithEditorialExport(persisted, "tarnos");
ok(exported.includes("exportEditorialFeedback") && exported.includes("__LOKA_EDITORIAL_EXPORT"), "export_hooks_preserved");

const activeFieldIds = [
  "storyPrimary", "storySecondary", "storyHashtags",
  "engagementFormat", "engagementQuestion", "engagementOptionA", "engagementOptionB",
  "feedPrimary", "feedSecondary", "feedParagraph1", "feedParagraph2", "feedHashtags"
];
ok(activeFieldIds.every((id) => exported.includes(`id="${id}"`)) && !exported.includes('id="storySubtitle"') && !exported.includes('id="feedSubtitle"'), "editor_fields_step5_active_contract");
ok(exported.includes('id="publicationInstagramPack"') && exported.includes('id="copyFeedPublication"'), "publication_instagram_single_visual_zone");
ok(exported.includes("publicationFromFields()") && !exported.includes('id="feedFullText"'), "publication_copy_keeps_granular_storage");

if (passed !== 16) throw new Error(`instagram_architecture_count_mismatch:${passed}`);
console.log(`INSTAGRAM_EDITORIAL_ARCHITECTURE ${passed}/16 PASS`);
