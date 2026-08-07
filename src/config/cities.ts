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
      gustNotableKmh: 55,
      gustStrongKmh: 70
    }
  }
};

export function getCity(slug: string): CityConfig | undefined {
  return CITIES[slug.toLowerCase()];
}
