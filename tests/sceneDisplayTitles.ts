import { CITIES } from "../src/config/cities";
import { scene24DisplayTitle, SCENE24_DISPLAY_TITLES } from "../src/engine/scenes24/displayTitles";
import { SCENES24 } from "../src/engine/scenes24/registry";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24, Scene24Id } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`SCENE_DISPLAY_TITLES_FAIL:${label}`);
  passed++;
}

const expected = [
  "PLEIN SOLEIL",
  "SOLEIL VOILÉ",
  "BELLES ÉCLAIRCIES",
  "CIEL CHANGEANT",
  "CIEL SE COUVRANT",
  "SOLEIL & VENT",
  "SOLEIL TRÈS VOILÉ",
  "BRUME & BROUILLARD",
  "CIEL COUVERT",
  "GRAND VENT",
  "AMÉLIORATION",
  "PLUIE SOUTENUE",
  "AVERSES",
  "ÉCLAIRCIES & VENT",
  "BELLE EMBELLIE",
  "SOLEIL & NUAGES",
  "ÉPAIS BROUILLARD",
  "TEMPS CHANGEANT",
  "TEMPS INSTABLE",
  "NUAGES & VENT",
  "LARGES ÉCLAIRCIES",
  "RISQUE D’ORAGE",
  "CIEL TRÈS GRIS",
  "PLUIE & VENT"
] as const;

ok(Object.keys(SCENE24_DISPLAY_TITLES).length === 24, "all_24_display_titles_defined");
expected.forEach((title, index) => ok(scene24DisplayTitle((index + 1) as Scene24Id) === title, `display_title_${index + 1}`));

// Canonical labels deliberately remain untouched for engine identity/history.
ok(SCENES24[0].label === "GRAND SOLEIL", "canonical_scene_01_unchanged");
ok(SCENES24[15].label === "SOLEIL + PASSAGES NUAGEUX", "canonical_scene_16_unchanged");
ok(SCENES24[22].label === "COUVERT DENSE", "canonical_scene_23_unchanged");

function payloadFor(scene: number): OfficialPublicPayloadV24 {
  const points = canonicalPoints(scene as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test",
    latitude: 0, longitude: 0, hourly: []
  }));
  return buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
}

const scene16 = payloadFor(16);
const instagram = renderInstagramOfficial24(scene16, CITIES.tarnos);
ok(instagram.includes('"title":"SOLEIL \\u0026 NUAGES"'), "instagram_uses_display_title");
ok(instagram.includes('"canonicalTitle":"SOLEIL + PASSAGES NUAGEUX"'), "instagram_keeps_canonical_title_for_audit");
const titleLayout = instagram.split("\n").find((line) => line.startsWith("function centeredTitleLayout(")) ?? "";
ok(titleLayout.includes("lines:[label]") && !titleLayout.includes("fitLines"), "instagram_scene_title_is_forced_to_one_line");

ok(instagram.includes("centeredTitleLayout(m.scene.title"), "studio_draws_display_title");
ok(instagram.includes("displayTitle:m.scene.title"), "studio_audit_tracks_display_title");

if (passed !== 33) throw new Error(`scene_display_titles_count_mismatch:${passed}`);
console.log(`SCENE_DISPLAY_TITLES ${passed}/33 PASS`);
