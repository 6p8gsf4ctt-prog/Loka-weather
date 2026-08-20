import type { EditorialEngagementV2, EditorialFacts } from "../../types";

type EngagementTemplate = {
  format: EditorialEngagementV2["format"];
  question: (cityName: string, facts: EditorialFacts) => string;
  options?: [string, string];
};

function dateSeed(date: string, sceneId: number): number {
  let total = sceneId * 17;
  for (const char of date) total += char.charCodeAt(0);
  return total;
}

function choose(date: string, facts: EditorialFacts, templates: EngagementTemplate[]): EngagementTemplate {
  return templates[dateSeed(date, facts.sceneId) % templates.length];
}

function templatesFor(facts: EditorialFacts): EngagementTemplate[] {
  if (facts.precipitation.kind === "THUNDER") {
    return [
      { format: "POLL", question: () => "Les orages, vous aimez ça ?", options: ["Oui, j’adore", "Pas du tout"] },
      { format: "QUESTION", question: (city) => `Votre réflexe quand l’orage arrive sur ${city} ?` }
    ];
  }
  if (facts.precipitation.kind === "RAIN") {
    return [
      { format: "POLL", question: () => "Parapluie aujourd’hui : indispensable ?", options: ["Évidemment", "Je tente sans"] },
      { format: "QUESTION", question: (city) => `Jour de pluie à ${city} : votre programme idéal ?` }
    ];
  }
  if (facts.precipitation.kind === "SHOWERS") {
    return [
      { format: "POLL", question: () => "Vous tentez la sortie entre deux averses ?", options: ["Oui", "J’attends"] },
      { format: "QUESTION", question: () => "Une éclaircie arrive : vous en profitez pour faire quoi ?" }
    ];
  }
  if (facts.fog.kind !== "NONE") {
    return [
      { format: "POLL", question: () => "Le brouillard : ambiance ou contrainte ?", options: ["Ambiance", "Contrainte"] },
      { format: "QUESTION", question: (city) => `Le brouillard sur ${city}, ça vous évoque quoi ?` }
    ];
  }
  if (facts.wind.kind === "STRONG") {
    return [
      { format: "POLL", question: () => "Avec ce vent, vous maintenez vos plans dehors ?", options: ["Oui", "Je reporte"] },
      { format: "QUESTION", question: () => "Quand ça souffle fort, vous adaptez comment votre journée ?" }
    ];
  }
  if (facts.temperature.character === "VERY_HOT" || facts.temperature.character === "HOT") {
    return [
      { format: "POLL", question: () => `Avec ${facts.temperature.maxC} °C au plus chaud : plutôt ombre ou soleil ?`, options: ["À l’ombre", "Au soleil"] },
      { format: "QUESTION", question: () => "Votre meilleur réflexe quand la journée chauffe ?" }
    ];
  }
  if (facts.trajectory === "IMPROVING") {
    return [
      { format: "POLL", question: () => "Vous attendez l’amélioration ou vous sortez quand même ?", options: ["J’attends", "J’y vais"] },
      { format: "QUESTION", question: () => "Les éclaircies reviennent : vous en profitez comment ?" }
    ];
  }
  if (facts.trajectory === "DEGRADING") {
    return [
      { format: "POLL", question: () => "Vous profitez du meilleur créneau dès le matin ?", options: ["Oui", "Pas possible"] },
      { format: "QUESTION", question: () => "Avant que le ciel se charge, vous faites quoi en priorité ?" }
    ];
  }
  if ([1, 2, 6, 16, 21].includes(facts.sceneId)) {
    return [
      { format: "QUESTION", question: (city) => `Votre spot préféré pour profiter d’une belle journée à ${city} ?` },
      { format: "POLL", question: () => "Une journée lumineuse, ça change votre humeur ?", options: ["Carrément", "Pas vraiment"] }
    ];
  }
  if ([9, 20, 23].includes(facts.sceneId)) {
    return [
      { format: "POLL", question: () => "Un ciel gris change vos plans ?", options: ["Oui", "Pas du tout"] },
      { format: "QUESTION", question: () => "Temps gris : quelle activité vous donne quand même envie ?" }
    ];
  }
  return [
    { format: "POLL", question: () => "Avec ce temps changeant, vous improvisez votre journée ?", options: ["Toujours", "Je planifie"] },
    { format: "QUESTION", question: (city) => `Aujourd’hui à ${city}, vous avez prévu quoi ?` }
  ];
}

export function buildEngagementEditorial(cityName: string, date: string, facts: EditorialFacts): EditorialEngagementV2 {
  const template = choose(date, facts, templatesFor(facts));
  const question = template.question(cityName, facts).replace(/\s+/g, " ").trim();
  if (!question || question.length > 140) throw new Error("editorial_engagement_question_invalid");
  return {
    format: template.format,
    question,
    options: template.format === "POLL" ? template.options ?? ["Oui", "Non"] : null
  };
}
