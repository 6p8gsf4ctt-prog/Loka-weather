import type { WeeklyComplementarySlide, WeeklyComplementarySlidePlan } from "./complementarySlides";

export const WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION = "1.0.0" as const;

export interface WeeklyComplementaryPreflightCheck {
  id: "count" | "positions" | "frame" | "titles" | "themes" | "copy" | "claim" | "source";
  ok: boolean;
  detail: string;
}

export interface WeeklyComplementaryPreflight {
  version: typeof WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION;
  ok: boolean;
  checks: WeeklyComplementaryPreflightCheck[];
}

const TITLES = {
  NUMBER: "LE CHIFFRE DE LA SEMAINE",
  PRACTICAL: "À SAVOIR CETTE SEMAINE",
  DETAIL: "LE DÉTAIL À REMARQUER"
} as const;

function compact(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function check(id: WeeklyComplementaryPreflightCheck["id"], ok: boolean, detail: string): WeeklyComplementaryPreflightCheck {
  return { id, ok, detail };
}

function copyFits(slide: WeeklyComplementarySlide): boolean {
  // The canvas renderer shrinks only inside these deliberately bounded limits;
  // longer editorial content is a preflight failure, never a silent crop.
  return compact(slide.displayValue).length > 0 && compact(slide.displayValue).length <= 32
    && compact(slide.primaryLine).length > 0 && compact(slide.primaryLine).length <= 80
    && compact(slide.secondaryLine).length > 0 && compact(slide.secondaryLine).length <= 120;
}

function claimIsCoherent(slide: WeeklyComplementarySlide): boolean {
  const copy = `${slide.primaryLine} ${slide.secondaryLine}`.toLocaleLowerCase("fr-FR");
  if (slide.claimStatus === "OBSERVED") return !/(prévu|pourrait|devrait|si les)/.test(copy);
  if (slide.claimStatus === "IF_CONFIRMED") return /si les|se confirment|pourrait/.test(copy);
  if (slide.claimStatus === "POSSIBLE") return /pourrai|possible/.test(copy);
  return /devrait|attendu|prévu/.test(copy);
}

/**
 * N8 publication gate. It validates the content that can be proven before a
 * canvas exists; the renderer then has its own no-crop fitting guard.
 */
export function preflightWeeklyComplementarySlides(plan: WeeklyComplementarySlidePlan): WeeklyComplementaryPreflight {
  const slides = plan.slides;
  const positions = slides.map((slide) => slide.position);
  const expected = slides.map((_, index) => (index + 2) as 2 | 3 | 4);
  const checks: WeeklyComplementaryPreflightCheck[] = [
    check("count", slides.length <= 3, "at_most_three_contextual_slides"),
    check("positions", positions.every((position, index) => position === expected[index]), "positions_are_contiguous_after_overview"),
    check("frame", slides.every((slide) => slide.frame === "WEEKLY_SHARED_V1"), "daily_weekly_shared_frame_required"),
    check("titles", slides.every((slide) => slide.title === TITLES[slide.role]), "fixed_title_per_role"),
    check("themes", new Set(slides.map((slide) => slide.theme)).size === slides.length && new Set(slides.map((slide) => slide.signalId)).size === slides.length, "one_theme_and_signal_once"),
    check("copy", slides.every(copyFits), "bounded_nonempty_display_and_editorial_copy"),
    check("claim", slides.every(claimIsCoherent), "forecast_observation_wording_is_coherent"),
    check("source", slides.every((slide) => compact(slide.sourceNote).length >= 20), "traceable_source_note_required")
  ];
  return { version: WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION, ok: checks.every((item) => item.ok), checks };
}

export function assertWeeklyComplementaryPreflight(plan: WeeklyComplementarySlidePlan): WeeklyComplementaryPreflight {
  const result = preflightWeeklyComplementarySlides(plan);
  if (!result.ok) throw new Error(`weekly_complementary_preflight_failed:${result.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  return result;
}
