import { CITIES } from "../src/config/cities";
import { renderWeeklyCarousel } from "../src/engine/weekly";
import { applyWeeklyManualSelection, generateWeeklyCalmVisualPreview, generateWeeklyContextualVisualPreview, weeklyPreviewRenderOptions } from "../src/weeklyPipeline";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_PRODUCTION_READINESS_FAIL:${label}`);
  passed++;
}

const instant = new Date("2026-09-17T12:00:00Z");
const contextual = generateWeeklyContextualVisualPreview(CITIES.tarnos!, instant, "2026-09-21");
const calm = generateWeeklyCalmVisualPreview(CITIES.tarnos!, instant, "2026-09-21");

const approvedOptions = weeklyPreviewRenderOptions(contextual);
ok(approvedOptions.complementarySlides?.slides.length === 2, "approved_preview_exposes_only_preflighted_complementary_slides");
ok(contextual.editorial.weeklyNumber === undefined, "raw_weekly_number_is_removed_from_the_production_editorial");

const failedPreflight = {
  ...contextual,
  contextual: {
    ...contextual.contextual,
    preflight: { ...contextual.contextual.preflight, ok: false }
  }
};
const fallbackOptions = weeklyPreviewRenderOptions(failedPreflight);
ok(fallbackOptions.complementarySlides === undefined, "failed_preflight_resolves_to_slide1_render_options");
const fallbackHtml = renderWeeklyCarousel(failedPreflight.editorial, fallbackOptions);
ok((fallbackHtml.match(/class="slide-card"/g) ?? []).length === 1, "failed_preflight_renders_exactly_one_slide");
ok(fallbackHtml.includes("La semaine à Tarnos") && fallbackHtml.includes("1 slide"), "fallback_keeps_slide1_and_removes_contextual_slides");

const calmOptions = weeklyPreviewRenderOptions(calm);
const calmHtml = renderWeeklyCarousel(calm.editorial, calmOptions);
ok(calmOptions.complementarySlides === undefined && (calmHtml.match(/class="slide-card"/g) ?? []).length === 1, "no_signal_week_renders_slide1_only");
ok(calm.editorial.slide1.title === contextual.editorial.slide1.title, "fallback_does_not_change_the_locked_slide1_title");

const firstSignalId = contextual.contextual.ranking.selected[0]?.candidate.signal.id;
if (!firstSignalId) throw new Error("WEEKLY_PRODUCTION_READINESS_FAIL:no_eligible_signal_for_manual_selection");
const manuallySelected = applyWeeklyManualSelection(contextual, [firstSignalId]);
ok(manuallySelected.carousel.slides.length === 2, "manual_selection_keeps_slide1_and_one_selected_slide");
ok(manuallySelected.carousel.slides[0]?.kind === "OVERVIEW", "manual_selection_keeps_overview_first");
ok(manuallySelected.contextual.slides.slides[0]?.signalId === firstSignalId, "manual_selection_uses_requested_signal");
let rejectedUnknown = false;
try { applyWeeklyManualSelection(contextual, ["unknown-signal-id"]); } catch { rejectedUnknown = true; }
ok(rejectedUnknown, "manual_selection_rejects_unknown_signal");

console.log(`WEEKLY_PRODUCTION_READINESS ${passed}/11 PASS`);
