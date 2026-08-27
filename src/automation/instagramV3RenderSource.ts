import type { GenerationArchiveRow, OfficialPublicPayloadV24 } from "../types";

export type InstagramV3RenderSourceKind = "OFFICIAL_V3" | "ARCHIVED_V3" | "FRESH_V3";

export interface InstagramV3RenderSource {
  payload: OfficialPublicPayloadV24;
  generationId: number | null;
  source: InstagramV3RenderSourceKind;
}

export interface InstagramV3RenderSourceDeps {
  loadHistory(): Promise<GenerationArchiveRow[]>;
  generateFresh(): Promise<{ payload: OfficialPublicPayloadV24; generationId: number }>;
}

/**
 * Resolve a payload that actually contains analysis V3 before Browser Run starts.
 * This is intentionally independent from the official V2 fallback: a deployment
 * made after the daily officialization can still render today's V3 PNGs without
 * rewriting the official forecast row.
 */
export async function resolveInstagramV3RenderSource(
  officialPayload: OfficialPublicPayloadV24,
  deps: InstagramV3RenderSourceDeps
): Promise<InstagramV3RenderSource> {
  if (officialPayload.analysis) {
    return { payload: officialPayload, generationId: null, source: "OFFICIAL_V3" };
  }

  const history = await deps.loadHistory();
  const archived = history.find((item) => item.forecastDate === officialPayload.date && !!item.publicPayload.analysis);
  if (archived) {
    return { payload: archived.publicPayload, generationId: archived.id, source: "ARCHIVED_V3" };
  }

  const generated = await deps.generateFresh();
  if (!generated.payload.analysis) throw new Error("v3_analysis_generation_failed");
  if (generated.payload.date !== officialPayload.date) throw new Error("v3_render_date_mismatch");
  return { payload: generated.payload, generationId: generated.generationId, source: "FRESH_V3" };
}
