import { CITIES } from "../src/config/cities";
import {
  buildDailyInsightDataBundle,
  dailyInsightCalendar,
  validateDailyInsightDataBundle,
  type DailyInsightAtmosphereInput,
  type DailyInsightMarineInput
} from "../src/engine/dailyInsight/dataBundle";
import type { DailyInsightReferenceSnapshot } from "../src/engine/dailyInsight/referenceData";
import type { ClimateDistribution } from "../src/engine/weekly/climateReferences";
import type { ForecastSnapshot } from "../src/weather/forecastSnapshot";
import { collectDailyInsightExternalData } from "../src/weather/dailyInsightDataSources";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_DATA_LAB_FAIL:${label}`);
  passed++;
}

const date = "2026-10-25";
const generatedAt = "2026-10-24T05:00:00.000Z";
const distribution: ClimateDistribution = { count: 450, min: 2, max: 29, mean: 16, p01: 4, p05: 7, p10: 9, p50: 16, p90: 23, p95: 25, p99: 28 };
const calendar = Object.fromEntries(Array.from({ length: 366 }, (_, index) => {
  const cursor = new Date(Date.UTC(2000, 0, index + 1));
  const monthDay = cursor.toISOString().slice(5, 10);
  return [monthDay, { monthDay, radiusDays: 7, metrics: { tminC: distribution, tmaxC: distribution, rainMm: distribution, gustKmh: distribution } }];
}));
const reference: DailyInsightReferenceSnapshot = {
  version: "1.0.0", stationId: "64024001", stationName: "BIARRITZ-PAYS-BASQUE",
  sourceSnapshotId: "climate-v1", generatedAt, firstDate: "1956-01-01", lastDate: "2026-10-24", rowCount: 25000,
  validCounts: { tminC: 20000, tmaxC: 20000, rainMm: 20000, gustKmh: 18000 },
  climateStartYear: 1991, climateEndYear: 2020, calendarRadiusDays: 7, calendar,
  comparable: { tminC: { high: [], low: [] }, tmaxC: { high: [], low: [] }, rainMm: { high: [], low: [] }, gustKmh: { high: [], low: [] } },
  extremes: { tminC: { min: null, max: null }, tmaxC: { min: null, max: null }, rainMm: { min: null, max: null }, gustKmh: { min: null, max: null } },
  series: [], seasonal: [],
  recent: Array.from({ length: 31 }, (_, index) => [`2026-09-${String(index + 1).padStart(2, "0")}`, 12, 20, 0, 35])
};
const consensus = Array.from({ length: 24 }, (_, hour) => ({
  time: `${date}T${String(hour).padStart(2, "0")}:00`, temperatureC: 10 + hour / 2,
  apparentTemperatureC: 9 + hour / 2, precipitationMm: hour === 14 ? 2 : 0,
  cloudCoverPct: 40, cloudCoverLowPct: 20, cloudCoverMidPct: 10, cloudCoverHighPct: 10,
  cloudLayerModelCount: 5, windSpeedKmh: 12, windGustKmh: 24 + hour,
  modelCount: 5, temperatureSpreadC: 1.2, precipitationSupport: hour === 14 ? .8 : 0,
  rainCodeSupport: 0, showerSupport: 0, thunderstormSupport: 0, fogSupport: 0
}));
const forecast: ForecastSnapshot = {
  version: "1.0.0", id: "forecast-v1", citySlug: "tarnos", purpose: "DAILY", generatedAt,
  request: { forecastDays: 2 }, forecasts: Array.from({ length: 5 }, (_, index) => ({
    modelId: `m${index}`, family: "meteofrance", weight: .2, fetchedAt: generatedAt,
    latitude: CITIES.tarnos.latitude, longitude: CITIES.tarnos.longitude, hourly: []
  })), failures: {}, consensus
};
const atmosphere: DailyInsightAtmosphereInput = {
  manifest: { state: "READY", provider: "TEST_ATMOSPHERE", generatedAt, detail: "24_hours" },
  points: consensus.map((point, hour) => ({ time: point.time, relativeHumidityPct: 80 - hour, surfacePressureHpa: 1010 + hour / 2, visibilityM: 15000, shortwaveRadiationWm2: hour >= 8 && hour <= 18 ? 400 : 0 }))
};
const marine: DailyInsightMarineInput = {
  manifest: { state: "READY", provider: "TEST_MARINE", generatedAt, detail: "24_hours" },
  points: consensus.map((point) => ({ time: point.time, seaSurfaceTemperatureC: 18.4, waveHeightM: 1.2, wavePeriodS: 8 }))
};

const bundle = buildDailyInsightDataBundle({ city: CITIES.tarnos, targetDate: date, generatedAt, forecast, reference, atmosphere, marine });
ok(bundle.mode === "LAB_ONLY", "bundle_is_explicitly_lab_only");
ok(bundle.hourly.length === 24 && bundle.daily.precipitationTotalMm === 2, "daily_summary_comes_from_consensus");
ok(bundle.daily.pressureChangeHpa === 11.5 && bundle.daily.meanRelativeHumidityPct === 68.5, "atmospheric_enrichment_is_merged");
ok(bundle.marine.seaSurfaceTemperatureC === 18.4 && bundle.marine.maxWaveHeightM === 1.2, "marine_values_are_kept_separate");
ok(bundle.sources.tides.state === "NOT_CONFIGURED" && bundle.tides.length === 0, "missing_tides_are_never_invented");
ok(bundle.quality.coreReady && bundle.quality.enrichmentCoveragePct === 67, "quality_manifest_exposes_partial_enrichment");
ok(bundle.calendar.clockChange === "WINTER_TIME_START", "french_winter_clock_change_is_deterministic");
ok(Object.keys(bundle.climate).length === 4 && bundle.recentObservations.length === 31, "local_context_is_bounded_and_complete");
ok(validateDailyInsightDataBundle(JSON.parse(JSON.stringify(bundle))).id === bundle.id, "serialized_bundle_validates");
ok(dailyInsightCalendar("2026-03-01").firstDayOfSeason, "meteorological_season_start_is_available");

(async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    const marineRequest = url.includes("marine-api");
    const hourly = marineRequest ? {
      time: [`${date}T00:00`], sea_surface_temperature: [18], wave_height: [1.4], wave_period: [9]
    } : {
      time: [`${date}T00:00`], relative_humidity_2m: [78], surface_pressure: [1012], visibility: [12000], shortwave_radiation: [0]
    };
    return new Response(JSON.stringify({ hourly }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const external = await collectDailyInsightExternalData(CITIES.tarnos, date, { fetcher, generatedAt });
  ok(external.atmosphere.manifest.state === "READY" && external.marine.manifest.state === "READY", "external_collectors_report_source_state");
  ok(urls.some((url) => url.includes("relative_humidity_2m")) && urls.some((url) => url.includes("sea_surface_temperature")), "external_requests_are_scoped_to_declared_variables");

  console.log(`DAILY_INSIGHT_DATA_LAB ${passed}/12 PASS`);
})().catch((error) => { throw error; });
