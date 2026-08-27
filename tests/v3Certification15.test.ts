import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { evaluatePublicationGuard } from "../src/engine/publicationGuard";
import { buildCandidateProduct } from "../src/engine/verdict";
import type {
  DayEvolution,
  DominantPhenomenon,
  HourPoint,
  KeyTakeawayType,
  ModelForecast,
  WeatherConfidenceLevel,
  WeatherFamily
} from "../src/types";

const date = "2026-08-18";
const specs: Array<[string, WeatherFamily, number]> = [
  ["arome", "meteofrance", 0.30],
  ["ecmwf_ifs", "ecmwf_physics", 0.25],
  ["ecmwf_aifs", "ecmwf_ai", 0.15],
  ["icon_eu", "dwd", 0.17],
  ["gfs", "noaa", 0.13]
];

type Shape = {
  temp?: number;
  cloud?: number;
  rain?: number;
  code?: number;
  gust?: number;
  wind?: number;
};

type ShapeFn = (hour: number, modelId: string, modelIndex: number) => Shape;

function defaultCode(shape: Shape): number {
  if (shape.code !== undefined) return shape.code;
  const rain = shape.rain ?? 0;
  const cloud = shape.cloud ?? 45;
  if (rain >= 0.2) return 61;
  if (cloud >= 85) return 3;
  if (cloud >= 50) return 2;
  if (cloud >= 20) return 1;
  return 0;
}

function forecasts(shapeFn: ShapeFn): ModelForecast[] {
  return specs.map(([modelId, family, weight], modelIndex) => {
    const hourly: HourPoint[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      const shape = shapeFn(hour, modelId, modelIndex);
      const rain = shape.rain ?? 0;
      const cloud = shape.cloud ?? 45;
      const temp = (shape.temp ?? 20) + (modelIndex - 2) * 0.15;
      hourly.push({
        time: `${date}T${String(hour).padStart(2, "0")}:00`,
        temperatureC: temp,
        apparentTemperatureC: temp,
        precipitationMm: rain,
        rainMm: rain,
        cloudCoverPct: cloud,
        cloudCoverLowPct: Math.max(0, cloud - 20),
        cloudCoverMidPct: Math.max(0, cloud - 30),
        cloudCoverHighPct: cloud,
        windSpeedKmh: shape.wind ?? 15,
        windGustKmh: shape.gust ?? 25,
        weatherCode: defaultCode(shape)
      });
    }
    return {
      modelId,
      family,
      weight,
      fetchedAt: new Date().toISOString(),
      latitude: 43.5417,
      longitude: -1.4628,
      hourly
    };
  });
}

interface Expected {
  dominant?: DominantPhenomenon | DominantPhenomenon[];
  evolution?: DayEvolution | DayEvolution[];
  confidence?: WeatherConfidenceLevel;
  takeaway?: KeyTakeawayType | KeyTakeawayType[];
  timelineMin?: number;
  timelineMax?: number;
  guard?: "PASS" | "BLOCKED";
  custom?: (payload: ReturnType<typeof buildCandidateProduct>) => boolean;
}

interface Scenario {
  name: string;
  shape: ShapeFn;
  expected: Expected;
}

function oneOf<T>(actual: T, expected: T | T[] | undefined): boolean {
  if (expected === undefined) return true;
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

const scenarios: Scenario[] = [
  {
    name: "01_grand_soleil_stable",
    shape: (h) => ({ cloud: 8, temp: 17 + Math.max(0, 1 - Math.abs(h - 16) / 10) * 11, code: 0 }),
    expected: { dominant: "SUN", evolution: "STABLE", confidence: "STABLE", takeaway: ["TEMPERATURE_PEAK", "STABILITY"], timelineMin: 5, timelineMax: 6, guard: "PASS" }
  },
  {
    name: "02_ciel_couvert_stable",
    shape: (h) => ({ cloud: 94, temp: 16 + Math.max(0, 1 - Math.abs(h - 15) / 10) * 4, code: 3 }),
    expected: { dominant: "CLOUD", evolution: "STABLE", confidence: "STABLE", takeaway: "STABILITY", timelineMin: 5, timelineMax: 6, guard: "PASS" }
  },
  {
    name: "03_ciel_se_couvrant",
    shape: (h) => ({ cloud: h <= 10 ? 16 : h <= 13 ? 35 : h <= 16 ? 65 : 92, temp: 18 + Math.max(0, 1 - Math.abs(h - 15) / 9) * 7 }),
    expected: { dominant: "SKY_DEGRADATION", evolution: "DEGRADING", confidence: "STABLE", takeaway: "CHANGE", timelineMin: 6, timelineMax: 8, guard: "PASS", custom: (p) => p.analysis!.classification.transition.peakHour !== null }
  },
  {
    name: "04_journee_s_ameliorant",
    shape: (h) => ({ cloud: h <= 9 ? 94 : h <= 12 ? 75 : h <= 15 ? 45 : 14, temp: 15 + Math.max(0, 1 - Math.abs(h - 16) / 10) * 8 }),
    expected: { dominant: "SKY_IMPROVEMENT", evolution: "IMPROVING", confidence: "STABLE", takeaway: "IMPROVEMENT", timelineMin: 6, timelineMax: 8, guard: "PASS" }
  },
  {
    name: "05_pluie_continue",
    shape: (h) => ({ cloud: 96, temp: 16, rain: h >= 6 && h <= 21 ? 0.8 : 0, code: h >= 6 && h <= 21 ? 61 : 3 }),
    expected: { dominant: "RAIN", evolution: "STABLE", confidence: "STABLE", takeaway: ["CHANGE", "RAIN_END", "RAIN_START"], timelineMin: 5, timelineMax: 8, guard: "PASS" }
  },
  {
    name: "06_averses_intermittentes",
    shape: (h) => {
      const wet = [8, 9, 12, 13, 17, 18].includes(h);
      return { cloud: wet ? 82 : 42, temp: 17, rain: wet ? 0.9 : 0, code: wet ? 80 : 2 };
    },
    expected: { dominant: "SHOWERS", evolution: "INTERMITTENT", confidence: "STABLE", takeaway: ["RAIN_START", "CHANGE", "RAIN_END"], timelineMin: 7, timelineMax: 9, guard: "PASS" }
  },
  {
    name: "07_pluie_arrivant_en_journee",
    shape: (h) => ({ cloud: h < 13 ? 18 : h < 16 ? 70 : 94, temp: 18, rain: h >= 16 && h <= 21 ? 0.9 : 0, code: h >= 16 && h <= 21 ? 61 : h >= 13 ? 3 : 0 }),
    expected: { dominant: "RAIN", evolution: "TWO_PHASES", confidence: "STABLE", takeaway: "RAIN_START", timelineMin: 7, timelineMax: 9, guard: "PASS", custom: (p) => p.analysis!.timeline.points.some((x) => x.hour === 16 && x.importance === "KEY") }
  },
  {
    name: "08_pluie_cessant_en_journee",
    shape: (h) => ({ cloud: h <= 11 ? 94 : h <= 14 ? 65 : 30, temp: 16, rain: h >= 6 && h <= 10 ? 0.9 : 0, code: h >= 6 && h <= 10 ? 61 : h <= 14 ? 3 : 1 }),
    expected: { dominant: "RAIN", evolution: "TWO_PHASES", confidence: "STABLE", takeaway: "RAIN_END", timelineMin: 6, timelineMax: 9, guard: "PASS" }
  },
  {
    name: "09_journee_venteuse",
    shape: (h) => ({ cloud: 76, temp: 18, gust: h >= 13 && h <= 20 ? 76 : 48, wind: h >= 13 && h <= 20 ? 44 : 28, code: 2 }),
    expected: { dominant: "WIND", confidence: "STABLE", takeaway: "WIND", timelineMin: 6, timelineMax: 9, guard: "PASS", custom: (p) => p.analysis!.editorialSignals.contextualData?.type === "WIND_GUST" }
  },
  {
    name: "10_brouillard_matinal",
    shape: (h) => ({ cloud: h <= 10 ? 94 : 20, temp: 15, code: h >= 6 && h <= 9 ? 45 : h <= 10 ? 3 : 0 }),
    expected: { dominant: "FOG", evolution: "IMPROVING", confidence: "STABLE", takeaway: "FOG", timelineMin: 6, timelineMax: 9, guard: "PASS", custom: (p) => p.analysis!.editorialSignals.keyMoment.type === "FOG_END" }
  },
  {
    name: "11_forte_chaleur",
    shape: (h) => ({ cloud: 8, temp: h >= 14 && h <= 18 ? 35 : h >= 11 && h <= 20 ? 31 : 24, code: 0 }),
    expected: { dominant: "HEAT", evolution: "STABLE", confidence: "STABLE", takeaway: "HEAT_PEAK", timelineMin: 5, timelineMax: 7, guard: "PASS", custom: (p) => p.analysis!.timeline.points.some((x) => x.reason === "TEMPERATURE_PEAK") }
  },
  {
    name: "12_journee_fraiche",
    shape: (h) => ({ cloud: 35, temp: h >= 14 && h <= 17 ? 17 : 12, code: 1 }),
    expected: { dominant: "COLD", evolution: "STABLE", confidence: "STABLE", takeaway: "COOL", timelineMin: 5, timelineMax: 7, guard: "PASS", custom: (p) => p.temperatures.maxC <= 18 && p.analysis!.editorialSignals.contextualData?.type === "TEMPERATURE_MAX" }
  },
  {
    name: "13_risque_orageux",
    shape: (h) => ({ cloud: h < 16 ? 55 : 95, temp: 24, rain: h >= 18 && h <= 20 ? 1.2 : 0, code: h >= 18 && h <= 20 ? 95 : h >= 16 ? 3 : 2 }),
    expected: { dominant: "THUNDER", confidence: "STABLE", takeaway: "THUNDER", timelineMin: 7, timelineMax: 9, guard: "PASS", custom: (p) => p.analysis!.timeline.points.some((x) => x.reason === "THUNDER") }
  },
  {
    name: "14_prevision_tres_incertaine",
    shape: (h, _id, i) => {
      const wetModel = i <= 1;
      const wet = wetModel && h >= (15 + i) && h <= 20;
      return { cloud: wetModel ? (h >= 14 ? 92 : 45) : 30, temp: 20, rain: wet ? 0.9 : 0, code: wet ? 61 : wetModel && h >= 14 ? 3 : 1 };
    },
    expected: { confidence: "WATCH", timelineMin: 5, timelineMax: 9, guard: "PASS", custom: (p) => p.analysis!.weatherConfidence.mainUncertainty === "RAIN_PRESENCE" || p.analysis!.weatherConfidence.mainUncertainty === "RAIN_START" }
  },
  {
    name: "15_meteo_changeante_plusieurs_fois",
    shape: (h) => {
      if (h <= 8) return { cloud: 12, temp: 17, code: 0 };
      if (h <= 11) return { cloud: 90, temp: 18, code: 3 };
      if (h <= 14) return { cloud: 28, temp: 20, code: 1 };
      if (h <= 17) return { cloud: 92, temp: 19, code: 3 };
      if (h <= 19) return { cloud: 35, temp: 18, code: 1 };
      return { cloud: 88, temp: 17, code: 3 };
    },
    expected: { dominant: ["MIXED", "CLOUD"], evolution: "VARIABLE", confidence: "STABLE", timelineMin: 8, timelineMax: 9, guard: "PASS" }
  }
];

let checks = 0;
const summaries: string[] = [];
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`FAIL:${label}`);
  checks++;
}

for (const scenario of scenarios) {
  const fs = forecasts(scenario.shape);
  const consensus = buildConsensus(fs);
  const payload = buildCandidateProduct(CITIES.tarnos, date, consensus, fs, {}, `CERT_V3:${scenario.name}`);
  const analysis = payload.analysis;
  if (!analysis) throw new Error(`FAIL:${scenario.name}:analysis_missing`);
  const expected = scenario.expected;

  ok(oneOf(analysis.classification.dominantPhenomenon, expected.dominant), `${scenario.name}:dominant:${analysis.classification.dominantPhenomenon}`);
  ok(oneOf(analysis.classification.evolution, expected.evolution), `${scenario.name}:evolution:${analysis.classification.evolution}`);
  ok(oneOf(analysis.weatherConfidence.level, expected.confidence), `${scenario.name}:confidence:${analysis.weatherConfidence.level}`);
  ok(oneOf(analysis.editorialSignals.keyTakeaway.type, expected.takeaway), `${scenario.name}:takeaway:${analysis.editorialSignals.keyTakeaway.type}`);
  ok(analysis.timeline.points.length >= (expected.timelineMin ?? 5), `${scenario.name}:timeline_min:${analysis.timeline.points.length}`);
  ok(analysis.timeline.points.length <= (expected.timelineMax ?? 9), `${scenario.name}:timeline_max:${analysis.timeline.points.length}`);
  ok(analysis.timeline.points.every((p, i, a) => i === 0 || p.hour > a[i - 1].hour), `${scenario.name}:timeline_order`);
  ok(new Set(analysis.timeline.points.map((p) => p.hour)).size === analysis.timeline.points.length, `${scenario.name}:timeline_unique`);
  const guard = evaluatePublicationGuard(payload);
  ok(guard.status === (expected.guard ?? "PASS"), `${scenario.name}:guard:${guard.reason}`);
  if (expected.custom) ok(expected.custom(payload), `${scenario.name}:custom`);

  summaries.push([
    scenario.name,
    analysis.classification.dominantPhenomenon,
    analysis.classification.evolution,
    analysis.weatherConfidence.level,
    analysis.timeline.points.length,
    analysis.editorialSignals.keyTakeaway.type,
    guard.status
  ].join(" | "));
}

console.log("V3 CERTIFICATION — 15 SCENARIOS");
for (const line of summaries) console.log(line);
console.log(`v3Certification15: ${scenarios.length} scenarios, ${checks} checks passed`);
