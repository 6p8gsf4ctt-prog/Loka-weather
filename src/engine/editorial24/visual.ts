import type { EditorialFacts, Scene24Id } from "../../types";

const PRIMARY: Record<Scene24Id, string> = {
  1: "Ciel dégagé · Soleil dominant toute la journée",
  2: "Soleil présent · Voile élevé par moments",
  3: "Nuages dominants · Éclaircies ponctuelles",
  4: "Alternances fréquentes · Luminosité souvent présente",
  5: "Début lumineux · Nuages plus nombreux ensuite",
  6: "Temps lumineux · Vent sensible et durable",
  7: "Voile épais · Lumière nettement atténuée",
  8: "Brume ou brouillard · Visibilité réduite par moments",
  9: "Ciel couvert · Peu d’évolution au fil des heures",
  10: "Vent fort · Rafales marquées sur la journée",
  11: "Début chargé · Conditions plus ouvertes ensuite",
  12: "Pluie durable · Peu de véritables accalmies",
  13: "Averses par moments · Accalmies entre les passages",
  14: "Éclaircies · Vent sensible sur les périodes ouvertes",
  15: "Matinée nuageuse · Éclaircies plus franches ensuite",
  16: "Soleil dominant · Passages nuageux temporaires",
  17: "Brouillard dense · Visibilité durablement réduite",
  18: "Soleil et nuages · Alternance sans direction nette",
  19: "Temps changeant · Plusieurs retournements possibles",
  20: "Nuages dominants · Vent sensible et régulier",
  21: "Nuages présents · Longues séquences lumineuses",
  22: "Risque orageux · Évolution potentiellement rapide",
  23: "Couche dense · Ciel très uniforme et persistant",
  24: "Pluie et vent · Chevauchement durable des deux phénomènes"
};

function formatDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function hours(value: number): number {
  return Math.max(1, Math.round(value));
}

function brightPeriod(period: EditorialFacts["brightestPeriod"]): string {
  if (period === "EARLY") return "en début de journée";
  if (period === "MID") return "autour du milieu de journée";
  if (period === "LATE") return "en fin de journée";
  return "sur l’ensemble de la journée";
}

function drySecondary(f: EditorialFacts): string {
  if (f.trajectory === "IMPROVING") {
    return "Temps sec ; les éclaircies les plus franches se concentrent en seconde partie de journée.";
  }
  if (f.trajectory === "DEGRADING") {
    return "Temps sec ; les meilleures périodes lumineuses se concentrent en première partie de journée.";
  }
  if (f.trajectory === "VARIABLE") {
    return "Temps sec ; les périodes lumineuses alternent avec des passages plus chargés au fil des heures.";
  }
  const sky = [f.startSky, f.middleSky, f.endSky];
  if (sky.every((band) => band === "CLOUDY" || band === "DENSE")) {
    return "Temps sec ; la couverture nuageuse reste dominante sans évolution marquée.";
  }
  if (f.brightestPeriod === "ALL_DAY") {
    return "Temps sec ; la luminosité reste bien présente sur l’ensemble de la journée.";
  }
  return `Temps sec ; la période la plus lumineuse se situe ${brightPeriod(f.brightestPeriod)}.`;
}

function secondary(f: EditorialFacts): string {
  if (f.precipitation.kind === "THUNDER") {
    return `Risque orageux sur ${hours(f.precipitation.hours)} h ; des évolutions rapides restent possibles.`;
  }
  if (f.precipitation.kind === "RAIN") {
    const total = formatDecimal(f.precipitation.totalMm);
    if (f.wind.kind !== "NONE") {
      return `Environ ${total} mm sur la journée, avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
    }
    return `Environ ${total} mm sur ${hours(f.precipitation.hours)} h humides ; les précipitations restent dominantes.`;
  }
  if (f.precipitation.kind === "SHOWERS") {
    if (f.wind.kind !== "NONE") {
      return `Averses intermittentes avec des accalmies ; rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
    }
    return `Averses intermittentes sur ${hours(f.precipitation.hours)} h, entrecoupées de plusieurs accalmies.`;
  }
  if (f.fog.kind === "DENSE") {
    return `Brouillard dense pendant environ ${hours(f.fog.hours)} h ; la visibilité reste le paramètre principal à surveiller.`;
  }
  if (f.fog.kind === "BRIEF") {
    return `Brume ou brouillard pendant environ ${hours(f.fog.hours)} h ; la visibilité s’améliore ensuite.`;
  }
  if (f.wind.kind === "STRONG") {
    return `Rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h ; le vent reste le paramètre dominant de la journée.`;
  }
  if (f.wind.kind === "NOTABLE") {
    return `Vent sensible avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h ; la tendance reste globalement sèche.`;
  }
  return drySecondary(f);
}

export function buildVisualEditorial(facts: EditorialFacts): { subtitle: string; primaryLine: string; secondaryLine: string } {
  return {
    // Conservé dans le contrat V2 uniquement pour relire les anciens payloads et feedbacks.
    subtitle: "",
    primaryLine: PRIMARY[facts.sceneId],
    secondaryLine: secondary(facts)
  };
}
