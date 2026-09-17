import {
  buildConsecutiveSeriesReference,
  buildDatedTemperatureReference,
  buildHourlyClimateReference,
  buildRollingRainfallReference,
  buildSeasonalThresholdReference,
  dailyCoverage,
  normalizeDailyArchiveRow,
  normalizeHourlyArchiveRow,
  parseSemicolonArchive,
  percentile,
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME
} from "../src/engine/weekly";
import type { ClimateDailyObservation, ClimateHourlyObservation, ClimateProvenance } from "../src/engine/weekly";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_CLIMATE_REFERENCES_FAIL:${label}`);
  passed++;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE",
  stationId: WEEKLY_CLIMATE_STATION_ID,
  stationName: WEEKLY_CLIMATE_STATION_NAME,
  resourceId: "test:daily:64",
  acquiredAt: "2026-09-17T10:00:00.000Z",
  referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
};

function iso(date: Date): string { return date.toISOString().slice(0, 10); }

function dailyArchive(startYear = 1991, endYear = 2020): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  let cursor = new Date(`${startYear}-01-01T00:00:00Z`);
  const end = new Date(`${endYear}-12-31T00:00:00Z`);
  while (cursor <= end) {
    const day = Number(iso(cursor).slice(8));
    const month = Number(iso(cursor).slice(5, 7));
    rows.push({
      stationId: WEEKLY_CLIMATE_STATION_ID,
      date: iso(cursor),
      tminC: month + day / 100,
      tmaxC: month + 10 + day / 100,
      rainMm: day === 1 ? 7 : 0,
      gust3sMs: 8,
      quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 },
      provenance
    });
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return rows;
}

function hourlyArchive(): ClimateHourlyObservation[] {
  const rows: ClimateHourlyObservation[] = [];
  for (let year = 2000; year <= 2024; year++) {
    for (let offset = -7; offset <= 7; offset++) {
      const center = new Date(`${year}-09-17T00:00:00Z`);
      const date = new Date(center.getTime() + offset * 86_400_000);
      rows.push({
        stationId: WEEKLY_CLIMATE_STATION_ID,
        sourceTimestamp: iso(date).replaceAll("-", "") + "22",
        localDate: iso(date), localHour: 22,
        temperatureC: 15 + (year - 2000) / 10 + offset / 100,
        rainMm: 0, gust3sMs: 6,
        quality: { temperatureC: 1, rainMm: 1, gust3sMs: 1 },
        provenance
      });
    }
  }
  return rows;
}

const parsed = parseSemicolonArchive("NUM_POSTE;AAAAMMJJ;TN;TX;RR;FXI3S;QTN;QTX;QRR;QFXI3S\n64024001;20260917;12,4;24,8;1,2;14,0;1;1;1;1\n");
ok(parsed.length === 1 && parsed[0].TN === "12,4", "semicolon_parser_preserves_decimal_comma");

const normalizedDaily = normalizeDailyArchiveRow(parsed[0], provenance);
ok(normalizedDaily?.date === "2026-09-17" && normalizedDaily.tminC === 12.4 && normalizedDaily.rainMm === 1.2, "daily_archive_is_normalized");
ok(normalizeDailyArchiveRow({ ...parsed[0], NUM_POSTE: "99999999" }, provenance) === null, "foreign_station_is_rejected");

const normalizedHourly = normalizeHourlyArchiveRow({ NUM_POSTE: WEEKLY_CLIMATE_STATION_ID, AAAAMMJJHH: "2026091720", T: "21.5", RR1: "0", FXI3S: "9" }, {
  provenance,
  toLocalDateHour: () => ({ date: "2026-09-17", hour: 22 })
});
ok(normalizedHourly?.localHour === 22 && normalizedHourly.sourceTimestamp === "2026091720", "hourly_timezone_conversion_is_explicit");

const daily = dailyArchive();
const coverage = dailyCoverage(daily, "tmaxC", 1991, 2020);
ok(coverage.coverage === 1 && coverage.distinctYears === 30 && coverage.acceptable, "daily_1991_2020_coverage_is_measured");

const temperature = buildDatedTemperatureReference(daily, { metric: "tmaxC", targetDate: "2026-09-17" });
ok(temperature.distribution.count === 450 && temperature.calendarRadiusDays === 7, "dated_temperature_uses_30_years_and_15_day_window");
ok(temperature.distribution.p95 > temperature.distribution.p50, "dated_temperature_percentiles_are_ordered");
ok(percentile([0, 10], .5) === 5, "percentile_is_interpolated");

const rain = buildRollingRainfallReference(daily, { targetStartDate: "2026-09-17" });
ok(rain.durationDays === 7 && rain.completeWindows === 450 && rain.coverage === 1, "rain_uses_complete_comparable_rolling_windows");

const threshold = buildSeasonalThresholdReference(daily, {
  metric: "tmaxC", operator: "GTE", threshold: 19,
  seasonStartMonthDay: "09-01", targetMonthDay: "09-30"
});
ok(threshold.yearlyCounts.length === 30 && threshold.yearlyCounts.every((item) => item.count === 30), "seasonal_threshold_counts_each_reference_year");
ok(threshold.firstOccurrenceDates.every((date) => date.endsWith("-09-01")), "seasonal_first_occurrence_is_retained");

const series = buildConsecutiveSeriesReference(daily, { metric: "rainMm", operator: "LT", threshold: 1, startDate: "2020-09-02", endDate: "2020-09-30" });
ok(series.longestRun === 29 && series.latestRun === 29 && series.runCount === 1, "consecutive_series_is_calendar_continuous");

const hourly = buildHourlyClimateReference(hourlyArchive(), { metric: "temperatureC", targetDate: "2026-09-17", localHour: 22 });
ok(hourly.distinctYears === 25 && hourly.distribution.count === 375, "hourly_reference_uses_2000_2024_same_local_hour");

let insufficientHourlyBlocked = false;
try {
  buildHourlyClimateReference(hourlyArchive().filter((row) => Number(row.localDate.slice(0, 4)) < 2010), { metric: "temperatureC", targetDate: "2026-09-17", localHour: 22 });
} catch (error) { insufficientHourlyBlocked = error instanceof Error && error.message === "climate_hourly_years_insufficient"; }
ok(insufficientHourlyBlocked, "hourly_reference_requires_twenty_years");

let lowCoverageBlocked = false;
try {
  buildDatedTemperatureReference(daily.filter((_, index) => index % 2 === 0), { metric: "tmaxC", targetDate: "2026-09-17" });
} catch (error) { lowCoverageBlocked = error instanceof Error && error.message === "climate_daily_coverage_insufficient"; }
ok(lowCoverageBlocked, "daily_reference_requires_ninety_percent_coverage");

const multipleResources = buildDatedTemperatureReference(daily.map((row, index) => index === 0 ? { ...row, provenance: { ...provenance, resourceId: "test:daily:other-decade" } } : row), { metric: "tmaxC", targetDate: "2026-09-17" });
ok(multipleResources.provenance.length === 2, "multiple_decade_resources_remain_traceable");

let mixedStationBlocked = false;
try {
  buildDatedTemperatureReference(daily.map((row, index) => index === 0 ? { ...row, stationId: "99999999" } : row), { metric: "tmaxC", targetDate: "2026-09-17" });
} catch (error) { mixedStationBlocked = error instanceof Error && error.message === "climate_reference_mixed_station"; }
ok(mixedStationBlocked, "mixed_stations_are_rejected");

const badQuality = daily.map((row) => row.date === "2000-09-17" ? { ...row, quality: { ...row.quality, tmaxC: 9 } } : row);
const cleanReference = buildDatedTemperatureReference(badQuality, { metric: "tmaxC", targetDate: "2026-09-17" });
ok(cleanReference.distribution.count === 449, "invalid_quality_value_is_excluded");

console.log(`WEEKLY_CLIMATE_REFERENCES ${passed}/18 PASS`);
