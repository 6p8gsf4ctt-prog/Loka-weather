import {
  DAILY_INSIGHT_SELECTION_VERSION,
  validateDailyInsightSelection,
  type DailyInsightSelectionResult
} from "../engine/dailyInsight/editorialSelection";

export type DailyInsightEditorialDraftStatus = "READY" | "STALE" | "UNAVAILABLE" | "REJECTED";

export interface DailyInsightEditorialDraftResult {
  status: DailyInsightEditorialDraftStatus;
  detail: string;
  selection: DailyInsightSelectionResult | null;
}

interface DraftRow {
  city_slug: string;
  target_date: string;
  engine_version: string;
  bundle_id: string;
  status: DailyInsightSelectionResult["status"];
  generated_at: string;
  payload_json: string;
}

function databaseAvailable(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

export async function saveDailyInsightEditorialDraft(db: D1Database, selection: DailyInsightSelectionResult): Promise<void> {
  if (!databaseAvailable(db)) throw new Error("daily_insight_editorial_draft_database_unavailable");
  validateDailyInsightSelection(selection);
  await db.prepare(`
    INSERT INTO daily_insight_editorial_drafts (
      city_slug, target_date, engine_version, bundle_id, status,
      winner_detector_id, winner_family, winner_score, generated_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, target_date) DO UPDATE SET
      engine_version = excluded.engine_version,
      bundle_id = excluded.bundle_id,
      status = excluded.status,
      winner_detector_id = excluded.winner_detector_id,
      winner_family = excluded.winner_family,
      winner_score = excluded.winner_score,
      generated_at = excluded.generated_at,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    selection.citySlug,
    selection.targetDate,
    selection.version,
    selection.bundleId,
    selection.status,
    selection.winner?.detectorId ?? null,
    selection.winner?.family ?? null,
    selection.winner?.score.final ?? null,
    selection.generatedAt,
    JSON.stringify(selection)
  ).run();
}

export async function loadDailyInsightEditorialDraft(
  db: D1Database | undefined,
  citySlug: string,
  targetDate: string,
  expectedBundleId?: string
): Promise<DailyInsightEditorialDraftResult> {
  if (!databaseAvailable(db)) return { status: "UNAVAILABLE", detail: "daily_insight_editorial_draft_database_unavailable", selection: null };
  try {
    const row = await db.prepare(`
      SELECT city_slug, target_date, engine_version, bundle_id, status, generated_at, payload_json
      FROM daily_insight_editorial_drafts
      WHERE city_slug = ? AND target_date = ?
      LIMIT 1
    `).bind(citySlug, targetDate).first<DraftRow>();
    if (!row) return { status: "UNAVAILABLE", detail: "daily_insight_editorial_draft_empty", selection: null };
    if (row.engine_version !== DAILY_INSIGHT_SELECTION_VERSION) throw new Error("daily_insight_editorial_draft_version_mismatch");
    const selection = validateDailyInsightSelection(JSON.parse(row.payload_json) as unknown);
    if (selection.citySlug !== row.city_slug || selection.targetDate !== row.target_date || selection.bundleId !== row.bundle_id
      || selection.status !== row.status || selection.generatedAt !== row.generated_at) throw new Error("daily_insight_editorial_draft_manifest_mismatch");
    if (expectedBundleId && expectedBundleId !== row.bundle_id) return { status: "STALE", detail: `daily_insight_editorial_draft_stale:${row.bundle_id}`, selection };
    return { status: "READY", detail: `daily_insight_editorial_draft_ready:${selection.status}`, selection };
  } catch (error) {
    return { status: "REJECTED", detail: error instanceof Error ? error.message : "daily_insight_editorial_draft_rejected", selection: null };
  }
}
