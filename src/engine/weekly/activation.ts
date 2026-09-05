import { weeklyRangeForDate } from "./schedule";
import type { WeeklyEditorial } from "./editorial";
import type { WeeklyCarouselPlan } from "./carousel";

export interface WeeklyActivationCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface WeeklyActivationValidation {
  status: "READY" | "BLOCKED";
  ok: boolean;
  checks: WeeklyActivationCheck[];
}

function check(id: string, ok: boolean, detail: string): WeeklyActivationCheck {
  return { id, ok, detail };
}

function sameIds(actual: Array<string | null>, expected: string[]): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index])
    && new Set(actual).size === expected.length;
}

/**
 * Validates the complete weekly publication contract before it can be stored
 * or exposed publicly. This is a deterministic guard, not an editorial step.
 */
export function validateWeeklyActivation(
  editorial: WeeklyEditorial,
  carousel: WeeklyCarouselPlan
): WeeklyActivationValidation {
  const checks: WeeklyActivationCheck[] = [];
  let expectedRange: { startDate: string; endDate: string } | null = null;
  try { expectedRange = weeklyRangeForDate(editorial.startDate); }
  catch { expectedRange = null; }

  checks.push(check("versions", editorial.version === "0.1.0" && carousel.version === "0.1.0", "versions_0_1"));
  checks.push(check(
    "monday_to_sunday",
    expectedRange !== null && editorial.endDate === expectedRange.endDate && carousel.startDate === editorial.startDate && carousel.endDate === editorial.endDate,
    expectedRange ? `${editorial.startDate}:${editorial.endDate}` : "invalid_week_range"
  ));
  checks.push(check("adaptive_slide_count", carousel.slides.length === editorial.events.length + 1, `${carousel.slides.length}_slides_for_${editorial.events.length}_events`));
  checks.push(check("overview_first", carousel.slides[0]?.kind === "OVERVIEW" && carousel.slides[0]?.eventId === null, "overview_first"));
  checks.push(check(
    "event_mapping",
    sameIds(carousel.slides.slice(1).map((slide) => slide.eventId), editorial.events.map((event) => event.id)),
    "one_event_slide_per_selected_event"
  ));
  checks.push(check("calm_contract", editorial.status !== "CALM" || editorial.events.length === 0, "calm_week_has_no_event_slides"));
  checks.push(check("carousel_dimensions", carousel.width === 1080 && carousel.height === 1350, "1080x1350"));
  checks.push(check("story_dimensions", carousel.story.width === 1080 && carousel.story.height === 1920, "1080x1920"));
  checks.push(check("story_relay", carousel.story.relay.kind === "RELAY" && carousel.story.relay.cta.length > 0, "relay_only_story"));
  checks.push(check(
    "scene_assets",
    [editorial.overview.scene, ...carousel.slides.map((slide) => slide.scene)].every((scene) => scene.masterUrl.startsWith("/masters24/")),
    "v24_master_assets"
  ));

  const ok = checks.every((item) => item.ok);
  return { status: ok ? "READY" : "BLOCKED", ok, checks };
}
