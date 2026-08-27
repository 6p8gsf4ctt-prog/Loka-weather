import { CITIES } from "../src/config/cities";
import { buildWeatherConfidence } from "../src/engine/weatherConfidence";
import type { DayClassification, HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date = "2026-08-18";
const weights: Array<[string, WeatherFamily, number]> = [
  ["arome", "meteofrance", 0.30],
  ["ecmwf_ifs", "ecmwf_physics", 0.25],
  ["ecmwf_aifs", "ecmwf_ai", 0.15],
  ["icon_eu", "dwd", 0.17],
  ["gfs", "noaa", 0.13]
];

function classification(dominant: DayClassification["dominantPhenomenon"]): DayClassification {
  return {
    version: "3.0", dominantPhenomenon: dominant, secondaryPhenomenon: "NONE", evolution: "STABLE",
    evolutionStrength: "NONE", changeLevel: "LOW", changeScore: 10,
    transition: { startHour: null, peakHour: null, endHour: null }, keyPeriod: null
  };
}

interface ModelShape { rainStart?: number | null; rainEnd?: number | null; thunderHour?: number | null; fogEnd?: number | null; gust?: number; tempMax?: number; cloudEarly?: number; cloudLate?: number; }
function forecast(modelId: string, family: WeatherFamily, weight: number, shape: ModelShape): ModelForecast {
  const hourly: HourPoint[] = [];
  for (let h = 0; h <= 23; h++) {
    const wet = shape.rainStart !== undefined && shape.rainStart !== null && h >= shape.rainStart && h <= (shape.rainEnd ?? shape.rainStart);
    const thunder = shape.thunderHour === h;
    const fog = shape.fogEnd !== undefined && shape.fogEnd !== null && h >= 6 && h <= shape.fogEnd;
    const cloud = h <= 11 ? (shape.cloudEarly ?? 35) : h >= 17 ? (shape.cloudLate ?? 35) : 45;
    const temp = h === 16 ? (shape.tempMax ?? 28) : 20 + Math.min(h, 16) * 0.3;
    hourly.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`, temperatureC: temp, apparentTemperatureC: temp,
      precipitationMm: wet ? 0.8 : 0, rainMm: wet ? 0.8 : 0,
      cloudCoverPct: cloud, cloudCoverLowPct: cloud, cloudCoverMidPct: cloud, cloudCoverHighPct: cloud,
      windSpeedKmh: 20, windGustKmh: shape.gust ?? 30,
      weatherCode: thunder ? 95 : fog ? 45 : wet ? 61 : 1
    });
  }
  return { modelId, family, weight, fetchedAt: new Date().toISOString(), latitude: 43.54, longitude: -1.46, hourly };
}

function models(shapes: ModelShape[]): ModelForecast[] {
  return weights.map(([id, family, weight], i) => forecast(id, family, weight, shapes[i] ?? {}));
}

let passed = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`FAIL:${label}`); passed++; }

{
  const c = buildWeatherConfidence(CITIES.tarnos, date, models(Array(5).fill({ rainStart: 16, rainEnd: 19 })), classification("RAIN"));
  ok(c.level === "STABLE", "stable_all_models_agree");
  ok(c.agreements.scenario >= 95, "stable_scenario_high");
}

{
  const c = buildWeatherConfidence(CITIES.tarnos, date, models([
    { rainStart: 15, rainEnd: 19 }, { rainStart: 16, rainEnd: 20 }, { rainStart: 16, rainEnd: 20 }, { rainStart: 17, rainEnd: 21 }, { rainStart: 17, rainEnd: 21 }
  ]), classification("RAIN"));
  ok(c.level === "SOME_UNCERTAINTY", "rain_timing_some_uncertainty");
  ok(c.mainUncertainty === "RAIN_START", "rain_timing_main_uncertainty");
  ok(c.period?.startHour === 15 && c.period?.endHour === 17, "rain_timing_period");
}

{
  const c = buildWeatherConfidence(CITIES.tarnos, date, models([
    { rainStart: 16, rainEnd: 19 }, { rainStart: 16, rainEnd: 19 }, {}, {}, {}
  ]), classification("RAIN"));
  ok(c.level === "WATCH", "rain_presence_watch");
  ok(c.mainUncertainty === "RAIN_PRESENCE", "rain_presence_main_uncertainty");
}

{
  const c = buildWeatherConfidence(CITIES.tarnos, date, models([
    { thunderHour: 19 }, {}, {}, {}, {}
  ]), classification("MIXED"));
  ok(c.level === "WATCH", "thunder_split_watch");
  ok(c.mainUncertainty === "THUNDER_PRESENCE", "thunder_split_main_uncertainty");
}

{
  const c = buildWeatherConfidence(CITIES.tarnos, date, models([
    { gust: 35 }, { gust: 45 }, { gust: 58 }, { gust: 65 }, { gust: 70 }
  ]), classification("WIND"));
  ok(c.level === "WATCH", "wind_scenario_split_watch");
  ok(c.mainUncertainty === "WIND_INTENSITY", "wind_main_uncertainty");
}


{
  const variableModels: ModelForecast[] = weights.map(([modelId, family, weight]) => {
    const hourly: HourPoint[] = [];
    for (let h = 0; h <= 23; h++) {
      const cloud = h <= 8 ? 12 : h <= 11 ? 90 : h <= 14 ? 28 : h <= 17 ? 92 : h <= 19 ? 35 : 88;
      const temp = 17 + Math.max(0, 1 - Math.abs(h - 14) / 10) * 3;
      hourly.push({
        time: `${date}T${String(h).padStart(2, "0")}:00`, temperatureC: temp, apparentTemperatureC: temp,
        precipitationMm: 0, rainMm: 0, cloudCoverPct: cloud, cloudCoverLowPct: cloud,
        cloudCoverMidPct: cloud, cloudCoverHighPct: cloud, windSpeedKmh: 15, windGustKmh: 25,
        weatherCode: cloud >= 85 ? 3 : cloud >= 50 ? 2 : cloud >= 20 ? 1 : 0
      });
    }
    return { modelId, family, weight, fetchedAt: new Date().toISOString(), latitude: 43.54, longitude: -1.46, hourly };
  });
  const c = buildWeatherConfidence(CITIES.tarnos, date, variableModels, classification("MIXED"));
  ok(c.level === "STABLE", "mixed_variable_identical_models_stable");
  ok(c.agreements.scenario >= 95, "mixed_variable_scenario_high");
}

console.log(`weatherConfidence: ${passed} checks passed`);
