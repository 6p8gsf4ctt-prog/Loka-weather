import type { EditorialFacts } from "../../types";

export function buildHashtags(_citySlug: string, cityName: string, _facts: EditorialFacts): string {
  const city = cityName.replace(/[^A-Za-zÀ-ÿ0-9]/g, "");

  // Doctrine éditoriale V2.1 : socle local stable.
  // Les hashtags de scène et de phénomène sont volontairement retirés :
  // ils répétaient la météo du jour et variaient trop souvent dans les validations.
  return [`#${city}`, `#Meteo${city}`, "#Landes", "#MeteoLandes", "#LOKA"].join(" ");
}
