import { enhanceInstagramWithEditorialPersistence } from "../src/ui/instagramEditorialPersistence";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_STUDIO_STEP5_FAIL:${label}`);
  passed++;
}

const base = `<!doctype html><html><head><!--LOKA_EDITORIAL_STYLE_MOUNT--></head><body><!--LOKA_EDITORIAL_STUDIO_MOUNT--><div class="caption-card"><div class="caption-help"></div><pre id="captionText"></pre><pre id="hashtagsText"></pre><button id="copyCaption"></button><button id="copyHashtags"></button><button id="copyAll"></button></div><!--LOKA_EDITORIAL_SCRIPT_MOUNT--></body></html>`;
const studio = enhanceInstagramWithEditorialStudio(base);

ok(!studio.includes('id="storySubtitle"') && !studio.includes('id="feedSubtitle"'), "subtitle_fields_removed");
ok(!studio.includes("<span>Sous-titre</span>"), "subtitle_label_removed");
ok(studio.includes('id="sharedPrimary"') && studio.includes('id="sharedSecondary"'), "single_visual_field_pair");
ok(studio.includes('id="sharedLegend"') && studio.includes('id="sharedHashtags"'), "shared_social_fields");
ok(!studio.includes('id="storyPrimary"') && !studio.includes('id="feedPrimary"'), "duplicate_visual_fields_removed");
ok(!studio.includes('id="feedParagraph1"') && !studio.includes('id="feedParagraph2"') && !studio.includes('id="storyHashtags"'), "duplicate_social_fields_removed");
ok(!studio.includes('id="engagementFormat"') && !studio.includes('id="engagementQuestion"'), "engagement_ui_removed");
ok(studio.includes("m.storyVisual={...officialVisual") && studio.includes("m.feedVisual={...officialVisual"), "one_visual_pair_updates_both_canvases");
ok(studio.includes("m.legendText=legend") && studio.includes("renderLegendStory(a.bg,a.logo)"), "shared_legend_drives_story");
ok(studio.includes("publicationCaption(legend)") && studio.includes("copySharedPublication"), "shared_legend_drives_publication");
ok(studio.includes("__LOKA_EDITORIAL_LEGACY_SUBTITLE"), "legacy_subtitle_bridge_present");
ok(studio.includes("activeSharedFields:['legend','hashtags']") && studio.includes("engagementUi:'DISABLED'"), "shared_editor_contract_declared");

const persisted = enhanceInstagramWithEditorialPersistence(studio, "tarnos");
ok(!persisted.includes("document.getElementById('storySubtitle')") && !persisted.includes("document.getElementById('feedSubtitle')"), "persistence_no_removed_dom_dependency");
ok(persisted.includes("subtitle:legacySubtitle('story')") && persisted.includes("subtitle:legacySubtitle('feed')"), "save_preserves_legacy_subtitle");
ok(persisted.includes("legacyEngagement:'PRESERVED_HIDDEN'") && persisted.includes("sharedLegend:true"), "persistence_compatibility_contract");

for (const body of [...persisted.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])) {
  new Function(body);
}
ok(true, "inline_scripts_syntax");

if (passed !== 16) throw new Error(`instagram_studio_step5_count_mismatch:${passed}`);
console.log(`INSTAGRAM_EDITORIAL_STUDIO_STEP5 ${passed}/16 PASS`);
