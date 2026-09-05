import { scene24DisplayTitle } from "../scenes24/displayTitles";
import { chooseScene24V2 } from "../scenes24/classifier";
import { masterUrlForScene, scene24ById } from "../scenes24/registry";
import type { Scene24Id } from "../../types";
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
  visualIcon: string;
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
  return value === null ? "—" : `${Math.round(value * 10) / 10} mm`;
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
  const decision = chooseScene24V2(day.daylight);
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
    case "HEAT": return `La chaleur sera marquée ${range}, avec jusqu’à ${formatCelsius(numberValue(event, "maxTemperatureC"))}.`;
    case "COLD": return `Les températures resteront basses ${range}, avec un maximum proche de ${formatCelsius(numberValue(event, "maxTemperatureC"))}.`;
    case "RAIN": return `La pluie sera suffisamment présente ${range}, pour un cumul d’environ ${formatMm(numberValue(event, "totalMm"))}.`;
    case "WIND": return `Les rafales pourront atteindre ${numberValue(event, "maxGustKmh") === null ? "des niveaux élevés" : `${Math.round(numberValue(event, "maxGustKmh") as number)} km/h`} ${range}.`;
    case "IMPROVEMENT": return `Le ciel s’éclaircira progressivement ${range}, avec une baisse nette de la couverture nuageuse.`;
    case "DEGRADATION": return `Le temps se chargera progressivement ${range}, avec une hausse nette de la couverture nuageuse.`;
    case "BEST_WINDOW": return `Le créneau le plus favorable se situe ${formatDate(event.startDate)}, entre ${formatHour(numberValue(event, "startHour"))} et ${formatHour(numberValue(event, "endHour"))}.`;
    case "THUNDER": return `Un signal orageux suffisamment partagé entre les modèles est détecté ${range}.`;
  }
}

function reasonText(insight: WeeklyActivityInsight): string {
  const labels: Record<WeeklyActivityInsight["reasonCodes"][number], string> = {
    DRY: "temps sec", RAIN: "pluie", WIND: "vent", THUNDER: "orage", FOG: "brouillard",
    COLD: "fraîcheur", HEAT: "chaleur", CLOUD: "ciel chargé", FAVORABLE_WINDOW: "créneau favorable"
  };
  return insight.reasonCodes.map((code) => labels[code]).join(", ");
}

function activityText(insight: WeeklyActivityInsight): string {
  const label = ACTIVITY_LABELS[insight.activity];
  if (insight.status === "FAVORABLE" && insight.bestWindow) {
    return `${label} : créneau favorable entre ${formatHour(insight.bestWindow.startHour)} et ${formatHour(insight.bestWindow.endHour)}.`;
  }
  if (insight.status === "FAVORABLE") return `${label} : conditions favorables sur la période évaluée.`;
  if (insight.status === "UNFAVORABLE") return `${label} : conditions peu favorables en raison de ${reasonText(insight)}.`;
  if (insight.bestWindow) return `${label} : conditions variables, avec une fenêtre plus favorable entre ${formatHour(insight.bestWindow.startHour)} et ${formatHour(insight.bestWindow.endHour)}.`;
  return `${label} : conditions variables en raison de ${reasonText(insight)}.`;
}

function activityTexts(event: SelectedWeeklyEvent, insights: WeeklyActivityInsight[]): WeeklyActivityText[] {
  return insights
    .filter((insight) => insight.eventId === event.id)
    .sort((a, b) => ["BEACH", "OUTDOOR_WALK", "OUTDOOR_SPORT"].indexOf(a.activity) - ["BEACH", "OUTDOOR_WALK", "OUTDOOR_SPORT"].indexOf(b.activity))
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
      body: `Aucun changement météo suffisamment marqué n’est retenu pour cette semaine à ${cityName}.`,
      scene: overviewScene
    }
    : {
      title: `La semaine à ${cityName}`,
      body: events.length === 1 ? "Un temps fort météo mérite d’être suivi cette semaine." : `${events.length} temps forts météo méritent d’être suivis cette semaine.`,
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
