import { CITIES } from "../src/config/cities";
import type { DailyInsightCandidateV2, DailyInsightSelectionResult } from "../src/engine/dailyInsight/editorialSelection";
import type { DailyInsightLabPreviewResult } from "../src/dailyInsightLab";
import { generateDailyInsightLabPreview } from "../src/dailyInsightLab";
import { renderDailyInsightLabPreview } from "../src/ui/dailyInsightLabPreview";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_LAB_PREVIEW_FAIL:${label}`);
  passed++;
}

const candidate: DailyInsightCandidateV2 = {
  id: "T08:2026-09-30:TEMP_DROP:20-23",
  detectorId: "T08",
  topicKey: "TEMP_DROP:20-23",
  family: "TEMPERATURE",
  priority: "P0",
  format: "F2_EVOLUTION_RAPIDE",
  claim: "EXPECTED_HIGH",
  valueLabel: "−10 °C",
  headline: "Grosse chute des températures entre 20 h et 23 h.",
  proofLine: "10 °C de moins en seulement 3 heures.",
  evidence: [
    { source: "LOKA_CONSENSUS", metric: "temperature", value: 28, unit: "°C", window: "2026-09-30T20:00", detail: "Début de la fenêtre." },
    { source: "LOKA_CONSENSUS", metric: "temperature", value: 18, unit: "°C", window: "2026-09-30T23:00", detail: "Fin de la fenêtre." }
  ],
  score: { rarity: 24, magnitude: 20, utility: 20, localSpecificity: 15, clarity: 10, confidence: 10, base: 99, penalties: [], final: 99 },
  eligible: true,
  rejectionReasons: [],
  trace: { threshold: "drop>=10C within<=3h", observed: "10C/3h", sourceKeys: ["hourly.temperatureC"] }
};

const selection: DailyInsightSelectionResult = {
  version: "1.1.0",
  mode: "LAB_ONLY",
  citySlug: "tarnos",
  targetDate: "2026-09-30",
  generatedAt: "2026-09-30T05:00:00.000Z",
  bundleId: "bundle-test-1234567890",
  status: "SELECTED",
  publicationThreshold: 70,
  winner: candidate,
  candidates: [candidate],
  audit: { generated: 1, eligible: 1, rejected: 0, rejectionCounts: {}, appliedRotationPenalties: 0 }
};

const ready: DailyInsightLabPreviewResult = {
  version: "1.0.0",
  mode: "LAB_ONLY",
  citySlug: "tarnos",
  targetDate: "2026-09-30",
  generatedAt: "2026-09-30T05:00:00.000Z",
  status: "READY",
  detail: "selected",
  bundle: {
    id: "bundle-test-1234567890",
    sources: {
      forecast: { state: "READY", provider: "LOKA_5_MODEL_CONSENSUS", snapshotId: "forecast-test", generatedAt: "2026-09-30T05:00:00.000Z", modelCount: 5, failedModels: [], detail: "5_models" },
      localArchive: { state: "READY", provider: "METEO_FRANCE", sourceSnapshotId: "reference-test", generatedAt: "2026-09-30T04:00:00.000Z", lastDate: "2026-09-29", rowCount: 25000, detail: "ready" },
      atmosphere: { state: "READY", provider: "OPEN_METEO_ATMOSPHERE", generatedAt: "2026-09-30T05:00:00.000Z", detail: "24_hours" },
      marine: { state: "READY", provider: "OPEN_METEO_MARINE", generatedAt: "2026-09-30T05:00:00.000Z", detail: "24_hours" },
      tides: { state: "NOT_CONFIGURED", provider: "NONE", generatedAt: "2026-09-30T05:00:00.000Z", detail: "not_configured" }
    }
  } as never,
  selection,
  forecast: { snapshotId: "forecast-test", modelCount: 5, failures: {} },
  persistence: { bundleSaved: true, draftSaved: true, warnings: [] },
  timings: { referenceMs: 1, forecastMs: 20, enrichmentMs: 18, selectionMs: 2, persistenceMs: 1, totalMs: 24 }
};

const html = renderDailyInsightLabPreview(CITIES.tarnos, ready);
ok(html.includes("Daily Insight Lab Preview") && html.includes("LABORATOIRE INDÉPENDANT"), "surface_identifies_independent_lab");
ok(html.includes("Aucune publication automatique") && html.includes("export manuel uniquement"), "surface_forbids_automatic_publication");
ok(html.includes("T08") && html.includes("99/100") && html.includes("Preuves et trace"), "editorial_audit_is_visible");
ok(html.includes('<canvas id="dailyInsightLabStory" width="1080" height="1920">'), "story_keeps_instagram_dimensions");
ok(html.includes('data-export="dailyInsightLabStory"') && !html.includes("fetch("), "export_is_local_without_publish_transport");
ok(html.includes("2026-09-30") && !html.includes("TEMP_DROP:20-23</div>"), "story_date_comes_from_request_scope");
const runtime = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
ok(Boolean(runtime) && (() => { try { new Function(runtime!); return true; } catch { return false; } })(), "story_runtime_is_valid");

const unavailable: DailyInsightLabPreviewResult = {
  ...ready,
  status: "REFERENCE_UNAVAILABLE",
  detail: "daily_insight_reference_empty",
  bundle: null,
  selection: null,
  forecast: { snapshotId: null, modelCount: 0, failures: {} },
  persistence: { bundleSaved: false, draftSaved: false, warnings: [] }
};
const emptyHtml = renderDailyInsightLabPreview(CITIES.tarnos, unavailable);
ok(emptyHtml.includes("Le cache climatique n’est pas prêt") && !emptyHtml.includes("<canvas"), "missing_reference_never_invents_story");

const queriedSql: string[] = [];
const unavailableDb = {
  prepare(sql: string) {
    queriedSql.push(sql);
    return {
      bind() { return this; },
      async first() { return null; },
      async all() { return { results: [] }; },
      async run() { return { success: true }; }
    };
  }
} as unknown as D1Database;

(async () => {
  const result = await generateDailyInsightLabPreview({ DB: unavailableDb }, CITIES.tarnos, "2026-09-30", new Date("2026-09-30T05:00:00.000Z"));
  ok(result.status === "REFERENCE_UNAVAILABLE" && result.forecast.modelCount === 0, "missing_reference_stops_before_weather_capture");
  ok(queriedSql.length === 1 && queriedSql[0].includes("daily_insight_reference_cache"), "unavailable_path_reads_only_dedicated_reference_cache");
  ok(!queriedSql.some((sql) => /\bforecasts\b|daily_scene_ledger|official_generations/i.test(sql)), "lab_never_touches_active_daily_tables");
  console.log(`DAILY_INSIGHT_LAB_PREVIEW ${passed}/11 PASS`);
})().catch((error) => { throw error; });
