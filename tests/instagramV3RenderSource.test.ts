import { resolveInstagramV3RenderSource } from "../src/automation/instagramV3RenderSource";
import type { GenerationArchiveRow, OfficialPublicPayloadV24 } from "../src/types";

let checks = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_V3_RENDER_SOURCE_FAIL:${label}`);
  checks++;
}

function payload(date: string, withAnalysis: boolean): OfficialPublicPayloadV24 {
  const base = {
    version: "2.0", city: "Tarnos", citySlug: "tarnos", date,
    generatedAt: `${date}T05:00:00.000Z`, source: "test",
    scene: { id: 1, key: "GRAND_SOLEIL", label: "Grand soleil", family: "LIGHT", masterUrl: "/masters24/01_GRAND_SOLEIL.png", visualIcon: "sun", emoji: "☀️" },
    temperatures: { minC: 15, maxC: 27 }, hourly: [], editorial: {} as any, decision: {} as any,
    models: { count: 5, ok: ["a","b","c","d","e"], failed: {} }
  } as OfficialPublicPayloadV24;
  if (withAnalysis) (base as any).analysis = { version: "3.0" };
  return base;
}

function archive(id: number, p: OfficialPublicPayloadV24): GenerationArchiveRow {
  return { id, citySlug: p.citySlug, forecastDate: p.date, generatedAt: p.generatedAt, source: p.source, sceneId: p.scene.id, sceneKey: p.scene.key, score: 80, confidence: "HIGH", modelCount: 5, publicPayload: p, manifestHash: "x".repeat(64) };
}

(async () => {
  const date = "2026-08-27";
  const officialV3 = payload(date, true);
  let historyCalls = 0, freshCalls = 0;
  const direct = await resolveInstagramV3RenderSource(officialV3, {
    loadHistory: async () => { historyCalls++; return []; },
    generateFresh: async () => { freshCalls++; return { payload: officialV3, generationId: 9 }; }
  });
  ok(direct.source === "OFFICIAL_V3" && direct.payload === officialV3, "official_v3_used_directly");
  ok(historyCalls === 0 && freshCalls === 0, "official_v3_needs_no_fallback");

  const officialLegacy = payload(date, false);
  const archivedV3 = payload(date, true);
  historyCalls = 0; freshCalls = 0;
  const archived = await resolveInstagramV3RenderSource(officialLegacy, {
    loadHistory: async () => { historyCalls++; return [archive(42, archivedV3)]; },
    generateFresh: async () => { freshCalls++; return { payload: archivedV3, generationId: 43 }; }
  });
  ok(archived.source === "ARCHIVED_V3" && archived.generationId === 42 && !!archived.payload.analysis, "legacy_official_uses_archived_v3");
  ok(historyCalls === 1 && freshCalls === 0, "archived_v3_avoids_model_refetch");

  const freshV3 = payload(date, true);
  historyCalls = 0; freshCalls = 0;
  const fresh = await resolveInstagramV3RenderSource(officialLegacy, {
    loadHistory: async () => { historyCalls++; return []; },
    generateFresh: async () => { freshCalls++; return { payload: freshV3, generationId: 77 }; }
  });
  ok(fresh.source === "FRESH_V3" && fresh.generationId === 77 && !!fresh.payload.analysis, "legacy_official_generates_fresh_v3_when_needed");
  ok(historyCalls === 1 && freshCalls === 1, "fresh_v3_fallback_called_once");

  let rejectedMissingAnalysis = false;
  try {
    await resolveInstagramV3RenderSource(officialLegacy, {
      loadHistory: async () => [],
      generateFresh: async () => ({ payload: officialLegacy, generationId: 88 })
    });
  } catch (error) {
    rejectedMissingAnalysis = error instanceof Error && error.message === "v3_analysis_generation_failed";
  }
  ok(rejectedMissingAnalysis, "never_send_legacy_payload_to_browser_run");

  let rejectedWrongDate = false;
  try {
    await resolveInstagramV3RenderSource(officialLegacy, {
      loadHistory: async () => [],
      generateFresh: async () => ({ payload: payload("2026-08-28", true), generationId: 89 })
    });
  } catch (error) {
    rejectedWrongDate = error instanceof Error && error.message === "v3_render_date_mismatch";
  }
  ok(rejectedWrongDate, "fresh_payload_must_match_official_date");

  console.log(`instagramV3RenderSource: ${checks} checks passed`);
})().catch((error) => { throw error; });
