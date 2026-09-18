import { CITIES } from "../src/config/cities";
import {
  activateWeeklyEditorialSignals,
  buildWeeklyContextualPipeline,
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME
} from "../src/engine/weekly";
import type { ClimateDailyObservation, ClimateProvenance } from "../src/engine/weekly";
import { generateWeeklyContextualVisualPreview } from "../src/weeklyPipeline";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_EDITORIAL_ACTIVATION_FAIL:${label}`);
  passed++;
}

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE",
  stationId: WEEKLY_CLIMATE_STATION_ID,
  stationName: WEEKLY_CLIMATE_STATION_NAME,
  resourceId: "test:n2:daily:64",
  acquiredAt: "2026-09-17T10:00:00.000Z",
  referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
};

function iso(date: Date): string { return date.toISOString().slice(0, 10); }

function archive(): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  let cursor = new Date("1991-01-01T00:00:00Z");
  const end = new Date("2026-09-20T00:00:00Z");
  let index = 0;
  while (cursor <= end) {
    const date = iso(cursor);
    const currentYear = Number(date.slice(0, 4)) === 2026;
    const rainMm = currentYear && date >= "2026-09-18" ? 0 : index % 3 === 0 ? 2 : 0;
    rows.push({
      stationId: WEEKLY_CLIMATE_STATION_ID,
      date,
      tminC: 12,
      tmaxC: 22,
      rainMm,
      gust3sMs: 8,
      quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 },
      provenance
    });
    cursor = new Date(cursor.getTime() + 86_400_000);
    index++;
  }
  return rows;
}

const generated = generateWeeklyContextualVisualPreview(CITIES.tarnos!, new Date("2026-09-17T12:00:00Z"), "2026-09-21");
const dailyArchive = archive();
const activation = activateWeeklyEditorialSignals(generated.profiles, dailyArchive);
const detectors = new Set(activation.candidates.map((candidate) => candidate.detector));

ok(activation.evaluatedFamilies.length === 4, "all_archive_backed_families_are_evaluated");
ok(detectors.has("RECORD_PROXIMITY"), "record_candidates_are_activated");
ok(detectors.has("CLIMATE_ANOMALY"), "climate_anomalies_are_activated");
ok(detectors.has("EXTREME_PERCENTILE"), "temperature_and_rain_percentiles_are_activated");
ok(detectors.has("SEASONAL_FIRST"), "seasonal_thresholds_are_activated");
ok(detectors.has("REMARKABLE_SERIES"), "projected_series_are_activated");

const contextual = buildWeeklyContextualPipeline(generated.profiles, { dailyArchive });
ok(contextual.climateStatus === "READY" && contextual.activation !== null, "validated_archive_reaches_the_real_pipeline");
ok(contextual.ranking.selected.length > 0 && contextual.ranking.rejected.length > 0, "scoring_and_deduplication_are_applied");
ok(contextual.slides.slides.length >= 1 && contextual.slides.slides.length <= 3, "adaptive_slides_2_to_4_are_selected");
ok(contextual.preflight.ok && contextual.preflight.comprehensive, "complete_preflight_accepts_the_real_activation_path");

let mixedStationRejected = false;
try {
  activateWeeklyEditorialSignals(generated.profiles, dailyArchive.map((row, index) => index === 0 ? { ...row, stationId: "99999999" } : row));
} catch (error) {
  mixedStationRejected = error instanceof Error && error.message === "weekly_editorial_activation_station_mismatch";
}
ok(mixedStationRejected, "mixed_station_archive_is_rejected_before_detection");

console.log(`WEEKLY_EDITORIAL_ACTIVATION ${passed}/11 PASS`);
