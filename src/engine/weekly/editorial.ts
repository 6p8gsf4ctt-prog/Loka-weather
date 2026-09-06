import { scene24DisplayTitle } from "../scenes24/displayTitles";
import { masterUrlForScene, scene24ById } from "../scenes24/registry";
import type { Scene24Id, VisualIcon } from "../../types";
import type { WeeklyActivity, WeeklyActivityInsight } from "./activities";
import type { SelectedWeeklyEvent, WeeklySelection } from "./selection";
import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";

export interface WeeklySceneReference {
  id: Scene24Id;
  key: string;
  title: string;
  displayTitle: string;
  family: string;
  masterUrl: string;
  visualIcon: VisualIcon;
  emoji: string;
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
    id: scene.id,
    key: scene.key,
    title: scene.label,
    displayTitle: scene24DisplayTitle(scene.id),
    family: scene.family,
    masterUrl: masterUrlForScene(scene.id),
    visualIcon: scene.visualIcon,
    emoji: scene.emoji
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

function activityTexts(event: SelectedWeeklyEvent, insights: WeeklyActivityInsight[]): WeeklyActivityText[] {
  const bestByActivity = new Map<WeeklyActivity, WeeklyActivityInsight>();
  for (const insight of insights.filter((item) => item.eventId === event.id)) {
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

export function buildWeeklyEditorial(
  profiles: WeeklyProfileSet,
  selection: WeeklySelection,
  activities: { insights: WeeklyActivityInsight[] },
  cityName = "Tarnos"
): WeeklyEditorial {
  if (profiles.citySlug !== selection.citySlug) throw new Error(`weekly_editorial_city_mismatch:${profiles.citySlug}:${selection.citySlug}`);
  const events = selection.events.map((event): WeeklyEditorialEvent => {
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
  const overview = selection.status === "CALM"
    ? {
      title: `Une semaine calme à ${cityName}`,
      body: `La semaine restera globalement stable à ${cityName}. Aucun changement météo suffisamment marqué n’est retenu.`,
      scene: overviewScene
    }
    : {
      title: `La semaine à ${cityName}`,
      body: events.length === 1 ? "Un temps fort météo est retenu cette semaine." : `${events.length} temps forts météo sont retenus cette semaine.`,
      scene: overviewScene
    };
  return {
    version: "0.1.0",
    citySlug: profiles.citySlug,
    startDate: profiles.startDate,
    endDate: profiles.endDate,
    status: selection.status,
    overview,
    events,
    signature: "Ici, cette semaine."
  };
}
