import { scene24DisplayTitle } from "../scenes24/displayTitles";
import { masterUrlForScene, scene24ById } from "../scenes24/registry";
import type { Scene24Id, SceneDecisionV24, VisualIcon } from "../../types";
import type { WeeklyActivity, WeeklyActivityInsight } from "./activities";
import type { SelectedWeeklyEvent, WeeklySelection } from "./selection";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";
import { orderWeeklyEvents } from "./narrativeOrder";
import { buildWeeklyConclusion } from "./conclusion";

export interface WeeklySceneReference {
  source: "DAILY_V24_DECISION";
  date: string;
  dayIndex: number;
  id: Scene24Id;
  key: string;
  title: string;
  displayTitle: string;
  family: string;
  masterUrl: string;
  visualIcon: VisualIcon;
  emoji: string;
  decisionVersion: string;
  doctrineVersion: string;
  validity: SceneDecisionV24["validity"];
  confidence: SceneDecisionV24["confidence"];
  resolutionMode: SceneDecisionV24["resolutionMode"];
}

export interface WeeklyActivityText {
  activity: WeeklyActivity;
  status: WeeklyActivityInsight["status"];
  text: string;
  bestWindow: WeeklyActivityInsight["bestWindow"];
}

export interface WeeklyEditorialEvent {
  id: string;
  type: SelectedWeeklyEvent["type"];
  startDate: string;
  endDate: string;
  title: string;
  body: string;
  activities: WeeklyActivityText[];
  scene: WeeklySceneReference;
}

/**
 * A compact, read-only reference to one of the seven daily V24 decisions.
 * It is the only source of data for the lower weekly strip; the renderer must
 * never independently classify a day or choose another pictogram.
 */
export interface WeeklyDailySummary {
  date: string;
  dayIndex: number;
  minTemperatureC: number;
  maxTemperatureC: number;
  scene: WeeklySceneReference;
}

export type WeeklyDailyHighlightKind = "PREFERRED" | "WATCH";

/**
 * A factual weekly marker tied to a selected event. The weekly strip may use
 * it visually later, but it never has permission to create a marker itself.
 */
export interface WeeklyDailyHighlight {
  kind: WeeklyDailyHighlightKind;
  dayIndex: number;
  date: string;
  sourceEventId: string;
  sourceEventType: SelectedWeeklyEvent["type"];
}

export interface WeeklyEditorial {
  version: "0.1.0";
  citySlug: string;
  startDate: string;
  endDate: string;
  status: WeeklySelection["status"];
  overview: {
    title: string;
    body: string;
    scene: WeeklySceneReference;
  };
  /** Monday to Sunday, derived directly from the seven daily V24 profiles. */
  dailySummaries: WeeklyDailySummary[];
  /** Zero, one or two factual markers derived from selected weekly events. */
  dailyHighlights: WeeklyDailyHighlight[];
  events: WeeklyEditorialEvent[];
  signature: "Ici, cette semaine.";
}

const ACTIVITY_LABELS: Record<WeeklyActivity, string> = {
  BEACH: "Plage",
  OUTDOOR_WALK: "Promenade",
  OUTDOOR_SPORT: "Sport extérieur"
};

function numberValue(event: SelectedWeeklyEvent, key: string): number | null {
  const value = event.evidence[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatCelsius(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)} °C`;
}

function formatMm(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")} mm`;
}

function formatHour(value: number | null): string {
  return value === null ? "—" : `${String(Math.round(value)).padStart(2, "0")} h`;
}

function formatDate(date: string, withYear = false): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {})
  }).format(new Date(`${date}T12:00:00Z`));
}

function dateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDate(startDate) : `du ${formatDate(startDate)} au ${formatDate(endDate)}`;
}

function dayForEvent(profiles: WeeklyProfileSet, event: SelectedWeeklyEvent): WeeklyDayProfile {
  const days = event.dayIndexes
    .map((dayIndex) => profiles.days.find((day) => day.dayIndex === dayIndex))
    .filter((day): day is WeeklyDayProfile => !!day);
  if (!days.length) throw new Error(`weekly_editorial_unknown_event_day:${event.id}`);
  const measure = (day: WeeklyDayProfile): number => {
    if (event.type === "HEAT") return day.fullDay.maxTemperatureC;
    if (event.type === "COLD") return -day.fullDay.maxTemperatureC;
    if (event.type === "RAIN") return day.fullDay.precipitation.totalMm;
    if (event.type === "WIND") return day.fullDay.wind.maxGustKmh;
    if (event.type === "THUNDER") return day.fullDay.thunderHours * 10 + Math.max(...day.hours.map((point) => point.thunderstormSupport));
    if (event.type === "IMPROVEMENT" || event.type === "DEGRADATION") return Math.abs(day.daylight.evolution.cloudTrend);
    return numberValue(event, "hours") ?? 0;
  };
  return [...days].sort((a, b) => measure(b) - measure(a) || a.dayIndex - b.dayIndex)[0];
}

function sceneReference(day: WeeklyDayProfile): WeeklySceneReference {
  const decision = day.sceneDecision;
  const scene = scene24ById(decision.sceneId);
  return {
    source: "DAILY_V24_DECISION",
    date: day.date,
    dayIndex: day.dayIndex,
    id: scene.id,
    key: scene.key,
    title: scene.label,
    displayTitle: scene24DisplayTitle(scene.id),
    family: scene.family,
    masterUrl: masterUrlForScene(scene.id),
    visualIcon: scene.visualIcon,
    emoji: scene.emoji,
    decisionVersion: decision.version,
    doctrineVersion: decision.doctrineVersion,
    validity: decision.validity,
    confidence: decision.confidence,
    resolutionMode: decision.resolutionMode
  };
}

function eventTitle(event: SelectedWeeklyEvent): string {
  switch (event.type) {
    case "HEAT": return "Chaleur marquée";
    case "COLD": return "Fraîcheur marquée";
    case "RAIN": return "Épisode pluvieux";
    case "WIND": return "Vent fort";
    case "IMPROVEMENT": return "Amélioration nette";
    case "DEGRADATION": return "Dégradation nette";
    case "BEST_WINDOW": return "Meilleure fenêtre météo";
    case "THUNDER": return "Risque orageux";
  }
}

function eventBody(event: SelectedWeeklyEvent): string {
  const range = dateRange(event.startDate, event.endDate);
  switch (event.type) {
    case "HEAT": return `Une chaleur marquée est attendue ${range}, avec des maximales jusqu’à ${formatCelsius(numberValue(event, "maxTemperatureC"))}.`;
    case "COLD": return `Une fraîcheur marquée est attendue ${range}, avec un maximum proche de ${formatCelsius(numberValue(event, "maxTemperatureC"))}.`;
    case "RAIN": return `Un épisode pluvieux est attendu ${range}, avec un cumul proche de ${formatMm(numberValue(event, "totalMm"))}.`;
    case "WIND": {
      const gust = numberValue(event, "maxGustKmh");
      return gust === null
        ? `Des rafales soutenues sont possibles ${range}.`
        : `Des rafales jusqu’à ${Math.round(gust)} km/h sont possibles ${range}.`;
    }
    case "IMPROVEMENT": return `Le ciel s’éclaircira nettement ${range}, avec une baisse sensible de la couverture nuageuse.`;
    case "DEGRADATION": return `Le temps se chargera nettement ${range}, avec une hausse sensible de la couverture nuageuse.`;
    case "BEST_WINDOW": return `La meilleure fenêtre météo de la semaine se situe ${formatDate(event.startDate)}, entre ${formatHour(numberValue(event, "startHour"))} et ${formatHour(numberValue(event, "endHour"))}.`;
    case "THUNDER": return `Un risque orageux est détecté ${range} ; le signal est partagé entre les modèles.`;
  }
}

function reasonText(insight: WeeklyActivityInsight): string {
  const labels: Record<WeeklyActivityInsight["reasonCodes"][number], string> = {
    DRY: "temps sec", RAIN: "pluie", WIND: "vent", THUNDER: "orage", FOG: "brouillard",
    COLD: "fraîcheur", HEAT: "chaleur", CLOUD: "ciel chargé", FAVORABLE_WINDOW: "créneau favorable"
  };
  const reasons = insight.reasonCodes.map((code) => labels[code]).filter(Boolean);
  if (!reasons.length) return "conditions changeantes";
  if (reasons.length === 1) return reasons[0];
  return `${reasons.slice(0, -1).join(", ")} et ${reasons[reasons.length - 1]}`;
}

function activityText(insight: WeeklyActivityInsight): string {
  const label = ACTIVITY_LABELS[insight.activity];
  if (insight.status === "FAVORABLE" && insight.bestWindow) {
    return `${label} : meilleur créneau entre ${formatHour(insight.bestWindow.startHour)} et ${formatHour(insight.bestWindow.endHour)}.`;
  }
  if (insight.status === "FAVORABLE") return `${label} : conditions favorables sur la période évaluée.`;
  if (insight.status === "UNFAVORABLE") return `${label} : conditions peu favorables en raison de ${reasonText(insight)}.`;
  if (insight.bestWindow) return `${label} : fenêtre plus favorable entre ${formatHour(insight.bestWindow.startHour)} et ${formatHour(insight.bestWindow.endHour)}.`;
  return `${label} : conditions variables en raison de ${reasonText(insight)}.`;
}

const ACTIVITY_ORDER: WeeklyActivity[] = ["BEACH", "OUTDOOR_WALK", "OUTDOOR_SPORT"];

function activityInsightRank(insight: WeeklyActivityInsight): number {
  const statusWeight = insight.status === "UNFAVORABLE" ? 300 : insight.status === "FAVORABLE" ? 200 : 100;
  return statusWeight + (insight.bestWindow?.hours ?? 0);
}

function activityIsDirectlyRelevant(event: SelectedWeeklyEvent, insight: WeeklyActivityInsight): boolean {
  if (event.type === "BEST_WINDOW") return insight.bestWindow !== null;
  const directCodes: Record<SelectedWeeklyEvent["type"], WeeklyActivityInsight["reasonCodes"][number][]> = {
    HEAT: ["HEAT"],
    COLD: ["COLD"],
    RAIN: ["RAIN"],
    WIND: ["WIND"],
    IMPROVEMENT: ["CLOUD", "FAVORABLE_WINDOW"],
    DEGRADATION: ["CLOUD"],
    BEST_WINDOW: ["FAVORABLE_WINDOW"],
    THUNDER: ["THUNDER"]
  };
  return directCodes[event.type].some((code) => insight.reasonCodes.includes(code));
}

function activityTexts(event: SelectedWeeklyEvent, insights: WeeklyActivityInsight[]): WeeklyActivityText[] {
  const bestByActivity = new Map<WeeklyActivity, WeeklyActivityInsight>();
  for (const insight of insights.filter((item) => item.eventId === event.id && activityIsDirectlyRelevant(event, item))) {
    // A mixed result without a usable window is not strong enough for the
    // publication. This keeps the event slide focused on concrete advice.
    if (insight.status === "MIXED" && !insight.bestWindow) continue;
    const previous = bestByActivity.get(insight.activity);
    if (!previous || activityInsightRank(insight) > activityInsightRank(previous)
      || (activityInsightRank(insight) === activityInsightRank(previous) && insight.date < previous.date)) {
      bestByActivity.set(insight.activity, insight);
    }
  }
  return ACTIVITY_ORDER
    .map((activity) => bestByActivity.get(activity))
    .filter((insight): insight is WeeklyActivityInsight => !!insight)
    .map((insight) => ({ activity: insight.activity, status: insight.status, text: activityText(insight), bestWindow: insight.bestWindow }));
}

function calmOverview(profiles: WeeklyProfileSet): WeeklySceneReference {
  const day = [...profiles.days].sort((a, b) =>
    b.daylight.light.brightFraction - a.daylight.light.brightFraction
    || a.dayIndex - b.dayIndex
  )[0];
  if (!day) throw new Error("weekly_editorial_no_days_for_calm_overview");
  return sceneReference(day);
}

function weeklyDailySummaries(profiles: WeeklyProfileSet): WeeklyDailySummary[] {
  const days = [...profiles.days].sort((left, right) => left.dayIndex - right.dayIndex);
  if (days.length !== 7 || days.some((day, index) => day.dayIndex !== index)) {
    throw new Error(`weekly_editorial_requires_ordered_7_day_summaries:${days.length}`);
  }
  return days.map((day) => ({
    date: day.date,
    dayIndex: day.dayIndex,
    minTemperatureC: day.fullDay.minTemperatureC,
    maxTemperatureC: day.fullDay.maxTemperatureC,
    scene: sceneReference(day)
  }));
}

const WATCH_EVENT_PRIORITY: Record<SelectedWeeklyEvent["type"], number> = {
  THUNDER: 70,
  RAIN: 60,
  WIND: 50,
  DEGRADATION: 40,
  HEAT: 30,
  COLD: 30,
  BEST_WINDOW: 0,
  IMPROVEMENT: 0
};

function selectedByImportance(events: SelectedWeeklyEvent[]): SelectedWeeklyEvent[] {
  return [...events].sort((left, right) =>
    right.score - left.score
    || WATCH_EVENT_PRIORITY[right.type] - WATCH_EVENT_PRIORITY[left.type]
    || left.startDate.localeCompare(right.startDate)
    || left.id.localeCompare(right.id)
  );
}

function weeklyDailyHighlights(profiles: WeeklyProfileSet, selection: WeeklySelection): WeeklyDailyHighlight[] {
  if (selection.status === "CALM" || !selection.events.length) return [];

  const preferredEvent = selectedByImportance(selection.events.filter((event) => event.type === "BEST_WINDOW"))[0] ?? null;
  const preferred = preferredEvent ? dayForEvent(profiles, preferredEvent) : null;
  const watchEvent = selectedByImportance(selection.events.filter((event) => WATCH_EVENT_PRIORITY[event.type] > 0))[0] ?? null;
  const watch = watchEvent ? dayForEvent(profiles, watchEvent) : null;
  const highlights: WeeklyDailyHighlight[] = [];

  if (preferred && preferredEvent) {
    highlights.push({
      kind: "PREFERRED",
      dayIndex: preferred.dayIndex,
      date: preferred.date,
      sourceEventId: preferredEvent.id,
      sourceEventType: preferredEvent.type
    });
  }
  // A single column cannot carry two contradictory frames. When both events
  // resolve to the same day, retaining the practical best-window marker is
  // more honest than inventing a second watched day.
  if (watch && watchEvent && watch.dayIndex !== preferred?.dayIndex) {
    highlights.push({
      kind: "WATCH",
      dayIndex: watch.dayIndex,
      date: watch.date,
      sourceEventId: watchEvent.id,
      sourceEventType: watchEvent.type
    });
  }
  return highlights;
}

export function buildWeeklyEditorial(
  profiles: WeeklyProfileSet,
  selection: WeeklySelection,
  activities: { insights: WeeklyActivityInsight[] },
  cityName = "Tarnos"
): WeeklyEditorial {
  if (profiles.citySlug !== selection.citySlug) throw new Error(`weekly_editorial_city_mismatch:${profiles.citySlug}:${selection.citySlug}`);
  const orderedEvents = orderWeeklyEvents(selection.events);
  const events = orderedEvents.map((event): WeeklyEditorialEvent => {
    const day = dayForEvent(profiles, event);
    return {
      id: event.id,
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate,
      title: eventTitle(event),
      body: eventBody(event),
      activities: activityTexts(event, activities.insights),
      scene: sceneReference(day)
    };
  });
  const overviewScene = events[0]?.scene ?? calmOverview(profiles);
  const conclusion = buildWeeklyConclusion(orderedEvents, cityName);
  const overview = {
    title: conclusion.title,
    body: conclusion.body,
    scene: overviewScene
  };
  return {
    version: "0.1.0",
    citySlug: profiles.citySlug,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    status: selection.status,
    overview,
    dailySummaries: weeklyDailySummaries(profiles),
    dailyHighlights: weeklyDailyHighlights(profiles, selection),
    events,
    signature: "Ici, cette semaine."
  };
}
