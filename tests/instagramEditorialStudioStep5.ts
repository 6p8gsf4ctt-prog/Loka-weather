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
ok(studio.includes('id="storyPrimary"') && studio.includes('id="storySecondary"'), "story_active_visual_fields");
ok(studio.includes('id="feedPrimary"') && studio.includes('id="feedSecondary"'), "feed_active_visual_fields");
ok(studio.includes("[['storyPrimary','feedPrimary'],['storySecondary','feedSecondary']]"), "story_to_feed_sync_two_fields");
ok(studio.includes("[['feedPrimary','storyPrimary'],['feedSecondary','storySecondary']]"), "feed_to_story_sync_two_fields");
ok(studio.includes("__LOKA_EDITORIAL_LEGACY_SUBTITLE"), "legacy_subtitle_bridge_present");
ok(studio.includes("subtitle:legacySubtitle.story") && studio.includes("subtitle:legacySubtitle.feed"), "legacy_subtitle_kept_in_drafts");
ok(studio.includes("resetLegacySubtitles();byId('storyPrimary')"), "reset_restores_legacy_official");
ok(studio.includes("activeVisualFields:['primaryLine','secondaryLine']"), "active_visual_contract_declared");

const persisted = enhanceInstagramWithEditorialPersistence(studio, "tarnos");
ok(!persisted.includes("document.getElementById('storySubtitle')") && !persisted.includes("document.getElementById('feedSubtitle')"), "persistence_no_removed_dom_dependency");
ok(persisted.includes("subtitle:legacySubtitle('story')") && persisted.includes("subtitle:legacySubtitle('feed')"), "save_preserves_legacy_subtitle");
ok(persisted.includes("setLegacySubtitle('story',story.subtitle") && persisted.includes("setLegacySubtitle('feed',feed.subtitle"), "old_feedback_legacy_loaded_hidden");
ok(persisted.includes("legacySubtitle:'PRESERVED_HIDDEN'"), "persistence_contract_declared");
ok(persisted.includes("Rétablir l’officiel") && persisted.includes("anciens sous-titres"), "compatibility_explained_in_ui");

for (const body of [...persisted.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])) {
  new Function(body);
}
ok(true, "inline_scripts_syntax");

if (passed !== 16) throw new Error(`instagram_studio_step5_count_mismatch:${passed}`);
console.log(`INSTAGRAM_EDITORIAL_STUDIO_STEP5 ${passed}/16 PASS`);
