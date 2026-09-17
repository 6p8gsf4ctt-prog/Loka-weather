import { CITIES } from "../src/config/cities";
import {
  buildWeeklyProfiles,
  detectClimateDeparture,
  detectHistoricalExtreme,
  detectImpactPhenomena,
  detectIntradayChanges,
  detectProjectedSeries,
  detectRegimeChanges,
  detectSeasonalFirst,
  detectWeeklyRainfallDeparture,
  detectWeeklySignalCandidates,
  validateWeeklyEditorialSignal,
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME
} from "../src/engine/weekly";
import type {
  ClimateDailyObservation,
  ClimateProvenance,
  ConsecutiveSeriesReference,
  DatedClimateReference,
  RainfallReference,
  SeasonalThresholdReference,
  WeeklySignalCandidate
} from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_SIGNAL_DETECTORS_FAIL:${label}`);
  passed++;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE", stationId: WEEKLY_CLIMATE_STATION_ID, stationName: WEEKLY_CLIMATE_STATION_NAME,
  resourceId: "test:reference", acquiredAt: "2026-09-17T12:00:00Z", referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
};

const distribution = { count: 450, min: 5, max: 32, mean: 20, p01: 7, p05: 10, p10: 12, p50: 20, p90: 27, p95: 29, p99: 31 };
const datedReference: DatedClimateReference = {
  kind: "DERIVED_DAILY_CLIMATOLOGY", metric: "tmaxC", targetDate: "2026-09-21", calendarRadiusDays: 7,
  startYear: 1991, endYear: 2020,
  coverage: { metric: "tmaxC", startYear: 1991, endYear: 2020, expected: 10958, valid: 10958, coverage: 1, acceptable: true, distinctYears: 30 },
  distribution, provenance: [provenance]
};

const hotForecast = { date: "2026-09-21", dayIndex: 0, metric: "tmaxC" as const, value: 31, confidence: "HIGH" as const };
const climate = detectClimateDeparture(hotForecast, datedReference);
ok(climate.some((item) => item.detector === "CLIMATE_ANOMALY" && item.facts.anomalyC === 11), "temperature_anomaly_is_detected");
ok(climate.some((item) => item.detector === "EXTREME_PERCENTILE" && item.facts.percentile === 95), "upper_percentile_is_detected");
ok(detectClimateDeparture({ ...hotForecast, value: 21 }, datedReference).length === 0, "ordinary_temperature_is_not_a_candidate");

const archive: ClimateDailyObservation[] = [
  { stationId: WEEKLY_CLIMATE_STATION_ID, date: "2026-06-18", tminC: 10, tmaxC: 32, rainMm: 0, gust3sMs: 10, quality: { tminC: 1, tmaxC: 1 }, provenance },
  { stationId: WEEKLY_CLIMATE_STATION_ID, date: "2026-08-10", tminC: 12, tmaxC: 30, rainMm: 0, gust3sMs: 10, quality: { tminC: 1, tmaxC: 1 }, provenance }
];
const since = detectHistoricalExtreme(hotForecast, archive, "HIGH");
ok(since?.detector === "HISTORICAL_SINCE" && since.facts.previousDate === "2026-06-18", "last_comparable_historical_extreme_is_selected");
const record = detectHistoricalExtreme({ ...hotForecast, value: 33 }, archive, "HIGH");
ok(record?.detector === "RECORD_PROXIMITY" && record.facts.recordValue === 32, "forecast_beyond_archive_extreme_is_conditional_record_candidate");

const rainReference: RainfallReference = {
  kind: "DERIVED_ROLLING_RAINFALL", targetStartDate: "2026-09-21", durationDays: 7, calendarRadiusDays: 7,
  startYear: 1991, endYear: 2020, completeWindows: 450, candidateWindows: 450, coverage: 1,
  distribution: { ...distribution, min: 0, max: 80, mean: 15, p95: 45, p99: 70 }, provenance: [provenance]
};
ok(detectWeeklyRainfallDeparture({ totalMm: 50, startDate: "2026-09-21", endDate: "2026-09-27", representativeDayIndex: 3, confidence: "MEDIUM", reference: rainReference })?.facts.percentile === 95, "weekly_rain_p95_is_detected");
ok(detectWeeklyRainfallDeparture({ totalMm: 20, startDate: "2026-09-21", endDate: "2026-09-27", representativeDayIndex: 3, confidence: "MEDIUM", reference: rainReference }) === null, "ordinary_weekly_rain_is_rejected");

const thresholdReference: SeasonalThresholdReference = {
  metric: "tmaxC", operator: "GTE", threshold: 30, seasonStartMonthDay: "01-01", targetMonthDay: "09-21",
  yearlyCounts: Array.from({ length: 30 }, (_, index) => ({ year: 1991 + index, count: 2, firstDate: `${1991 + index}-06-15` })),
  countDistribution: { ...distribution, count: 30, min: 0, max: 5, mean: 2, p50: 2 },
  firstOccurrenceDates: Array.from({ length: 30 }, (_, index) => `${1991 + index}-06-15`), provenance: [provenance]
};
ok(detectSeasonalFirst({ forecast: hotForecast, operator: "GTE", threshold: 30, occurrencesBeforeForecast: 0, reference: thresholdReference })?.detector === "SEASONAL_FIRST", "first_seasonal_threshold_is_detected");
ok(detectSeasonalFirst({ forecast: hotForecast, operator: "GTE", threshold: 30, occurrencesBeforeForecast: 1, reference: thresholdReference }) === null, "non_first_threshold_is_rejected");

function nextDate(date: string, offset: number): string {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10);
}

function points(modelIndex: number): HourPoint[] {
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const day = Math.floor(index / 24); const hour = index % 24;
    let temperature = 18 + Math.sin(hour / 24 * Math.PI) * 5;
    let rain = 0; let gust = 25; let weatherCode = 1;
    if (day === 1) temperature = 35 + Math.sin(hour / 24 * Math.PI) * 2;
    if (day === 2) rain = 1;
    if (day === 3) gust = 80;
    if (day === 4 && hour >= 14 && hour <= 16) weatherCode = 95;
    if (day === 5 && hour >= 4 && hour <= 9) weatherCode = 45;
    if (day === 6) temperature = hour <= 14 ? 36 : 18;
    return {
      time: `${nextDate("2026-09-21", day)}T${String(hour).padStart(2, "0")}:00`,
      temperatureC: temperature + modelIndex * .05, apparentTemperatureC: temperature + modelIndex * .05,
      precipitationMm: rain, rainMm: rain, cloudCoverPct: rain ? 90 : 20,
      cloudCoverLowPct: rain ? 90 : 10, cloudCoverMidPct: 10, cloudCoverHighPct: 10,
      windSpeedKmh: gust > 70 ? 45 : 10, windGustKmh: gust, weatherCode
    };
  });
}

const models = ["arome", "ifs", "aifs", "icon", "gfs"].map((modelId, index): ModelForecast => ({
  modelId, family: "meteofrance", weight: .2, fetchedAt: "2026-09-17T05:00:00Z",
  latitude: CITIES.tarnos.latitude, longitude: CITIES.tarnos.longitude, hourly: points(index)
}));
const profiles = buildWeeklyProfiles(CITIES.tarnos, models);
const phenomena = detectImpactPhenomena(profiles);
const phenomenonTopics = new Set(phenomena.map((item) => String(item.facts.phenomenon)));
ok(phenomenonTopics.has("STRONG_HEAT"), "impact_heat_is_detected");
ok(phenomenonTopics.has("HEAVY_RAIN"), "impact_rain_is_detected");
ok(phenomenonTopics.has("STRONG_WIND"), "impact_wind_is_detected");
ok(phenomenonTopics.has("THUNDER"), "impact_thunder_is_detected");
ok(phenomenonTopics.has("FOG"), "impact_fog_is_detected");

const regimes = detectRegimeChanges(profiles);
ok(regimes.some((item) => item.facts.direction === "WARMING"), "marked_warming_is_detected");
ok(regimes.some((item) => item.facts.direction === "RAIN_ARRIVAL"), "rain_arrival_is_detected");
ok(regimes.some((item) => item.facts.direction === "WIND_INCREASE"), "wind_increase_is_detected");

const intraday = detectIntradayChanges(profiles);
ok(intraday.some((item) => item.facts.change === "AMPLITUDE"), "same_day_amplitude_is_detected");
ok(intraday.some((item) => item.facts.change === "RAPID_DROP"), "four_hour_temperature_drop_is_detected");
ok(intraday.every((item) => item.signal.forecast.window.startDate === item.signal.forecast.window.endDate), "intraday_candidates_never_cross_days");

const seriesReference: ConsecutiveSeriesReference = {
  metric: "rainMm", operator: "LT", threshold: 1, startDate: "1991-01-01", endDate: "2020-12-31",
  longestRun: 12, latestRun: 2, runCount: 40, provenance: [provenance]
};
ok(detectProjectedSeries({ metric: "rainMm", operator: "LT", threshold: 1, startDate: "2026-09-01", endDate: "2026-09-21", representativeDayIndex: 0, projectedLength: 14, confidence: "HIGH", reference: seriesReference })?.detector === "REMARKABLE_SERIES", "series_longer_than_reference_is_detected");
ok(detectProjectedSeries({ metric: "rainMm", operator: "LT", threshold: 1, startDate: "2026-09-01", endDate: "2026-09-10", representativeDayIndex: 0, projectedLength: 10, confidence: "HIGH", reference: seriesReference }) === null, "ordinary_series_is_rejected");

const orchestrated = detectWeeklySignalCandidates({ profiles });
const all: WeeklySignalCandidate[] = [...climate, since!, record!, ...phenomena, ...regimes, ...intraday, ...orchestrated];
ok(all.every((item) => validateWeeklyEditorialSignal(item.signal).ok), "every_candidate_satisfies_signal_contract");
ok(all.every((item) => Object.keys(item.facts).length > 0), "every_candidate_retains_machine_facts");

console.log(`WEEKLY_SIGNAL_DETECTORS ${passed}/24 PASS`);
