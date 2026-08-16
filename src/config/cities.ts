import type { CityConfig } from "../types";

export const CITIES: Record<string, CityConfig> = {
  tarnos: {
    slug: "tarnos",
    name: "Tarnos",
    latitude: 43.5417,
    longitude: -1.4628,
    timezone: "Europe/Paris",

    // Bloc 12.16.7 — 10 repères horaires réels destinés aux stories 9:16.
    // Le moteur de décision conserve sa plage d'analyse historique 07h–21h.
    // Le 04h est uniquement une donnée de présentation, issue du consensus complet.
    displayHours: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22],

    wind: {
      // Coastal editorial thresholds: ordinary sea-breeze conditions stay invisible.
      gustNotableKmh: 55,
      gustStrongKmh: 70
    },

    thermal: {
      // V0.3 editorial calibration for Tarnos.
      // Morning wording is based on the actual temperature, not only on daily amplitude.
      morningCoolBelowC: 15,
      morningMildBelowC: 18,
      morningWarmFromC: 21,

      afternoonHotFromC: 27,
      afternoonVeryHotFromC: 33,

      // Temperature-change thresholds used only when the absolute temperatures justify it.
      notableRiseC: 7,
      strongRiseC: 10,
      notableDropC: 6
    }
  }
};

export function getCity(slug: string): CityConfig | undefined {
  return CITIES[slug.toLowerCase()];
}
