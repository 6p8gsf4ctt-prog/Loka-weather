import { CITIES } from "../src/config/cities";
import { buildAdaptiveTimeline } from "../src/engine/adaptiveTimeline";
import { buildDayClassification } from "../src/engine/dayClassification";
import { buildEditorialSignals } from "../src/engine/editorialSignals";
import { buildDayProfileV2 } from "../src/engine/scenes24/profile";
import type { ConsensusHour, WeatherConfidence } from "../src/types";

const date = "2026-08-18";
function makeDay(shape: (h: number) => Partial<ConsensusHour>): ConsensusHour[] {
  return Array.from({ length: 24 }, (_, h) => {
    const x = shape(h); const rain = x.precipitationMm ?? 0; const cloud = x.cloudCoverPct ?? 20;
    return { time: `${date}T${String(h).padStart(2, "0")}:00`, temperatureC: x.temperatureC ?? 24, apparentTemperatureC: x.temperatureC ?? 24,
      precipitationMm: rain, cloudCoverPct: cloud, cloudCoverLowPct: cloud, cloudCoverMidPct: cloud, cloudCoverHighPct: cloud, cloudLayerModelCount: 5,
      windSpeedKmh: x.windSpeedKmh ?? 15, windGustKmh: x.windGustKmh ?? 25, modelCount: 5, temperatureSpreadC: 1,
      precipitationSupport: x.precipitationSupport ?? (rain >= 0.2 ? 0.85 : 0.05), rainCodeSupport: x.rainCodeSupport ?? (rain >= 0.2 ? 0.85 : 0.05),
      showerSupport: x.showerSupport ?? 0.05, thunderstormSupport: x.thunderstormSupport ?? 0.02, fogSupport: x.fogSupport ?? 0.02 } as ConsensusHour;
  });
}
function conf(overrides: Partial<WeatherConfidence> = {}): WeatherConfidence {
  return { level: "STABLE", score: 90, agreements: { scenario: 95, timing: null, intensity: 95, duration: 95, thermal: 95 }, mainUncertainty: "NONE", period: null,
    impact: "LOW", availableModels: 5, availableWeight: 1, reasons: [], ...overrides };
}
function analyse(points: ConsensusHour[], confidence: WeatherConfidence = conf()) {
  const profile = buildDayProfileV2(CITIES.tarnos, date, points);
  const classification = buildDayClassification(CITIES.tarnos, date, profile, points);
  const timeline = buildAdaptiveTimeline(CITIES.tarnos, date, points, classification, confidence);
  return { classification, signals: buildEditorialSignals(CITIES.tarnos, date, profile, classification, confidence, timeline, points) };
}
let passed = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`FAIL:${label}`); passed++; }

{
  const r = analyse(makeDay((h) => ({ cloudCoverPct: h >= 14 ? 80 : 20, precipitationMm: h >= 16 && h <= 20 ? 0.8 : 0 })));
  ok(r.signals.keyTakeaway.type === "RAIN_START", "rain_takeaway_start");
  ok(r.signals.keyTakeaway.startHour === 16, "rain_takeaway_hour");
  ok(r.signals.contextualData?.type === "DRY_WINDOW", "rain_context_dry_window");
}

{
  const r = analyse(makeDay((h) => ({ cloudCoverPct: 8, temperatureC: h >= 14 && h <= 18 ? 35 : 27 })));
  ok(r.signals.keyTakeaway.type === "HEAT_PEAK", "heat_takeaway");
  ok(r.signals.keyMoment.type === "HOTTEST", "heat_key_moment");
}

{
  const r = analyse(makeDay((h) => ({ cloudCoverPct: h <= 10 ? 92 : 25, fogSupport: h >= 6 && h <= 10 ? 0.82 : 0.02 })));
  ok(r.signals.keyTakeaway.type === "FOG", "fog_takeaway");
  ok(r.signals.keyMoment.type === "FOG_END", "fog_end_moment");
}

{
  const r = analyse(makeDay(() => ({ cloudCoverPct: 8, temperatureC: 24 })));
  ok(r.signals.keyTakeaway.type === "STABILITY", "stable_takeaway");
  ok(r.signals.contextualData === null, "stable_no_forced_context");
}

{
  const uncertain = conf({ level: "SOME_UNCERTAINTY", mainUncertainty: "RAIN_START", period: { startHour: 15, endHour: 17 }, impact: "HIGH" });
  const r = analyse(makeDay((h) => ({ cloudCoverPct: h >= 14 ? 80 : 20, precipitationMm: h >= 16 && h <= 20 ? 0.8 : 0 })), uncertain);
  ok(r.signals.keyTakeaway.type === "RAIN_START" && r.signals.keyTakeaway.uncertain === true, "uncertain_rain_propagated");
  ok(r.signals.keyTakeaway.startHour === 15 && r.signals.keyTakeaway.endHour === 17, "uncertain_rain_window");
}

console.log(`editorialSignals: ${passed} checks passed`);
