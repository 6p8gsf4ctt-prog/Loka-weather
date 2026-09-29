import {
  DAILY_INSIGHT_RECENT_DAYS,
  buildDailyInsightReference,
  calendarReferenceForDate,
  lastComparable,
  recentDrySpellDays,
  validateDailyInsightReference
} from "../src/engine/dailyInsight/referenceData";
import type { ClimateDailyObservation, ClimateProvenance } from "../src/engine/weekly/climateReferences";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_REFERENCE_FAIL:${label}`);
  passed++;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE",
  stationId: "64024001",
  stationName: "BIARRITZ-PAYS-BASQUE",
  resourceId: "daily-insight-reference-test",
  acquiredAt: "2025-01-01T03:00:00.000Z",
  referenceVersion: "1.0.0"
};

function archive(): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  const cursor = new Date("2020-01-01T00:00:00Z");
  const end = Date.parse("2024-12-31T00:00:00Z");
  while (cursor.getTime() <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const month = cursor.getUTCMonth();
    const seasonal = month >= 5 && month <= 8 ? 8 : 0;
    rows.push({
      stationId: "64024001",
      date,
      tminC: 8 + seasonal,
      tmaxC: 20 + seasonal,
      rainMm: 0,
      gust3sMs: 12,
      quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 },
      provenance
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const hot = rows.find((row) => row.date === "2024-12-15")!;
  hot.tmaxC = 32;
  const invalid = rows.find((row) => row.date === "2024-12-31")!;
  invalid.tmaxC = 40;
  invalid.quality.tmaxC = 0;
  return rows;
}

const observations = archive();
const snapshot = buildDailyInsightReference({
  stationId: "64024001",
  stationName: "BIARRITZ-PAYS-BASQUE",
  sourceSnapshotId: "snapshot-test-v1",
  generatedAt: "2025-01-01T04:00:00.000Z",
  observations
});

ok(snapshot.version === "1.0.0", "versioned_contract");
ok(Object.keys(snapshot.calendar).length === 366, "all_calendar_days_are_precomputed");
ok(snapshot.recent.length === DAILY_INSIGHT_RECENT_DAYS, "recent_tail_is_bounded");
ok(snapshot.recent.at(-1)?.[2] === null, "invalid_quality_is_not_exposed");
ok(snapshot.extremes.tmaxC.max?.value === 32, "invalid_extreme_is_ignored");
ok(lastComparable(snapshot, "tmaxC", "HIGH", 30)?.date === "2024-12-15", "historical_since_lookup_is_precomputed");
ok(lastComparable(snapshot, "gustKmh", "HIGH", 36)?.threshold === 40, "gust_lookup_uses_conservative_display_bucket");
ok((calendarReferenceForDate(snapshot, "2025-01-01", "tmaxC")?.count ?? 0) > 10, "dated_climatology_is_available");
ok(recentDrySpellDays(snapshot) === DAILY_INSIGHT_RECENT_DAYS, "dry_spell_uses_recent_observations");
ok(snapshot.series.some((item) => item.id === "rain-gte-1" && item.longestRun === 0), "series_references_are_precomputed");
ok(snapshot.seasonal.some((item) => item.id === "first-tmax-25" && item.seasons.some((season) => season.firstDate !== null)), "seasonal_occurrences_are_precomputed");
ok(validateDailyInsightReference(JSON.parse(JSON.stringify(snapshot))).sourceSnapshotId === "snapshot-test-v1", "serialized_snapshot_validates");
ok(JSON.stringify(snapshot).length < JSON.stringify(observations).length, "prepared_reference_is_smaller_than_raw_archive");

let rejected = false;
try { validateDailyInsightReference({ ...snapshot, version: "0.0.0" }); }
catch { rejected = true; }
ok(rejected, "unknown_reference_version_is_rejected");

console.log(`DAILY_INSIGHT_REFERENCE ${passed}/14 PASS`);
