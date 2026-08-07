import type { ModelConfig } from "../types";

// Current Open-Meteo model identifiers. Each model is fetched separately so
// LOKA preserves model identity and can learn weights later.
export const MODELS: ModelConfig[] = [
  {
    id: "arome",
    apiModel: "meteofrance_arome_france",
    family: "meteofrance",
    baseWeight: 0.30
  },
  {
    id: "ecmwf_ifs",
    apiModel: "ecmwf_ifs025",
    family: "ecmwf_physics",
    baseWeight: 0.25
  },
  {
    id: "ecmwf_aifs",
    apiModel: "ecmwf_aifs025_single",
    family: "ecmwf_ai",
    baseWeight: 0.15
  },
  {
    id: "icon_eu",
    apiModel: "icon_eu",
    family: "dwd",
    baseWeight: 0.17
  },
  {
    id: "gfs",
    apiModel: "ncep_gfs_seamless",
    family: "noaa",
    baseWeight: 0.13
  }
];

export const HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "weather_code"
] as const;
