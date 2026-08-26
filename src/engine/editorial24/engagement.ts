import type { EditorialEngagementV2, EditorialFacts } from "../../types";

type EngagementTemplate = {
  question: (cityName: string, facts: EditorialFacts) => string;
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
      { question: (city) => `Votre réflexe quand l’orage arrive sur ${city} ?` }
    ];
  }
  if (facts.precipitation.kind === "RAIN") {
    return [
      { question: (city) => `Jour de pluie à ${city} : votre programme idéal ?` }
    ];
  }
  if (facts.precipitation.kind === "SHOWERS") {
    return [
      { question: () => "Une éclaircie arrive : vous en profitez pour faire quoi ?" }
    ];
  }
  if (facts.fog.kind !== "NONE") {
    return [
      { question: (city) => `Le brouillard sur ${city}, ça vous évoque quoi ?` }
    ];
  }
  if (facts.wind.kind === "STRONG") {
    return [
      { question: () => "Quand ça souffle fort, vous adaptez comment votre journée ?" }
    ];
  }
  if (facts.temperature.character === "VERY_HOT" || facts.temperature.character === "HOT") {
    return [
      { question: () => "Votre meilleur réflexe quand la journée chauffe ?" }
    ];
  }
  if (facts.trajectory === "IMPROVING") {
    return [
      { question: () => "Les éclaircies reviennent : vous en profitez comment ?" }
    ];
  }
  if (facts.trajectory === "DEGRADING") {
    return [
      { question: () => "Avant que le ciel se charge, vous faites quoi en priorité ?" }
    ];
  }
  if ([1, 2, 6, 16, 21].includes(facts.sceneId)) {
    return [
      { question: (city) => `Votre spot préféré pour profiter d’une belle journée à ${city} ?` }
    ];
  }
  if ([9, 20, 23].includes(facts.sceneId)) {
    return [
      { question: () => "Temps gris : quelle activité vous donne quand même envie ?" }
    ];
  }
  return [
    { question: (city) => `Aujourd’hui à ${city}, vous avez prévu quoi ?` }
  ];
}

export function buildEngagementEditorial(cityName: string, date: string, facts: EditorialFacts): EditorialEngagementV2 {
  const template = choose(date, facts, templatesFor(facts));
  const question = template.question(cityName, facts).replace(/\s+/g, " ").trim();
  if (!question || question.length > 140) throw new Error("editorial_engagement_question_invalid");
  return {
    format: "QUESTION",
    question,
    options: null
  };
}
