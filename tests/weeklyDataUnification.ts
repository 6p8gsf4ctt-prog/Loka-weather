import {
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME,
  type ClimateDailyObservation,
  type ClimateProvenance
} from "../src/engine/weekly";
import {
  evaluateMeteoFranceDailyArchive,
  readMeteoFranceClimateBootstrap,
  readMeteoFranceDailyResource,
  selectMeteoFranceDailyResources,
  type DataGouvClimateDataset
} from "../src/weather/meteoFranceClimate";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_DATA_UNIFICATION_FAIL:${label}`);
  passed++;
}

const resources: DataGouvClimateDataset = {
  id: "daily",
  last_update: "2026-09-17T06:00:00Z",
  resources: [
    { id: "other", title: "QUOT_departement_33_periode_1950-2024_RR-T-Vent", url: "https://example.test/33.csv.gz", format: "csv.gz" },
    { id: "historic", title: "QUOT_departement_64_periode_1950-2024_RR-T-Vent", url: "https://example.test/history.csv.gz", format: "csv.gz", last_modified: "2026-08-02T00:00:00Z" },
    { id: "latest", title: "QUOT_departement_64_periode_2025-2026_RR-T-Vent", url: "https://example.test/latest.csv.gz", format: "csv.gz", last_modified: "2026-09-17T06:00:00Z" },
    { id: "extra", title: "QUOT_departement_64_periode_2025-2026_autres-parametres", url: "https://example.test/extra.csv.gz", format: "csv.gz" }
  ]
};

const selected = selectMeteoFranceDailyResources(resources);
ok(selected.map((item) => item.id).join(",") === "historic,latest", "catalog_selects_historical_and_rolling_resources");

const provenance: ClimateProvenance = {
  provider: "METEO_FRANCE",
  stationId: WEEKLY_CLIMATE_STATION_ID,
  stationName: WEEKLY_CLIMATE_STATION_NAME,
  resourceId: "latest",
  acquiredAt: "2026-09-17T08:00:00.000Z",
  referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
};

async function gzipResponse(text: string): Promise<Response> {
  const source = new Blob([text]).stream();
  const compressed = source.pipeThrough(new CompressionStream("gzip"));
  return new Response(compressed, { status: 200, headers: { "content-type": "application/gzip" } });
}

function archive(endDate: string): ClimateDailyObservation[] {
  const rows: ClimateDailyObservation[] = [];
  let cursor = new Date("1956-01-01T00:00:00Z");
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    rows.push({
      stationId: WEEKLY_CLIMATE_STATION_ID,
      date,
      tminC: 10,
      tmaxC: 20,
      rainMm: 0,
      gust3sMs: 8,
      quality: { tminC: 1, tmaxC: 1, rainMm: 1, gust3sMs: 1 },
      provenance
    });
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return rows;
}

(async () => {
  const csv = [
    "NUM_POSTE;NOM_USUEL;AAAAMMJJ;RR;QRR;TN;QTN;TX;QTX;FXI3S;QFXI3S",
    "64006001;ACCOUS;20260915;0;1;9;1;20;1;4;1",
    "64024001;BIARRITZ-PAYS-BASQUE;20260915;0.2;1;15.6;1;24.5;1;15.0;1"
  ].join("\n");
  const parsed = await readMeteoFranceDailyResource(await gzipResponse(csv), provenance);
  ok(parsed.length === 1 && parsed[0].date === "2026-09-15", "gzip_stream_is_filtered_to_reference_station");
  ok(parsed[0].tminC === 15.6 && parsed[0].gust3sMs === 15, "gzip_stream_is_normalized");

  const bootstrap = await readMeteoFranceClimateBootstrap(new Response(JSON.stringify({
    version: 1,
    stationId: WEEKLY_CLIMATE_STATION_ID,
    sourceTitle: "history",
    sourceUrl: "https://example.test/history.csv.gz",
    sourceLastModified: "2026-08-02T00:00:00Z",
    firstDate: "2024-12-31",
    lastDate: "2024-12-31",
    rowCount: 1,
    rows: [["2024-12-31", 8, 15, 1.2, 12, 1, 1, 1, 1]]
  })), provenance);
  ok(bootstrap.length === 1 && bootstrap[0].rainMm === 1.2 && bootstrap[0].provenance.resourceId === "latest", "compact_official_bootstrap_is_normalized");

  const quality = evaluateMeteoFranceDailyArchive(archive("2026-09-15"), new Date("2026-09-17T12:00:00Z"));
  ok(quality.acceptable && quality.latestObservationAgeDays === 2, "complete_recent_archive_is_accepted");
  ok(Object.values(quality.coverage).every((item) => item.acceptable), "reference_coverage_is_checked");

  const stale = evaluateMeteoFranceDailyArchive(archive("2026-08-31"), new Date("2026-09-17T12:00:00Z"));
  ok(!stale.acceptable && stale.issues.some((item) => item.startsWith("latest_observation_too_old")), "stale_archive_is_rejected");

  console.log(`WEEKLY_DATA_UNIFICATION ${passed}/7 PASS`);
})().catch((error) => { throw error; });
