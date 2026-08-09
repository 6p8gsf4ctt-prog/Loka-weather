import type { LokaScene } from "../types";

export const FORBIDDEN_PUBLIC_WORDS = [
  "précipitations",
  "risque orageux",
  "averses marquées",
  "nébulosité",
  "temps sec",
  "vent soutenu",
  "fin de journée",
  "en fin de journée",
  "plus frais"
];

export const hourLabel = (hour: number) => `${hour} h`;

export function temperatureRange(minC: number, maxC: number): string {
  return `Températures comprises entre ${Math.round(minC)} et ${Math.round(maxC)}°.`;
}

export function rainIntensity(maxMmPerHour: number): "faible" | "modérée" | "forte" {
  if (maxMmPerHour < 0.8) return "faible";
  if (maxMmPerHour >= 4) return "forte";
  return "modérée";
}

export function rainLine(start: number, end: number, maxMmPerHour: number): string {
  const intensity = rainIntensity(maxMmPerHour);
  if (intensity === "forte") return `Forte pluie de ${hourLabel(start)} à ${hourLabel(end)}.`;
  return `Pluie ${intensity} de ${hourLabel(start)} à ${hourLabel(end)}.`;
}

export function thunderLine(start: number, end: number, strongRain: boolean, gustKmh: number | null): string {
  const extras: string[] = [];
  if (strongRain) extras.push("forte pluie");
  if (gustKmh !== null) extras.push(`rafales jusqu’à ${Math.round(gustKmh / 5) * 5} km/h`);
  if (!extras.length) return `Orages de ${hourLabel(start)} à ${hourLabel(end)}.`;
  if (extras.length === 1) return `Orages de ${hourLabel(start)} à ${hourLabel(end)}, avec ${extras[0]}.`;
  return `Orages de ${hourLabel(start)} à ${hourLabel(end)}, avec ${extras[0]} et ${extras[1]}.`;
}

export function windLine(start: number, end: number, gustKmh: number): string {
  return `Vent fort de ${hourLabel(start)} à ${hourLabel(end)}, avec des rafales jusqu’à ${Math.round(gustKmh / 5) * 5} km/h.`;
}

export function prolongedHeatLine(start: number, end: number, thresholdC: number): string {
  return `Plus de ${Math.round(thresholdC)}° de ${hourLabel(start)} à ${hourLabel(end)}.`;
}

export function subtitleFor(args: {
  scene: LokaScene;
  hot: boolean;
  veryHot: boolean;
  sunnyFraction: number;
  rainStartHour: number | null;
  thunderStartHour: number | null;
}): string {
  const { scene, hot, veryHot, sunnyFraction, rainStartHour, thunderStartHour } = args;
  switch (scene) {
    case "SOLEIL":
      if (veryHot) return "Journée très chaude et ensoleillée.";
      if (hot) return "Journée chaude et ensoleillée.";
      return "Journée ensoleillée et lumineuse.";
    case "NUAGES": return "Journée douce et nuageuse.";
    case "PLUIE":
      if (rainStartHour !== null && rainStartHour >= 12) return "Journée pluvieuse l’après-midi.";
      return "Journée pluvieuse.";
    case "ORAGES":
      if (veryHot || hot) return "Journée chaude, devenant orageuse en soirée.";
      if (thunderStartHour !== null && thunderStartHour >= 17) return "Journée calme avant des orages en soirée.";
      return "Journée orageuse.";
    case "VENT FORT":
      if (sunnyFraction >= 0.55) return "Journée ensoleillée et venteuse.";
      return "Journée venteuse.";
    case "INSTABLE": return "Journée agréable avant une dégradation en soirée.";
  }
}

export function assertPublicLanguage(text: string): void {
  const lower = text.toLocaleLowerCase("fr-FR");
  for (const forbidden of FORBIDDEN_PUBLIC_WORDS) {
    if (lower.includes(forbidden.toLocaleLowerCase("fr-FR"))) {
      throw new Error(`LOKA editorial rule: forbidden public wording "${forbidden}"`);
    }
  }
}
