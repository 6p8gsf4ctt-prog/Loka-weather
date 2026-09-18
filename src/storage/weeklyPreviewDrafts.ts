import type { GeneratedWeekly } from "../weeklyPipeline";

export type WeeklyPreviewDraftPayload = Pick<GeneratedWeekly, "profiles" | "editorial" | "contextual">;

interface WeeklyPreviewDraftRow {
  draft_id: string;
  city_slug: string;
  start_date: string;
  end_date: string;
  generated_at: string;
  expires_at: string;
  payload_json: string;
}

export async function saveWeeklyPreviewDraft(
  db: D1Database,
  input: { draftId: string; citySlug: string; startDate: string; endDate: string; generatedAt: string; payload: WeeklyPreviewDraftPayload; expiresAt: string }
): Promise<void> {
  await db.prepare(`
    INSERT OR REPLACE INTO weekly_preview_drafts
      (draft_id, city_slug, start_date, end_date, generated_at, expires_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(input.draftId, input.citySlug, input.startDate, input.endDate, input.generatedAt, input.expiresAt, JSON.stringify(input.payload)).run();
}

export async function loadWeeklyPreviewDraft(db: D1Database, draftId: string): Promise<WeeklyPreviewDraftPayload | null> {
  const row = await db.prepare(`SELECT * FROM weekly_preview_drafts WHERE draft_id = ? LIMIT 1`).bind(draftId).first<WeeklyPreviewDraftRow>();
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) return null;
  try { return JSON.parse(row.payload_json) as WeeklyPreviewDraftPayload; }
  catch { return null; }
}

export async function consumeWeeklyPreviewDraft(db: D1Database, draftId: string): Promise<void> {
  await db.prepare(`UPDATE weekly_preview_drafts SET expires_at = CURRENT_TIMESTAMP WHERE draft_id = ?`).bind(draftId).run();
}
