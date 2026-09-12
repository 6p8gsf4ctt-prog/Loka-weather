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
ok(plan.headerDateLabel === "LUNDI 7 AU DIMANCHE 13 SEPTEMBRE", "weekly_header_date_uses_single_month_label");
ok(plan.overviewTitle.title === "LA SEMAINE À TARNOS", "overview_title_uses_city_name");
ok(plan.overviewTitle.subtitle === "Le jour à privilégier · Le jour à surveiller", "overview_title_uses_weekly_editorial_guide");
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
ok(calmPlan.overviewTitle.subtitle === "Une semaine calme · Les repères essentiels", "calm_week_title_stays_factually_calm");
ok(calmPlan.story.relay.source === "CAROUSEL" && calmPlan.story.relay.body.includes("publication"), "calm_story_relays_publication");
ok(calmPlan.story.relay.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL, "story_relay_uses_weekly_overview_master");

const crossMonthPlan = buildWeeklyCarouselPlan({
  ...editorial([]),
  startDate: "2026-09-28",
  endDate: "2026-10-04"
});
ok(crossMonthPlan.headerDateLabel === "LUNDI 28 SEPTEMBRE AU DIMANCHE 4 OCTOBRE", "weekly_header_date_keeps_both_months_when_needed");

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
ok(renderedModel?.dailyCardDetails.map((card) => `${card.kind}:${card.weekdayLabel}.${card.dayLabel}:${card.pictogram.kind}:${card.slots.map((slot) => slot.hour).join("-")}`).join(",") === "PREFERRED:SAM.12:partly:8-12-16-20,WATCH:MER.9:partly:8-12-16-20", "renderer_exposes_prepared_central_card_data");
ok(renderedModel?.dailyCardDetails.every((card) => card.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,") && card.slots.every((slot) => slot.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,"))) === true, "renderer_embeds_official_loka_card_pictograms");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let scriptValid = true;
try { new Function(script); } catch { scriptValid = false; }
ok(scriptValid, "renderer_browser_script_is_valid");

const overviewRenderer = script.split("\n").find((line) => line.startsWith("function drawOverview(")) ?? "";
const overviewTitleRenderer = script.split("\n").find((line) => line.startsWith("function drawOverviewTitle(")) ?? "";
const weeklyDayStripRenderer = script.split("\n").find((line) => line.startsWith("function drawWeeklyDayStrip(")) ?? "";
const weeklyDayHighlightRenderer = script.split("\n").find((line) => line.startsWith("function drawWeeklyDayHighlight(")) ?? "";
const preferredCardRenderer = script.split("\n").find((line) => line.startsWith("function drawPreferredCard(")) ?? "";
const watchCardRenderer = script.split("\n").find((line) => line.startsWith("function drawWatchCard(")) ?? "";
ok(overviewRenderer.includes("box(50,160,980,150);drawOverviewTitle(plan.overviewTitle);box(50,336,980,700);if(preferredCard)drawPreferredCard") && overviewRenderer.includes("if(watchCard)drawWatchCard") && overviewRenderer.includes("box(50,1060,980,190);drawWeeklyDayStrip(plan.dailySummaries,dailyIcons)"), "overview_keeps_three_daily_layout_boxes");
ok(!overviewRenderer.includes("slide.scene.displayTitle") && !overviewRenderer.includes("plan.slides.slice(1)"), "overview_removes_old_scene_and_event_content");
ok(overviewRenderer.includes("drawOverviewTitle(plan.overviewTitle)") && overviewTitleRenderer.includes("content.title") && overviewTitleRenderer.includes("content.subtitle") && overviewTitleRenderer.includes("ctx.strokeStyle=gold"), "overview_draws_automatic_title_box_content");
ok(overviewRenderer.includes("drawSignature(1304,'rgba(255,255,255,.94)')"), "overview_signature_uses_soft_white_on_dark_lower_master");
ok(weeklyDayStripRenderer.includes("days.forEach") && weeklyDayStripRenderer.includes("drawImageCentered(icon") && weeklyDayStripRenderer.includes("Math.round(day.minTemperatureC)") && weeklyDayStripRenderer.includes("Math.round(day.maxTemperatureC)"), "overview_draws_seven_loka_daily_columns");
ok(weeklyDayStripRenderer.includes("drawWeeklyDayHighlight(day.highlight") && weeklyDayHighlightRenderer.includes("kind==='PREFERRED'") && weeklyDayHighlightRenderer.includes("preferred?gold:ink"), "overview_draws_gold_and_ink_editorial_highlights_only_when_present");
const drawSlideRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide(")) ?? "";
ok(preferredCardRenderer.includes("LE JOUR À PRIVILÉGIER") && preferredCardRenderer.includes("card.weatherLabel") && preferredCardRenderer.includes("card.minTemperatureC") && preferredCardRenderer.includes("card.maxTemperatureC") && preferredCardRenderer.includes("card.slots.forEach"), "overview_draws_preferred_card_with_daily_v24_facts");
ok(preferredCardRenderer.includes("drawImageCentered(mainIcon") && preferredCardRenderer.includes("drawImageCentered(icon,centerX-22") && preferredCardRenderer.includes("centerX+22,y+280") && preferredCardRenderer.includes("card.weekdayLabel+'. '+card.dayLabel"), "overview_centers_preferred_hourly_groups_under_their_labels");
ok(watchCardRenderer.includes("LE JOUR À SURVEILLER") && watchCardRenderer.includes("ctx.fillStyle=ink") && watchCardRenderer.includes("'#FFFFFF'") && watchCardRenderer.includes("card.weatherLabel") && watchCardRenderer.includes("card.slots.forEach"), "overview_draws_watch_card_with_distinct_vigilance_badge");
ok(watchCardRenderer.includes("drawImageCentered(mainIcon") && watchCardRenderer.includes("drawImageCentered(icon,centerX-22") && watchCardRenderer.includes("centerX+22,y+280") && watchCardRenderer.includes("const x=74,y=704") && watchCardRenderer.includes("card.weekdayLabel+'. '+card.dayLabel"), "overview_centers_watch_hourly_groups_under_their_labels");
ok(drawSlideRenderer.includes("weekly_pictogram_") && drawSlideRenderer.includes("central_preferred_main_") && drawSlideRenderer.includes("card.kind==='PREFERRED'") && drawSlideRenderer.includes("central_preferred_hour_") && drawSlideRenderer.includes("central_watch_main_") && drawSlideRenderer.includes("card.kind==='WATCH'") && drawSlideRenderer.includes("central_watch_hour_") && drawSlideRenderer.includes("images.slice(dailyIconOffset,preferredIconOffset)"), "overview_loads_preferred_and_watch_loka_card_pictograms_conditionally");

console.log(`WEEKLY_CAROUSEL ${passed}/64 PASS`);
