import type { CityConfig } from "../types";

export const CITIES: Record<string, CityConfig> = {
  tarnos: {
    slug: "tarnos",
    name: "Tarnos",
    latitude: 43.5417,
    longitude: -1.4628,
    timezone: "Europe/Paris",
    displayHours: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    wind: { gustNotableKmh: 55, gustStrongKmh: 70 },
    thermal: {
      morningCoolBelowC: 15,
      morningMildBelowC: 18,
      morningWarmFromC: 21,
      afternoonHotFromC: 27,
      afternoonVeryHotFromC: 33,
      notableRiseC: 7,
      strongRiseC: 10,
      notableDropC: 6
    }
  }
};

export function getCity(slug: string): CityConfig | undefined {
  return CITIES[slug.toLowerCase()];
}
