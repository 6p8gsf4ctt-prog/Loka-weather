import type { EditorialFacts } from "../../types";

function sceneTag(key: string): string {
  return key.toLowerCase().split("_").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join("");
}

export function buildHashtags(citySlug: string, cityName: string, facts: EditorialFacts): string {
  const city = cityName.replace(/[^A-Za-zÀ-ÿ0-9]/g, "");
  const tags = [`#${city}`, `#Meteo${city}`, "#Landes", "#MeteoLandes", "#LOKA", `#${sceneTag(facts.sceneKey)}`];
  if (facts.precipitation.kind === "THUNDER") tags.push("#Orage");
  else if (facts.precipitation.kind === "RAIN") tags.push("#Pluie");
  else if (facts.precipitation.kind === "SHOWERS") tags.push("#Averses");
  if (facts.wind.kind !== "NONE") tags.push("#Vent");
  if (facts.fog.kind !== "NONE") tags.push("#Brouillard");
  if (citySlug === "tarnos") tags.splice(2, 0, "#Tarnos40");
  return [...new Set(tags)].join(" ");
}
