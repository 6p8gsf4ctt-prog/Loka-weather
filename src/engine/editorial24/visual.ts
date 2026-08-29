import type { EditorialFacts, Scene24Id, SkyBand } from "../../types";
import type { EditorialDaypart, EditorialFactsV21 } from "./facts";

const FALLBACK_PRIMARY: Record<Scene24Id, string> = {
  1: "Ciel dégagé · Soleil dominant toute la journée",
  2: "Soleil présent · Voile élevé par moments",
  3: "Nuages dominants · Quelques éclaircies",
  4: "Soleil et nuages · Belles périodes lumineuses",
  5: "Début lumineux · Nuages plus nombreux ensuite",
  6: "Temps lumineux · Vent sensible et durable",
  7: "Ciel souvent voilé · Quelques éclaircies",
  8: "Brume ou brouillard · Visibilité réduite par moments",
  9: "Ciel couvert · Peu d’évolution au fil des heures",
  10: "Vent fort · Rafales marquées sur la journée",
  11: "Début chargé · Éclaircies plus franches ensuite",
  12: "Pluie durable · Peu de véritables accalmies",
  13: "Averses par moments · Accalmies entre les passages",
  14: "Éclaircies · Vent sensible sur les périodes ouvertes",
  15: "Matinée nuageuse · Éclaircies plus franches ensuite",
  16: "Soleil dominant · Passages nuageux temporaires",
  17: "Brouillard dense · Visibilité durablement réduite",
  18: "Soleil et nuages · Alternance sans direction nette",
  19: "Temps changeant · Plusieurs évolutions possibles",
  20: "Nuages dominants · Vent sensible et régulier",
  21: "Nuages présents · Longues séquences lumineuses",
  22: "Risque orageux · Évolution potentiellement rapide",
  23: "Couche dense · Ciel très uniforme et persistant",
  24: "Pluie et vent · Deux phénomènes présents sur la journée"
};

function formatDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function hourLabel(hour: number): string {
  return `${Math.round(hour)}h`;
}

function daypartLabel(period: EditorialDaypart | null, preposition = true): string {
  const prefix = preposition ? "" : "";
  switch (period) {
    case "NIGHT": return `${prefix}dans la nuit`;
    case "MORNING": return `${prefix}le matin`;
    case "MIDDAY": return `${prefix}autour de la mi-journée`;
    case "AFTERNOON": return `${prefix}dans l’après-midi`;
    case "LATE_AFTERNOON": return `${prefix}en fin d’après-midi`;
    case "EVENING": return `${prefix}en soirée`;
    case "ALL_DAY": return `${prefix}sur l’ensemble de la journée`;
    default: return "";
  }
}

function transitionSuffix(f: EditorialFactsV21): string {
  const transition = f.intelligence.transition;
  if (transition.decisiveHour !== null) return `à partir de ${hourLabel(transition.decisiveHour)}`;
  const period = daypartLabel(transition.period);
  return period || "au fil de la journée";
}

function brighterSky(band: SkyBand): boolean {
  return band === "CLEAR" || band === "BRIGHT";
}

function darkerSky(band: SkyBand): boolean {
  return band === "CLOUDY" || band === "DENSE";
}

function skyPrimary(f: EditorialFactsV21): string {
  const transition = f.intelligence.transition;
  const rain = f.intelligence.rain;

  if (f.trajectory === "IMPROVING" && (darkerSky(f.startSky) || f.sceneId === 15 || f.sceneId === 21)) {
    const decisive = transition.decisiveHour;
    if ((f.sceneId === 15 || f.sceneId === 21) && decisive !== null && decisive >= 11 && decisive <= 18) {
      return f.sceneId === 21
        ? `Matinée nuageuse · Éclaircies plus franches à partir de ${hourLabel(decisive)}`
        : `Matinée nuageuse · Belle amélioration à partir de ${hourLabel(decisive)}`;
    }
    if (f.sceneId === 11 && transition.period === "EVENING") {
      return "Début chargé · Conditions plus ouvertes en soirée";
    }
    return FALLBACK_PRIMARY[f.sceneId];
  }

  if (f.trajectory === "DEGRADING" && brighterSky(f.startSky) && f.sceneId === 5) {
    if (rain.firstHour !== null && rain.firstHour >= 20) {
      return "Soleil dominant · Ciel plus couvert en soirée";
    }
    if (f.endSky === "BRIGHT" && (transition.firstChangeHour ?? 0) >= 17) {
      return "Soleil dominant · Nuages plus nombreux en fin d’après-midi";
    }
    if (transition.period === "AFTERNOON") {
      return "Soleil dominant · Nuages plus nombreux dans l’après-midi";
    }
    if (transition.period === "LATE_AFTERNOON") {
      return "Soleil dominant · Nuages plus nombreux en fin d’après-midi";
    }
    if (transition.period === "EVENING") {
      return "Soleil dominant · Ciel plus couvert en soirée";
    }
  }

  if (f.sceneId === 7) return "Ciel souvent voilé · Quelques éclaircies";
  return FALLBACK_PRIMARY[f.sceneId];
}

function primary(f: EditorialFactsV21): string {
  const role = f.intelligence.rain.role;
  const rain = f.intelligence.rain;

  if (role === "THUNDER") return "Risque orageux · Évolution parfois rapide";

  if (role === "SUSTAINED") {
    if (rain.lastHour !== null && rain.lastHour <= 18) return "Pluie durable · Plus calme en soirée";
    if (f.trajectory === "IMPROVING") {
      const period = daypartLabel(f.intelligence.transition.period);
      if (period === "en soirée") return "Pluie durable · Plus calme en soirée";
      if (period === "en fin d’après-midi") return "Pluie durable · Plus calme en fin de journée";
    }
    if (f.wind.kind !== "NONE" && f.sceneId === 24) return "Pluie et vent · Conditions perturbées plusieurs heures";
    return "Pluie durable · Peu de véritables accalmies";
  }

  if (role === "SHOWERS" && (f.sceneId === 13 || f.intelligence.priority.primary === "SHOWERS")) {
    return "Averses par moments · Accalmies entre les passages";
  }

  // Garde-fou : une pluie secondaire ne doit jamais dicter le titre principal.
  if (role === "SECONDARY" && f.sceneId === 12) {
    if (rain.period === "MORNING") return "Nuages nombreux · Quelques pluies possibles le matin";
    if (rain.period === "MIDDAY") return "Nuages nombreux · Quelques pluies possibles autour de midi";
    return "Nuages nombreux · Quelques pluies possibles";
  }
  if (role === "SECONDARY" && f.sceneId === 24) return "Nuages et vent · Quelques pluies possibles";

  return skyPrimary(f);
}

function temperatureSecondary(f: EditorialFactsV21): string | null {
  const t = f.temperature;
  const peakPeriod = daypartLabel(f.intelligence.temperature.peakPeriod);

  if (t.character === "VERY_HOT") {
    return `Temps sec et chaud, jusqu’à ${t.maxC} °C${peakPeriod ? ` ${peakPeriod}` : ""}.`;
  }
  if (t.character === "HOT") {
    return `Temps sec et chaud, jusqu’à ${t.maxC} °C${peakPeriod ? ` ${peakPeriod}` : ""}.`;
  }
  if (f.intelligence.temperature.salience === "NOTABLE" || f.intelligence.temperature.salience === "STRONG") {
    return `Temps sec, jusqu’à ${t.maxC} °C${peakPeriod ? ` ${peakPeriod}` : ""}.`;
  }
  return null;
}

function secondaryRain(f: EditorialFactsV21): string | null {
  const rain = f.intelligence.rain;
  const total = formatDecimal(f.precipitation.totalMm);
  const period = daypartLabel(rain.period);

  if (rain.role === "THUNDER") {
    return period
      ? `Risque orageux ${period}, avec des évolutions parfois rapides.`
      : "Risque orageux par moments, avec des évolutions parfois rapides.";
  }

  if (rain.role === "SUSTAINED") {
    if (f.trajectory === "IMPROVING") {
      const improvement = daypartLabel(f.intelligence.transition.period);
      if (improvement) return `Autour de ${total} mm de pluie, avec une amélioration attendue ${improvement}.`;
    }
    if (f.wind.kind !== "NONE") {
      return `Autour de ${total} mm de pluie, avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
    }
    return `Autour de ${total} mm de pluie attendus sur la journée.`;
  }

  if (rain.role === "SHOWERS") {
    const timing = period ? ` ${period}` : "";
    return f.precipitation.totalMm >= 0.8
      ? `Quelques averses possibles${timing}, autour de ${total} mm au total.`
      : `Quelques averses possibles${timing}, avec de faibles cumuls.`;
  }

  if (rain.role === "SECONDARY") {
    if (f.precipitation.totalMm <= 0.5) {
      return `Jusqu’à ${f.temperature.maxC} °C, avec très peu de pluie attendue.`;
    }
    if (f.precipitation.totalMm <= 1 && f.temperature.maxC >= 24) {
      return `Jusqu’à ${f.temperature.maxC} °C, avec seulement un peu de pluie attendue.`;
    }
    const improvement = f.trajectory === "IMPROVING" ? daypartLabel(f.intelligence.transition.period) : "";
    if (improvement) return `Quelques averses possibles, autour de ${total} mm, puis une amélioration progressive.`;
    if (rain.firstHour !== null && rain.firstHour >= 20) {
      return `Jusqu’à ${f.temperature.maxC} °C, avec environ ${total} mm de pluie attendus en fin de journée.`;
    }
    return `Quelques pluies possibles${period ? ` ${period}` : ""}, autour de ${total} mm au total.`;
  }

  return null;
}

function drySecondary(f: EditorialFactsV21): string {
  if (f.wind.kind === "STRONG") {
    return `Rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h, avec un temps globalement sec.`;
  }
  if (f.wind.kind === "NOTABLE") {
    return `Vent sensible, avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
  }
  if (f.fog.kind === "DENSE") return "Brouillard dense plusieurs heures, puis visibilité en amélioration.";
  if (f.fog.kind === "BRIEF") return "Brume ou brouillard temporaire, puis visibilité en amélioration.";

  // La chaleur réellement marquée peut passer avant la chronologie du ciel.
  if (f.temperature.character === "VERY_HOT" || f.temperature.character === "HOT") {
    const temperature = temperatureSecondary(f);
    if (temperature) return temperature;
  }

  if (f.trajectory === "IMPROVING") {
    const decisive = f.intelligence.transition.decisiveHour;
    if (decisive !== null && decisive >= 11 && decisive <= 18) {
      return `Temps sec, avec des éclaircies plus franches à partir de ${hourLabel(decisive)}.`;
    }
    return "Temps sec, avec des éclaircies plus franches en seconde partie de journée.";
  }
  if (f.trajectory === "DEGRADING") {
    const first = f.intelligence.transition.firstChangeHour;
    if (first !== null && first >= 18) {
      return "Temps sec, avec un ciel bien lumineux jusqu’en milieu d’après-midi.";
    }
    return "Temps sec, avec un ciel plus lumineux en première partie de journée.";
  }
  if (f.sceneId === 18 && f.temperature.maxC >= 22) {
    return `Les températures atteignent ${f.temperature.maxC} °C, sans pluie annoncée.`;
  }
  if (f.trajectory === "VARIABLE") {
    return `Temps sec toute la journée, jusqu’à ${f.temperature.maxC} °C dans l’après-midi.`;
  }

  if (f.brightestPeriod === "ALL_DAY") {
    return "Temps sec ; la luminosité reste bien présente sur l’ensemble de la journée.";
  }
  const sky = [f.startSky, f.middleSky, f.endSky];
  if (sky.every((band) => band === "CLOUDY" || band === "DENSE")) {
    return "Temps sec ; la couverture nuageuse reste dominante sans évolution marquée.";
  }
  return `Temps sec toute la journée, jusqu’à ${f.temperature.maxC} °C dans l’après-midi.`;
}

function secondary(f: EditorialFactsV21): string {
  const rain = secondaryRain(f);
  if (rain) return rain;
  return drySecondary(f);
}

export function buildVisualEditorial(facts: EditorialFacts | EditorialFactsV21): { subtitle: string; primaryLine: string; secondaryLine: string } {
  const f = facts as EditorialFactsV21;
  const primaryLine = f.intelligence ? primary(f) : FALLBACK_PRIMARY[f.sceneId];
  const secondaryLine = f.intelligence ? secondary(f) : `Jusqu’à ${f.temperature.maxC} °C.`;

  return {
    // Conservé dans le contrat V2 uniquement pour relire les anciens payloads et feedbacks.
    subtitle: "",
    primaryLine,
    secondaryLine
  };
}
