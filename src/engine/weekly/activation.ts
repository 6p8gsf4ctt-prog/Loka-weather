import { weeklyRangeForDate } from "./schedule";
import type { WeeklyEditorial } from "./editorial";
import { WEEKLY_CAROUSEL_MAX_EVENT_SLIDES, WEEKLY_OVERVIEW_MASTER_URL } from "./carousel";
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

function isValidDailyV24Scene(scene: WeeklyEditorial["overview"]["scene"]): boolean {
  return scene.source === "DAILY_V24_DECISION"
    && scene.validity === "VALID"
    && /^\d{4}-\d{2}-\d{2}$/.test(scene.date)
    && scene.dayIndex >= 0
    && scene.dayIndex <= 6
    && scene.decisionVersion.startsWith("2.0")
    && scene.doctrineVersion.startsWith("2.0");
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
  checks.push(check("publication_limit", editorial.events.length <= WEEKLY_CAROUSEL_MAX_EVENT_SLIDES, `${editorial.events.length}_event_slides_max_${WEEKLY_CAROUSEL_MAX_EVENT_SLIDES}`));
  checks.push(check("overview_first", carousel.slides[0]?.kind === "OVERVIEW" && carousel.slides[0]?.eventId === null, "overview_first"));
  checks.push(check(
    "event_mapping",
    sameIds(carousel.slides.slice(1).map((slide) => slide.eventId), editorial.events.map((event) => event.id)),
    "one_event_slide_per_selected_event"
  ));
  checks.push(check("calm_contract", editorial.status !== "CALM" || editorial.events.length === 0, "calm_week_has_no_event_slides"));
  checks.push(check("carousel_dimensions", carousel.width === 1080 && carousel.height === 1350, "1080x1350"));
  checks.push(check("story_dimensions", carousel.story.width === 1080 && carousel.story.height === 1920, "1080x1920"));
  checks.push(check("story_relay", carousel.story.relay.kind === "RELAY" && carousel.story.relay.source === "CAROUSEL" && carousel.story.relay.cta.length > 0, "relay_only_story"));
  checks.push(check(
    "weekly_daily_summaries",
    editorial.dailySummaries.length === 7
      && carousel.dailySummaries.length === 7
      && editorial.dailySummaries.every((day, index) => day.dayIndex === index && Number.isFinite(day.minTemperatureC) && Number.isFinite(day.maxTemperatureC) && isValidDailyV24Scene(day.scene))
      && carousel.dailySummaries.every((day, index) => day.dayIndex === index && day.date === editorial.dailySummaries[index]?.date && day.scene.id === editorial.dailySummaries[index]?.scene.id),
    "seven_ordered_daily_v24_summaries"
  ));
  checks.push(check(
    "scene_assets",
    [editorial.overview.scene, ...carousel.slides.map((slide) => slide.scene)].every((scene) => scene.masterUrl.startsWith("/masters24/")),
    "v24_master_assets"
  ));
  checks.push(check(
    "weekly_background_assets",
    [...carousel.slides.map((slide) => slide.backgroundUrl), carousel.story.relay.backgroundUrl]
      .every((url) => url.startsWith("/masters24/")),
    "weekly_master_assets"
  ));
  checks.push(check(
    "overview_background",
    carousel.slides[0]?.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL
      && carousel.story.relay.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL,
    "dedicated_weekly_overview_master"
  ));
  checks.push(check(
    "event_background_alignment",
    carousel.slides.slice(1).every((slide) => slide.backgroundUrl === slide.scene.masterUrl),
    "event_backgrounds_keep_daily_v24_master"
  ));
  checks.push(check(
    "daily_v24_scene_provenance",
    [editorial.overview.scene, ...editorial.events.map((event) => event.scene), ...carousel.slides.map((slide) => slide.scene), carousel.story.relay.scene].every(isValidDailyV24Scene),
    "scenes_must_reference_valid_daily_v24_decisions"
  ));
  checks.push(check(
    "event_scene_alignment",
    editorial.events.every((event) => event.scene.date >= event.startDate && event.scene.date <= event.endDate),
    "event_scene_date_is_inside_event_range"
  ));

  const ok = checks.every((item) => item.ok);
  return { status: ok ? "READY" : "BLOCKED", ok, checks };
}
