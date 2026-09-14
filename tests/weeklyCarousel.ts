import { buildWeeklyCarouselPlan, renderWeeklyCarousel, WEEKLY_OVERVIEW_MASTER_URL } from "../src/engine/weekly";
import type { WeeklyEditorial, WeeklySceneReference } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_CAROUSEL_FAIL:${label}`);
  passed++;
}

const scene: WeeklySceneReference = {
  source: "DAILY_V24_DECISION",
  date: "2026-09-09",
  dayIndex: 2,
  id: 3,
  key: "ECLAIRCIES",
  title: "ÉCLAIRCIES",
  displayTitle: "BELLES ÉCLAIRCIES",
  family: "MIXED_SKY",
  masterUrl: "/masters24/03_ECLAIRCIES.png",
  visualIcon: "partly",
  emoji: "⛅",
  decisionVersion: "2.0.3",
  doctrineVersion: "2.0.3",
  validity: "VALID",
  confidence: "HIGH",
  resolutionMode: "DIRECT"
};

function dateAt(dayIndex: number): string {
  const date = new Date("2026-09-07T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

function dailySummaries(): WeeklyEditorial["dailySummaries"] {
  return Array.from({ length: 7 }, (_, dayIndex) => ({
    date: dateAt(dayIndex),
    dayIndex,
    minTemperatureC: 13 + dayIndex,
    maxTemperatureC: 21 + dayIndex,
    scene: { ...scene, date: dateAt(dayIndex), dayIndex }
  }));
}

function slide1Content(days: WeeklyEditorial["dailySummaries"]): WeeklyEditorial["slide1"] {
  const coldestMorning = { date: dateAt(0), dayIndex: 0, temperatureC: 13, sourceHour: 7 };
  const hottestDay = { date: dateAt(6), dayIndex: 6, temperatureC: 27, sourceHour: 15 };
  return {
    title: "LA SEMAINE À TARNOS",
    synthesis: { text: "La semaine commence sous le soleil. Le temps reste ensuite lumineux jusqu’au week-end.", maximumLines: 3 },
    coldestMorning: { ...coldestMorning, label: "MATIN LE PLUS FRAIS", dateLabel: "LUN. 7", temperatureLabel: "13°C", timeLabel: "07 H" },
    hottestDay: { ...hottestDay, label: "JOURNÉE LA PLUS CHAUDE", dateLabel: "DIM. 13", temperatureLabel: "27°C", timeLabel: "15 H" },
    daylight: {
      label: "LUMIÈRE DE LA SEMAINE", direction: "SHORTER", deltaMinutes: -18, deltaLabel: "18 min de jour en moins",
      start: { date: dateAt(0), weekdayLabel: "LUN.", sunriseMinutes: 440, sunsetMinutes: 1220, durationMinutes: 780, sunriseLabel: "07:20", sunsetLabel: "20:20" },
      end: { date: dateAt(6), weekdayLabel: "DIM.", sunriseMinutes: 449, sunsetMinutes: 1211, durationMinutes: 762, sunriseLabel: "07:29", sunsetLabel: "20:11" }
    },
    dailyStrip: days,
    facts: {
      version: "1.0.0", citySlug: "tarnos", startDate: dateAt(0), endDate: dateAt(6), coldestMorning, hottestDay,
      daylight: {
        start: { date: dateAt(0), sunriseMinutes: 440, sunsetMinutes: 1220, durationMinutes: 780 },
        end: { date: dateAt(6), sunriseMinutes: 449, sunsetMinutes: 1211, durationMinutes: 762 },
        deltaMinutes: -18
      }
    }
  };
}

function dailyCardDetails(
  preferred: WeeklyEditorial["events"][number] | null,
  watch: WeeklyEditorial["events"][number] | null
): WeeklyEditorial["dailyCardDetails"] {
  const card = (
    kind: "PREFERRED" | "WATCH",
    dayIndex: number,
    sourceEvent: WeeklyEditorial["events"][number],
    condition: "soleil" | "pluie"
  ) => ({
    kind,
    date: dateAt(dayIndex),
    dayIndex,
    sourceEventId: sourceEvent.id,
    sourceEventType: sourceEvent.type,
    weatherLabel: scene.displayTitle,
    minTemperatureC: 13 + dayIndex,
    maxTemperatureC: 21 + dayIndex,
    scene: { ...scene, date: dateAt(dayIndex), dayIndex },
    slots: ([8, 12, 16, 20] as const).map((hour) => ({
      hour,
      sourceHour: hour,
      temperatureC: 16 + dayIndex,
      condition
    }))
  });
  return [
    ...(preferred ? [card("PREFERRED", 5, preferred, "soleil")] : []),
    ...(watch ? [card("WATCH", 2, watch, "pluie")] : [])
  ];
}

function editorial(events: WeeklyEditorial["events"]): WeeklyEditorial {
  const preferred = events.find((event) => event.type === "BEST_WINDOW") ?? null;
  const watch = events.find((event) => event.type === "WIND") ?? null;
  return {
    version: "0.1.0",
    citySlug: "tarnos",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: events.length ? "EVENTS" : "CALM",
    overview: {
      title: events.length ? "La semaine à Tarnos" : "Une semaine calme à Tarnos",
      body: events.length ? `${events.length} temps forts météo méritent d’être suivis cette semaine.` : "Aucun changement météo suffisamment marqué n’est retenu pour cette semaine à Tarnos.",
      scene
    },
    slide1: slide1Content(dailySummaries()),
    dailySummaries: dailySummaries(),
    dailyHighlights: [
      ...(preferred ? [{ kind: "PREFERRED" as const, dayIndex: 5, date: "2026-09-12", sourceEventId: preferred.id, sourceEventType: preferred.type }] : []),
      ...(watch ? [{ kind: "WATCH" as const, dayIndex: 2, date: "2026-09-09", sourceEventId: watch.id, sourceEventType: watch.type }] : [])
    ],
    dailyCardDetails: dailyCardDetails(preferred, watch),
    events,
    signature: "Ici, cette semaine."
  };
}

const events: WeeklyEditorial["events"] = [
  {
    id: "wind:2026-09-09",
    type: "WIND",
    startDate: "2026-09-09",
    endDate: "2026-09-10",
    title: "Vent fort",
    body: "Les rafales pourront atteindre 70 km/h du mercredi 9 septembre au jeudi 10 septembre.",
    activities: [
      { activity: "BEACH", status: "UNFAVORABLE", text: "Plage : conditions peu favorables en raison de vent.", bestWindow: null },
      { activity: "OUTDOOR_WALK", status: "MIXED", text: "Promenade : conditions variables.", bestWindow: null },
      { activity: "OUTDOOR_SPORT", status: "MIXED", text: "Sport extérieur : conditions variables.", bestWindow: null }
    ],
    scene
  },
  {
    id: "best_window:2026-09-12",
    type: "BEST_WINDOW",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    title: "Meilleure fenêtre météo",
    body: "Le créneau le plus favorable se situe samedi 12 septembre, entre 10 h et 16 h.",
    activities: [
      { activity: "BEACH", status: "FAVORABLE", text: "Plage : créneau favorable entre 10 h et 16 h.", bestWindow: { startHour: 10, endHour: 16, hours: 7 } },
      { activity: "OUTDOOR_WALK", status: "FAVORABLE", text: "Promenade : créneau favorable entre 10 h et 16 h.", bestWindow: { startHour: 10, endHour: 16, hours: 7 } },
      { activity: "OUTDOOR_SPORT", status: "FAVORABLE", text: "Sport extérieur : créneau favorable entre 10 h et 16 h.", bestWindow: { startHour: 10, endHour: 16, hours: 7 } }
    ],
    scene
  }
];

const plan = buildWeeklyCarouselPlan(editorial(events));
ok(plan.slides.length === 3, "two_events_make_three_slides");
ok(plan.slides[0].kind === "OVERVIEW" && plan.slides[0].eventId === null, "overview_is_first");
ok(plan.headerDateLabel === "LUNDI 7 AU DIMANCHE 13 SEPTEMBRE", "weekly_header_date_keeps_full_range_for_existing_surfaces");
ok(plan.headerDateCompact.line1 === "7 — 13" && plan.headerDateCompact.line2 === "SEPTEMBRE", "slide1_header_uses_the_compact_two_line_date_option");
ok(plan.overviewTitle.title === "LA SEMAINE À TARNOS", "overview_title_uses_city_name");
ok(Object.keys(plan.overviewTitle).join(",") === "title", "overview_title_keeps_only_the_week_name");
ok(plan.slide1.coldestMorning.label === "MATIN LE PLUS FRAIS" && plan.slide1.hottestDay.label === "JOURNÉE LA PLUS CHAUDE" && plan.slide1.dailyStrip.length === 7, "carousel_plan_exposes_first_slide_content_contract");
ok(plan.dailySummaries.length === 7 && plan.dailySummaries.every((day, index) => day.dayIndex === index), "carousel_plan_keeps_seven_daily_summaries");
ok(plan.dailySummaries.every((day, index) => day.scene.id === editorial(events).dailySummaries[index]?.scene.id), "carousel_plan_keeps_daily_v24_scene_identity");
ok(plan.dailySummaries.every((day) => day.pictogram.source === "LOKA_OFFICIAL_PICTOGRAM_LIBRARY" && day.pictogram.libraryVersion === "LOKA_PREMIUM_1.2"), "daily_summaries_use_official_loka_pictogram_library");
ok(plan.dailySummaries.every((day) => day.scene.visualIcon === "partly" && day.pictogram.kind === "partly"), "daily_v24_visual_icon_drives_pictogram_kind");
ok(plan.dailySummaries.map((day) => `${day.weekdayLabel} ${day.dayLabel}`).join(",") === "LUN 7,MAR 8,MER 9,JEU 10,VEN 11,SAM 12,DIM 13", "daily_strip_labels_are_monday_to_sunday_in_french");
ok(plan.dailyHighlights.map((highlight) => `${highlight.kind}:${highlight.dayIndex}`).join(",") === "PREFERRED:5,WATCH:2", "carousel_plan_keeps_editorial_daily_highlights");
ok(plan.dailySummaries.map((day) => day.highlight ?? "NONE").join(",") === "NONE,NONE,WATCH,NONE,NONE,PREFERRED,NONE", "carousel_plan_binds_highlights_to_their_days_only");
ok(plan.dailyCardDetails.map((card) => `${card.kind}:${card.dayIndex}:${card.weatherLabel}`).join(",") === "PREFERRED:5:BELLES ÉCLAIRCIES,WATCH:2:BELLES ÉCLAIRCIES", "carousel_plan_prepares_preferred_and_watch_cards");
ok(plan.dailyCardDetails.every((card) => card.pictogram.kind === "partly" && card.slots.map((slot) => slot.hour).join(",") === "8,12,16,20"), "central_cards_bind_v24_and_hourly_pictograms");
ok(plan.dailyCardDetails.map((card) => `${card.weekdayLabel}. ${card.dayLabel}`).join(",") === "SAM. 12,MER. 9", "central_cards_receive_precomputed_french_date_labels");
ok(buildWeeklyCarouselPlan(editorial([events[1]])).overviewTitle.title === "LA SEMAINE À TARNOS", "single_preferred_card_keeps_the_week_name");
ok(buildWeeklyCarouselPlan(editorial([events[0]])).overviewTitle.title === "LA SEMAINE À TARNOS", "single_watch_card_keeps_the_week_name");
ok(plan.slides[0].backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL, "overview_uses_dedicated_weekly_master");
ok(plan.slides.slice(1).every((slide) => slide.kind === "EVENT"), "event_slides_follow_overview");
ok(plan.slides.slice(1).map((slide) => slide.eventId).join(",") === "wind:2026-09-09,best_window:2026-09-12", "one_slide_per_event");
ok(plan.slides.slice(1).every((slide) => slide.backgroundUrl === slide.scene.masterUrl), "event_slides_keep_daily_v24_backgrounds");
ok(plan.width === 1080 && plan.height === 1350, "carousel_dimensions");
ok(plan.story.width === 1080 && plan.story.height === 1920, "story_dimensions");
ok(plan.story.relay.kind === "RELAY" && plan.story.relay.source === "CAROUSEL", "story_is_relay");
ok(plan.story.relay.body.includes("carrousel") && !plan.story.relay.body.includes("jour"), "story_does_not_become_daily_bulletin");
ok(plan.slides.every((slide) => slide.scene.masterUrl.startsWith("/masters24/")), "slides_reuse_v24_masters");
ok(plan.slides.every((slide) => slide.scene.source === "DAILY_V24_DECISION" && slide.scene.validity === "VALID"), "slides_keep_daily_v24_provenance");
ok(plan.slides[1].eventId === "wind:2026-09-09", "event_identity_is_available_for_export");
ok(plan.slides[1].activities.length === 3, "activities_are_attached_to_event_slide");

const calmPlan = buildWeeklyCarouselPlan(editorial([]));
ok(calmPlan.slides.length === 1, "calm_week_has_one_slide");
ok(calmPlan.slides[0].kind === "OVERVIEW" && calmPlan.slides[0].title === "Une semaine calme à Tarnos", "calm_week_uses_short_overview");
ok(calmPlan.overviewTitle.title === "LA SEMAINE À TARNOS", "calm_week_keeps_the_permanent_week_name");
ok(calmPlan.story.relay.source === "CAROUSEL" && calmPlan.story.relay.body.includes("publication"), "calm_story_relays_publication");
ok(calmPlan.story.relay.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL, "story_relay_uses_weekly_overview_master");

const crossMonthPlan = buildWeeklyCarouselPlan({
  ...editorial([]),
  startDate: "2026-09-28",
  endDate: "2026-10-04"
});
ok(crossMonthPlan.headerDateLabel === "LUNDI 28 SEPTEMBRE AU DIMANCHE 4 OCTOBRE", "weekly_header_date_keeps_both_months_when_needed");
ok(crossMonthPlan.headerDateCompact.line1 === "28 SEPT. —" && crossMonthPlan.headerDateCompact.line2 === "4 OCTOBRE", "slide1_header_keeps_a_compact_cross_month_date");

const html = renderWeeklyCarousel(editorial(events));
ok(html.includes("carousel-canvas") && html.includes("story-relay"), "renderer_contains_carousel_and_story");
ok(html.includes("data-slide-index=\"2\""), "renderer_keeps_adaptive_slide_count");
ok(html.includes("data-event-id=\"wind:2026-09-09\""), "renderer_keeps_event_identity");
ok(html.includes("RELAIS DE LA PUBLICATION"), "renderer_labels_story_as_relay");
ok(html.includes("strokeText(label"), "renderer_uses_daily_full_text_draw");
ok(html.includes("Helvetica Neue"), "renderer_reuses_daily_font_stack");
ok(html.includes("function trackedText(value,x,y,size,weight,color,tracking"), "renderer_reuses_daily_tracked_city_wordmark");
ok(html.includes("plan.headerDateLabel"), "renderer_uses_week_range_in_existing_headers");
ok(html.includes("replace(/\\s+/g"), "renderer_normalizes_canvas_whitespace");
ok(html.includes("data:image/png;base64,"), "renderer_embeds_shared_loka_logo");
ok(html.includes("pictogramUrl") && html.includes("LOKA_PREMIUM_1.2"), "renderer_reuses_brand_pictograms");
ok(html.includes("SCÈNE V24 DU JOUR") && html.includes("Ici, cette semaine."), "renderer_explains_scene_context_and_signature");
ok(html.includes(WEEKLY_OVERVIEW_MASTER_URL), "renderer_embeds_weekly_overview_master");
ok(html.includes('"dailySummaries"') && html.includes('"source":"DAILY_V24_DECISION"'), "renderer_embeds_daily_summaries_with_v24_provenance");
const browserModelLine = html.match(/const model=(.*);\nconst plan=model;/)?.[1] ?? "";
const renderedModel = browserModelLine ? JSON.parse(browserModelLine) as {
  slide1: {
    title: string;
    daylight: { deltaLabel: string };
    dailyStrip: Array<{ pictogram: { kind: string; url: string } }>;
  };
  dailySummaries: Array<{ weekdayLabel: string; dayLabel: string; pictogram: { source: string; libraryVersion: string; kind: string; url: string } }>;
  dailyCardDetails: Array<{
    kind: string;
    weekdayLabel: string;
    dayLabel: string;
    pictogram: { kind: string; url: string };
    slots: Array<{ hour: number; condition: string; pictogram: { kind: string; url: string } }>;
  }>;
} : null;
ok(renderedModel?.dailySummaries.length === 7, "renderer_exposes_seven_daily_pictograms");
ok(renderedModel?.dailySummaries.every((day) => day.pictogram.source === "LOKA_OFFICIAL_PICTOGRAM_LIBRARY" && day.pictogram.libraryVersion === "LOKA_PREMIUM_1.2" && day.pictogram.kind === "partly" && day.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,")) === true, "renderer_uses_generated_official_loka_pictogram_urls");
ok(renderedModel?.dailySummaries.map((day) => `${day.weekdayLabel} ${day.dayLabel}`).join(",") === "LUN 7,MAR 8,MER 9,JEU 10,VEN 11,SAM 12,DIM 13", "renderer_keeps_precomputed_french_day_labels");
ok(renderedModel?.slide1.title === "LA SEMAINE À TARNOS" && renderedModel.slide1.dailyStrip.length === 7 && renderedModel.slide1.dailyStrip.every((day) => day.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,")), "renderer_exposes_first_slide_content_with_official_daily_pictograms");
ok(renderedModel?.dailyCardDetails.map((card) => `${card.kind}:${card.weekdayLabel}.${card.dayLabel}:${card.pictogram.kind}:${card.slots.map((slot) => slot.hour).join("-")}`).join(",") === "PREFERRED:SAM.12:partly:8-12-16-20,WATCH:MER.9:partly:8-12-16-20", "renderer_exposes_prepared_central_card_data");
ok(renderedModel?.dailyCardDetails.every((card) => card.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,") && card.slots.every((slot) => slot.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,"))) === true, "renderer_embeds_official_loka_card_pictograms");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let scriptValid = true;
try { new Function(script); } catch { scriptValid = false; }
ok(scriptValid, "renderer_browser_script_is_valid");

const overviewTitleRenderer = script.split("\n").find((line) => line.startsWith("function drawOverviewTitle(")) ?? "";
const slide1HeaderRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Header(")) ?? "";
const slide1OverviewRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Overview(")) ?? "";
const slide1FactsRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Facts(")) ?? "";
const slide1TemperatureRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1TemperatureFact(")) ?? "";
const slide1DaylightRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DaylightFact(")) ?? "";
const slide1SummaryRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Summary(")) ?? "";
const completeWrapRenderer = script.split("\n").find((line) => line.startsWith("function completeWrap(")) ?? "";
const slide1DayStripRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DayStrip(")) ?? "";
const slide1DayMarkerRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DayMarker(")) ?? "";
const slide1StripBoxRenderer = script.split("\n").find((line) => line.startsWith("function slide1StripBox(")) ?? "";
const publicationSlideRenderer = script.split("\n").find((line) => line.startsWith("function drawPublicationSlide(")) ?? "";
const publicationLaunch = script.split("\n").find((line) => line.startsWith("Promise.all(plan.slides.map")) ?? "";
ok(slide1OverviewRenderer.includes("box(45,185,990,135);drawOverviewTitle(plan.overviewTitle);drawSlide1Facts(plan.slide1") && slide1OverviewRenderer.includes("drawSlide1Summary(plan.slide1);slide1StripBox(45,945,990,250);drawSlide1DayStrip(plan.slide1.dailyStrip"), "slide1_uses_the_v7_title_facts_summary_and_daily_strip_boxes");
ok(!slide1OverviewRenderer.includes("slide.scene.displayTitle") && !slide1OverviewRenderer.includes("dailyCardDetails"), "slide1_does_not_render_the_previous_daily_cards");
ok(slide1OverviewRenderer.includes("drawOverviewTitle(plan.overviewTitle)") && overviewTitleRenderer.includes("content.title") && !overviewTitleRenderer.includes("subtitle") && overviewTitleRenderer.includes("ctx.strokeStyle=slide1EditorialGold"), "slide1_draws_the_single_week_title_with_reference_palette");
ok(slide1OverviewRenderer.includes("drawSlide1Header(logo,plan.headerDateCompact,width)") && slide1HeaderRenderer.includes("date.line1") && slide1HeaderRenderer.includes("date.line2") && slide1HeaderRenderer.includes("width-50,81,17") && slide1HeaderRenderer.includes("width-50,104,17"), "slide1_header_keeps_logo_city_and_the_compact_two_line_date");
ok(slide1OverviewRenderer.includes("drawSignature(1274,'rgba(255,255,255,.94)')"), "slide1_signature_uses_soft_white_on_dark_lower_master");
ok(slide1FactsRenderer.includes("content.coldestMorning") && slide1FactsRenderer.includes("content.hottestDay") && slide1FactsRenderer.includes("content.daylight"), "slide1_draws_the_three_fixed_weekly_facts");
ok(slide1TemperatureRenderer.includes("fact.label") && slide1TemperatureRenderer.includes("fact.dateLabel") && slide1TemperatureRenderer.includes("fact.temperatureLabel") && !slide1TemperatureRenderer.includes("fact.timeLabel"), "slide1_temperature_fact_keeps_only_the_essential_day_and_temperature");
ok(slide1FactsRenderer.includes("thermometerIcon") && slide1FactsRenderer.includes("hotIcon=dailyIcons[content.hottestDay.dayIndex]") && slide1FactsRenderer.includes("cardWidth,148,132") && slide1FactsRenderer.includes("cardWidth,170,145") && slide1TemperatureRenderer.includes("plainText(fact.temperatureLabel"), "slide1_temperature_facts_use_optically_balanced_loka_icons_and_navy_values");
ok(script.includes("function drawSlide1DaylightFact") && script.includes("const sunrise='Lever '") && script.includes("sunset='Coucher '") && script.includes("y+321") && script.includes("y+351"), "slide1_daylight_fact_uses_two_larger_astronomical_lines");
ok(slide1SummaryRenderer.includes("slide1SummaryBox(45,750,990,170)") && slide1SummaryRenderer.includes("completePlainWrap") && slide1SummaryRenderer.includes("600,slide1Ink") && !slide1SummaryRenderer.includes("EN BREF"), "slide1_renders_the_larger_v7_chronological_summary");
ok(completeWrapRenderer.includes("lines.length<=maxLines") && completeWrapRenderer.includes("weekly_slide1_synthesis_does_not_fit"), "slide1_never_cuts_a_summary_mid_sentence");
ok(slide1DayStripRenderer.includes("days.forEach") && slide1DayStripRenderer.includes("drawImageCentered(icon") && slide1DayStripRenderer.includes("plainText(minLabel") && slide1DayStripRenderer.includes("plainText(maxLabel") && !slide1DayStripRenderer.includes("plainText(maxLabel,centerX+7,y+220,24,600,gold"), "slide1_draws_seven_loka_columns_with_uniform_navy_temperatures");
ok(slide1DayStripRenderer.includes("content.coldestMorning.dayIndex") && slide1DayStripRenderer.includes("content.hottestDay.dayIndex") && slide1DayMarkerRenderer.includes("kind==='HOT'") && slide1DayMarkerRenderer.includes("slide1ColdBlue") && slide1DayMarkerRenderer.includes("Math.round(x+8)"), "slide1_marks_only_the_extreme_days_with_identical_pixel_rounded_insets");
ok(slide1StripBoxRenderer.includes("rgba(255,255,255,.80)") && slide1DayStripRenderer.includes("const x=45,y=945,w=990,h=250") && slide1DayMarkerRenderer.includes("ctx.lineWidth=2"), "slide1_daily_strip_matches_the_milky_reference_surface_and_precise_markers");
ok(publicationSlideRenderer.includes("plan.slide1.dailyStrip.map") && publicationSlideRenderer.includes("model.slide1UtilityPictograms.daylight") && publicationSlideRenderer.includes("model.slide1UtilityPictograms.thermometer") && publicationSlideRenderer.includes("drawSlide1Overview"), "slide1_loads_its_official_daily_and_utility_loka_pictograms");
ok(publicationLaunch.includes("drawPublicationSlide(slideCanvases[index],slide)"), "publication_renderer_uses_the_new_slide1_visual_path");

console.log(`WEEKLY_CAROUSEL ${passed}/75 PASS`);
