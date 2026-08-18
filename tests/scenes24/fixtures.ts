import { CITIES } from "../../src/config/cities";
import type { ConsensusHour, Scene24Id } from "../../src/types";
import { buildDayProfileV2 } from "../../src/engine/scenes24/profile";
import { chooseScene24V2 } from "../../src/engine/scenes24/classifier";

export interface ShapePoint {
  cloud?: number; low?: number | null; mid?: number | null; high?: number | null;
  rain?: number; precipSupport?: number; shower?: number; thunder?: number; fog?: number;
  gust?: number; wind?: number; temp?: number; models?: number;
}

export function makeDay(date = "2026-08-18", shape: (hour: number) => ShapePoint): ConsensusHour[] {
  const points: ConsensusHour[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    const x = shape(hour);
    const cloud = x.cloud ?? 50;
    const rain = x.rain ?? 0;
    const support = x.precipSupport ?? (rain >= 0.2 ? 0.8 : 0.05);
    points.push({
      time: `${date}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: x.temp ?? (16 + hour * 0.4),
      apparentTemperatureC: x.temp ?? (16 + hour * 0.4),
      precipitationMm: rain,
      cloudCoverPct: cloud,
      cloudCoverLowPct: x.low === undefined ? Math.max(0, cloud - 25) : x.low,
      cloudCoverMidPct: x.mid === undefined ? Math.max(0, cloud - 35) : x.mid,
      cloudCoverHighPct: x.high === undefined ? Math.max(0, cloud - 15) : x.high,
      cloudLayerModelCount: x.models ?? 5,
      windSpeedKmh: x.wind ?? 15,
      windGustKmh: x.gust ?? 25,
      modelCount: x.models ?? 5,
      temperatureSpreadC: 1.2,
      precipitationSupport: support,
      rainCodeSupport: rain >= 0.2 ? support : 0.05,
      showerSupport: x.shower ?? 0.05,
      thunderstormSupport: x.thunder ?? 0.02,
      fogSupport: x.fog ?? 0.02
    });
  }
  return points;
}

function dayHours(h: number): boolean { return h >= 7 && h <= 21; }

export function canonicalPoints(id: Scene24Id, date = "2026-08-18", models = 5): ConsensusHour[] {
  return makeDay(date, (h) => {
    const base: ShapePoint = { models, cloud: 50, gust: 25, temp: 15 + Math.min(h, 16) * 0.7 };
    if (!dayHours(h)) return base;
    switch (id) {
      case 1: return { ...base, cloud: 8, low: 2, mid: 2, high: 8 };
      case 2: return { ...base, cloud: 32, low: 5, mid: 8, high: 78 };
      case 3: return { ...base, cloud: [82,80,76,35,78,84,38,80,77,40,82,75,36,80,78][h-7] ?? 78 };
      case 4: return { ...base, cloud: [25,32,28,60,30,35,25,58,28,34,32,60,27,38,30][h-7] ?? 40 };
      case 5: return { ...base, cloud: h <= 11 ? 20 : h <= 15 ? 48 : 84 };
      case 6: return { ...base, cloud: 18, gust: 62, wind: 38 };
      case 7: return { ...base, cloud: 62, low: 8, mid: 12, high: 92 };
      case 8: return { ...base, cloud: h <= 9 ? 78 : 45, fog: h <= 9 ? 0.5 : 0.05 };
      case 9: return { ...base, cloud: 82, low: 70, mid: 65, high: 72 };
      case 10: return { ...base, cloud: 55, gust: 82, wind: 50 };
      case 11: return { ...base, cloud: h <= 11 ? 86 : h <= 15 ? 68 : 48 };
      case 12: return { ...base, cloud: 88, rain: h >= 9 && h <= 16 ? 0.9 : 0.12, precipSupport: h >= 9 && h <= 16 ? 0.85 : 0.2, shower: 0.1 };
      case 13: {
        const wet = [9,12,16,19].includes(h); return { ...base, cloud: wet ? 82 : 48, rain: wet ? 0.8 : 0, precipSupport: wet ? 0.8 : 0.1, shower: wet ? 0.8 : 0.05 };
      }
      case 14: return { ...base, cloud: [35,55,40,62,38,58,42,60,35,55,40,60,38,55,42][h-7] ?? 50, gust: 62, wind: 38 };
      case 15: return { ...base, cloud: h <= 11 ? 88 : h <= 15 ? 58 : 18 };
      case 16: return { ...base, cloud: [15,18,20,52,55,48,18,20,16,50,45,18,15,20,18][h-7] ?? 20 };
      case 17: return { ...base, cloud: h <= 11 ? 92 : 65, fog: h <= 11 ? 0.82 : 0.15 };
      case 18: return { ...base, cloud: [38,75,42,72,40,76,45,70,40,74,44,72,40,75,42][h-7] ?? 55 };
      case 19: {
        const fog = h === 7 || h === 8;
        const shower = h === 11 || h === 16;
        const windy = h === 13 || h === 14 || h === 18;
        return { ...base, cloud: [88,82,30,75,90,35,65,25,82,92,32,78,38,85,42][h-7] ?? 60,
          fog: fog ? 0.55 : 0.03, rain: shower ? 0.7 : 0, precipSupport: shower ? 0.75 : 0.08,
          shower: shower ? 0.8 : 0.05, gust: windy ? 62 : 30, wind: windy ? 40 : 15 };
      }
      case 20: return { ...base, cloud: 82, gust: 62, wind: 38 };
      case 21: { const seq = date.endsWith("12-18") ? [70,62,60,22,20,18,60,62,24,20,18,60,65,62,60] : [65,62,24,20,18,22,58,62,28,24,20,22,60,58,30]; return { ...base, cloud: seq[h-7] ?? 55 }; }
      case 22: return { ...base, cloud: 88, rain: h>=14&&h<=16?1.1:0.1, precipSupport: h>=14&&h<=16?0.8:0.15, shower: h>=14&&h<=16?0.75:0.1, thunder: h>=14&&h<=16?0.72:0.05 };
      case 23: return { ...base, cloud: 97, low: 92, mid: 90, high: 90 };
      case 24: return { ...base, cloud: 88, rain: h>=10&&h<=15?0.8:0, precipSupport: h>=10&&h<=15?0.8:0.08, gust: h>=9&&h<=17?64:35, wind: h>=9&&h<=17?42:20 };
    }
  });
}

export function classify(id: Scene24Id, date = "2026-08-18", models = 5, mutate?: (points: ConsensusHour[]) => void, previous?: Scene24Id) {
  const points = canonicalPoints(id, date, models); mutate?.(points);
  const profile = buildDayProfileV2(CITIES.tarnos, date, points);
  return { profile, decision: chooseScene24V2(profile, previous) };
}
