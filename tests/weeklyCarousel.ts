import { buildWeeklyCarouselPlan, renderWeeklyCarousel, WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID, WEEKLY_OVERVIEW_MASTER_URL, WEEKLY_SLIDE1_DAILY_FEED_GRID, WEEKLY_SLIDE2_DAILY_FEED_GRID } from "../src/engine/weekly";
import { LOKA_DAILY_FEED_FRAME } from "../src/ui/feedFrame";
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
  const coldestMorningReference = { date: dateAt(0), dayIndex: 0, temperatureC: 13, sourceHour: 7 };
  const hottestDayReference = { date: dateAt(6), dayIndex: 6, temperatureC: 27, sourceHour: 15 };
  const coldestMorning = { ...coldestMorningReference, matches: [coldestMorningReference] };
  const hottestDay = { ...hottestDayReference, matches: [hottestDayReference] };
  return {
    title: "LA SEMAINE À TARNOS",
    synthesis: {
      primaryLine: "Temps chaud et sec · Soleil bien présent cette semaine",
      secondaryLine: "Les maximales évolueront de 21 à 27 °C.",
      primaryMaximumLines: 1,
      secondaryMaximumLines: 2,
      evidence: {
        thermalClass: "WARM", maximumTemperatureC: 27, minimumDailyMaximumC: 21, maximumDayIndexes: [6],
        totalPrecipitationMm: 0, wetHours: 0, dryWeek: true, meanBrightFraction: .7,
        startBrightFraction: .6, endBrightFraction: .7, startCloudCoverPct: 30, endCloudCoverPct: 25,
        measuredBrightening: false, measuredClouding: false
      }
    },
    coldestMorning: { ...coldestMorning, label: "MATIN LE PLUS FRAIS", dateLabel: "LUN. 7", temperatureLabel: "13 °C", timeLabel: "07 H" },
    hottestDay: { ...hottestDay, label: "JOURNÉE LA PLUS CHAUDE", dateLabel: "DIM. 13", temperatureLabel: "27 °C", timeLabel: "15 H" },
    daylight: {
      label: "LUMIÈRE DE LA SEMAINE", direction: "SHORTER", deltaMinutes: -18, deltaLabel: "−18 min de jour", periodLabel: "LUN. 7 → DIM. 13",
      start: { date: dateAt(0), weekdayLabel: "LUN.", sunriseMinutes: 440, sunsetMinutes: 1220, durationMinutes: 780, sunriseLabel: "07:20", sunsetLabel: "20:20" },
      end: { date: dateAt(6), weekdayLabel: "DIM.", sunriseMinutes: 449, sunsetMinutes: 1211, durationMinutes: 762, sunriseLabel: "07:29", sunsetLabel: "20:11" }
    },
    dailyStrip: days,
    facts: {
      version: "1.1.0", citySlug: "tarnos", startDate: dateAt(0), endDate: dateAt(6), coldestMorning, hottestDay,
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
ok(WEEKLY_OVERVIEW_MASTER_URL === "/masters24/weekly/SEMAINE_HOMOGENE.jpeg", "overview_uses_the_homogeneous_weekly_master");
ok(WEEKLY_SLIDE1_DAILY_FEED_GRID.x === LOKA_DAILY_FEED_FRAME.title.x && WEEKLY_SLIDE1_DAILY_FEED_GRID.width === LOKA_DAILY_FEED_FRAME.title.width && WEEKLY_SLIDE1_DAILY_FEED_GRID.title === LOKA_DAILY_FEED_FRAME.title && WEEKLY_SLIDE1_DAILY_FEED_GRID.facts.y === 336 && WEEKLY_SLIDE1_DAILY_FEED_GRID.facts.height === 490 && WEEKLY_SLIDE1_DAILY_FEED_GRID.summary.y === 856 && WEEKLY_SLIDE1_DAILY_FEED_GRID.summary.height === 175 && WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.height === 240 && WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.bottom === LOKA_DAILY_FEED_FRAME.lowerBox.bottom && WEEKLY_SLIDE1_DAILY_FEED_GRID.signature === LOKA_DAILY_FEED_FRAME.signature, "slide1_shares_the_daily_feed_frame_and_only_varies_inner_box_heights");
ok(plan.slides.length === 1, "raw_weekly_number_is_not_published_without_context");
ok(plan.slides[0].kind === "OVERVIEW" && plan.slides[0].eventId === null, "overview_is_first");
ok(plan.headerDateLabel === "LUNDI 7 AU DIMANCHE 13 SEPTEMBRE", "weekly_header_date_keeps_full_range_for_existing_surfaces");
ok(plan.headerDateCompact.line1 === "7 — 13" && plan.headerDateCompact.line2 === "SEPTEMBRE", "slide1_header_uses_the_compact_two_line_date_option");
ok(plan.headerDateFeed === "7 — 13 SEPTEMBRE", "slide1_header_uses_the_daily_feed_single_line_baseline");
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
ok(plan.weeklyNumber === undefined && plan.slides[1] === undefined, "weekly_number_requires_a_contextual_editorial_signal");
ok(plan.width === 1080 && plan.height === 1440, "carousel_dimensions");
ok(plan.story.width === 1080 && plan.story.height === 1920, "story_dimensions");
ok(plan.story.relay.kind === "RELAY" && plan.story.relay.source === "CAROUSEL", "story_is_relay");
ok(plan.story.relay.body.includes("carrousel") && !plan.story.relay.body.includes("jour"), "story_does_not_become_daily_bulletin");
ok(plan.slides.every((slide) => slide.scene.masterUrl.startsWith("/masters24/")), "slides_reuse_v24_masters");
ok(plan.slides.every((slide) => slide.scene.source === "DAILY_V24_DECISION" && slide.scene.validity === "VALID"), "slides_keep_daily_v24_provenance");

const calmPlan = buildWeeklyCarouselPlan(editorial([]));
ok(calmPlan.slides.length === 1, "calm_week_does_not_invent_a_number_slide");
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
ok(crossMonthPlan.headerDateFeed === "28 SEPT. — 4 OCTOBRE", "slide1_header_keeps_a_single_line_cross_month_feed_date");

const html = renderWeeklyCarousel(editorial(events));
ok(html.includes("carousel-canvas") && html.includes("story-relay"), "renderer_contains_carousel_and_story");
ok(!html.includes("data-slide-index=\"1\""), "renderer_keeps_only_the_validated_overview");
ok(!html.includes("data-event-id=\"wind:2026-09-09\""), "renderer_does_not_publish_the_legacy_event_slide");
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
    synthesis: { primaryLine: string; secondaryLine: string; primaryMaximumLines: number; secondaryMaximumLines: number };
    daylight: { deltaLabel: string; periodLabel: string };
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
ok(renderedModel?.slide1.synthesis.primaryLine.includes(" · ") === true && renderedModel?.slide1.synthesis.secondaryLine.endsWith(".") === true && renderedModel?.slide1.synthesis.primaryMaximumLines === 1 && renderedModel?.slide1.synthesis.secondaryMaximumLines === 2, "renderer_exposes_the_shared_daily_editorial_copy_contract");
ok(renderedModel?.slide1.daylight.periodLabel === "LUN. 7 → DIM. 13", "renderer_exposes_the_compact_daylight_period");
ok(renderedModel?.dailyCardDetails.map((card) => `${card.kind}:${card.weekdayLabel}.${card.dayLabel}:${card.pictogram.kind}:${card.slots.map((slot) => slot.hour).join("-")}`).join(",") === "PREFERRED:SAM.12:partly:8-12-16-20,WATCH:MER.9:partly:8-12-16-20", "renderer_exposes_prepared_central_card_data");
ok(renderedModel?.dailyCardDetails.every((card) => card.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,") && card.slots.every((slot) => slot.pictogram.url.startsWith("data:image/svg+xml;charset=utf-8,"))) === true, "renderer_embeds_official_loka_card_pictograms");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? "";
let scriptValid = true;
try { new Function(script); } catch { scriptValid = false; }
ok(scriptValid, "renderer_browser_script_is_valid");

const slide1RuntimeSource = script.slice(0, script.indexOf("Promise.all(plan.slides.map"));
const adaptiveLayoutRuntime = new Function("document", `${slide1RuntimeSource};return{layout:function(content,context){ctx=context;return slide1FactLayout(content,50,980);},summary:function(content,context){ctx=context;return fitSlide1EditorialLines(content.synthesis.secondaryLine,844,21,17,550,content.synthesis.secondaryMaximumLines);}};`)({
  querySelectorAll: () => [],
  getElementById: () => null
}) as {
  layout: (content: NonNullable<typeof renderedModel>["slide1"], context: {
    font: string;
    fontKerning: string;
    save: () => void;
    restore: () => void;
    measureText: (value: string) => { width: number };
  }) => Array<{ x: number; width: number }>;
  summary: (content: NonNullable<typeof renderedModel>["slide1"], context: unknown) => { size: number; lines: string[] };
};
let measuredFontSize = 16;
const adaptiveLayout = adaptiveLayoutRuntime.layout(renderedModel!.slide1, {
  get font() { return ""; },
  set font(value: string) { measuredFontSize = Number(value.match(/(\d+)px/)?.[1] ?? 16); },
  fontKerning: "normal",
  save: () => undefined,
  restore: () => undefined,
  measureText: (value: string) => ({ width: [...value].reduce((total, character) => total + measuredFontSize * (character === " " ? 0.28 : 0.52), 0) })
});
ok(adaptiveLayout.length === 3 && adaptiveLayout[0]?.x === 50 && adaptiveLayout[1]?.x === (adaptiveLayout[0]?.x ?? 0) + (adaptiveLayout[0]?.width ?? 0) + 10 && adaptiveLayout[2]?.x === (adaptiveLayout[1]?.x ?? 0) + (adaptiveLayout[1]?.width ?? 0) + 10 && Math.abs(adaptiveLayout.reduce((total, card) => total + card.width, 0) - 960) < .001 && adaptiveLayout.every((card) => Math.abs(card.width - 320) < .001), "slide1_fact_layout_uses_three_identical_card_columns");

let summaryFontSize = 16;
const shortSummary = {
  ...renderedModel!.slide1,
  synthesis: {
    ...renderedModel!.slide1.synthesis,
    secondaryLine: "Les maximales évolueront de 21 à 27 °C."
  }
};
const summaryFit = adaptiveLayoutRuntime.summary(shortSummary, {
  get font() { return ""; },
  set font(value: string) { summaryFontSize = Number(value.match(/(\d+)px/)?.[1] ?? 16); },
  fontKerning: "normal",
  save: () => undefined,
  restore: () => undefined,
  measureText: (value: string) => ({
    width: [...value].reduce((total, character) => total + summaryFontSize * (character === " " ? 0.28 : 0.52), 0)
  })
});
ok(summaryFit.lines.length >= 1 && summaryFit.lines.length <= 2 && summaryFit.size >= 17 && summaryFit.size <= 21, "slide1_summary_secondary_line_is_bounded_by_the_shared_daily_contract");

const overviewTitleRenderer = script.split("\n").find((line) => line.startsWith("function drawOverviewTitle(")) ?? "";
const slide1HeaderRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Header(")) ?? "";
const slide1OverviewRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Overview(")) ?? "";
const slide1FactsRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Facts(")) ?? "";
const slide1TemperatureRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1TemperatureFact(")) ?? "";
const slide1DaylightRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DaylightFact(")) ?? "";
const slide1FactLayoutRenderer = script.split("\n").find((line) => line.startsWith("function slide1FactLayout(")) ?? "";
const slide1SummaryRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1Summary(")) ?? "";
const slide1FeedSignatureRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1FeedSignature(")) ?? "";
const slide2NumberRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide2Number(")) ?? "";
const plainWrappedLinesRenderer = script.split("\n").find((line) => line.startsWith("function drawPlainWrappedLines(")) ?? "";
const completeWrapRenderer = script.split("\n").find((line) => line.startsWith("function completeWrap(")) ?? "";
const slide1DayStripRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DayStrip(")) ?? "";
const slide1DayMarkerRenderer = script.split("\n").find((line) => line.startsWith("function drawSlide1DayMarker(")) ?? "";
const slide1StripBoxRenderer = script.split("\n").find((line) => line.startsWith("function slide1StripBox(")) ?? "";
const publicationSlideRenderer = script.split("\n").find((line) => line.startsWith("function drawPublicationSlide(")) ?? "";
const publicationLaunch = script.split("\n").find((line) => line.startsWith("Promise.all(plan.slides.map")) ?? "";
ok(slide1OverviewRenderer.includes("box(50,160,980,150);drawOverviewTitle(plan.overviewTitle);drawSlide1Facts(plan.slide1") && slide1OverviewRenderer.includes("drawSlide1Summary(plan.slide1);slide1StripBox(50,1065,980,240);drawSlide1DayStrip(plan.slide1.dailyStrip"), "slide1_uses_the_daily_title_box_and_lower_box_baseline");
ok(!slide1OverviewRenderer.includes("slide.scene.displayTitle") && !slide1OverviewRenderer.includes("dailyCardDetails"), "slide1_does_not_render_the_previous_daily_cards");
ok(slide1OverviewRenderer.includes("drawOverviewTitle(plan.overviewTitle)") && overviewTitleRenderer.includes("content.title") && !overviewTitleRenderer.includes("subtitle") && overviewTitleRenderer.includes("870,56,44,760") && overviewTitleRenderer.includes("ctx.strokeStyle=slide1EditorialGold"), "slide1_draws_a_more_discreet_single_week_title_with_reference_palette");
ok(slide1OverviewRenderer.includes("drawSlide1Header(logo,plan.headerDateFeed,width)") && !slide1HeaderRenderer.includes("date.line1") && !slide1HeaderRenderer.includes("date.line2") && slide1HeaderRenderer.includes("logo,50,79,174,58") && slide1HeaderRenderer.includes("width-50,94,19,540"), "slide1_header_matches_the_daily_feed_coordinates_with_weekly_copy");
ok(slide1OverviewRenderer.includes("drawSlide1FeedSignature()") && slide1FeedSignatureRenderer.includes("540,1368,18,500,rgba(ink,0.88),'center'") && slide1FeedSignatureRenderer.includes("ctx.moveTo(518,1387)") && slide1FeedSignatureRenderer.includes("ctx.lineTo(562,1387)"), "slide1_signature_matches_the_daily_feed_position_color_and_dimensions");
ok(WEEKLY_SLIDE2_DAILY_FEED_GRID.title === LOKA_DAILY_FEED_FRAME.title && WEEKLY_SLIDE2_DAILY_FEED_GRID.numberBox.bottom === LOKA_DAILY_FEED_FRAME.lowerBox.bottom && WEEKLY_SLIDE2_DAILY_FEED_GRID.signature === LOKA_DAILY_FEED_FRAME.signature, "slide2_shares_the_daily_title_lower_baseline_and_signature");
ok(slide2NumberRenderer.includes("drawSlide1Header(logo,plan.headerDateFeed") && slide2NumberRenderer.includes("drawOverviewTitle(content)") && slide2NumberRenderer.includes("box(x,160,w,150)") && slide2NumberRenderer.includes("box(x,y,w,h)") && slide2NumberRenderer.includes("drawSlide1FeedSignature()"), "slide2_frame_is_preserved_until_a_contextual_signal_is_available");
ok(slide1FactsRenderer.includes("content.coldestMorning") && slide1FactsRenderer.includes("content.hottestDay") && slide1FactsRenderer.includes("content.daylight"), "slide1_draws_the_three_fixed_weekly_facts");
ok(slide1TemperatureRenderer.includes("fact.label") && slide1TemperatureRenderer.includes("fact.dateLabel") && slide1TemperatureRenderer.includes("fact.temperatureLabel") && !slide1TemperatureRenderer.includes("fact.timeLabel"), "slide1_temperature_fact_keeps_only_the_essential_day_and_temperature");
ok(slide1FactsRenderer.includes("cards=slide1FactLayout(content,x,w)") && slide1FactsRenderer.includes("cards[0].x") && slide1FactsRenderer.includes("cards[1].x") && slide1FactsRenderer.includes("cards[2].x") && slide1TemperatureRenderer.includes("plainText(fact.temperatureLabel"), "slide1_temperature_facts_use_optically_balanced_loka_icons_and_common_card_centers");
ok(slide1FactLayoutRenderer.includes("cardWidth=(totalWidth-gap*2)/3") && !slide1FactLayoutRenderer.includes("trackedMeasure(content.coldestMorning") && !slide1FactLayoutRenderer.includes("requiredWidths"), "slide1_fact_boxes_share_exactly_the_same_geometry");
ok(slide1TemperatureRenderer.includes("const labelSize=fittedSize(fact.label,w-44,19,15,700)") && slide1DaylightRenderer.includes("const labelSize=fittedSize(content.label,w-44,19,15,700)") && slide1DaylightRenderer.includes("trackedText(content.label,x+w/2,y+92,labelSize,700,slide1Ink,.35,'center')") && slide1DaylightRenderer.includes("plainText(content.periodLabel,x+w/2,y+329,periodSize,560,slide1Ink,'center')") && slide1DaylightRenderer.includes("plainText(deltaValue,x+w/2,y+430") && !slide1DaylightRenderer.includes("sunriseLabel") && !slide1DaylightRenderer.includes("sunsetLabel"), "slide1_daylight_fact_uses_the_same_title_icon_period_value_structure_as_temperature_cards");
ok(slide1SummaryRenderer.includes("const x=50,y=856,w=980,h=175") && slide1SummaryRenderer.includes("visual=content.synthesis") && slide1SummaryRenderer.includes("visual.primaryLine") && slide1SummaryRenderer.includes("visual.secondaryLine") && slide1SummaryRenderer.includes("slide1EditorialGold") && slide1SummaryRenderer.includes("'left'") && !slide1SummaryRenderer.includes("EN BREF"), "slide1_uses_the_daily_two_line_editorial_hierarchy");
ok(slide1SummaryRenderer.includes("fitSlide1EditorialLines") && slide1SummaryRenderer.includes("visual.secondaryMaximumLines") && !slide1SummaryRenderer.includes("weekly_slide1_synthesis_does_not_fit"), "slide1_never_cuts_a_weekly_editorial_line_mid_sentence");
ok(slide1DayStripRenderer.includes("days.forEach") && slide1DayStripRenderer.includes("drawImageCentered(icon") && slide1DayStripRenderer.includes("plainText(minLabel") && slide1DayStripRenderer.includes("plainText(maxLabel") && slide1DayStripRenderer.includes("y+210,24,600,slide1Ink") && !slide1DayStripRenderer.includes("plainText(maxLabel,centerX+7,y+210,24,600,gold"), "slide1_draws_seven_loka_columns_with_uniform_navy_temperatures");
ok(slide1DayStripRenderer.includes("factMatches(content.coldestMorning)") && slide1DayStripRenderer.includes("factMatches(content.hottestDay)") && slide1DayMarkerRenderer.includes("kind==='HOT'") && slide1DayMarkerRenderer.includes("slide1ColdBlue") && slide1DayMarkerRenderer.includes("Math.round(x+8)"), "slide1_marks_every_tied_extreme_day_with_identical_pixel_rounded_insets");
ok(slide1StripBoxRenderer.includes("rgba(255,255,255,.74)") && slide1DayStripRenderer.includes("const x=50,y=1065,w=980,h=240") && slide1DayMarkerRenderer.includes("ctx.lineWidth=1.5") && slide1DayMarkerRenderer.includes("markerWidth=Math.round(w-16)") && slide1DayMarkerRenderer.includes("markerHeight=Math.round(h-16)"), "slide1_daily_strip_is_fixed_and_uses_contours_without_changing_column_geometry");
ok(publicationSlideRenderer.includes("slide.kind==='WEEKLY_NUMBER'") && publicationSlideRenderer.includes("model.weeklyNumberPictogram") && publicationSlideRenderer.includes("plan.slide1.dailyStrip.map") && publicationSlideRenderer.includes("model.slide1UtilityPictograms.daylight") && publicationSlideRenderer.includes("model.slide1UtilityPictograms.thermometer") && publicationSlideRenderer.includes("drawSlide1Overview"), "slide1_and_slide2_load_their_official_loka_pictograms");
ok(publicationLaunch.includes("drawPublicationSlide(slideCanvases[index],slide)"), "publication_renderer_uses_the_new_slide1_visual_path");

const complementarySlides = {
  version: "1.0.0" as const,
  inputSignals: 2,
  omittedSignalIds: [],
  slides: [
    { version: "1.0.0" as const, position: 2 as const, role: "NUMBER" as const, title: "LE CHIFFRE DE LA SEMAINE" as const, signalId: "heat", detector: "HISTORICAL_SINCE" as const, theme: "TEMPERATURE" as const, visual: "THERMOMETER" as const, displayValue: "31 °C", primaryLine: "Jeudi devrait être particulièrement chaud.", secondaryLine: "Référence locale comparable à cette date.", claimStatus: "EXPECTED" as const, sourceNote: "Archive locale comparable et consensus multi-modèles.", frame: "WEEKLY_SHARED_V1" as const },
    { version: "1.0.0" as const, position: 3 as const, role: "PRACTICAL" as const, title: "À SAVOIR CETTE SEMAINE" as const, signalId: "rain", detector: "IMPACT_PHENOMENON" as const, theme: "WET_WEATHER" as const, visual: "RAIN" as const, displayValue: "28 mm", primaryLine: "Des pluies marquées pourraient arriver mercredi.", secondaryLine: "Le cumul quotidien deviendrait notable.", claimStatus: "POSSIBLE" as const, sourceNote: "Consensus de prévision et seuil d'impact local documenté.", frame: "WEEKLY_SHARED_V1" as const }
  ]
};
const contextualCarousel = buildWeeklyCarouselPlan(editorial(events), { complementarySlides });
ok(contextualCarousel.slides.map((slide) => slide.kind).join(",") === "OVERVIEW,COMPLEMENTARY_NUMBER,COMPLEMENTARY_PRACTICAL", "preflight_approved_contextual_slides_replace_legacy_raw_number");
ok(contextualCarousel.slides.slice(1).every((slide) => slide.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL && slide.complementary?.frame === "WEEKLY_SHARED_V1"), "contextual_slides_reuse_weekly_master_and_shared_frame");
ok(WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID === WEEKLY_SLIDE2_DAILY_FEED_GRID && WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID.numberBox.bottom === LOKA_DAILY_FEED_FRAME.lowerBox.bottom, "contextual_slides_share_exact_lower_baseline");
const contextualHtml = renderWeeklyCarousel(editorial(events), { complementarySlides });
ok(contextualHtml.includes("drawComplementarySlide") && contextualHtml.includes("COMPLEMENTARY_PRACTICAL") && contextualHtml.includes("weekly_shared_frame_required"), "renderer_draws_contextual_slides_only_inside_shared_frame");
ok(contextualHtml.includes("complementaryPictogramUrl") && contextualHtml.includes("contextual_pictogram"), "renderer_binds_only_official_loka_contextual_pictograms");

console.log(`WEEKLY_CAROUSEL ${passed}/87 PASS`);
