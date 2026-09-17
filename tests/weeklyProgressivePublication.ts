import { CITIES } from "../src/config/cities";
import { evaluateWeeklyProgressivePublication, resolveWeeklyPublicSurface } from "../src/engine/weekly";
import { generateWeeklyContextualVisualPreview } from "../src/weeklyPipeline";
import type { Env } from "../src/types";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_PROGRESSIVE_PUBLICATION_FAIL:${label}`);
  passed++;
}

const generated = generateWeeklyContextualVisualPreview(CITIES.tarnos, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
const baseEnv = { WEEKLY_ENABLED: "true" } as Pick<Env, "WEEKLY_ENABLED" | "WEEKLY_CONTEXTUAL_SLIDES_ENABLED" | "WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED" | "WEEKLY_PROGRESSIVE_SHADOW_MODE" | "WEEKLY_PROGRESSIVE_ROLLBACK">;

const safeDefault = evaluateWeeklyProgressivePublication(baseEnv, generated.editorial, generated.carousel);
ok(safeDefault.mode === "SLIDE1_ONLY" && !safeDefault.exposeComplementarySlides && !safeDefault.fallbackToSlide1, "default_keeps_validated_slide1_public");

const shadow = evaluateWeeklyProgressivePublication({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true", WEEKLY_PROGRESSIVE_SHADOW_MODE: "true" }, generated.editorial, generated.carousel);
ok(shadow.mode === "SHADOW" && !shadow.exposeComplementarySlides, "shadow_mode_runs_without_exposing_editorial_slides");

const progressive = evaluateWeeklyProgressivePublication({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true", WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED: "true" }, generated.editorial, generated.carousel);
ok(progressive.mode === "PROGRESSIVE" && progressive.exposeComplementarySlides && !progressive.fallbackToSlide1, "explicit_progressive_gate_exposes_preflighted_slides");

const rollback = evaluateWeeklyProgressivePublication({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true", WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED: "true", WEEKLY_PROGRESSIVE_ROLLBACK: "true" }, generated.editorial, generated.carousel);
ok(rollback.mode === "SLIDE1_ONLY" && rollback.fallbackToSlide1 && rollback.reason === "operator_rollback_requested", "rollback_flag_wins_over_progressive_gate");

const invalid = { ...generated.carousel, complementaryPreflight: { ...generated.carousel.complementaryPreflight!, ok: false } };
const failed = evaluateWeeklyProgressivePublication({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true", WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED: "true" }, generated.editorial, invalid);
ok(failed.fallbackToSlide1 && failed.reason === "preflight_or_activation_failed", "failed_preflight_falls_back_without_throwing");

const publicFallback = resolveWeeklyPublicSurface({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true" }, generated.editorial, generated.carousel);
ok(publicFallback.carousel.slides.length === 1 && !publicFallback.renderOptions.complementarySlides, "fallback_surface_contains_only_slide1");

const publicFull = resolveWeeklyPublicSurface({ ...baseEnv, WEEKLY_CONTEXTUAL_SLIDES_ENABLED: "true", WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED: "true" }, generated.editorial, generated.carousel);
ok(publicFull.carousel.slides.length === generated.carousel.slides.length && publicFull.renderOptions.complementarySlides?.slides.length === 2, "progressive_surface_reuses_stored_complementary_plan");

console.log(`WEEKLY_PROGRESSIVE_PUBLICATION ${passed}/7 PASS`);
