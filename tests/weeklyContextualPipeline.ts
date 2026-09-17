import { CITIES } from "../src/config/cities";
import { generateWeeklyContextualVisualPreview } from "../src/weeklyPipeline";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_CONTEXTUAL_PIPELINE_FAIL:${label}`);
  passed++;
}

const generated = generateWeeklyContextualVisualPreview(CITIES.tarnos!, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
ok(generated.contextual.version === "1.0.0" && generated.contextual.climateStatus === "UNAVAILABLE", "real_pipeline_reports_missing_archive_without_inventing_history");
ok(generated.contextual.candidates.length >= 2 && generated.contextual.ranking.selected.length >= 2, "controlled_forecast_reaches_detection_and_ranking");
ok(generated.contextual.slides.slides.map((slide) => `${slide.position}:${slide.role}`).join(",") === "2:NUMBER,3:PRACTICAL", "selected_signals_reach_adaptive_slide_assignment");
ok(generated.carousel.slides.map((slide) => slide.kind).join(",") === "OVERVIEW,COMPLEMENTARY_NUMBER,COMPLEMENTARY_PRACTICAL", "pipeline_passes_contextual_plan_to_shared_renderer");
ok(generated.carousel.slides.slice(1).every((slide) => slide.backgroundUrl === "/masters24/weekly/SEMAINE_HOMOGENE.jpeg" && slide.complementary?.frame === "WEEKLY_SHARED_V1"), "all_contextual_slides_keep_the_validated_shared_frame");
ok(generated.activation.ok, "integrated_preview_still_passes_weekly_activation");

console.log(`WEEKLY_CONTEXTUAL_PIPELINE ${passed}/6 PASS`);
