import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { enhanceInstagramWithEditorialExport } from "../src/ui/instagramEditorialExport";
import { enhanceInstagramWithEditorialPersistence } from "../src/ui/instagramEditorialPersistence";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";
import { renderInstagramDailyGraphicPreview } from "../src/ui/instagramDailyGraphicPreview";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_STORY_DECK_ACTIVATION_FAIL:${label}`);
  passed++;
}

function payload(): OfficialPublicPayloadV24 {
  const points = canonicalPoints(21 as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`,
    family: "noaa",
    weight: 0.2,
    fetchedAt: "test",
    latitude: CITIES.tarnos.latitude,
    longitude: CITIES.tarnos.longitude,
    hourly: []
  }));
  return buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
}

function functionLine(html: string, name: string): string {
  return html.split("\n").find((line) => line.startsWith(`function ${name}(`) || line.startsWith(`async function ${name}(`)) ?? "";
}

const base = renderInstagramDailyGraphicPreview(payload(), CITIES.tarnos);
ok(base.includes('id="storyDeckControls"') && base.includes('id="shareStoryDeck"'), "single_story_deck_control_is_present");
ok(base.includes('href="#storyCard1"') && base.includes('href="#storyCard5"'), "five_story_navigation_is_ordered");
ok(base.indexOf('id="storyCard1"') < base.indexOf('id="storyDeckControls"'), "historical_primary_story_is_presented_before_test_controls");
ok(base.includes("STORY JOURNALIÈRE PRINCIPALE · ACTUELLE") && base.includes("Story historique LOKA maintenue en priorité"), "primary_story_is_explicitly_identified_as_current");
ok(base.includes('id="shareStoryDeck" type="button" disabled'), "bulk_export_waits_for_complete_render");
ok(base.includes("const STORY_DECK_EXPORTS=[[storyCanvas,'story-01-journee'],[hourlyStoryCanvas,'story-02-heure-par-heure'],[daylightStoryCanvas,'story-03-heures-du-jour'],[moonStoryCanvas,'story-04-lune'],[legendStoryCanvas,'story-05-resume']]"), "bulk_export_names_preserve_instagram_order");
ok(functionLine(base, "shareStoryDeck").includes("files.length!==5") && functionLine(base, "shareStoryDeck").includes("navigator.share"), "bulk_export_is_atomic_before_native_share");
ok(functionLine(base, "shareStoryDeck").includes("files.forEach(file=>fallbackDownload(file))"), "bulk_export_has_desktop_download_fallback");
ok(base.includes("__LOKA_STORY_DECK_AUDIT") && base.includes("publicationChanged:false"), "runtime_audit_declares_publication_is_untouched");
ok(functionLine(base, "drawLegendPanel").includes("m.storyVisual||m.visual||m.storyDeck.summary"), "story_five_uses_daily_editorial_summary");
ok(!functionLine(base, "drawLegendPanel").includes("m.legendText"), "instagram_caption_is_not_drawn_in_story_five");
ok(functionLine(base, "renderStory").includes("drawStoryGeneral") && functionLine(base, "renderStory").includes("drawStoryHours") && functionLine(base, "renderStory").includes("drawStoryComments") && functionLine(base, "renderStory").includes("drawStorySolar"), "story_one_restores_the_complete_historical_daily_pipeline");
ok(!functionLine(base, "renderStory").includes("drawOverviewBody"), "experimental_overview_does_not_replace_the_primary_story");
ok(base.includes("primaryStoryPreserved:true") && base.includes("order:['PRIMARY','HOURLY','DAYLIGHT','MOON','SUMMARY']"), "runtime_audit_records_primary_story_preservation");
ok(functionLine(base, "renderFeed").includes("drawFeedGeneral") && functionLine(base, "renderFeed").includes("drawFeedHours") && functionLine(base, "renderFeed").includes("drawFeedComments") && functionLine(base, "renderFeed").includes("drawFeedSolar"), "publication_render_pipeline_is_unchanged");

const enhanced = enhanceInstagramWithEditorialExport(
  enhanceInstagramWithEditorialPersistence(
    enhanceInstagramWithEditorialStudio(base),
    "tarnos"
  ),
  "tarnos"
);
ok(enhanced.includes("Editorial Studio · V1.5") && enhanced.includes("Story 5 « Résumé du jour »"), "editor_explains_the_new_summary_link");
ok(enhanced.includes("storySummarySource:'PRIMARY_SECONDARY'"), "editor_contract_exposes_summary_source");
ok(enhanced.includes("Story 5 et Publication actualisées."), "editor_confirms_only_the_linked_visuals");
ok(enhanced.includes("commentaire partagé Story 5 / Publication") && enhanced.includes("légende Instagram"), "persistence_and_export_copy_match_the_final_architecture");

for (const body of [...enhanced.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1])) {
  new Function(body);
}
ok(true, "final_integrated_browser_scripts_are_valid");

if (passed !== 20) throw new Error(`daily_story_deck_activation_count_mismatch:${passed}`);
console.log(`DAILY_STORY_DECK_ACTIVATION ${passed}/20 PASS`);
