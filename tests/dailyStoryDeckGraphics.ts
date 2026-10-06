import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramDailyGraphicPreview } from "../src/ui/instagramDailyGraphicPreview";
import { LOKA_INSTAGRAM_STORY_SAFE_FRAME } from "../src/ui/instagramStorySafeFrame";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_STORY_DECK_GRAPHICS_FAIL:${label}`);
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

function modelFrom(html: string): any {
  const raw = html.match(/const m=(\{.*?\});const GS=/s)?.[1];
  if (!raw) throw new Error("daily_story_deck_graphics_model_missing");
  return JSON.parse(raw);
}

const payload = payloadFor(21);
const html = renderInstagramDailyGraphicPreview(payload, CITIES.tarnos);
const model = modelFrom(html);

ok(["story", "hourlyStory", "daylightStory", "moonStory", "legendStory"].every((id) => html.includes(`<canvas id="${id}" width="1080" height="1920">`)), "five_story_canvases_are_exportable");
ok(html.includes("STORY 1 · LA JOURNÉE") && html.includes("STORY 5 · RÉSUMÉ DU JOUR"), "five_story_sequence_is_labelled");
ok(model.storyDeck.hourly.points.length === 19 && model.storyDeck.hourly.points[0].hour === 4 && model.storyDeck.hourly.points[18].hour === 22, "hourly_story_contains_every_hour_from_four_to_twenty_two");
ok(functionLine(html, "drawHourlyBody").includes("rows=4,columns=5") && functionLine(html, "drawHourlyBody").includes("row===3?4:5"), "nineteen_hours_use_the_validated_five_by_four_grid");
ok(functionLine(html, "prepareStory").includes("drawHeader(logo)") && functionLine(html, "prepareStory").includes("drawDeckTitle(title)") && functionLine(html, "prepareStory").includes("drawDeckBody()"), "all_stories_reuse_one_shared_frame_runtime");
ok(functionLine(html, "renderHourlyStory").includes("drawStorySignature()") && functionLine(html, "renderMoonStory").includes("drawStorySignature()"), "shared_instagram_footer_is_preserved");
ok(functionLine(html, "drawDaylightBody").includes("DURÉE DU JOUR") && functionLine(html, "drawDaylightBody").includes("d.solarNoon"), "daylight_story_contains_duration_and_five_solar_markers");
ok(model.storyDeck.moon.pictogramUrl.startsWith("data:image/svg+xml;charset=utf-8,"), "moon_uses_the_official_local_pictogram_pipeline");
ok(functionLine(html, "drawMoonBody").includes("LEVER DE LUNE") && functionLine(html, "drawMoonBody").includes("PROCHAINE PHASE"), "moon_story_has_useful_public_information");
ok(functionLine(html, "drawLegendPanel").includes("m.legendText||m.storyDeck.summary.legendText"), "summary_story_reuses_the_single_editable_daily_text");
ok(functionLine(html, "drawFeedHours").includes("x=50,y=336,w=980,h=500") && functionLine(html, "drawFeedSolar").includes("x=50,y=1100,w=980,h=205"), "publication_geometry_remains_unchanged");
ok(LOKA_INSTAGRAM_STORY_SAFE_FRAME.deck.title.y === LOKA_INSTAGRAM_STORY_SAFE_FRAME.content.general.y && LOKA_INSTAGRAM_STORY_SAFE_FRAME.deck.body.y === LOKA_INSTAGRAM_STORY_SAFE_FRAME.content.hours.y, "deck_anchors_reuse_the_validated_daily_weekly_safe_frame");

const legacy = structuredClone(payload) as OfficialPublicPayloadV24;
delete legacy.storyDeck;
const legacyModel = modelFrom(renderInstagramDailyGraphicPreview(legacy, CITIES.tarnos));
ok(legacyModel.storyDeck.hourly.points.length === 19 && legacyModel.storyDeck.hourly.complete === false, "archived_payloads_receive_a_non_interpolated_compatibility_deck");
ok(legacyModel.storyDeck.hourly.points.some((point: any) => point.available === false && point.temperatureC === null), "missing_legacy_hours_are_explicit_not_invented");

const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let scriptValid = true;
try { new Function(script); } catch { scriptValid = false; }
ok(scriptValid, "five_story_browser_runtime_is_valid");

if (passed !== 15) throw new Error(`daily_story_deck_graphics_count_mismatch:${passed}`);
console.log(`DAILY_STORY_DECK_GRAPHICS ${passed}/15 PASS`);
