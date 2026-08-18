import type { EditorialFacts } from "../../types";

function skyPhrase(f: EditorialFacts): string {
  switch (f.sceneId) {
    case 1: return "la journée s’annonce très largement ensoleillée";
    case 2: return "le soleil devrait rester visible malgré un voile élevé";
    case 3: return "les nuages devraient dominer avec quelques éclaircies";
    case 4: return "le ciel devrait rester changeant mais souvent lumineux";
    case 5: return "le ciel devrait progressivement se charger au fil de la journée";
    case 6: return "le soleil devrait dominer dans une ambiance venteuse";
    case 7: return "un voile dense devrait atténuer durablement la lumière";
    case 8: return "brume ou brouillard devraient réduire temporairement la visibilité";
    case 9: return "la couverture nuageuse devrait rester installée";
    case 10: return "le vent fort devrait constituer le fait marquant de la journée";
    case 11: return "les conditions devraient s’améliorer progressivement";
    case 12: return "la pluie devrait accompagner une large partie de la journée";
    case 13: return "des averses devraient alterner avec des accalmies";
    case 14: return "des éclaircies devraient se développer sous un vent sensible";
    case 15: return "le début de journée devrait rester nuageux avant des éclaircies nettement plus franches";
    case 16: return "le soleil devrait dominer malgré quelques passages nuageux";
    case 17: return "un brouillard dense devrait marquer plusieurs heures";
    case 18: return "soleil et nuages devraient alterner sans véritable tendance";
    case 19: return "plusieurs changements de temps devraient rythmer la journée";
    case 20: return "les nuages devraient dominer sous un vent sensible";
    case 21: return "de longues éclaircies devraient s’installer entre les passages nuageux";
    case 22: return "un risque orageux suffisamment robuste devrait structurer la journée";
    case 23: return "une couche nuageuse très dense devrait rester durablement installée";
    case 24: return "pluie et vent devraient se combiner pendant plusieurs heures";
  }
}

function confidenceLead(f: EditorialFacts): string {
  if (f.confidence === "HIGH") return "";
  if (f.confidence === "MEDIUM") return "D’après le consensus, ";
  return "La tendance la plus probable indique que ";
}

function detail(f: EditorialFacts): string {
  if (f.precipitation.kind === "THUNDER") return "Le risque orageux reste le phénomène à suivre, avec une évolution parfois rapide selon les secteurs.";
  if (f.precipitation.kind === "RAIN") return `Le cumul envisagé est proche de ${Math.round(f.precipitation.totalMm * 10) / 10} mm, avec ${f.precipitation.hours} heures humides dans la fenêtre utile.`;
  if (f.precipitation.kind === "SHOWERS") return "Les passages humides devraient rester irréguliers, laissant place à plusieurs périodes d’accalmie.";
  if (f.wind.kind === "STRONG") return `Le vent sera marqué, avec des rafales pouvant approcher ${Math.round(f.wind.maxGustKmh)} km/h.`;
  if (f.wind.kind === "NOTABLE") return `Le vent restera sensible, avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h.`;
  if (f.fog.kind !== "NONE") return "La visibilité sera le principal paramètre à surveiller avant une amélioration progressive.";
  if (f.trajectory === "IMPROVING") return "Les périodes les plus lumineuses devraient se concentrer dans la seconde partie de journée.";
  if (f.trajectory === "DEGRADING") return "Les périodes les plus lumineuses devraient se concentrer en première partie de journée.";
  return "Les conditions devraient rester globalement sèches sur la journée.";
}

export function buildSocialEditorial(citySlug: string, cityName: string, facts: EditorialFacts, emoji: string, hashtags: string): {
  paragraph1: string; paragraph2: string; signature: "Ici, aujourd’hui."; handle: string; caption: string; hashtags: string;
} {
  const paragraph1 = `${emoji} ${confidenceLead(facts)}${skyPhrase(facts)} sur ${cityName}. Les températures iront de ${facts.temperature.minC} à ${facts.temperature.maxC} °C.`;
  const paragraph2 = detail(facts);
  const signature = "Ici, aujourd’hui." as const;
  const handle = `@loka.${citySlug}`;
  const caption = `${paragraph1}\n\n${paragraph2}\n\n${signature}\n${handle}`;
  return { paragraph1, paragraph2, signature, handle, caption, hashtags };
}
