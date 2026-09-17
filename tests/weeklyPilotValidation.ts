import { CITIES } from "../src/config/cities";
import { summarizeWeeklyEditorialPilot, validateWeeklyEditorialPilot } from "../src/engine/weekly";
import { generateWeeklyCalmVisualPreview, generateWeeklyContextualVisualPreview } from "../src/weeklyPipeline";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_PILOT_VALIDATION_FAIL:${label}`);
  passed++;
}

const instant = new Date("2026-09-17T12:00:00Z");
const calm = generateWeeklyCalmVisualPreview(CITIES.tarnos!, instant, "2026-09-21");
const contextual = generateWeeklyContextualVisualPreview(CITIES.tarnos!, instant, "2026-09-21");

ok(calm.pilot.status === "PASS" && calm.pilot.source === "CONTROLLED" && calm.pilot.renderedPositions.length === 0, "calm_controlled_week_is_a_valid_zero_signal_case");
ok(contextual.pilot.status === "PASS" && contextual.pilot.renderedPositions.join(",") === "2,3", "heat_rain_controlled_week_validates_the_full_editorial_path");
ok(contextual.pilot.checks.every((check) => check.ok), "controlled_pilot_checks_profiles_preflight_signals_renderer_activation_and_sources");

const liveLike = validateWeeklyEditorialPilot({
  source: "LIVE", label: "semaine_live_sans_archive", profiles: contextual.profiles,
  contextual: contextual.contextual, carousel: contextual.carousel, activation: contextual.activation
});
ok(liveLike.status === "REVIEW" && liveLike.checks.find((check) => check.id === "reference_coverage")?.ok === false, "live_pilot_never_claims_full_contextual_coverage_without_local_archive");

const blocked = validateWeeklyEditorialPilot({
  source: "CONTROLLED", label: "activation_bloquee", profiles: contextual.profiles,
  contextual: contextual.contextual, carousel: contextual.carousel,
  activation: { ...contextual.activation, ok: false, status: "BLOCKED" }
});
ok(blocked.status === "BLOCKED" && blocked.checks.find((check) => check.id === "activation")?.ok === false, "failed_activation_blocks_the_pilot");

const partialBatch = summarizeWeeklyEditorialPilot([calm.pilot, contextual.pilot]);
ok(partialBatch.status === "REVIEW" && partialBatch.checks.find((check) => check.id === "live_count")?.ok === false, "pilot_cannot_pass_before_real_weeks_are_collected");

console.log(`WEEKLY_PILOT_VALIDATION ${passed}/6 PASS`);
