export const FORBIDDEN_PUBLIC_WORDS = [
  "précipitations", "risque orageux", "averses marquées", "nébulosité",
  "éclaircies", "temps sec", "vent soutenu", "fin de journée", "en fin de journée", "plus frais"
];

export const hourLabel = (hour: number) => `${hour} h`;

export function temperatureStory(morningC: number, maxC: number, maxHour = 15): string {
  const morning = Math.round(morningC), max = Math.round(maxC);
  if (Math.abs(max - morning) < 3) return `Autour de ${max}° toute la journée.`;
  if (maxHour >= 12 && maxHour <= 18) return `${morning}° ce matin, jusqu’à ${max}° cet après-midi.`;
  return `${morning}° ce matin, jusqu’à ${max}° vers ${hourLabel(maxHour)}.`;
}

export const noRainAllDay = () => "Pas de pluie aujourd’hui.";
export const rainFreeBefore = (h: number) => `Pas de pluie avant ${hourLabel(h)}.`;
export const rainFreeAfter = (h: number) => `Plus de pluie après ${hourLabel(h)}.`;
export const uncertaintyAfter = (h: number) => `Après ${hourLabel(h)}, les prévisions sont incertaines.`;

export function rainWindow(start: number, end: number, intensity: "normal"|"strong"="normal", intermittent=false): string {
  if (intermittent) return `Pluie par moments entre ${hourLabel(start)} et ${hourLabel(end)}.`;
  return `${intensity === "strong" ? "Forte pluie" : "Pluie"} entre ${hourLabel(start)} et ${hourLabel(end)}.`;
}

export const thunderstormWindow = (start: number, end: number) =>
  `Orages entre ${hourLabel(start)} et ${hourLabel(end)}.`;

export function windWindow(start: number, end: number, gust: number): string {
  return `Vent fort entre ${hourLabel(start)} et ${hourLabel(end)}, jusqu’à ${Math.round(gust/5)*5} km/h.`;
}

export const temperatureDrop = (fromH:number, fromC:number, toH:number, toC:number) =>
  `${Math.round(fromC)}° à ${hourLabel(fromH)}, ${Math.round(toC)}° à ${hourLabel(toH)}.`;

export const joinSentences = (...s: Array<string|null|undefined>) => s.filter(Boolean).join(" ");

export function assertPublicLanguage(text: string): void {
  const lower = text.toLocaleLowerCase("fr-FR");
  for (const forbidden of FORBIDDEN_PUBLIC_WORDS) {
    if (lower.includes(forbidden.toLocaleLowerCase("fr-FR")))
      throw new Error(`LOKA editorial rule: forbidden public wording "${forbidden}"`);
  }
}
