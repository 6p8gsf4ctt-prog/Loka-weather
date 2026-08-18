import type { EditorialFacts, Scene24Id } from "../../types";

const SUBTITLES: Record<Scene24Id, string> = {
  1: "Un ciel largement dégagé du matin au soir.",
  2: "Le soleil reste présent sous un voile discret.",
  3: "Des ouvertures apparaissent dans un ciel souvent chargé.",
  4: "Une journée changeante mais souvent lumineuse.",
  5: "Le ciel se charge progressivement au fil des heures.",
  6: "Une journée lumineuse accompagnée d’un vent sensible.",
  7: "Un voile épais atténue durablement la lumière.",
  8: "La visibilité est réduite pendant une partie de la journée.",
  9: "Une couverture nuageuse durable domine la journée.",
  10: "Le vent devient le caractère principal de la journée.",
  11: "Les conditions deviennent progressivement plus favorables.",
  12: "Les précipitations occupent une large partie de la journée.",
  13: "Des averses alternent avec des périodes plus calmes.",
  14: "Éclaircies et passages nuageux sous un vent sensible.",
  15: "Une fin de journée nettement plus dégagée.",
  16: "Le soleil domine malgré quelques passages nuageux.",
  17: "Un brouillard dense marque durablement la journée.",
  18: "Soleil et nuages alternent sans tendance nette.",
  19: "Plusieurs changements de temps rythment la journée.",
  20: "Les nuages dominent sous un vent régulièrement sensible.",
  21: "De longues périodes lumineuses percent entre les nuages.",
  22: "Un risque orageux robuste structure la journée.",
  23: "Une couche très dense reste installée durablement.",
  24: "Pluie et vent se combinent pendant plusieurs heures."
};

const PRIMARY: Record<Scene24Id, string> = {
  1: "Ciel dégagé · Soleil dominant toute la journée",
  2: "Soleil présent · Voile élevé par moments",
  3: "Nuages dominants · Éclaircies ponctuelles",
  4: "Alternances fréquentes · Luminosité souvent présente",
  5: "Début lumineux · Nuages plus nombreux ensuite",
  6: "Temps lumineux · Vent sensible et durable",
  7: "Voile épais · Lumière nettement atténuée",
  8: "Brume ou brouillard · Amélioration de la visibilité ensuite",
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

function secondary(f: EditorialFacts): string {
  if (f.precipitation.kind === "THUNDER") return "Des orages sont possibles au cours de la journée.";
  if (f.precipitation.kind === "RAIN") return `Environ ${Math.round(f.precipitation.totalMm * 10) / 10} mm sont envisagés sur la journée.`;
  if (f.precipitation.kind === "SHOWERS") return "Les précipitations restent intermittentes avec des accalmies.";
  if (f.wind.kind === "STRONG") return `Rafales maximales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
  if (f.wind.kind === "NOTABLE") return `Vent sensible avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
  if (f.fog.kind === "DENSE") return "Le brouillard peut rester compact pendant plusieurs heures.";
  if (f.fog.kind === "BRIEF") return "La visibilité s’améliore après l’épisode de brume ou brouillard.";
  if (f.temperature.character === "VERY_HOT") return `Température maximale autour de ${f.temperature.maxC} °C.`;
  if (f.temperature.character === "HOT") return `Après-midi chaud avec jusqu’à ${f.temperature.maxC} °C.`;
  return "Aucune pluie significative n’est attendue.";
}

export function buildVisualEditorial(facts: EditorialFacts): { subtitle: string; primaryLine: string; secondaryLine: string } {
  return { subtitle: SUBTITLES[facts.sceneId], primaryLine: PRIMARY[facts.sceneId], secondaryLine: secondary(facts) };
}
