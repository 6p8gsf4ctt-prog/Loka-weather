import { canonicalPublicRedirect, LOKA_CANONICAL_PUBLIC_ROUTES } from "../src/http/canonicalPublicRoutes";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`CANONICAL_PUBLIC_ROUTES_FAIL:${label}`);
  passed++;
}

const origin = "https://loka.test";
const daily = canonicalPublicRedirect(`${origin}/?city=tarnos`);
ok(daily === `${origin}/daily-graphic-preview?city=tarnos`, "root_redirects_to_daily_graphic");

const insight = canonicalPublicRedirect(`${origin}/daily-insight-op4-gallery?city=tarnos&date=2026-10-06`);
ok(insight === `${origin}/daily-insight-lab-preview?city=tarnos&date=2026-10-06`, "legacy_insight_preserves_city_and_date");

const sceneLab = canonicalPublicRedirect(`${origin}/instagram-scenes-preview?pack=3&view=story`);
ok(sceneLab === `${origin}/daily-graphic-preview?city=tarnos`, "scene_lab_redirects_without_legacy_parameters");

ok(canonicalPublicRedirect(`${origin}/daily-insight-lab-shared-story?city=tarnos`) === null, "required_internal_story_route_is_preserved");
ok(canonicalPublicRedirect(`${origin}/weekly-candidate-preview`) === null, "required_weekly_candidate_route_is_preserved");
ok(canonicalPublicRedirect(`${origin}/api/health`) === null, "diagnostic_api_is_preserved");
ok(canonicalPublicRedirect(`${origin}/admin`, "POST") === null, "post_actions_are_never_redirected");
ok(LOKA_CANONICAL_PUBLIC_ROUTES.length === 4, "exactly_four_public_entry_points_are_declared");

console.log(`CANONICAL_PUBLIC_ROUTES ${passed}/8 PASS`);

