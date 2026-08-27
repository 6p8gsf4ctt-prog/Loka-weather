import { CITIES } from "../src/config/cities";
import { buildAdaptiveTimeline } from "../src/engine/adaptiveTimeline";
import type { ConsensusHour, DayClassification, WeatherConfidence } from "../src/types";

const date = "2026-08-18";
function makeDay(shape: (h: number) => Partial<ConsensusHour>): ConsensusHour[] {
  const out: ConsensusHour[] = [];
  for (let h = 0; h <= 23; h++) {
    const x = shape(h);
    const rain = x.precipitationMm ?? 0;
    out.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`, temperatureC: x.temperatureC ?? 22,
      apparentTemperatureC: x.apparentTemperatureC ?? x.temperatureC ?? 22, precipitationMm: rain,
      cloudCoverPct: x.cloudCoverPct ?? 20, cloudCoverLowPct: 10, cloudCoverMidPct: 10, cloudCoverHighPct: 10,
      cloudLayerModelCount: 5, windSpeedKmh: x.windSpeedKmh ?? 15, windGustKmh: x.windGustKmh ?? 25,
      modelCount: 5, temperatureSpreadC: 1, precipitationSupport: x.precipitationSupport ?? (rain >= 0.2 ? 0.8 : 0.05),
      rainCodeSupport: x.rainCodeSupport ?? (rain >= 0.2 ? 0.8 : 0.05), showerSupport: x.showerSupport ?? 0.05,
      thunderstormSupport: x.thunderstormSupport ?? 0.02, fogSupport: x.fogSupport ?? 0.02
    });
  }
  return out;
}
function classification(overrides: Partial<DayClassification> = {}): DayClassification {
  return { version: "3.0", dominantPhenomenon: "SUN", secondaryPhenomenon: "NONE", evolution: "STABLE", evolutionStrength: "NONE",
    changeLevel: "LOW", changeScore: 10, transition: { startHour: null, peakHour: null, endHour: null }, keyPeriod: null, ...overrides };
}
function confidence(overrides: Partial<WeatherConfidence> = {}): WeatherConfidence {
  return { level: "STABLE", score: 90, agreements: { scenario: 95, timing: null, intensity: 95, duration: null, thermal: 95 },
    mainUncertainty: "NONE", period: null, impact: "LOW", availableModels: 5, availableWeight: 1, reasons: [], ...overrides };
}
let passed = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`FAIL:${label}`); passed++; }

{
  const t = buildAdaptiveTimeline(CITIES.tarnos, date, makeDay(() => ({ cloudCoverPct: 8 })), classification(), confidence());
  ok(t.mode === "STABLE", "stable_mode");
  ok(t.points.length === 5, "stable_five_points");
  ok(t.points.map((p) => p.hour).join(",") === "6,10,14,18,22", "stable_reference_hours");
}

{
  const points = makeDay((h) => {
    const wet = h >= 16 && h <= 18;
    return { cloudCoverPct: wet ? 92 : h >= 14 ? 75 : 20, precipitationMm: wet ? 0.8 : 0 };
  });
  const c = classification({ dominantPhenomenon: "RAIN", evolution: "TWO_PHASES", evolutionStrength: "STRONG", changeLevel: "MODERATE", changeScore: 58,
    transition: { startHour: 14, peakHour: 16, endHour: 17 }, keyPeriod: { startHour: 16, endHour: 18 } });
  const t = buildAdaptiveTimeline(CITIES.tarnos, date, points, c, confidence());
  const hours = t.points.map((p) => p.hour);
  ok(t.mode === "EVENT_FOCUSED", "rain_event_focused");
  ok(t.points.length >= 7 && t.points.length <= 8, "rain_event_point_count");
  ok([14,15,16,17].every((h) => hours.includes(h)), "rain_transition_dense_window");
  ok(t.points.some((p) => p.hour === 16 && p.importance === "KEY"), "rain_start_key");
}

{
  const points = makeDay((h) => ({ cloudCoverPct: h % 3 === 0 ? 90 : h % 3 === 1 ? 20 : 60, precipitationMm: [9,13,17,20].includes(h) ? 0.6 : 0, showerSupport: [9,13,17,20].includes(h) ? 0.8 : 0.05 }));
  const c = classification({ dominantPhenomenon: "SHOWERS", evolution: "INTERMITTENT", evolutionStrength: "STRONG", changeLevel: "HIGH", changeScore: 82 });
  const t = buildAdaptiveTimeline(CITIES.tarnos, date, points, c, confidence());
  ok(t.points.length <= 9, "complex_max_nine");
  ok(t.points[0].hour >= 6 && t.points[t.points.length - 1].hour <= 22, "complex_day_window");
}

console.log(`adaptiveTimeline: ${passed} checks passed`);
