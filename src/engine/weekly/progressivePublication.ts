import type { Env } from "../../types";
import { isWeeklyContextualSlidesEnabled, isWeeklyProgressivePublicationEnabled, isWeeklyProgressiveRollbackEnabled, isWeeklyProgressiveShadowModeEnabled, isWeeklyEnabled } from "./featureFlag";
import { buildWeeklyCarouselPlan, type WeeklyCarouselPlan, type WeeklyCarouselRenderOptions } from "./carousel";
import type { WeeklyComplementarySlidePlan } from "./complementarySlides";
import { weeklyComplementaryPlanFingerprint } from "./complementaryPreflight";
import { validateWeeklyActivation } from "./activation";
import type { WeeklyEditorial } from "./editorial";

export type WeeklyProgressivePublicationMode = "DISABLED" | "SLIDE1_ONLY" | "SHADOW" | "PROGRESSIVE";

export interface WeeklyProgressivePublicationCheck {
  id: "weekly_enabled" | "contextual_flag" | "progressive_flag" | "rollback_flag" | "activation" | "preflight" | "fingerprint";
  ok: boolean;
  detail: string;
}

export interface WeeklyProgressivePublicationDecision {
  mode: WeeklyProgressivePublicationMode;
  exposeComplementarySlides: boolean;
  fallbackToSlide1: boolean;
  reason: string;
  checks: WeeklyProgressivePublicationCheck[];
}

export interface WeeklyPublicSurface {
  editorial: WeeklyEditorial;
  carousel: WeeklyCarouselPlan;
  renderOptions: WeeklyCarouselRenderOptions;
  rollout: WeeklyProgressivePublicationDecision;
}

function check(
  id: WeeklyProgressivePublicationCheck["id"],
  ok: boolean,
  detail: string
): WeeklyProgressivePublicationCheck {
  return { id, ok, detail };
}

function complementaryPlanFromCarousel(carousel: WeeklyCarouselPlan): WeeklyComplementarySlidePlan | undefined {
  const slides = carousel.slides.slice(1)
    .map((slide) => slide.complementary)
    .filter((slide): slide is NonNullable<typeof slide> => slide !== undefined);
  if (!slides.length) return undefined;
  return {
    version: "1.0.0",
    inputSignals: slides.length,
    slides,
    omittedSignalIds: []
  };
}

/**
 * Decides what may be exposed on the public weekly surface. The default is
 * deliberately slide 1 only. A production operator must explicitly enable
 * both contextual generation and progressive publication; the rollback flag
 * always wins over those gates.
 */
export function evaluateWeeklyProgressivePublication(
  env: Pick<Env, "WEEKLY_ENABLED" | "WEEKLY_CONTEXTUAL_SLIDES_ENABLED" | "WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED" | "WEEKLY_PROGRESSIVE_SHADOW_MODE" | "WEEKLY_PROGRESSIVE_ROLLBACK">,
  editorial: WeeklyEditorial,
  carousel: WeeklyCarouselPlan
): WeeklyProgressivePublicationDecision {
  const weeklyEnabled = isWeeklyEnabled(env);
  const contextualEnabled = isWeeklyContextualSlidesEnabled(env);
  const progressiveEnabled = isWeeklyProgressivePublicationEnabled(env);
  const shadowEnabled = isWeeklyProgressiveShadowModeEnabled(env);
  const rollbackEnabled = isWeeklyProgressiveRollbackEnabled(env);
  const activation = validateWeeklyActivation(editorial, carousel);
  const preflight = carousel.complementaryPreflight;
  const contextualSlides = carousel.slides.slice(1).filter((slide) => slide.complementary !== undefined);
  const hasContextualSlides = contextualSlides.length > 0;
  const storedComplementaryPlan = complementaryPlanFromCarousel(carousel);
  const fingerprintMatches = !hasContextualSlides
    || (preflight !== undefined && storedComplementaryPlan !== undefined
      && preflight.planFingerprint === weeklyComplementaryPlanFingerprint(storedComplementaryPlan));
  const checks: WeeklyProgressivePublicationCheck[] = [
    check("weekly_enabled", weeklyEnabled, weeklyEnabled ? "weekly_surface_enabled" : "weekly_surface_disabled"),
    check("contextual_flag", contextualEnabled, contextualEnabled ? "contextual_generation_enabled" : "contextual_slides_stay_hidden"),
    check("progressive_flag", progressiveEnabled, progressiveEnabled ? "progressive_publication_enabled" : "slide1_default_until_explicit_opt_in"),
    check("rollback_flag", !rollbackEnabled, rollbackEnabled ? "operator_rollback_requested" : "rollback_not_requested"),
    check("activation", activation.ok, activation.ok ? "stored_carousel_passes_activation" : "stored_carousel_activation_failed"),
    check("preflight", !hasContextualSlides || (preflight?.ok === true && preflight.comprehensive === true), hasContextualSlides ? "contextual_plan_has_complete_preflight" : "no_contextual_slides_to_expose"),
    check("fingerprint", fingerprintMatches, hasContextualSlides ? "preflight_fingerprint_matches_stored_plan" : "no_contextual_fingerprint_required")
  ];

  if (!weeklyEnabled) {
    return { mode: "DISABLED", exposeComplementarySlides: false, fallbackToSlide1: false, reason: "weekly_surface_disabled", checks };
  }
  if (rollbackEnabled) {
    return { mode: "SLIDE1_ONLY", exposeComplementarySlides: false, fallbackToSlide1: true, reason: "operator_rollback_requested", checks };
  }
  if (progressiveEnabled && contextualEnabled) {
    const safeToExpose = activation.ok && (!hasContextualSlides || (preflight?.ok === true && preflight.comprehensive === true && fingerprintMatches));
    if (safeToExpose) {
      return { mode: "PROGRESSIVE", exposeComplementarySlides: hasContextualSlides, fallbackToSlide1: false, reason: hasContextualSlides ? "preflight_approved_editorial_slides" : "no_contextual_signal_this_week", checks };
    }
    return { mode: "SLIDE1_ONLY", exposeComplementarySlides: false, fallbackToSlide1: true, reason: "preflight_or_activation_failed", checks };
  }
  if (shadowEnabled) {
    return { mode: "SHADOW", exposeComplementarySlides: false, fallbackToSlide1: false, reason: "shadow_mode_keeps_slide1_public", checks };
  }
  return { mode: "SLIDE1_ONLY", exposeComplementarySlides: false, fallbackToSlide1: false, reason: "progressive_publication_not_enabled", checks };
}

/** Resolves a stored publication into the surface that may actually be shown. */
export function resolveWeeklyPublicSurface(
  env: Pick<Env, "WEEKLY_ENABLED" | "WEEKLY_CONTEXTUAL_SLIDES_ENABLED" | "WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED" | "WEEKLY_PROGRESSIVE_SHADOW_MODE" | "WEEKLY_PROGRESSIVE_ROLLBACK">,
  editorial: WeeklyEditorial,
  carousel: WeeklyCarouselPlan
): WeeklyPublicSurface {
  const rollout = evaluateWeeklyProgressivePublication(env, editorial, carousel);
  const publicEditorial = rollout.exposeComplementarySlides
    ? editorial
    : { ...editorial, weeklyNumber: undefined };
  const publicCarousel = rollout.exposeComplementarySlides
    ? carousel
    : buildWeeklyCarouselPlan(publicEditorial);
  const complementarySlides = rollout.exposeComplementarySlides ? complementaryPlanFromCarousel(carousel) : undefined;
  const renderOptions: WeeklyCarouselRenderOptions = complementarySlides
    ? { complementarySlides, complementaryPreflight: carousel.complementaryPreflight }
    : {};
  return { editorial: publicEditorial, carousel: publicCarousel, renderOptions, rollout };
}

/** Structured observability event for rollout and rollback decisions. */
export function logWeeklyProgressivePublication(
  decision: WeeklyProgressivePublicationDecision,
  context: { citySlug: string; startDate: string; endDate: string }
): void {
  console.info("LOKA_WEEKLY_PROGRESSIVE_PUBLICATION", JSON.stringify({
    ...context,
    mode: decision.mode,
    exposeComplementarySlides: decision.exposeComplementarySlides,
    fallbackToSlide1: decision.fallbackToSlide1,
    reason: decision.reason,
    failedChecks: decision.checks.filter((item) => !item.ok).map((item) => item.id)
  }));
}
