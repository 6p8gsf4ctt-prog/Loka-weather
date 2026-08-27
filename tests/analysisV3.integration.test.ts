import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { evaluatePublicationGuard } from "../src/engine/publicationGuard";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date = "2026-08-18";
const specs: Array<[string, WeatherFamily, number, number]> = [
  ["arome", "meteofrance", 0.30, 15],
  ["ecmwf_ifs", "ecmwf_physics", 0.25, 16],
  ["ecmwf_aifs", "ecmwf_ai", 0.15, 16],
  ["icon_eu", "dwd", 0.17, 17],
  ["gfs", "noaa", 0.13, 17]
];

function model(id: string, family: WeatherFamily, weight: number, rainStart: number): ModelForecast {
  const hourly: HourPoint[] = [];
  for (let h = 0; h <= 23; h++) {
    const wet = h >= rainStart && h <= 20;
    const cloud = h < 13 ? 22 : h < rainStart ? 72 : 92;
    const temp = 17 + Math.min(h, 15) * 0.45 - (wet ? 1.5 : 0);
    hourly.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`,
      temperatureC: temp, apparentTemperatureC: temp,
      precipitationMm: wet ? 0.8 : 0, rainMm: wet ? 0.8 : 0,
      cloudCoverPct: cloud, cloudCoverLowPct: cloud, cloudCoverMidPct: Math.max(0, cloud - 10), cloudCoverHighPct: cloud,
      windSpeedKmh: 18, windGustKmh: 30, weatherCode: wet ? 61 : cloud >= 85 ? 3 : cloud >= 50 ? 2 : 1
    });
  }
  return { modelId: id, family, weight, fetchedAt: new Date().toISOString(), latitude: 43.54, longitude: -1.46, hourly };
}

const forecasts = specs.map(([id, family, weight, start]) => model(id, family, weight, start));
const consensus = buildConsensus(forecasts);
const payload = buildCandidateProduct(CITIES.tarnos, date, consensus, forecasts, {}, "TEST_V3");

let passed = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`FAIL:${label}`); passed++; }

ok(payload.analysis?.version === "3.0", "analysis_present");
ok(payload.analysis?.classification.dominantPhenomenon === "RAIN", "analysis_rain_dominant");
ok(payload.analysis?.classification.evolution === "TWO_PHASES", "analysis_two_phases");
ok(payload.analysis?.weatherConfidence.level === "SOME_UNCERTAINTY", "analysis_weather_confidence");
ok(payload.analysis?.weatherConfidence.mainUncertainty === "RAIN_START", "analysis_rain_start_uncertainty");
ok((payload.analysis?.timeline.points.length ?? 0) >= 5 && (payload.analysis?.timeline.points.length ?? 0) <= 9, "analysis_timeline_bounds");
ok(payload.analysis?.timeline.points.some((p) => p.hour === 16 || p.hour === 17) === true, "analysis_transition_represented");
ok(payload.analysis?.editorialSignals.keyTakeaway.type === "RAIN_START", "analysis_takeaway_rain_start");
const guard = evaluatePublicationGuard(payload);
ok(guard.status === "PASS", `publication_guard:${guard.reason}`);

console.log(`analysisV3Integration: ${passed} checks passed`);
