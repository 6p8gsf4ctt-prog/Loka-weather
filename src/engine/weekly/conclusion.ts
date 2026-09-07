import type { SelectedWeeklyEvent } from "./selection";

export interface WeeklyConclusion {
  title: string;
  body: string;
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long"
  }).format(new Date(`${date}T12:00:00Z`));
}

function subject(event: SelectedWeeklyEvent): string {
  switch (event.type) {
    case "HEAT": return "une chaleur marquée";
    case "COLD": return "une fraîcheur inhabituelle";
    case "RAIN": return "un épisode pluvieux";
    case "WIND": return "un épisode de vent fort";
    case "THUNDER": return "un risque orageux";
    case "IMPROVEMENT": return "une amélioration nette";
    case "DEGRADATION": return "une dégradation nette";
    case "BEST_WINDOW": return "une fenêtre météo favorable";
  }
}

function joinSubjects(events: SelectedWeeklyEvent[]): string {
  const labels = events.map(subject);
  if (labels.length <= 1) return labels[0] ?? "des conditions changeantes";
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

function directionalConclusion(events: SelectedWeeklyEvent[]): string | null {
  const changes = events
    .filter((event) => event.type === "IMPROVEMENT" || event.type === "DEGRADATION")
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  if (!changes.length) return null;

  const first = changes[0];
  const laterOpposite = changes.slice(1).find((event) => event.type !== first.type);
  if (laterOpposite) {
    if (first.type === "DEGRADATION") return "Une semaine perturbée au départ, nettement plus agréable ensuite.";
    return "Une semaine agréable au départ, avant une dégradation nette ensuite.";
  }
  if (first.type === "IMPROVEMENT") return `La semaine s’améliore progressivement à partir de ${weekday(first.startDate)}.`;
  return `La semaine se dégrade nettement à partir de ${weekday(first.startDate)}.`;
}

export function buildWeeklyConclusion(events: SelectedWeeklyEvent[], cityName = "Tarnos"): WeeklyConclusion {
  if (!events.length) {
    return {
      title: `Une semaine calme à ${cityName}`,
      body: `La semaine restera globalement stable à ${cityName}. Aucun changement météo suffisamment marqué n’est retenu.`
    };
  }

  const nonWindowEvents = events.filter((event) => event.type !== "BEST_WINDOW");
  const bestWindow = events.find((event) => event.type === "BEST_WINDOW");
  const directional = directionalConclusion(nonWindowEvents);
  if (directional) return { title: `La semaine à ${cityName}`, body: directional };

  if (nonWindowEvents.length === 0 && bestWindow) {
    return {
      title: `La semaine à ${cityName}`,
      body: `La semaine sera globalement stable, avec une fenêtre météo particulièrement favorable ${weekday(bestWindow.startDate)}.`
    };
  }

  const base = nonWindowEvents.length === 1
    ? `La semaine sera surtout marquée par ${subject(nonWindowEvents[0])}`
    : `Une semaine contrastée, marquée par ${joinSubjects(nonWindowEvents)}`;
  const body = bestWindow
    ? `${base}, avec une fenêtre plus favorable ${weekday(bestWindow.startDate)}.`
    : `${base}.`;
  return { title: `La semaine à ${cityName}`, body };
}
