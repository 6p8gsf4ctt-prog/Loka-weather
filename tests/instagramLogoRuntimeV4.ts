import { CITIES } from "../src/config/cities";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { enhanceInstagramWithEditorialStudio } from "../src/ui/instagramEditorialStudio";
import { canonicalPoints } from "./scenes24/fixtures";

let passed = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`INSTAGRAM_LOGO_RUNTIME_V4_FAIL:${label}`); passed++; }
function payloadFor(scene: number): OfficialPublicPayloadV24 {
  const points = canonicalPoints(scene as never);
  const consensus = new Map(points.map((point) => [point.time, point]));
  const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({ modelId: `m${index}`, family: "noaa", weight: 0.2, fetchedAt: "test", latitude: 0, longitude: 0, hourly: [] }));
  return buildCandidateProduct(CITIES.tarnos, "2026-08-18", consensus, forecasts, {}, "test");
}

const base = renderInstagramOfficial24(payloadFor(16), CITIES.tarnos);
ok(base.includes('"logoUrl":"data:image/png;base64,'), "logo_embedded_data_url");
ok(!base.includes('/brand/loka-logo-v2.png'), "no_runtime_static_logo_dependency");
ok(base.includes("image_load_failed:"), "descriptive_image_load_errors");
const enhanced = enhanceInstagramWithEditorialStudio(base);
ok(enhanced.includes("load(m.brand.logoUrl,'editor_logo')"), "editor_loads_logo");
ok(enhanced.includes("renderStory(a.bg,a.logo,a.mainIcon,a.slots,a.hourIcons,a.solarIcons)"), "editor_story_signature_matches_renderer");
ok(enhanced.includes("renderFeed(a.bg,a.logo,a.mainIcon,a.slots,a.hourIcons,a.solarIcons)"), "editor_feed_signature_matches_renderer");
if (passed !== 6) throw new Error(`instagram_logo_runtime_v4_count_mismatch:${passed}`);
console.log(`INSTAGRAM_LOGO_RUNTIME_V4 ${passed}/6 PASS`);
