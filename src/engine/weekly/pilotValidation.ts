import { validateWeeklyEditorialSignal } from "./editorialSignals";
import type { WeeklyCarouselPlan } from "./carousel";
import type { WeeklyContextualPipelineResult } from "./contextualPipeline";
import type { WeeklyProfileSet } from "./profiles";
import type { WeeklyActivationValidation } from "./activation";

export const WEEKLY_EDITORIAL_PILOT_VERSION = "1.0.0" as const;

export type WeeklyEditorialPilotSource = "CONTROLLED" | "LIVE";
export type WeeklyEditorialPilotStatus = "PASS" | "REVIEW" | "BLOCKED";

export interface WeeklyEditorialPilotCheck {
  id: "profiles" | "preflight" | "signals" | "renderer" | "activation" | "reference_coverage";
  ok: boolean;
  detail: string;
}

export interface WeeklyEditorialPilotReport {
  version: typeof WEEKLY_EDITORIAL_PILOT_VERSION;
  source: WeeklyEditorialPilotSource;
  label: string;
  startDate: string;
  endDate: string;
  status: WeeklyEditorialPilotStatus;
  summary: string;
  climateStatus: WeeklyContextualPipelineResult["climateStatus"];
  selectedSignalIds: string[];
  renderedPositions: number[];
  checks: WeeklyEditorialPilotCheck[];
}

export interface WeeklyEditorialPilotInput {
  source: WeeklyEditorialPilotSource;
  label: string;
  profiles: WeeklyProfileSet;
  contextual: WeeklyContextualPipelineResult;
  carousel: WeeklyCarouselPlan;
  activation: WeeklyActivationValidation;
}

export interface WeeklyEditorialPilotBatch {
  version: typeof WEEKLY_EDITORIAL_PILOT_VERSION;
  status: WeeklyEditorialPilotStatus;
  requiredLiveWeeks: number;
  reports: WeeklyEditorialPilotReport[];
  checks: Array<{ id: "controlled" | "live_count" | "live_blocks" | "live_reference_coverage" | "unique_live_weeks"; ok: boolean; detail: string }>;
}

function addDays(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function check(id: WeeklyEditorialPilotCheck["id"], ok: boolean, detail: string): WeeklyEditorialPilotCheck {
  return { id, ok, detail };
}

/**
 * Produces a reviewable pilot verdict from the exact data used before render.
 * It does not alter a slide, choose a signal or make a publication decision.
 */
export function validateWeeklyEditorialPilot(input: WeeklyEditorialPilotInput): WeeklyEditorialPilotReport {
  const { profiles, contextual, carousel, activation } = input;
  const expectedDates = Array.from({ length: 7 }, (_, index) => addDays(profiles.startDate, index));
  const signalIds = contextual.slides.slides.map((slide) => slide.signalId);
  const selectedById = new Map(contextual.ranking.selected.map((item) => [item.candidate.signal.id, item]));
  const carouselSlides = carousel.slides.slice(1).filter((slide) => slide.complementary);
  const checks: WeeklyEditorialPilotCheck[] = [
    check(
      "profiles",
      profiles.forecastDays === 7
        && profiles.days.length === 7
        && profiles.endDate === expectedDates[6]
        && profiles.days.every((day, index) => day.dayIndex === index && day.date === expectedDates[index]),
      "seven_contiguous_daily_profiles"
    ),
    check(
      "preflight",
      contextual.preflight.ok
        && contextual.preflight.comprehensive
        && contextual.preflight.planFingerprint === carousel.complementaryPreflight?.planFingerprint,
      "complete_preflight_matches_renderer_plan"
    ),
    check(
      "signals",
      contextual.slides.slides.every((slide) => {
        const ranked = selectedById.get(slide.signalId);
        return ranked !== undefined
          && ranked.eligible
          && ranked.rank !== null
          && ranked.rejectionReasons.length === 0
          && ranked.candidate.detector === slide.detector
          && validateWeeklyEditorialSignal(ranked.candidate.signal).ok;
      }),
      "every_rendered_slide_has_a_selected_proven_signal"
    ),
    check(
      "renderer",
      carouselSlides.length === contextual.slides.slides.length
        && carouselSlides.every((slide, index) => slide.complementary?.position === index + 2 && slide.complementary?.frame === "WEEKLY_SHARED_V1")
        && carousel.slides.slice(1).every((slide) => slide.kind !== "WEEKLY_NUMBER"),
      "only_preflight_approved_editorial_slides_reach_the_shared_frame"
    ),
    check("activation", activation.ok, "weekly_activation_accepts_the_same_carousel"),
    check(
      "reference_coverage",
      input.source === "CONTROLLED" || contextual.climateStatus === "READY",
      input.source === "CONTROLLED"
        ? "controlled_scenario_no_live_climate_coverage_required"
        : contextual.climateStatus === "READY"
          ? "local_climate_reference_loaded"
          : "live_pilot_requires_local_climate_reference_for_full_editorial_coverage"
    )
  ];
  const blocked = checks.some((item) => !item.ok && item.id !== "reference_coverage");
  const review = !blocked && checks.some((item) => !item.ok);
  const status: WeeklyEditorialPilotStatus = blocked ? "BLOCKED" : review ? "REVIEW" : "PASS";
  const summary = status === "PASS"
    ? "Pilote valide : données, prévol et renderer sont cohérents."
    : status === "REVIEW"
      ? "Pilote techniquement valide, mais la couverture climatique locale manque encore pour valider les comparaisons contextuelles."
      : "Pilote bloqué : au moins un contrôle pré-rendu ou d’activation a échoué.";
  return {
    version: WEEKLY_EDITORIAL_PILOT_VERSION,
    source: input.source,
    label: input.label,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    status,
    summary,
    climateStatus: contextual.climateStatus,
    selectedSignalIds: signalIds,
    renderedPositions: carouselSlides.map((slide) => slide.complementary?.position ?? 0),
    checks
  };
}

/**
 * Phase-3 exit gate. Four distinct live weeks is the default minimum; a real
 * batch stays in REVIEW when archived climate coverage is unavailable.
 */
export function summarizeWeeklyEditorialPilot(
  reports: WeeklyEditorialPilotReport[],
  requiredLiveWeeks = 4
): WeeklyEditorialPilotBatch {
  const controlled = reports.filter((report) => report.source === "CONTROLLED");
  const live = reports.filter((report) => report.source === "LIVE");
  const uniqueLiveWeeks = new Set(live.map((report) => `${report.startDate}:${report.endDate}`));
  const checks = [
    { id: "controlled" as const, ok: controlled.length >= 2 && controlled.every((report) => report.status === "PASS"), detail: "at_least_two_controlled_scenarios_pass" },
    { id: "live_count" as const, ok: live.length >= requiredLiveWeeks, detail: `${live.length}_of_${requiredLiveWeeks}_live_weeks_collected` },
    { id: "live_blocks" as const, ok: live.every((report) => report.status !== "BLOCKED"), detail: "no_live_pilot_is_blocked" },
    { id: "live_reference_coverage" as const, ok: live.every((report) => report.checks.find((check) => check.id === "reference_coverage")?.ok), detail: "every_live_week_has_local_climate_coverage" },
    { id: "unique_live_weeks" as const, ok: uniqueLiveWeeks.size === live.length, detail: "each_live_pilot_covers_a_distinct_week" }
  ];
  const blocked = checks.some((item) => !item.ok && item.id === "live_blocks");
  const status: WeeklyEditorialPilotStatus = blocked ? "BLOCKED" : checks.every((item) => item.ok) ? "PASS" : "REVIEW";
  return { version: WEEKLY_EDITORIAL_PILOT_VERSION, status, requiredLiveWeeks, reports: [...reports], checks };
}
