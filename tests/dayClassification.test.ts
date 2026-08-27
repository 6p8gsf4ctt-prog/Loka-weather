import { CITIES } from "../src/config/cities";
import { buildDayClassification } from "../src/engine/dayClassification";
import { buildDayProfileV2 } from "../src/engine/scenes24/profile";
import type { ConsensusHour } from "../src/types";

interface ShapePoint {
  cloud?: number;
  rain?: number;
  precipSupport?: number;
  shower?: number;
  thunder?: number;
  fog?: number;
  gust?: number;
  wind?: number;
  temp?: number;
}

function makeDay(date: string, shape: (hour: number) => ShapePoint): ConsensusHour[] {
  const points: ConsensusHour[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    const x = shape(hour);
    const cloud = x.cloud ?? 50;
    const rain = x.rain ?? 0;
    const support = x.precipSupport ?? (rain >= 0.2 ? 0.8 : 0.05);
    points.push({
      time: `${date}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: x.temp ?? 20,
      apparentTemperatureC: x.temp ?? 20,
      precipitationMm: rain,
      cloudCoverPct: cloud,
      cloudCoverLowPct: Math.max(0, cloud - 25),
      cloudCoverMidPct: Math.max(0, cloud - 35),
      cloudCoverHighPct: Math.max(0, cloud - 15),
      cloudLayerModelCount: 5,
      windSpeedKmh: x.wind ?? 15,
      windGustKmh: x.gust ?? 25,
      modelCount: 5,
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

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`FAIL:${label}`);
  passed++;
}
function classify(points: ConsensusHour[], date = "2026-08-18") {
  const profile = buildDayProfileV2(CITIES.tarnos, date, points);
  return buildDayClassification(CITIES.tarnos, date, profile, points);
}

{
  const c = classify(makeDay("2026-08-18", () => ({ cloud: 8, temp: 27 })));
  ok(c.dominantPhenomenon === "SUN", "sun_dominant");
  ok(c.evolution === "STABLE", "sun_stable");
  ok(c.changeLevel === "LOW", "sun_low_change");
}

{
  const c = classify(makeDay("2026-08-18", (h) => ({ cloud: h <= 11 ? 20 : h <= 15 ? 48 : 84 })));
  ok(c.dominantPhenomenon === "SKY_DEGRADATION", "degradation_dominant");
  ok(c.evolution === "DEGRADING", "degradation_evolution");
  ok(c.transition.peakHour !== null, "degradation_transition");
}

{
  const c = classify(makeDay("2026-08-18", (h) => {
    const wet = h >= 16 && h <= 21;
    return { cloud: wet ? 92 : h >= 14 ? 70 : 20, rain: wet ? 0.8 : 0, precipSupport: wet ? 0.85 : 0.05 };
  }));
  ok(c.dominantPhenomenon === "RAIN", "rain_arrival_dominant");
  ok(c.evolution === "TWO_PHASES", "rain_arrival_two_phases");
  ok(c.transition.startHour === 14 && c.transition.peakHour === 16 && c.transition.endHour === 17, "rain_arrival_transition_window");
}

{
  const wetHours = new Set([9, 12, 16, 19]);
  const c = classify(makeDay("2026-08-18", (h) => ({
    cloud: wetHours.has(h) ? 82 : 45,
    rain: wetHours.has(h) ? 0.8 : 0,
    precipSupport: wetHours.has(h) ? 0.85 : 0.05,
    shower: wetHours.has(h) ? 0.85 : 0.05
  })));
  ok(c.dominantPhenomenon === "SHOWERS", "showers_dominant");
  ok(c.evolution === "INTERMITTENT", "showers_intermittent");
}

{
  const c = classify(makeDay("2026-08-18", (h) => ({
    cloud: h <= 10 ? 92 : 20,
    fog: h >= 7 && h <= 10 ? 0.82 : 0.03
  })));
  ok(c.dominantPhenomenon === "FOG", "fog_dominant");
  ok(c.evolution === "IMPROVING", "fog_improving");
  ok(c.secondaryPhenomenon === "SKY_IMPROVEMENT", "fog_secondary_improvement");
}

{
  const c = classify(makeDay("2026-08-18", () => ({ cloud: 82, gust: 82, wind: 50 })));
  ok(c.dominantPhenomenon === "WIND", "wind_dominant");
}

{
  const c = classify(makeDay("2026-08-18", (h) => ({ cloud: 8, temp: h >= 14 && h <= 18 ? 35 : 27 })));
  ok(c.dominantPhenomenon === "HEAT", "heat_dominant");
  ok(c.secondaryPhenomenon === "SUN", "heat_secondary_sun");
  ok(c.keyPeriod?.startHour === 14 && c.keyPeriod?.endHour === 18, "heat_key_period");
}

{
  const c = classify(makeDay("2026-08-18", (h) => ({ cloud: 88, thunder: h >= 18 && h <= 20 ? 0.75 : 0.03, rain: h >= 18 && h <= 20 ? 1 : 0 })));
  ok(c.dominantPhenomenon === "THUNDER", "thunder_priority");
}

{
  const c = classify(makeDay("2026-08-18", (h) => ({ cloud: 35, temp: h >= 14 && h <= 17 ? 17 : 12 })));
  ok(c.dominantPhenomenon === "COLD", "cold_dominant");
  ok(c.evolution === "STABLE", "cold_stable");
}

console.log(`dayClassification: ${passed} checks passed`);
