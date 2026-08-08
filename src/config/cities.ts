import type { CityConfig } from "../types";

export const CITIES: Record<string, CityConfig> = {
  tarnos: {
    slug: "tarnos",
    name: "Tarnos",
    latitude: 43.5417,
    longitude: -1.4628,
    timezone: "Europe/Paris",
    displayHours: [7, 9, 12, 15, 18, 21],

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
