import type { WeeklyDailyCardDetail, WeeklyDailyCardSlot, WeeklyDailyHighlight, WeeklyDailyHighlightKind, WeeklyDailySummary, WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference, WeeklySlide1Content } from "./editorial";
import type { WeeklyNumber } from "./weeklyNumber";
import { PICTOGRAM_LIBRARY_VERSION, PICTOGRAM_STYLE, hourlyConditionToPictogram, solarPictogramDataUrl, temperaturePictogramDataUrl, visualIconToPictogram, weatherPictogramDataUrl } from "../../ui/pictogramLibrary";
import type { WeatherPictogramKind } from "../../ui/pictogramLibrary";
import { LOKA_BRAND_VERSION, LOKA_CANVAS_FONT, LOKA_LOGO_DATA_URL, LOKA_SLOGAN_WEEKLY } from "../../ui/lokaBrand";
import { LOKA_DAILY_FEED_FRAME, LOKA_PUBLICATION_STYLE } from "../../ui/feedFrame";
import { LOKA_WEEKLY_STORY_FRAME } from "../../ui/storyFrame";
import { LOKA_EDITORIAL_SUMMARY_FRAME } from "../../ui/editorialSummaryFrame";
import { assertWeeklyComplementaryPreflight } from "./complementaryPreflight";
import type { WeeklyComplementaryPreflight } from "./complementaryPreflight";
import type { WeeklyComplementarySlide, WeeklyComplementarySlidePlan } from "./complementarySlides";
import { complementaryPictogramDataUrl } from "./complementaryPictograms";
import type { WeeklyEditorialPilotReport } from "./pilotValidation";

export const WEEKLY_CAROUSEL_VERSION = "0.1.0" as const;
export const WEEKLY_CAROUSEL_MAX_EVENT_SLIDES = 4 as const;
export const WEEKLY_CAROUSEL_WIDTH = LOKA_DAILY_FEED_FRAME.width;
export const WEEKLY_CAROUSEL_HEIGHT = LOKA_DAILY_FEED_FRAME.height;
export const WEEKLY_STORY_WIDTH = LOKA_WEEKLY_STORY_FRAME.width;
export const WEEKLY_STORY_HEIGHT = LOKA_WEEKLY_STORY_FRAME.height;

/**
 * The weekly overview is built inside the exact same 1080 × 1440 frame as
 * the daily feed. The header, title box, lower-box baseline and signature are
 * shared; only the weekly content modules may differ in height.
 */
export const WEEKLY_SLIDE1_DAILY_FEED_GRID = {
  x: LOKA_DAILY_FEED_FRAME.title.x,
  width: LOKA_DAILY_FEED_FRAME.title.width,
  title: LOKA_DAILY_FEED_FRAME.title,
  facts: { y: 336, height: 490 },
  summary: { y: 856, height: 175 },
  dailyStrip: {
    y: LOKA_DAILY_FEED_FRAME.lowerBox.bottom - 240,
    height: 240,
    bottom: LOKA_DAILY_FEED_FRAME.lowerBox.bottom
  },
  signature: LOKA_DAILY_FEED_FRAME.signature
} as const;

/** Slide 2 is a sibling of slide 1: same title frame, same lower baseline and signature. */
export const WEEKLY_SLIDE2_DAILY_FEED_GRID = {
  x: LOKA_DAILY_FEED_FRAME.title.x,
  width: LOKA_DAILY_FEED_FRAME.title.width,
  title: LOKA_DAILY_FEED_FRAME.title,
  numberBox: {
    y: 336,
    height: LOKA_DAILY_FEED_FRAME.lowerBox.bottom - 336,
    bottom: LOKA_DAILY_FEED_FRAME.lowerBox.bottom
  },
  signature: LOKA_DAILY_FEED_FRAME.signature
} as const;
/** N8 makes slides 2–4 use precisely the same permanent frame as slide 2. */
export const WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID = WEEKLY_SLIDE2_DAILY_FEED_GRID;

/** The weekly Story wraps the canonical publication at native scale. */
export const WEEKLY_SLIDE1_DAILY_STORY_GRID = {
  width: LOKA_WEEKLY_STORY_FRAME.width,
  height: LOKA_WEEKLY_STORY_FRAME.height,
  publication: LOKA_WEEKLY_STORY_FRAME.publication,
  safeArea: LOKA_WEEKLY_STORY_FRAME.safeArea
} as const;

/**
 * The contextual slides use the same vertical rhythm as the overview: one
 * title box followed by three deliberate content boxes. Their final edge is
 * locked to the permanent daily/weekly lower baseline.
 */
export const WEEKLY_COMPLEMENTARY_BOX_LAYOUT = {
  top: LOKA_PUBLICATION_STYLE.content.firstY,
  bottom: LOKA_PUBLICATION_STYLE.content.bottom,
  gap: LOKA_PUBLICATION_STYLE.content.gap,
  primary: { minimumHeight: 330, preferredHeight: 370 },
  secondary: { minimumHeight: 190, preferredHeight: 250 },
  editorial: { minimumHeight: 180, preferredHeight: 245 }
} as const;
/**
 * Dedicated master for the weekly overview only. Event slides retain the
 * actual V24 master selected from the representative daily decision.
 */
export const WEEKLY_OVERVIEW_MASTER_URL = "/masters24/weekly/SEMAINE_HOMOGENE.jpeg" as const;

export type WeeklyCarouselSlideKind = "OVERVIEW" | "WEEKLY_NUMBER" | "COMPLEMENTARY_NUMBER" | "COMPLEMENTARY_PRACTICAL" | "COMPLEMENTARY_DETAIL";

export interface WeeklyCarouselSlide {
  index: number;
  kind: WeeklyCarouselSlideKind;
  eventId: string | null;
  dateLabel: string;
  backgroundUrl: string;
  title: string;
  body: string;
  scene: WeeklySceneReference;
  activities: WeeklyEditorialEvent["activities"];
  weeklyNumber?: WeeklyNumber;
  complementary?: WeeklyComplementarySlide;
}

export interface WeeklyStoryRelay {
  kind: "RELAY";
  source: "CAROUSEL";
  title: string;
  body: string;
  cta: string;
  backgroundUrl: string;
  scene: WeeklySceneReference;
}

export interface WeeklyDailyPictogramReference {
  source: "LOKA_OFFICIAL_PICTOGRAM_LIBRARY";
  libraryVersion: typeof PICTOGRAM_LIBRARY_VERSION;
  kind: WeatherPictogramKind;
}

export interface WeeklyCarouselDailySummary extends WeeklyDailySummary {
  /** Mapping fixed from the daily V24 visual icon; the renderer cannot reclassify it. */
  pictogram: WeeklyDailyPictogramReference;
  /** French labels precomputed in the weekly engine, not in the browser. */
  weekdayLabel: string;
  dayLabel: string;
  /** Prepared in the editorial layer; still not drawn at this stage. */
  highlight: WeeklyDailyHighlightKind | null;
}

/** Official pictogram bindings for the central cards, prepared but not drawn yet. */
export interface WeeklyCarouselDailyCardSlot extends WeeklyDailyCardSlot {
  pictogram: WeeklyDailyPictogramReference;
}

export interface WeeklyCarouselDailyCardDetail extends Omit<WeeklyDailyCardDetail, "slots"> {
  /** The main V24 pictogram uses the exact daily scene decision. */
  pictogram: WeeklyDailyPictogramReference;
  /** Precomputed French labels keep the renderer free from date formatting. */
  weekdayLabel: string;
  dayLabel: string;
  /** Each checkpoint reuses the daily hourly condition → pictogram mapping. */
  slots: WeeklyCarouselDailyCardSlot[];
}

/** Render-ready copy of the permanent first-slide contract. */
export interface WeeklyCarouselSlide1Content extends Omit<WeeklySlide1Content, "dailyStrip"> {
  dailyStrip: WeeklyCarouselDailySummary[];
}

export interface WeeklyCarouselPlan {
  version: typeof WEEKLY_CAROUSEL_VERSION;
  citySlug: string;
  startDate: string;
  endDate: string;
  /** Header copy produced from the Monday-Sunday range, not from a slide. */
  headerDateLabel: string;
  /** Compact two-line period treatment dedicated to the permanent first slide. */
  headerDateCompact: {
    line1: string;
    line2: string;
  };
  /** One-line weekly range drawn on the exact daily feed header baseline. */
  headerDateFeed: string;
  /**
   * Copy for the first, overview-only box. It deliberately does not reuse the
   * old overview narrative: the box is the stable entry point of the weekly
   * format, while the following boxes will receive their own dedicated data.
   */
  overviewTitle: {
    title: string;
  };
  /** Stable slide-1 copy, including the three factual anchors and daily strip. */
  slide1: WeeklyCarouselSlide1Content;
  /** Present only after a contextual, preflight-approved editorial signal exists. */
  weeklyNumber?: WeeklyNumber;
  complementaryPreflight?: ReturnType<typeof assertWeeklyComplementaryPreflight>;
  /** Seven daily V24 references and their official LOKA pictogram bindings. */
  dailySummaries: WeeklyCarouselDailySummary[];
  /** Editorial origins of the optional preferred/watch strip markers. */
  dailyHighlights: WeeklyDailyHighlight[];
  /** Prepared content for the central preferred/watch cards; not rendered in this step. */
  dailyCardDetails: WeeklyCarouselDailyCardDetail[];
  signature: WeeklyEditorial["signature"];
  width: typeof WEEKLY_CAROUSEL_WIDTH;
  height: typeof WEEKLY_CAROUSEL_HEIGHT;
  slides: WeeklyCarouselSlide[];
  story: {
    width: typeof WEEKLY_STORY_WIDTH;
    height: typeof WEEKLY_STORY_HEIGHT;
    relay: WeeklyStoryRelay;
  };
}

export interface WeeklyCarouselBuildOptions {
  /** N7 output. It can reach the renderer only through the N8 preflight. */
  complementarySlides?: WeeklyComplementarySlidePlan;
  /** Comprehensive preflight produced from the same profiles and ranking. */
  complementaryPreflight?: WeeklyComplementaryPreflight;
}

export interface WeeklyCarouselRenderOptions extends WeeklyCarouselBuildOptions {
  /** Preview-only switch to hide the rendered slide cards. */
  includeSlides?: boolean;
  /** Internal editorial lab: never repeats the validated public slide 1 or Story relay. */
  surface?: "FULL" | "CONTEXTUAL_DEMO";
  /** Preview-only operational result; never painted inside a publication slide. */
  pilot?: WeeklyEditorialPilotReport;
  /** The manual Instagram workflow downloads carousel slides only. */
  includeStory?: boolean;
}

function overviewSlide(editorial: WeeklyEditorial): WeeklyCarouselSlide {
  return {
    index: 0,
    kind: "OVERVIEW",
    eventId: null,
    dateLabel: dateRangeLabel(editorial.startDate, editorial.endDate),
    backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
    title: editorial.overview.title,
    body: editorial.overview.body,
    scene: editorial.overview.scene,
    activities: []
  };
}

function weeklyNumberSlide(editorial: WeeklyEditorial, number: WeeklyNumber): WeeklyCarouselSlide {
  const day = editorial.dailySummaries[number.dayIndex] ?? editorial.dailySummaries[0];
  if (!day) throw new Error("weekly_number_requires_a_representative_day");
  return {
    index: 1,
    kind: "WEEKLY_NUMBER",
    eventId: null,
    dateLabel: dateRangeLabel(editorial.startDate, editorial.endDate),
    backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
    title: number.title,
    body: number.explanation,
    scene: day.scene,
    activities: [],
    weeklyNumber: number
  };
}

function complementarySlide(editorial: WeeklyEditorial, content: WeeklyComplementarySlide): WeeklyCarouselSlide {
  const kind: Exclude<WeeklyCarouselSlideKind, "OVERVIEW" | "WEEKLY_NUMBER"> = content.role === "NUMBER"
    ? "COMPLEMENTARY_NUMBER" : content.role === "PRACTICAL" ? "COMPLEMENTARY_PRACTICAL" : "COMPLEMENTARY_DETAIL";
  return {
    index: content.position - 1, kind, eventId: null,
    dateLabel: dateRangeLabel(editorial.startDate, editorial.endDate),
    // Shared master is intentional: slides 2–4 must not revert to a daily scene.
    backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
    title: content.title, body: content.primaryLine,
    scene: editorial.overview.scene, activities: [], complementary: { ...content }
  };
}

/**
 * Build the publication structure without rendering, storing or publishing it.
 * The first slide is always the overview; every retained event gets exactly one
 * dedicated slide. A calm week therefore contains one slide only.
 */
export function buildWeeklyCarouselPlan(editorial: WeeklyEditorial, options: WeeklyCarouselBuildOptions = {}): WeeklyCarouselPlan {
  // A raw forecast number is not an editorial signal. Until the contextual
  // signal engine validates one, publication deliberately remains on slide 1.
  const complementaryPreflight = options.complementarySlides
    ? assertWeeklyComplementaryPreflight(options.complementarySlides, undefined, options.complementaryPreflight)
    : undefined;
  const contextualSlides = options.complementarySlides?.slides.map((slide) => complementarySlide(editorial, slide)) ?? [];
  const slides = contextualSlides.length
    ? [overviewSlide(editorial), ...contextualSlides]
    : [overviewSlide(editorial)];
  const highlightsByDay = new Map(editorial.dailyHighlights.map((highlight) => [highlight.dayIndex, highlight]));
  const headerDateCompact = weeklyHeaderDateCompact(editorial.startDate, editorial.endDate);
  const dailySummaries: WeeklyCarouselDailySummary[] = editorial.dailySummaries.map((day) => ({
    ...day,
    scene: { ...day.scene },
    pictogram: {
      source: "LOKA_OFFICIAL_PICTOGRAM_LIBRARY",
      libraryVersion: PICTOGRAM_LIBRARY_VERSION,
      kind: visualIconToPictogram(day.scene.visualIcon)
    },
    ...weeklyDayLabels(day.date),
    highlight: highlightsByDay.get(day.dayIndex)?.kind ?? null
  }));
  return {
    version: WEEKLY_CAROUSEL_VERSION,
    citySlug: editorial.citySlug,
    startDate: editorial.startDate,
    endDate: editorial.endDate,
    headerDateLabel: weeklyHeaderDateLabel(editorial.startDate, editorial.endDate),
    headerDateCompact,
    headerDateFeed: `${headerDateCompact.line1} ${headerDateCompact.line2}`,
    overviewTitle: overviewTitleContent(editorial),
    slide1: {
      ...editorial.slide1,
      dailyStrip: dailySummaries.map((day) => ({ ...day, scene: { ...day.scene }, pictogram: { ...day.pictogram } }))
    },
    ...(complementaryPreflight ? { complementaryPreflight } : {}),
    dailySummaries,
    dailyHighlights: editorial.dailyHighlights.map((highlight) => ({ ...highlight })),
    dailyCardDetails: editorial.dailyCardDetails.map((card) => ({
      ...card,
      scene: { ...card.scene },
      pictogram: {
        source: "LOKA_OFFICIAL_PICTOGRAM_LIBRARY",
        libraryVersion: PICTOGRAM_LIBRARY_VERSION,
        kind: visualIconToPictogram(card.scene.visualIcon)
      },
      ...weeklyDayLabels(card.date),
      slots: card.slots.map((slot) => ({
        ...slot,
        pictogram: {
          source: "LOKA_OFFICIAL_PICTOGRAM_LIBRARY",
          libraryVersion: PICTOGRAM_LIBRARY_VERSION,
          kind: hourlyConditionToPictogram(slot.condition)
        }
      }))
    })),
    signature: editorial.signature,
    width: WEEKLY_CAROUSEL_WIDTH,
    height: WEEKLY_CAROUSEL_HEIGHT,
    slides,
    story: {
      width: WEEKLY_STORY_WIDTH,
      height: WEEKLY_STORY_HEIGHT,
      relay: {
        kind: "RELAY",
        source: "CAROUSEL",
        title: "La semaine à " + (editorial.citySlug === "tarnos" ? "Tarnos" : editorial.citySlug),
        body: editorial.status === "CALM"
          ? "La synthèse de la semaine est disponible dans la publication."
          : "Les temps forts météo de la semaine sont disponibles dans le carrousel.",
        cta: "Voir la publication",
        backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
        scene: editorial.overview.scene
      }
    }
  };
}

function weeklyDayLabels(date: string): Pick<WeeklyCarouselDailySummary, "weekdayLabel" | "dayLabel"> {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric"
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const value = (type: "weekday" | "day"): string => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekdayLabel: value("weekday").replace(/\.$/, "").toLocaleUpperCase("fr-FR"),
    dayLabel: value("day")
  };
}

function cityDisplayName(citySlug: string): string {
  return citySlug
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1).toLocaleLowerCase("fr-FR"))
    .join(" ") || "Tarnos";
}

function overviewTitleContent(editorial: WeeklyEditorial): WeeklyCarouselPlan["overviewTitle"] {
  return {
    title: editorial.slide1.title
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function dateRangeLabel(startDate: string, endDate: string): string {
  const format = (date: string): string => new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(date + "T12:00:00Z"));
  return startDate === endDate ? format(startDate) : "du " + format(startDate) + " au " + format(endDate);
}

/**
 * The daily renderer owns the header treatment. The weekly layer supplies
 * only the range-specific value that it has to draw there.
 *
 * Example: LUNDI 7 AU DIMANCHE 13 SEPTEMBRE
 */
function weeklyHeaderDateLabel(startDate: string, endDate: string): string {
  const partsFor = (date: string): { weekday: string; day: string; month: string } => {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long"
    }).formatToParts(new Date(date + "T12:00:00Z"));
    const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
    return { weekday: value("weekday"), day: value("day"), month: value("month") };
  };
  const start = partsFor(startDate);
  const end = partsFor(endDate);
  const label = start.month === end.month
    ? `${start.weekday} ${start.day} au ${end.weekday} ${end.day} ${end.month}`
    : `${start.weekday} ${start.day} ${start.month} au ${end.weekday} ${end.day} ${end.month}`;
  return label.toUpperCase();
}

function weeklyHeaderDateCompact(startDate: string, endDate: string): WeeklyCarouselPlan["headerDateCompact"] {
  const partsFor = (date: string): { day: string; month: string; shortMonth: string } => {
    const dateValue = new Date(date + "T12:00:00Z");
    const part = (options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes): string =>
      new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...options })
        .formatToParts(dateValue)
        .find((item) => item.type === type)?.value ?? "";
    return {
      day: part({ day: "numeric" }, "day"),
      month: part({ month: "long" }, "month").toLocaleUpperCase("fr-FR"),
      shortMonth: part({ month: "short" }, "month").replace(/\.$/, "").toLocaleUpperCase("fr-FR") + "."
    };
  };
  const start = partsFor(startDate);
  const end = partsFor(endDate);
  if (start.month === end.month) return { line1: `${start.day} — ${end.day}`, line2: end.month };
  return { line1: `${start.day} ${start.shortMonth} —`, line2: `${end.day} ${end.month}` };
}

function activityStatusClass(status: WeeklyEditorialEvent["activities"][number]["status"]): string {
  if (status === "FAVORABLE") return "favorable";
  if (status === "UNFAVORABLE") return "unfavorable";
  return "mixed";
}

function eventDateLabel(event: WeeklyEditorialEvent): string {
  return dateRangeLabel(event.startDate, event.endDate);
}

function renderSlideCard(slide: WeeklyCarouselSlide, position: number, total: number, includeStory: boolean): string {
  const label = slide.kind === "OVERVIEW"
    ? "Slide " + position + " : vue d’ensemble"
    : "Slide " + position + " : " + slide.title;
  const activities = slide.activities.map((activity) => '<span class="activity ' + activityStatusClass(activity.status) + '">' + escapeHtml(activity.text) + "</span>").join("");
  const story = slide.kind === "OVERVIEW" && includeStory
    ? '<div class="format-panel"><div class="format-label">STORY · 1080 × 1920</div><div class="canvas-wrap story-wrap"><canvas id="slide1-story" width="' + WEEKLY_STORY_WIDTH + '" height="' + WEEKLY_STORY_HEIGHT + '" aria-label="Slide 1 : vue d’ensemble · Story"></canvas></div><button class="secondary download-slide1-story" type="button">Enregistrer / partager la Story</button></div>'
    : "";
  return '<article class="slide-card" data-slide-index="' + (position - 1) + '"' + (slide.eventId ? ' data-event-id="' + escapeHtml(slide.eventId) + '"' : '') + '><div class="slide-head"><span>' +
    escapeHtml(slide.kind === "OVERVIEW" ? "VUE D’ENSEMBLE" : slide.title) + "</span><span>" + position + "/" + total +
    '</span></div><div class="format-grid"><div class="format-panel"><div class="format-label">PUBLICATION · 1080 × 1440</div><div class="canvas-wrap"><canvas class="carousel-canvas" width="' + WEEKLY_CAROUSEL_WIDTH + '" height="' + WEEKLY_CAROUSEL_HEIGHT +
    '" aria-label="' + escapeHtml(label) + '"></canvas></div>' + (activities ? '<div class="activity-list">' + activities + "</div>" : "") +
    '<button class="secondary download-slide" type="button">Enregistrer / partager la publication</button></div>' + story + '</div></article>';
}

function sceneForBrowser(scene: WeeklySceneReference): WeeklySceneReference & { pictogramUrl: string } {
  return {
    ...scene,
    pictogramUrl: weatherPictogramDataUrl(visualIconToPictogram(scene.visualIcon))
  };
}

function browserModel(plan: WeeklyCarouselPlan): unknown {
  const weeklyNumberDay = plan.weeklyNumber ? (plan.dailySummaries[plan.weeklyNumber.dayIndex] ?? plan.dailySummaries[0]) : null;
  if (plan.weeklyNumber && !weeklyNumberDay) throw new Error("weekly_number_requires_a_browser_day");
  return {
    ...plan,
    brand: {
      version: LOKA_BRAND_VERSION,
      logoUrl: LOKA_LOGO_DATA_URL,
      canvasFont: LOKA_CANVAS_FONT,
      slogan: LOKA_SLOGAN_WEEKLY,
      pictogramLibraryVersion: PICTOGRAM_LIBRARY_VERSION,
      ink: PICTOGRAM_STYLE.ink,
      gold: PICTOGRAM_STYLE.gold
    },
    slides: plan.slides.map((slide) => ({
      ...slide,
      scene: sceneForBrowser(slide.scene),
      ...(slide.complementary ? { complementaryPictogramUrl: complementaryPictogramDataUrl(slide.complementary.visual) } : {})
    })),
    dailySummaries: plan.dailySummaries.map((day) => ({
      ...day,
      pictogram: { ...day.pictogram, url: weatherPictogramDataUrl(day.pictogram.kind) }
    })),
    dailyCardDetails: plan.dailyCardDetails.map((card) => ({
      ...card,
      scene: sceneForBrowser(card.scene),
      pictogram: { ...card.pictogram, url: weatherPictogramDataUrl(card.pictogram.kind) },
      slots: card.slots.map((slot) => ({
        ...slot,
        pictogram: { ...slot.pictogram, url: weatherPictogramDataUrl(slot.pictogram.kind) }
      }))
    })),
    slide1: {
      ...plan.slide1,
      dailyStrip: plan.slide1.dailyStrip.map((day) => ({
        ...day,
        pictogram: { ...day.pictogram, url: weatherPictogramDataUrl(day.pictogram.kind) }
      }))
    },
    slide1UtilityPictograms: {
      daylight: solarPictogramDataUrl("sunrise"),
      thermometer: temperaturePictogramDataUrl("thermometer")
    },
    ...(plan.weeklyNumber && weeklyNumberDay ? {
      weeklyNumberPictogram: plan.weeklyNumber.kind === "THERMAL_RANGE"
        ? temperaturePictogramDataUrl("thermometer")
        : weatherPictogramDataUrl(visualIconToPictogram(weeklyNumberDay.scene.visualIcon))
    } : {}),
    story: {
      ...plan.story,
      relay: { ...plan.story.relay, scene: sceneForBrowser(plan.story.relay.scene) }
    }
  };
}

/**
 * Render an isolated preview/export surface. It is used by the protected
 * preview route. Its content engine remains independent from the daily route,
 * while its publication frame and visual primitives are shared with it.
 */
export function renderWeeklyCarousel(editorial: WeeklyEditorial, options: WeeklyCarouselRenderOptions = {}): string {
  const completePlan = buildWeeklyCarouselPlan(editorial, options);
  const contextualDemo = options.surface === "CONTEXTUAL_DEMO";
  const plan = contextualDemo
    ? { ...completePlan, slides: completePlan.slides.filter((slide) => slide.kind !== "OVERVIEW") }
    : completePlan;
  const model = browserModel(plan);
  const range = plan.headerDateLabel;
  const includeSlides = options.includeSlides !== false;
  const includeSlide1Story = !contextualDemo && options.includeStory !== false;
  const cards = includeSlides ? plan.slides.map((slide) => renderSlideCard(slide, slide.index + 1, contextualDemo ? 4 : plan.slides.length, includeSlide1Story)).join("\n") : "";
  const storySection = "";
  const previewTitle = contextualDemo ? "Démo · slides éditoriales" : plan.story.relay.title;
  const previewBadge = contextualDemo ? "Laboratoire interne · non publiable" : "Publication à télécharger · prévisions réelles";
  const previewNote = !includeSlides
    ? "Les aperçus visuels sont désactivés sur cette page. La publication sera générée après votre sélection."
    : contextualDemo
    ? "Laboratoire interne : seules les slides éditoriales sont affichées. Elles servent à contrôler le moteur et ne doivent pas être publiées."
    : "La slide 1 est disponible aux formats Publication et Story. Les autres slides restent au format Publication, dans l’ordre du carrousel.";
  const pilotPanel = options.pilot
    ? '<section class="pilot ' + escapeHtml(options.pilot.status.toLowerCase()) + '"><div><strong>Pilote éditorial · ' + escapeHtml(options.pilot.status) + '</strong><span>' + escapeHtml(options.pilot.summary) + '</span></div><small>' + escapeHtml(options.pilot.startDate + " → " + options.pilot.endDate + " · " + options.pilot.climateStatus) + '</small></section>'
    : "";
  const carouselSection = includeSlides ? '<section class="carousel" aria-label="Carrousel hebdomadaire">' + cards + '</section>' : '';
  const shell =
'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(plan.story.relay.title) + ' · LOKA</title>' +
'<style>:root{--ink:#12264a;--gold:#fdb515;--paper:#f3f1eb;--muted:#6f716f;--dark:#171715}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:24px 18px 48px}.toolbar{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:27px;font-weight:850;letter-spacing:.06em}.badge{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.toolbar h1{font-size:28px;line-height:1.05;margin:20px 0 6px}.muted{font-size:13px;color:var(--muted)}.pilot{display:flex;justify-content:space-between;gap:14px;margin:16px 0 0;padding:12px 14px;border-radius:14px;font-size:12px;line-height:1.35}.pilot strong,.pilot span{display:block}.pilot span{margin-top:3px}.pilot small{align-self:center;white-space:nowrap}.pilot.pass{background:#edf7ef;color:#21613b}.pilot.review{background:#faf3e3;color:#7a5b16}.pilot.blocked{background:#f9e9e7;color:#8c302b}.carousel{display:grid;gap:22px}.slide-card{background:#fff;border-radius:24px;padding:14px;box-shadow:0 14px 46px rgba(18,38,74,.1)}.slide-head{display:flex;justify-content:space-between;gap:8px;padding:3px 4px 11px;font-size:11px;font-weight:780;letter-spacing:.09em;color:var(--muted)}.format-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}.format-panel{min-width:0}.format-label{padding:0 4px 9px;font-size:10px;font-weight:800;letter-spacing:.1em;color:var(--muted)}.canvas-wrap{overflow:hidden;border-radius:18px;background:#d6d4cf}.canvas-wrap canvas{display:block;width:100%;height:auto}.story-wrap{max-width:420px;margin:0 auto}.activity-list{display:flex;flex-direction:column;gap:7px;margin:12px 2px 0}.activity{border-radius:11px;padding:8px 10px;font-size:12px;line-height:1.35}.activity.favorable{background:#edf7ef;color:#21613b}.activity.mixed{background:#faf3e3;color:#7a5b16}.activity.unfavorable{background:#f9e9e7;color:#8c302b}.secondary{width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px 10px;background:#f0f0ed;color:var(--dark);font:650 12px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.note{text-align:center;color:var(--muted);font-size:11px;line-height:1.5;margin:22px auto 0;max-width:760px}</style></head><body><main class="wrap"><section class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">' + escapeHtml(previewBadge) + '</div></div><h1>' + escapeHtml(previewTitle) + '</h1><div class="muted">' + escapeHtml(range) + ' · ' + String(plan.slides.length) + ' slide' + (plan.slides.length > 1 ? 's' : '') + '</div>' + pilotPanel + '</section>' + carouselSection + storySection + '<p class="note">' + escapeHtml(previewNote) + '</p></main><script>';

  const script = [
    "const model=" + safeJson(model) + ";",
    "const plan=model;",
    "const slideCanvases=[...document.querySelectorAll('.carousel-canvas')];",
    "const storyCanvas=document.getElementById('slide1-story');",
    "let ctx=null;",
    "const ink=model.brand.ink;",
    "const gold=model.brand.gold;",
    "const slide1Ink=ink;",
    "const slide1EditorialGold=gold;",
    "const fontFamily=model.brand.canvasFont;",
    "const FEED_LAYOUT={offsetY:0,scaleY:1,visualScale:1.06};",
    `const STORY_LAYOUT={offsetY:${LOKA_WEEKLY_STORY_FRAME.publication.y},scaleY:${LOKA_WEEKLY_STORY_FRAME.publication.verticalScale},visualScale:${LOKA_WEEKLY_STORY_FRAME.publication.visualScale}};`,
    "function layoutY(value,layout){return layout.offsetY+value*layout.scaleY;}",
    "function layoutH(value,layout){return value*layout.scaleY;}",
    "function load(src,label){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('weekly_image_load_failed:'+label));image.src=src;});}",
    "function normalizeText(value){return String(value??'').normalize('NFC').replace(/\\s+/g,' ').trim();}",
    "function font(size,weight){ctx.font=String(weight)+' '+String(size)+'px '+fontFamily;if('fontKerning' in ctx)ctx.fontKerning='normal';}",
    "function rgba(hex,a){const h=String(hex).replace('#',''),n=parseInt(h,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}",
    `function drawFullTextLine(label,x,y,color,align){ctx.fillStyle=color;ctx.strokeStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.lineJoin='${LOKA_PUBLICATION_STYLE.text.lineJoin}';ctx.miterLimit=${LOKA_PUBLICATION_STYLE.text.miterLimit};ctx.lineWidth=${LOKA_PUBLICATION_STYLE.text.strokeWidth};ctx.strokeText(label,x,y);ctx.fillText(label,x,y);}`,
    "function drawPlainTextLine(label,x,y,color,align){drawFullTextLine(label,x,y,color,align);}",
    "function text(value,x,y,size,weight,color,align='left'){const label=normalizeText(value);ctx.save();font(size,weight);drawFullTextLine(label,x,y,color,align);ctx.restore();}",
    "function plainText(value,x,y,size,weight,color,align='left'){const label=normalizeText(value);ctx.save();font(size,weight);drawPlainTextLine(label,x,y,color,align);ctx.restore();}",
    "function trackedText(value,x,y,size,weight,color,tracking,align='center'){const chars=normalizeText(value).split('');ctx.save();font(size,weight);const widths=chars.map(ch=>ctx.measureText(ch).width);const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking;let cursor=align==='center'?x-total/2:align==='right'?x-total:x;ctx.fillStyle=color;ctx.textBaseline='alphabetic';for(let i=0;i<chars.length;i++){ctx.fillText(chars[i],cursor,y);cursor+=widths[i]+tracking;}ctx.restore();}",
    "function measure(value,size,weight){ctx.save();font(size,weight);const width=ctx.measureText(normalizeText(value)).width;ctx.restore();return width;}",
    "function fittedSize(value,maxWidth,maxSize,minSize,weight){const label=normalizeText(value);ctx.save();let size=maxSize;while(size>minSize){font(size,weight);if(ctx.measureText(label).width<=maxWidth)break;size-=1;}ctx.restore();return Math.max(minSize,size);}",
    "function wrap(value,x,y,maxWidth,lineHeight,size,weight,color,align='left',maxLines=3){ctx.save();font(size,weight);const words=normalizeText(value).split(/\\s+/).filter(Boolean);let line='',yy=y,count=0;for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){drawFullTextLine(line,x,yy,color,align);count++;if(count>=maxLines){ctx.restore();return;}line=word;yy+=lineHeight;}else line=next;}if(line&&count<maxLines)drawFullTextLine(line,x,yy,color,align);ctx.restore();}",
    "function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}",
    `function box(x,y,w,h){ctx.save();rr(x,y,w,h,${LOKA_PUBLICATION_STYLE.glassBox.radius});const gradient=ctx.createLinearGradient(x,y,x,y+h);gradient.addColorStop(0,'${LOKA_PUBLICATION_STYLE.glassBox.fillTop}');gradient.addColorStop(${LOKA_PUBLICATION_STYLE.glassBox.sheenRatio},'${LOKA_PUBLICATION_STYLE.glassBox.fillMiddle}');gradient.addColorStop(1,'${LOKA_PUBLICATION_STYLE.glassBox.fillBottom}');ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle='${LOKA_PUBLICATION_STYLE.glassBox.borderColor}';ctx.lineWidth=${LOKA_PUBLICATION_STYLE.glassBox.borderWidth};ctx.stroke();ctx.save();rr(x+2,y+2,w-4,(h-4)*${LOKA_PUBLICATION_STYLE.glassBox.sheenClipRatio},${LOKA_PUBLICATION_STYLE.glassBox.insetRadius});ctx.clip();const sheen=ctx.createLinearGradient(x,y,x,y+h*${LOKA_PUBLICATION_STYLE.glassBox.sheenRatio});sheen.addColorStop(0,'${LOKA_PUBLICATION_STYLE.glassBox.sheenTop}');sheen.addColorStop(1,'${LOKA_PUBLICATION_STYLE.glassBox.sheenBottom}');ctx.fillStyle=sheen;ctx.fillRect(x+2,y+2,w-4,h*${LOKA_PUBLICATION_STYLE.glassBox.sheenRatio});ctx.restore();ctx.restore();}`,
    "function cover(image,width,height){const iw=Math.max(1,image.naturalWidth||image.width||width),ih=Math.max(1,image.naturalHeight||image.height||height),scale=Math.max(width/iw,height/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(image,(width-dw)/2,(height-dh)/2,dw,dh);}",
    "function overlay(width,height){const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'rgba(255,255,255,.04)');gradient.addColorStop(.54,'rgba(255,255,255,.06)');gradient.addColorStop(1,'rgba(7,21,48,.38)');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);}",
    "function drawLokaLogo(logo,x,centerY,maxWidth,maxHeight){const iw=Math.max(1,logo.naturalWidth||logo.width||maxWidth),ih=Math.max(1,logo.naturalHeight||logo.height||maxHeight),scale=Math.min(maxWidth/iw,maxHeight/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(logo,x,centerY-dh/2,dw,dh);}",
    "function drawImageCentered(image,cx,cy,w,h){const iw=Math.max(1,image.naturalWidth||image.width||w),ih=Math.max(1,image.naturalHeight||image.height||h),scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(image,cx-dw/2,cy-dh/2,dw,dh);}",
    `function drawHeader(logo,label,width){drawLokaLogo(logo,${LOKA_DAILY_FEED_FRAME.header.logoX},${LOKA_DAILY_FEED_FRAME.header.logoCenterY},${LOKA_DAILY_FEED_FRAME.header.logoWidth},${LOKA_DAILY_FEED_FRAME.header.logoHeight});trackedText(String(plan.citySlug==='tarnos'?'TARNOS':plan.citySlug).toUpperCase(),${LOKA_DAILY_FEED_FRAME.header.cityX},${LOKA_DAILY_FEED_FRAME.header.cityBaseline},${LOKA_DAILY_FEED_FRAME.header.citySize},${LOKA_DAILY_FEED_FRAME.header.cityWeight},ink,${LOKA_DAILY_FEED_FRAME.header.cityTracking},'center');text(String(label||'').toUpperCase(),width-50,${LOKA_DAILY_FEED_FRAME.header.dateBaseline},${LOKA_DAILY_FEED_FRAME.header.dateSize},${LOKA_DAILY_FEED_FRAME.header.dateWeight},ink,'right');}`,
    `function drawSlide1Header(logo,date,width,layout=FEED_LAYOUT){const s=layout.visualScale;drawLokaLogo(logo,${LOKA_DAILY_FEED_FRAME.header.logoX},layoutY(${LOKA_DAILY_FEED_FRAME.header.logoCenterY},layout),${LOKA_DAILY_FEED_FRAME.header.logoWidth}*s,${LOKA_DAILY_FEED_FRAME.header.logoHeight}*s);trackedText(String(plan.citySlug==='tarnos'?'TARNOS':plan.citySlug).toUpperCase(),${LOKA_DAILY_FEED_FRAME.header.cityX},layoutY(${LOKA_DAILY_FEED_FRAME.header.cityBaseline},layout),${LOKA_DAILY_FEED_FRAME.header.citySize}*s,${LOKA_DAILY_FEED_FRAME.header.cityWeight},ink,${LOKA_DAILY_FEED_FRAME.header.cityTracking},'center');text(normalizeText(date),width-50,layoutY(${LOKA_DAILY_FEED_FRAME.header.dateBaseline},layout),${LOKA_DAILY_FEED_FRAME.header.dateSize}*s,${LOKA_DAILY_FEED_FRAME.header.dateWeight},ink,'right');}`,
    "function drawStoryHeader(logo,label){drawLokaLogo(logo,50,144,190,64);trackedText(String(plan.citySlug==='tarnos'?'TARNOS':plan.citySlug).toUpperCase(),540,158,25,680,ink,8,'center');text(String(label||'').toUpperCase(),1030,158,20,540,ink,'right');}",
    "function sceneBadge(icon,scene,x,y,w,h){box(x,y,w,h);drawImageCentered(icon,x+82,y+h/2+8,116,90);text('SCÈNE V24 DU JOUR',x+160,y+43,14,700,ink,'left');text(scene.displayTitle,x+160,y+83,19,780,ink,'left');}",
    "function drawSignature(y,color){const signatureColor=color||ink;text(model.signature||model.brand.slogan,540,y,20,500,signatureColor,'center');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(514,y+24);ctx.lineTo(566,y+24);ctx.stroke();ctx.restore();}",
    `function drawOverviewTitle(content,layout=FEED_LAYOUT){const s=layout.visualScale,title=normalizeText(content.title),titleSize=fittedSize(title,870,48*s,32*s,800);text(title,${WEEKLY_SLIDE1_DAILY_FEED_GRID.x + 55},layoutY(241,layout),titleSize,800,ink,'left');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(${WEEKLY_SLIDE1_DAILY_FEED_GRID.x + 58},layoutY(263,layout));ctx.lineTo(${WEEKLY_SLIDE1_DAILY_FEED_GRID.x + 110},layoutY(263,layout));ctx.stroke();ctx.restore();}`,
    "function slide1MetricBox(x,y,w,h){box(x,y,w,h);}",
    "function slide1StripBox(x,y,w,h){box(x,y,w,h);}",
    "function slide1SummaryBox(x,y,w,h){box(x,y,w,h);}",
    "function drawFactAccent(cx,y){ctx.save();ctx.strokeStyle=slide1EditorialGold;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-24,y);ctx.lineTo(cx+24,y);ctx.stroke();ctx.restore();}",
    "function trackedMeasure(value,size,weight,tracking){const chars=normalizeText(value).split('');ctx.save();font(size,weight);const width=chars.reduce((total,char)=>total+ctx.measureText(char).width,0)+Math.max(0,chars.length-1)*tracking;ctx.restore();return width;}",
    `function drawSlide1TemperatureFact(fact,icon,x,y,w,iconWidth,iconHeight,layout=FEED_LAYOUT){const s=layout.visualScale,labelSize=fittedSize(fact.label,w-44,19*s,15*s,700),dateSize=fittedSize(fact.dateLabel,w-44,30*s,18*s,560);trackedText(fact.label,x+w/2,layoutY(y+72,layout),labelSize,700,slide1Ink,.35,'center');drawFactAccent(x+w/2,layoutY(y+92,layout));drawImageCentered(icon,x+w/2,layoutY(y+205,layout),iconWidth*s,iconHeight*s);plainText(fact.dateLabel,x+w/2,layoutY(y+329,layout),dateSize,560,slide1Ink,'center');plainText(fact.temperatureLabel,x+w/2,layoutY(y+430,layout),fittedSize(fact.temperatureLabel,w-28,70*s,56*s,700),700,slide1Ink,'center');}`,
    "function daylightDeltaValue(label){const match=normalizeText(label).match(/^(.+? min) de jour$/);return match?match[1]:normalizeText(label);}",
    `function drawSlide1DaylightFact(content,daylightIcon,x,y,w,layout=FEED_LAYOUT){const s=layout.visualScale,labelSize=fittedSize(content.label,w-44,19*s,15*s,700),periodSize=fittedSize(content.periodLabel,w-44,30*s,18*s,560),deltaValue=daylightDeltaValue(content.deltaLabel);trackedText(content.label,x+w/2,layoutY(y+72,layout),labelSize,700,slide1Ink,.35,'center');drawFactAccent(x+w/2,layoutY(y+92,layout));drawImageCentered(daylightIcon,x+w/2,layoutY(y+205,layout),205*s,154*s);plainText(content.periodLabel,x+w/2,layoutY(y+329,layout),periodSize,560,slide1Ink,'center');plainText(deltaValue,x+w/2,layoutY(y+430,layout),fittedSize(deltaValue,w-28,70*s,56*s,700),700,slide1Ink,'center');}`,
    "function wrappedLines(value,maxWidth,size,weight){const words=normalizeText(value).split(/\\s+/).filter(Boolean);ctx.save();font(size,weight);const lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);ctx.restore();return lines;}",
    "function drawWrappedLines(lines,x,y,lineHeight,size,weight,color,align){const firstY=y-(lines.length-1)*lineHeight/2;ctx.save();font(size,weight);for(let index=0;index<lines.length;index++)drawFullTextLine(lines[index],x,firstY+index*lineHeight,color,align);ctx.restore();}",
    "function drawPlainWrappedLines(lines,x,centerY,lineHeight,size,weight,color,align){ctx.save();font(size,weight);const sampleMetrics=ctx.measureText('Égj'),ascent=Number.isFinite(sampleMetrics.actualBoundingBoxAscent)&&sampleMetrics.actualBoundingBoxAscent>0?sampleMetrics.actualBoundingBoxAscent:size*.76,descent=Number.isFinite(sampleMetrics.actualBoundingBoxDescent)&&sampleMetrics.actualBoundingBoxDescent>0?sampleMetrics.actualBoundingBoxDescent:size*.22,textHeight=ascent+descent+Math.max(0,lines.length-1)*lineHeight,firstY=centerY-textHeight/2+ascent;for(let index=0;index<lines.length;index++)drawPlainTextLine(lines[index],x,firstY+index*lineHeight,color,align);ctx.restore();}",
    "function completeWrap(value,x,y,maxWidth,lineHeight,maxSize,minSize,weight,color,align,maxLines){for(let size=maxSize;size>=minSize;size--){const lines=wrappedLines(value,maxWidth,size,weight);if(lines.length===1){drawWrappedLines(lines,x,y,lineHeight,size,weight,color,align);return;}}for(let size=maxSize;size>=minSize;size--){const lines=wrappedLines(value,maxWidth,size,weight);if(lines.length<=maxLines){drawWrappedLines(lines,x,y,lineHeight,size,weight,color,align);return;}}throw new Error('weekly_slide1_synthesis_does_not_fit');}",
    "function completePlainWrap(value,x,y,maxWidth,lineHeight,maxSize,minSize,weight,color,align,maxLines){for(let size=maxSize;size>=minSize;size--){const lines=wrappedLines(value,maxWidth,size,weight);if(lines.length===1){drawPlainWrappedLines(lines,x,y,lineHeight,size,weight,color,align);return;}}for(let size=maxSize;size>=minSize;size--){const lines=wrappedLines(value,maxWidth,size,weight);if(lines.length<=maxLines){drawPlainWrappedLines(lines,x,y,lineHeight,size,weight,color,align);return;}}throw new Error('weekly_slide1_synthesis_does_not_fit');}",
    "function fitSlide1EditorialLines(value,maxWidth,maxSize,minSize,weight,maxLines){for(let size=maxSize;size>=minSize;size--){const lines=wrappedLines(value,maxWidth,size,weight);if(lines.length<=maxLines)return{size,lines};}throw new Error('weekly_slide1_editorial_does_not_fit');}",
    "function slide1FactLayout(_content,x,totalWidth){const cardWidth=totalWidth/3;return Array.from({length:3},(_,index)=>({x:x+index*cardWidth,width:cardWidth}));}",
    `function drawSlide1Facts(content,dailyIcons,daylightIcon,thermometerIcon,layout=FEED_LAYOUT){const x=${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},sourceY=${WEEKLY_SLIDE1_DAILY_FEED_GRID.facts.y},sourceH=${WEEKLY_SLIDE1_DAILY_FEED_GRID.facts.height},y=layoutY(sourceY,layout),w=${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},h=layoutH(sourceH,layout),cards=slide1FactLayout(content,x,w),hotIcon=dailyIcons[content.hottestDay.dayIndex];slide1MetricBox(x,y,w,h);ctx.save();ctx.strokeStyle='rgba(6,31,76,.18)';ctx.lineWidth=1.2;for(let index=1;index<3;index++){const separatorX=x+w*index/3;ctx.beginPath();ctx.moveTo(separatorX,layoutY(sourceY+22,layout));ctx.lineTo(separatorX,layoutY(sourceY+sourceH-22,layout));ctx.stroke();}ctx.restore();drawSlide1TemperatureFact(content.coldestMorning,thermometerIcon,cards[0].x,sourceY,cards[0].width,155,140,layout);drawSlide1TemperatureFact(content.hottestDay,hotIcon,cards[1].x,sourceY,cards[1].width,195,165,layout);drawSlide1DaylightFact(content.daylight,daylightIcon,cards[2].x,sourceY,cards[2].width,layout);}`,
    `function drawSlide1Summary(content,layout=FEED_LAYOUT){const x=${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},y=layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.summary.y},layout),w=${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},h=layoutH(${WEEKLY_SLIDE1_DAILY_FEED_GRID.summary.height},layout),s=layout.visualScale,visual=content.synthesis,main=normalizeText(visual.primaryLine),secondary=normalizeText(visual.secondaryLine),left=x+${LOKA_EDITORIAL_SUMMARY_FRAME.insetX},maxWidth=w-${LOKA_EDITORIAL_SUMMARY_FRAME.insetX * 2},primarySize=fittedSize(main,maxWidth,${LOKA_EDITORIAL_SUMMARY_FRAME.primary.maximumSize}*s,${LOKA_EDITORIAL_SUMMARY_FRAME.primary.minimumSize}*s,${LOKA_EDITORIAL_SUMMARY_FRAME.primary.weight}),secondaryFit=fitSlide1EditorialLines(secondary,maxWidth,${LOKA_EDITORIAL_SUMMARY_FRAME.secondary.maximumSize}*s,${LOKA_EDITORIAL_SUMMARY_FRAME.secondary.minimumSize}*s,${LOKA_EDITORIAL_SUMMARY_FRAME.secondary.weight},visual.secondaryMaximumLines),secondaryLineHeight=Math.round(secondaryFit.size*${LOKA_EDITORIAL_SUMMARY_FRAME.secondaryLineHeightRatio}),secondaryHeight=secondaryFit.size+Math.max(0,secondaryFit.lines.length-1)*secondaryLineHeight,groupHeight=primarySize+${LOKA_EDITORIAL_SUMMARY_FRAME.accent.offsetBelowPrimary}+${LOKA_EDITORIAL_SUMMARY_FRAME.accent.lineWidth}+${LOKA_EDITORIAL_SUMMARY_FRAME.gapAfterAccent}+secondaryHeight,top=y+(h-groupHeight)/2,primaryBaseline=top+primarySize,accentY=primaryBaseline+${LOKA_EDITORIAL_SUMMARY_FRAME.accent.offsetBelowPrimary};slide1SummaryBox(x,y,w,h);text(main,left,primaryBaseline,primarySize,${LOKA_EDITORIAL_SUMMARY_FRAME.primary.weight},slide1Ink,'left');ctx.save();ctx.strokeStyle=slide1EditorialGold;ctx.lineWidth=${LOKA_EDITORIAL_SUMMARY_FRAME.accent.lineWidth};ctx.lineCap='round';ctx.beginPath();ctx.moveTo(left,accentY);ctx.lineTo(left+${LOKA_EDITORIAL_SUMMARY_FRAME.accent.width},accentY);ctx.stroke();ctx.restore();const firstSecondaryBaseline=accentY+${LOKA_EDITORIAL_SUMMARY_FRAME.gapAfterAccent}+secondaryFit.size;secondaryFit.lines.forEach((line,index)=>text(line,left,firstSecondaryBaseline+index*secondaryLineHeight,secondaryFit.size,${LOKA_EDITORIAL_SUMMARY_FRAME.secondary.weight},rgba(slide1Ink,.99),'left'));}`,
    "function factMatches(fact){return Array.isArray(fact.matches)&&fact.matches.length?fact.matches:[fact];}",
    "function drawSlide1DayMarker(kind,x,y,w,h){const accent=kind==='HOT'?gold:ink,left=Math.round(x+8),top=Math.round(y+8),markerWidth=Math.round(w-16),markerHeight=Math.round(h-16);ctx.save();rr(left,top,markerWidth,markerHeight,12);ctx.fillStyle=kind==='HOT'?rgba(gold,.08):rgba(ink,.055);ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}",
    `function drawSlide1DayStrip(days,dailyIcons,content,layout=FEED_LAYOUT){const x=${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},sourceY=${WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.y},sourceH=${WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.height},y=layoutY(sourceY,layout),w=${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},h=layoutH(sourceH,layout),s=layout.visualScale,columnWidth=w/days.length,coldDayIndexes=new Set(factMatches(content.coldestMorning).map(match=>match.dayIndex)),hotDayIndexes=new Set(factMatches(content.hottestDay).map(match=>match.dayIndex));ctx.save();ctx.strokeStyle='rgba(6,31,76,.14)';ctx.lineWidth=1;for(let index=1;index<days.length;index++){const separatorX=Math.round(x+columnWidth*index)+.5;ctx.beginPath();ctx.moveTo(separatorX,layoutY(sourceY+18,layout));ctx.lineTo(separatorX,layoutY(sourceY+sourceH-18,layout));ctx.stroke();}ctx.restore();days.forEach(function(day,index){if(coldDayIndexes.has(day.dayIndex))drawSlide1DayMarker('COLD',x+columnWidth*index,y,columnWidth,h);if(hotDayIndexes.has(day.dayIndex))drawSlide1DayMarker('HOT',x+columnWidth*index,y,columnWidth,h);});days.forEach(function(day,index){const centerX=x+columnWidth*(index+.5),icon=dailyIcons[index];plainText(day.weekdayLabel,centerX,layoutY(sourceY+40,layout),17*s,700,slide1Ink,'center');plainText(day.dayLabel,centerX,layoutY(sourceY+66,layout),19*s,560,slide1Ink,'center');drawImageCentered(icon,centerX,layoutY(sourceY+133,layout),106*s,82*s);const minLabel=String(Math.round(day.minTemperatureC))+'°',maxLabel=String(Math.round(day.maxTemperatureC))+'°';plainText(minLabel,centerX-7,layoutY(sourceY+210,layout),24*s,600,slide1Ink,'right');plainText('/',centerX,layoutY(sourceY+210,layout),17*s,450,slide1Ink,'center');plainText(maxLabel,centerX+7,layoutY(sourceY+210,layout),24*s,600,slide1Ink,'left');});}`,
    `function drawSlide1FeedSignature(layout=FEED_LAYOUT){const s=layout.visualScale;text(model.signature||model.brand.slogan,${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.x},layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.baseline},layout),${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.size}*s,${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.weight},rgba(ink,${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.colorAlpha}),'center');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.underlineWidth};ctx.lineCap='round';ctx.beginPath();ctx.moveTo(${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.underlineStartX},layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.underlineY},layout));ctx.lineTo(${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.underlineEndX},layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.signature.underlineY},layout));ctx.stroke();ctx.restore();}`,
    `function drawWeeklySharedFrame(canvas,background,logo,titleContent){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);drawSlide1Header(logo,plan.headerDateFeed,width);box(${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},${WEEKLY_SLIDE1_DAILY_FEED_GRID.title.y},${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},${WEEKLY_SLIDE1_DAILY_FEED_GRID.title.height});drawOverviewTitle(titleContent);}`,
    `function drawSlide1PublicationComposition(logo,dailyIcons,daylightIcon,thermometerIcon,layout=FEED_LAYOUT){drawSlide1Header(logo,plan.headerDateFeed,${WEEKLY_CAROUSEL_WIDTH},layout);box(${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.title.y},layout),${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},layoutH(${WEEKLY_SLIDE1_DAILY_FEED_GRID.title.height},layout));drawOverviewTitle(plan.overviewTitle,layout);drawSlide1Facts(plan.slide1,dailyIcons,daylightIcon,thermometerIcon,layout);drawSlide1Summary(plan.slide1,layout);slide1StripBox(${WEEKLY_SLIDE1_DAILY_FEED_GRID.x},layoutY(${WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.y},layout),${WEEKLY_SLIDE1_DAILY_FEED_GRID.width},layoutH(${WEEKLY_SLIDE1_DAILY_FEED_GRID.dailyStrip.height},layout));drawSlide1DayStrip(plan.slide1.dailyStrip,dailyIcons,plan.slide1,layout);drawSlide1FeedSignature(layout);}`,
    `function drawSlide1Overview(canvas,slide,background,logo,dailyIcons,daylightIcon,thermometerIcon){ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);cover(background,canvas.width,canvas.height);drawSlide1PublicationComposition(logo,dailyIcons,daylightIcon,thermometerIcon);}`,
    `function drawSlide1Story(canvas,slide,background,logo,dailyIcons,daylightIcon,thermometerIcon){ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);cover(background,canvas.width,canvas.height);drawSlide1PublicationComposition(logo,dailyIcons,daylightIcon,thermometerIcon,STORY_LAYOUT);}`,
    `function drawSlide2Number(canvas,slide,background,logo,icon){const content=slide.weeklyNumber,x=${WEEKLY_SLIDE2_DAILY_FEED_GRID.x},y=${WEEKLY_SLIDE2_DAILY_FEED_GRID.numberBox.y},w=${WEEKLY_SLIDE2_DAILY_FEED_GRID.width},h=${WEEKLY_SLIDE2_DAILY_FEED_GRID.numberBox.height};ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);cover(background,canvas.width,canvas.height);drawSlide1Header(logo,plan.headerDateFeed,canvas.width);box(x,${WEEKLY_SLIDE2_DAILY_FEED_GRID.title.y},w,${WEEKLY_SLIDE2_DAILY_FEED_GRID.title.height});drawOverviewTitle(content);box(x,y,w,h);drawImageCentered(icon,x+w/2,y+252,224,172);const valueSize=fittedSize(content.valueLabel,w-100,152,82,700);plainText(content.valueLabel,x+w/2,y+470,valueSize,700,ink,'center');const unitSize=fittedSize(content.unitLabel,w-120,28,18,700);trackedText(content.unitLabel,x+w/2,y+530,unitSize,700,ink,1.2,'center');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w/2-26,y+567);ctx.lineTo(x+w/2+26,y+567);ctx.stroke();ctx.restore();completePlainWrap(content.explanation,x+w/2,y+660,w-150,38,29,20,550,ink,'center',2);drawSlide1FeedSignature();}`,
    `function drawComparisonItem(item,cx,valueY,labelY){plainText(item.value,cx,valueY,fittedSize(item.value,390,58,42,760),760,slide1Ink,'center');completePlainWrap(item.label,cx,labelY,390,25,22,18,650,slide1Ink,'center',2);}`,
    `function complementaryBoxLayout(content,w){const visual=content.presentation,settings=${JSON.stringify(WEEKLY_COMPLEMENTARY_BOX_LAYOUT)},available=settings.bottom-settings.top-settings.gap*2,subtitleLines=Math.max(1,Math.min(2,wrappedLines(visual.subtitle,w-100,29,760).length)),referenceLines=visual.comparison?2:Math.max(1,Math.min(3,wrappedLines(content.secondaryLine,w-150,26,560).length)),editorialLines=Math.max(1,Math.min(3,wrappedLines(visual.editorialLine,w-136,30,620).length)),minimum=[settings.primary.minimumHeight,settings.secondary.minimumHeight,settings.editorial.minimumHeight],wanted=[Math.max(minimum[0],settings.primary.preferredHeight+(subtitleLines-1)*32),Math.max(minimum[1],visual.comparison?settings.secondary.preferredHeight:150+referenceLines*34),Math.max(minimum[2],145+editorialLines*38)],wantedTotal=wanted.reduce((sum,value)=>sum+value,0);let heights=wanted.slice();if(wantedTotal<available){const extra=available-wantedTotal;heights=[wanted[0]+extra*.4,wanted[1]+extra*.25,wanted[2]+extra*.35];}else if(wantedTotal>available){const reducible=wanted.reduce((sum,value,index)=>sum+Math.max(0,value-minimum[index]),0),overflow=wantedTotal-available;if(reducible<overflow)throw new Error('weekly_complementary_content_does_not_fit');heights=wanted.map((value,index)=>value-Math.max(0,value-minimum[index])*overflow/reducible);}heights=heights.map(Math.round);heights[2]=available-heights[0]-heights[1];const primary={y:settings.top,height:heights[0]},secondary={y:settings.top+heights[0]+settings.gap,height:heights[1]},editorial={y:settings.top+heights[0]+settings.gap+heights[1]+settings.gap,height:heights[2]};return{primary,secondary,editorial};}`,
    `function drawComplementaryPrimaryBox(content,icon,x,y,w,h){const visual=content.presentation,offset=(h-370)/2;drawImageCentered(icon,x+w/2,y+110+offset,150,118);plainText(visual.headline,x+w/2,y+245+offset,fittedSize(visual.headline,w-110,112,62,700),700,ink,'center');completePlainWrap(visual.subtitle,x+w/2,y+306+offset,w-100,32,29,23,650,ink,'center',2);ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+w/2-26,y+h-30);ctx.lineTo(x+w/2+26,y+h-30);ctx.stroke();ctx.restore();}`,
    `function drawComplementarySecondaryBox(content,x,y,w,h){const visual=content.presentation,offset=(h-250)/2;if(visual.comparison){const leftX=x+w*.28,rightX=x+w*.72;drawComparisonItem(visual.comparison.left,leftX,y+100+offset,y+158+offset);drawComparisonItem(visual.comparison.right,rightX,y+100+offset,y+158+offset);ctx.save();ctx.strokeStyle=rgba(ink,.13);ctx.lineWidth=1.05;ctx.beginPath();ctx.moveTo(x+w/2,y+36);ctx.lineTo(x+w/2,y+h-36);ctx.stroke();ctx.restore();return;}trackedText('REPÈRE',x+w/2,y+60+offset,18,700,ink,2.4,'center');completePlainWrap(content.secondaryLine,x+w/2,y+140+offset,w-150,34,26,19,550,rgba(ink,.99),'center',3);}`,
    `function drawComplementaryEditorialBox(content,x,y,w,h){const visual=content.presentation,left=x+${LOKA_EDITORIAL_SUMMARY_FRAME.insetX},offset=(h-245)/2;ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=${LOKA_EDITORIAL_SUMMARY_FRAME.accent.lineWidth};ctx.lineCap='round';ctx.beginPath();ctx.moveTo(left,y+61+offset);ctx.lineTo(left+${LOKA_EDITORIAL_SUMMARY_FRAME.accent.width},y+61+offset);ctx.stroke();ctx.restore();completePlainWrap(visual.editorialLine,left,y+142+offset,w-${LOKA_EDITORIAL_SUMMARY_FRAME.insetX * 2},38,${LOKA_EDITORIAL_SUMMARY_FRAME.primary.maximumSize},${LOKA_EDITORIAL_SUMMARY_FRAME.primary.minimumSize},${LOKA_EDITORIAL_SUMMARY_FRAME.primary.weight},ink,'left',3);}`,
    `function drawComplementarySlide(canvas,slide,background,logo,icon){const content=slide.complementary,x=${WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID.x},w=${WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID.width};if(!content||content.frame!=='WEEKLY_SHARED_V1'||!content.presentation)throw new Error('weekly_shared_frame_required');const layout=complementaryBoxLayout(content,w);drawWeeklySharedFrame(canvas,background,logo,content);box(x,layout.primary.y,w,layout.primary.height);box(x,layout.secondary.y,w,layout.secondary.height);box(x,layout.editorial.y,w,layout.editorial.height);drawComplementaryPrimaryBox(content,icon,x,layout.primary.y,w,layout.primary.height);drawComplementarySecondaryBox(content,x,layout.secondary.y,w,layout.secondary.height);drawComplementaryEditorialBox(content,x,layout.editorial.y,w,layout.editorial.height);drawSlide1FeedSignature();}`,
    "function drawPublicationSlide(canvas,slide){if(slide.kind==='WEEKLY_NUMBER')return Promise.all([load(slide.backgroundUrl,'slide2_background'),load(model.brand.logoUrl,'slide2_logo'),load(model.weeklyNumberPictogram,'slide2_pictogram')]).then(function(images){drawSlide2Number(canvas,slide,images[0],images[1],images[2]);});if(slide.kind==='COMPLEMENTARY_NUMBER'||slide.kind==='COMPLEMENTARY_PRACTICAL'||slide.kind==='COMPLEMENTARY_DETAIL')return Promise.all([load(slide.backgroundUrl,'contextual_background'),load(model.brand.logoUrl,'contextual_logo'),load(slide.complementaryPictogramUrl,'contextual_pictogram')]).then(function(images){drawComplementarySlide(canvas,slide,images[0],images[1],images[2]);});if(slide.kind!=='OVERVIEW')return drawSlide(canvas,slide);const base=[load(slide.backgroundUrl,'slide1_background'),load(model.brand.logoUrl,'slide1_logo')],dailyPictograms=plan.slide1.dailyStrip.map(function(day){return load(day.pictogram.url,'slide1_pictogram_'+day.dayIndex);}),utilityPictograms=[load(model.slide1UtilityPictograms.daylight,'slide1_daylight'),load(model.slide1UtilityPictograms.thermometer,'slide1_thermometer')];return Promise.all([...base,...dailyPictograms,...utilityPictograms]).then(function(images){const dailyOffset=2,utilityOffset=dailyOffset+dailyPictograms.length;drawSlide1Overview(canvas,slide,images[0],images[1],images.slice(dailyOffset,utilityOffset),images[utilityOffset],images[utilityOffset+1]);});}",
    "function drawWeeklyDayHighlight(kind,x,y,w,h){if(!kind)return;const preferred=kind==='PREFERRED';ctx.save();rr(x+5,y+6,w-10,h-12,18);ctx.fillStyle=preferred?'rgba(253,181,21,.10)':'rgba(18,38,74,.075)';ctx.fill();ctx.strokeStyle=preferred?gold:ink;ctx.lineWidth=2.25;ctx.stroke();ctx.restore();}",
    "function drawWeeklyDayStrip(days,dailyIcons){const x=50,y=1060,w=980,h=190,columnWidth=w/days.length;days.forEach(function(day,index){drawWeeklyDayHighlight(day.highlight,x+columnWidth*index,y,columnWidth,h);});ctx.save();ctx.strokeStyle='rgba(18,38,74,.16)';ctx.lineWidth=1.15;for(let index=1;index<days.length;index++){const separatorX=x+columnWidth*index;ctx.beginPath();ctx.moveTo(separatorX,y+15);ctx.lineTo(separatorX,y+h-15);ctx.stroke();}ctx.restore();days.forEach(function(day,index){const centerX=x+columnWidth*(index+.5),icon=dailyIcons[index];text(day.weekdayLabel,centerX,y+32,15,780,ink,'center');text(day.dayLabel,centerX,y+55,18,760,ink,'center');drawImageCentered(icon,centerX,y+104,88,66);const minLabel=String(Math.round(day.minTemperatureC))+'°',maxLabel=String(Math.round(day.maxTemperatureC))+'°';text(minLabel,centerX-7,y+165,22,780,ink,'right');text('/',centerX,y+165,16,680,ink,'center');text(maxLabel,centerX+7,y+165,22,780,gold,'left');});}",
    "function drawPreferredCard(card,mainIcon,slotIcons){const x=74,y=360,w=932,h=320;ctx.save();rr(x,y,w,h,30);ctx.fillStyle='rgba(255,255,255,.115)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.76)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();const badgeLabel='LE JOUR À PRIVILÉGIER',badgeWidth=276;ctx.save();rr(x+242,y+18,badgeWidth,40,20);ctx.fillStyle=gold;ctx.fill();ctx.restore();text(badgeLabel,x+242+badgeWidth/2,y+46,17,800,ink,'center');drawImageCentered(mainIcon,x+110,y+126,142,108);const dateLabel=card.weekdayLabel+'. '+card.dayLabel;text(dateLabel,x+205,y+134,fittedSize(dateLabel,390,66,42,820),820,ink,'left');text(card.weatherLabel,x+205,y+179,fittedSize(card.weatherLabel,390,28,18,780),780,ink,'left');ctx.save();ctx.strokeStyle='rgba(18,38,74,.23)';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(x+596,y+77);ctx.lineTo(x+596,y+194);ctx.moveTo(x+22,y+205);ctx.lineTo(x+w-22,y+205);ctx.stroke();ctx.restore();text(String(Math.round(card.minTemperatureC))+'°',x+676,y+137,61,820,ink,'center');text(String(Math.round(card.maxTemperatureC))+'°',x+829,y+137,61,820,gold,'center');trackedText('MIN',x+676,y+171,14,720,ink,3,'center');trackedText('MAX',x+829,y+171,14,720,ink,3,'center');const slotsLeft=x+40,columnWidth=(w-80)/card.slots.length;card.slots.forEach(function(slot,index){const centerX=slotsLeft+columnWidth*(index+.5),icon=slotIcons[index];text(String(slot.hour).padStart(2,'0')+'h',centerX,y+235,18,720,ink,'center');drawImageCentered(icon,centerX-22,y+267,76,54);text(String(Math.round(slot.temperatureC))+'°',centerX+22,y+280,27,800,ink,'left');if(index<card.slots.length-1){ctx.save();ctx.strokeStyle='rgba(18,38,74,.18)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(centerX+columnWidth/2,y+223);ctx.lineTo(centerX+columnWidth/2,y+300);ctx.stroke();ctx.restore();}});}",
    "function drawWatchCard(card,mainIcon,slotIcons){const x=74,y=704,w=932,h=320;ctx.save();rr(x,y,w,h,30);ctx.fillStyle='rgba(255,255,255,.115)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.76)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();const badgeLabel='LE JOUR À SURVEILLER',badgeWidth=270;ctx.save();rr(x+242,y+18,badgeWidth,40,20);ctx.fillStyle=ink;ctx.fill();ctx.restore();text(badgeLabel,x+242+badgeWidth/2,y+46,17,800,'#FFFFFF','center');drawImageCentered(mainIcon,x+110,y+126,142,108);const dateLabel=card.weekdayLabel+'. '+card.dayLabel;text(dateLabel,x+205,y+134,fittedSize(dateLabel,390,66,42,820),820,ink,'left');text(card.weatherLabel,x+205,y+179,fittedSize(card.weatherLabel,390,28,18,780),780,ink,'left');ctx.save();ctx.strokeStyle='rgba(18,38,74,.23)';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(x+596,y+77);ctx.lineTo(x+596,y+194);ctx.moveTo(x+22,y+205);ctx.lineTo(x+w-22,y+205);ctx.stroke();ctx.restore();text(String(Math.round(card.minTemperatureC))+'°',x+676,y+137,61,820,ink,'center');text(String(Math.round(card.maxTemperatureC))+'°',x+829,y+137,61,820,gold,'center');trackedText('MIN',x+676,y+171,14,720,ink,3,'center');trackedText('MAX',x+829,y+171,14,720,ink,3,'center');const slotsLeft=x+40,columnWidth=(w-80)/card.slots.length;card.slots.forEach(function(slot,index){const centerX=slotsLeft+columnWidth*(index+.5),icon=slotIcons[index];text(String(slot.hour).padStart(2,'0')+'h',centerX,y+235,18,720,ink,'center');drawImageCentered(icon,centerX-22,y+267,76,54);text(String(Math.round(slot.temperatureC))+'°',centerX+22,y+280,27,800,ink,'left');if(index<card.slots.length-1){ctx.save();ctx.strokeStyle='rgba(18,38,74,.18)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(centerX+columnWidth/2,y+223);ctx.lineTo(centerX+columnWidth/2,y+300);ctx.stroke();ctx.restore();}});}",
    "function drawFeaturedDayCard(card,mainIcon,slotIcons,kind){const x=74,y=360,w=932,h=664,preferred=kind==='PREFERRED',badgeLabel=preferred?'LE JOUR À PRIVILÉGIER':'LE JOUR À SURVEILLER',badgeWidth=preferred?276:270;ctx.save();rr(x,y,w,h,32);ctx.fillStyle='rgba(255,255,255,.115)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.76)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();ctx.save();rr(x+(w-badgeWidth)/2,y+40,badgeWidth,44,22);ctx.fillStyle=preferred?gold:ink;ctx.fill();ctx.restore();text(badgeLabel,x+w/2,y+69,18,800,preferred?ink:'#FFFFFF','center');drawImageCentered(mainIcon,x+150,y+260,188,142);const dateLabel=card.weekdayLabel+'. '+card.dayLabel;text(dateLabel,x+286,y+257,fittedSize(dateLabel,300,78,50,820),820,ink,'left');text(card.weatherLabel,x+286,y+317,fittedSize(card.weatherLabel,310,31,19,780),780,ink,'left');ctx.save();ctx.strokeStyle='rgba(18,38,74,.23)';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(x+606,y+150);ctx.lineTo(x+606,y+336);ctx.moveTo(x+22,y+376);ctx.lineTo(x+w-22,y+376);ctx.stroke();ctx.restore();text(String(Math.round(card.minTemperatureC))+'°',x+700,y+258,76,820,ink,'center');text(String(Math.round(card.maxTemperatureC))+'°',x+846,y+258,76,820,gold,'center');trackedText('MIN',x+700,y+304,15,720,ink,3,'center');trackedText('MAX',x+846,y+304,15,720,ink,3,'center');const slotsLeft=x+40,columnWidth=(w-80)/card.slots.length;card.slots.forEach(function(slot,index){const centerX=slotsLeft+columnWidth*(index+.5),icon=slotIcons[index];text(String(slot.hour).padStart(2,'0')+'h',centerX,y+456,21,720,ink,'center');drawImageCentered(icon,centerX-25,y+520,96,70);text(String(Math.round(slot.temperatureC))+'°',centerX+30,y+548,32,800,ink,'left');if(index<card.slots.length-1){ctx.save();ctx.strokeStyle='rgba(18,38,74,.18)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(centerX+columnWidth/2,y+404);ctx.lineTo(centerX+columnWidth/2,y+574);ctx.stroke();ctx.restore();}});}",
    "function drawSummaryCard(slide){const x=74,y=460,w=932,h=452,calm=plan.status==='CALM',heading=calm?'UNE SEMAINE CALME':'LE POINT MÉTÉO DE LA SEMAINE';ctx.save();rr(x,y,w,h,32);ctx.fillStyle='rgba(255,255,255,.115)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.76)';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();text(heading,540,y+145,fittedSize(heading,720,36,24,800),800,ink,'center');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(510,y+173);ctx.lineTo(570,y+173);ctx.stroke();ctx.restore();wrap(slide.body,540,y+250,730,44,30,540,ink,'center',3);}",
    "function drawOverview(canvas,slide,background,logo,dailyIcons,preferredCard,watchCard){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawHeader(logo,plan.headerDateLabel,width);box(50,160,980,150);drawOverviewTitle(plan.overviewTitle);box(50,336,980,700);if(preferredCard&&watchCard){drawPreferredCard(preferredCard.card,preferredCard.mainIcon,preferredCard.slotIcons);drawWatchCard(watchCard.card,watchCard.mainIcon,watchCard.slotIcons);}else if(preferredCard)drawFeaturedDayCard(preferredCard.card,preferredCard.mainIcon,preferredCard.slotIcons,'PREFERRED');else if(watchCard)drawFeaturedDayCard(watchCard.card,watchCard.mainIcon,watchCard.slotIcons,'WATCH');else drawSummaryCard(slide);box(50,1060,980,190);drawWeeklyDayStrip(plan.dailySummaries,dailyIcons);drawSignature(1304,'rgba(255,255,255,.94)');}",
    "function activityStyle(status){if(status==='FAVORABLE')return{fill:'rgba(221,243,225,.86)',color:'#21613b'};if(status==='UNFAVORABLE')return{fill:'rgba(249,226,223,.86)',color:'#8c302b'};return{fill:'rgba(250,239,211,.86)',color:'#7a5b16'};}",
    "function drawActivityRows(activities,startY){const rows=activities.slice(0,3);if(!rows.length)return;const rowHeight=rows.length===3?62:rows.length===2?72:88;rows.forEach((activity,index)=>{const y=startY+index*rowHeight,style=activityStyle(activity.status);ctx.save();rr(101,y,820,rowHeight-10,18);ctx.fillStyle=style.fill;ctx.fill();ctx.restore();const size=fittedSize(activity.text,770,17,12,620);text(activity.text,124,y+27,size,620,style.color,'left');});}",
    "function drawEvent(canvas,slide,background,logo,icon){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawHeader(logo,plan.headerDateLabel,width);text('TEMPS FORT MÉTÉO',58,174,22,780,ink,'left');sceneBadge(icon,slide.scene,58,205,964,160);box(58,395,964,910);const titleSize=fittedSize(slide.title,820,58,36,820);wrap(slide.title,101,500,820,58,titleSize,820,ink,'left',2);text(slide.dateLabel,101,585,19,540,ink,'left');wrap(slide.body,101,648,820,34,26,540,ink,'left',3);if(slide.activities.length){text('POUR VOS ACTIVITÉS',101,780,18,780,ink,'left');drawActivityRows(slide.activities,812);}drawSignature(1368);}",
    "function drawStory(canvas,relay,background,logo,icon){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawStoryHeader(logo,plan.headerDateLabel);text('RELAIS DE LA PUBLICATION',58,225,24,780,ink,'left');box(58,470,964,820);drawImageCentered(icon,540,602,150,116);const titleSize=fittedSize(relay.title,820,58,36,820);wrap(relay.title,101,770,820,58,titleSize,820,ink,'left',2);wrap(relay.body,101,890,820,38,28,540,ink,'left',2);ctx.save();rr(101,1050,430,72,36);ctx.fillStyle=gold;ctx.fill();ctx.restore();text(relay.cta,316,1096,24,800,'#ffffff','center');text('Faites défiler le carrousel',540,1778,22,600,'#ffffff','center');drawSignature(1830,'#ffffff');}",
    "function drawSlide(canvas,slide){const base=[load(slide.backgroundUrl,'background_'+slide.index),load(model.brand.logoUrl,'logo')];if(slide.kind==='OVERVIEW'){const dailyPictograms=plan.dailySummaries.map(function(day){return load(day.pictogram.url,'weekly_pictogram_'+day.dayIndex);});const preferredCard=plan.dailyCardDetails.find(function(card){return card.kind==='PREFERRED';})||null;const watchCard=plan.dailyCardDetails.find(function(card){return card.kind==='WATCH';})||null;const preferredPictograms=preferredCard?[load(preferredCard.pictogram.url,'central_preferred_main_'+preferredCard.dayIndex),...preferredCard.slots.map(function(slot){return load(slot.pictogram.url,'central_preferred_hour_'+slot.hour);})]:[];const watchPictograms=watchCard?[load(watchCard.pictogram.url,'central_watch_main_'+watchCard.dayIndex),...watchCard.slots.map(function(slot){return load(slot.pictogram.url,'central_watch_hour_'+slot.hour);})]:[];return Promise.all([...base,...dailyPictograms,...preferredPictograms,...watchPictograms]).then(function(images){const dailyIconOffset=2,preferredIconOffset=dailyIconOffset+dailyPictograms.length,watchIconOffset=preferredIconOffset+preferredPictograms.length;const preferredVisual=preferredCard?{card:preferredCard,mainIcon:images[preferredIconOffset],slotIcons:images.slice(preferredIconOffset+1,preferredIconOffset+1+preferredCard.slots.length)}:null;const watchVisual=watchCard?{card:watchCard,mainIcon:images[watchIconOffset],slotIcons:images.slice(watchIconOffset+1,watchIconOffset+1+watchCard.slots.length)}:null;drawOverview(canvas,slide,images[0],images[1],images.slice(dailyIconOffset,preferredIconOffset),preferredVisual,watchVisual);});}return Promise.all([...base,load(slide.scene.pictogramUrl,'pictogram_'+slide.scene.id)]).then(function(images){drawEvent(canvas,slide,images[0],images[1],images[2]);});}",
    "function drawSlide1StoryExport(){const slide=plan.slides.find(function(item){return item.kind==='OVERVIEW';});if(!slide||!storyCanvas)return Promise.resolve();const base=[load(slide.backgroundUrl,'slide1_story_background'),load(model.brand.logoUrl,'slide1_story_logo')],dailyPictograms=plan.slide1.dailyStrip.map(function(day){return load(day.pictogram.url,'slide1_story_pictogram_'+day.dayIndex);}),utilityPictograms=[load(model.slide1UtilityPictograms.daylight,'slide1_story_daylight'),load(model.slide1UtilityPictograms.thermometer,'slide1_story_thermometer')];return Promise.all([...base,...dailyPictograms,...utilityPictograms]).then(function(images){const dailyOffset=2,utilityOffset=dailyOffset+dailyPictograms.length;drawSlide1Story(storyCanvas,slide,images[0],images[1],images.slice(dailyOffset,utilityOffset),images[utilityOffset],images[utilityOffset+1]);});}",
    "function canvasFile(targetCanvas,name){return new Promise(function(resolve){targetCanvas.toBlob(function(blob){resolve(blob?new File([blob],name,{type:'image/png'}):null);},'image/png');});}",
    "function fallbackDownload(file){if(!file)return;const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}",
    "async function shareCanvas(targetCanvas,name){const file=await canvasFile(targetCanvas,name);if(!file)return;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:'LOKA!'});return;}catch(error){if(error&&error.name==='AbortError')return;}}fallbackDownload(file);}",
    "Promise.all(plan.slides.map(function(slide,index){return drawPublicationSlide(slideCanvases[index],slide);})).catch(function(error){console.error(error);});",
    "if(storyCanvas)drawSlide1StoryExport().catch(function(error){console.error(error);});",
    "document.querySelectorAll('.download-slide').forEach(function(button,index){button.addEventListener('click',function(){const slide=plan.slides[index];shareCanvas(slideCanvases[index],'loka-semaine-'+String((slide?slide.index:index)+1).padStart(2,'0')+'.png');});});",
    "const storyDownload=document.querySelector('.download-slide1-story');if(storyDownload&&storyCanvas)storyDownload.addEventListener('click',function(){shareCanvas(storyCanvas,'loka-semaine-01-story.png');});"
  ].join("\n");

  return shell + script + "</script></body></html>";
}
