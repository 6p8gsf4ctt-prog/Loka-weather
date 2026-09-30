import {
  dailyInsightCalendar,
  type DailyInsightDataBundle,
  type DailyInsightHourlyPoint
} from "../src/engine/dailyInsight/dataBundle";
import {
  selectDailyInsightEditorial,
  validateDailyInsightSelection,
  type DailyInsightSelectionHistory
} from "../src/engine/dailyInsight/editorialSelection";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_EDITORIAL_SELECTION_FAIL:${label}`);
  passed++;
}

interface FixtureOptions {
  date?: string;
  temperatures?: number[];
  rain?: number[];
  gusts?: number[];
  dryDays?: number;
  pressureChange?: number | null;
  visibility?: number | null;
  humidity?: number | null;
  seaTemperature?: number | null;
  coreReady?: boolean;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function fixture(options: FixtureOptions = {}): DailyInsightDataBundle {
  const date = options.date ?? "2026-09-30";
  const temperatures = options.temperatures ?? Array.from({ length: 24 }, (_, hour) => 12 + Math.sin(hour / 23 * Math.PI) * 8);
  const rain = options.rain ?? Array(24).fill(0);
  const gusts = options.gusts ?? Array(24).fill(30);
  const pressureChange = options.pressureChange ?? 0;
  const startPressure = 1010;
  const hourly: DailyInsightHourlyPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    time: `${date}T${String(hour).padStart(2, "0")}:00`,
    temperatureC: temperatures[hour] ?? temperatures.at(-1)!,
    apparentTemperatureC: (temperatures[hour] ?? temperatures.at(-1)!) - 1,
    precipitationMm: rain[hour] ?? 0,
    cloudCoverPct: 40,
    windSpeedKmh: 15,
    windGustKmh: gusts[hour] ?? gusts.at(-1)!,
    relativeHumidityPct: options.humidity ?? 75,
    surfacePressureHpa: pressureChange === null ? null : startPressure + pressureChange * hour / 23,
    visibilityM: options.visibility ?? 15_000,
    shortwaveRadiationWm2: hour >= 8 && hour <= 18 ? 400 : 0,
    modelCount: 5,
    temperatureSpreadC: 1.2,
    precipitationSupport: (rain[hour] ?? 0) > 0 ? .8 : 0
  }));
  const minTemperatureC = Math.min(...temperatures);
  const maxTemperatureC = Math.max(...temperatures);
  const precipitationTotalMm = rain.reduce((sum, value) => sum + value, 0);
  const maxWindGustKmh = Math.max(...gusts);
  const recentObservations = Array.from({ length: 31 }, (_, index) => {
    const observationDate = addDays(date, index - 31);
    return [observationDate, minTemperatureC, maxTemperatureC, 0, maxWindGustKmh] as [string, number, number, number, number];
  });
  const climate = {
    tminC: { metric: "tminC" as const, count: 450, mean: minTemperatureC, p05: minTemperatureC - 7, p50: minTemperatureC, p95: minTemperatureC + 7 },
    tmaxC: { metric: "tmaxC" as const, count: 450, mean: maxTemperatureC, p05: maxTemperatureC - 7, p50: maxTemperatureC, p95: maxTemperatureC + 7 },
    rainMm: { metric: "rainMm" as const, count: 450, mean: 2, p05: 0, p50: 0, p95: 15 },
    gustKmh: { metric: "gustKmh" as const, count: 420, mean: 35, p05: 15, p50: 30, p95: 75 }
  };
  const seaTemperature = options.seaTemperature ?? null;
  return {
    version: "1.0.0", mode: "LAB_ONLY", id: `bundle:${date}`, targetDate: date, generatedAt: `${date}T05:00:00.000Z`,
    city: { slug: "tarnos", name: "Tarnos", latitude: 43.5417, longitude: -1.4628, timezone: "Europe/Paris" },
    sources: {
      forecast: { state: "READY", provider: "TEST", generatedAt: `${date}T05:00:00.000Z`, detail: "5_models", snapshotId: "forecast-v1", modelCount: 5 },
      localArchive: { state: "READY", provider: "METEO_FRANCE", generatedAt: `${date}T04:00:00.000Z`, detail: "25000_rows", sourceSnapshotId: "climate-v1", stationId: "64024001", lastDate: addDays(date, -1) },
      atmosphere: { state: "READY", provider: "TEST_ATMOSPHERE", generatedAt: `${date}T05:00:00.000Z`, detail: "24_hours" },
      marine: { state: seaTemperature === null ? "UNAVAILABLE" : "READY", provider: "TEST_MARINE", generatedAt: `${date}T05:00:00.000Z`, detail: seaTemperature === null ? "missing" : "24_hours" },
      tides: { state: "NOT_CONFIGURED", provider: "TIDE_PROVIDER", generatedAt: null, detail: "not_configured" },
      solar: { state: "READY", provider: "NOAA", generatedAt: `${date}T05:00:00.000Z`, detail: "NOAA" },
      calendar: { state: "READY", provider: "DETERMINISTIC", generatedAt: `${date}T05:00:00.000Z`, detail: "calendar" }
    },
    hourly,
    daily: {
      minTemperatureC, maxTemperatureC, minApparentTemperatureC: minTemperatureC - 1, maxApparentTemperatureC: maxTemperatureC - 1,
      thermalAmplitudeC: maxTemperatureC - minTemperatureC, precipitationTotalMm, wetHourCount: rain.filter((value) => value >= .1).length,
      maxWindGustKmh, meanCloudCoverPct: 40, meanRelativeHumidityPct: options.humidity ?? 75,
      minSurfacePressureHpa: pressureChange === null ? null : Math.min(startPressure, startPressure + pressureChange),
      maxSurfacePressureHpa: pressureChange === null ? null : Math.max(startPressure, startPressure + pressureChange),
      pressureChangeHpa: pressureChange, minVisibilityM: options.visibility ?? 15_000, maxShortwaveRadiationWm2: 400
    },
    climate,
    recentObservations,
    drySpellDays: options.dryDays ?? 0,
    solar: { dawn: "07:00", sunrise: "07:30", solarNoon: "13:50", sunset: "20:10", dusk: "20:40", daylightMinutes: 760, daylightDeltaMinutes: -3, sunriseDeltaMinutes: 1, sunsetDeltaMinutes: -2, method: "NOAA", twilight: "CIVIL" },
    calendar: dailyInsightCalendar(date),
    marine: { points: seaTemperature === null ? [] : hourly.map((point) => ({ time: point.time, seaSurfaceTemperatureC: seaTemperature, waveHeightM: 1.2, wavePeriodS: 8 })), seaSurfaceTemperatureC: seaTemperature, maxWaveHeightM: seaTemperature === null ? null : 1.2 },
    tides: [],
    quality: { coreReady: options.coreReady ?? true, enrichmentCoveragePct: seaTemperature === null ? 33 : 67, missingBlocks: seaTemperature === null ? ["marine", "tides"] : ["tides"], warnings: [] }
  };
}

const clock = selectDailyInsightEditorial({ bundle: fixture({ date: "2026-10-25" }) });
ok(clock.status === "SELECTED" && clock.winner?.detectorId === "C01", "certain_clock_change_has_priority");
ok(clock.winner?.claim === "CALENDAR_CERTAIN" && clock.winner.evidence.length === 1, "calendar_event_has_specific_proof_gate");

const dropTemperatures = Array(20).fill(30).concat([30, 27, 24, 20]);
const thermalBundle = fixture({ temperatures: dropTemperatures });
thermalBundle.recentObservations.at(-1)![1] = 20;
thermalBundle.recentObservations.at(-1)![2] = 30;
const thermal = selectDailyInsightEditorial({ bundle: thermalBundle });
ok(thermal.winner?.detectorId === "T08" && thermal.winner.priority === "P0", "rapid_temperature_drop_is_selected");
ok(thermal.winner?.headline.includes("chute") === true && thermal.winner.claim === "EXPECTED_HIGH", "forecast_wording_remains_conditional");
ok((thermal.winner?.evidence.length ?? 0) >= 2 && thermal.winner?.trace.sourceKeys.includes("hourly.temperatureC") === true, "winner_is_fully_traceable");

const rain = Array(24).fill(0);
rain[15] = 5;
const rainReturn = selectDailyInsightEditorial({ bundle: fixture({ rain, dryDays: 22 }) });
ok(rainReturn.winner?.detectorId === "R02" && rainReturn.winner.priority === "P0", "rain_return_after_long_dry_spell_is_selected");

const windyBundle = fixture({ temperatures: dropTemperatures, gusts: Array(24).fill(92) });
windyBundle.recentObservations.at(-1)![1] = 20;
windyBundle.recentObservations.at(-1)![2] = 30;
const history: DailyInsightSelectionHistory[] = [{ date: "2026-09-29", detectorId: "T08", topicKey: "TEMP_DROP:20-23", family: "TEMPERATURE", format: "F2_EVOLUTION_RAPIDE" }];
const rotated = selectDailyInsightEditorial({ bundle: windyBundle, recentSelections: history });
ok(rotated.winner?.detectorId === "V03", "rotation_can_prefer_an_equally_strong_other_family");
ok(rotated.candidates.find((candidate) => candidate.detectorId === "T08")?.score.penalties.length === 3, "rotation_penalties_are_audited");

const duplicate = selectDailyInsightEditorial({ bundle: fixture({ date: "2026-10-25" }), primarySlideTopics: ["C01"] });
ok(duplicate.candidates.find((candidate) => candidate.detectorId === "C01")?.rejectionReasons.includes("DUPLICATES_PRIMARY_SLIDE") === true, "primary_slide_duplicate_is_rejected");

const missing = selectDailyInsightEditorial({ bundle: fixture({ coreReady: false }) });
ok(missing.status === "DATA_NOT_READY" && missing.winner === null, "incomplete_core_data_blocks_selection");

const calm = selectDailyInsightEditorial({ bundle: fixture() });
ok(calm.status === "SELECTED" && calm.winner?.detectorId === "H01" && calm.winner.priority === "P3", "close_local_analogue_provides_controlled_fallback");
ok(validateDailyInsightSelection(JSON.parse(JSON.stringify(calm))).bundleId === calm.bundleId, "serialized_selection_validates");

console.log(`DAILY_INSIGHT_EDITORIAL_SELECTION ${passed}/12 PASS`);
