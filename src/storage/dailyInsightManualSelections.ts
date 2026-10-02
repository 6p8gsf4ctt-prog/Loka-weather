export interface DailyInsightManualSelection {
  citySlug: string;
  targetDate: string;
  candidateId: string;
  selectedAt: string;
}

interface ManualSelectionRow {
  city_slug: string;
  target_date: string;
  candidate_id: string;
  selected_at: string;
}

function databaseAvailable(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

export async function loadDailyInsightManualSelection(
  db: D1Database | undefined,
  citySlug: string,
  targetDate: string
): Promise<DailyInsightManualSelection | null> {
  if (!databaseAvailable(db)) return null;
  try {
    const row = await db.prepare(`
      SELECT city_slug, target_date, candidate_id, selected_at
      FROM daily_insight_manual_selections
      WHERE city_slug = ? AND target_date = ?
      LIMIT 1
    `).bind(citySlug, targetDate).first<ManualSelectionRow>();
    return row ? { citySlug: row.city_slug, targetDate: row.target_date, candidateId: row.candidate_id, selectedAt: row.selected_at } : null;
  } catch {
    // Deployment remains backward compatible until migration 0024 is applied.
    return null;
  }
}

export async function saveDailyInsightManualSelection(
  db: D1Database,
  selection: DailyInsightManualSelection
): Promise<void> {
  if (!databaseAvailable(db)) throw new Error("daily_insight_manual_selection_database_unavailable");
  await db.prepare(`
    INSERT INTO daily_insight_manual_selections (city_slug, target_date, candidate_id, selected_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(city_slug, target_date) DO UPDATE SET
      candidate_id = excluded.candidate_id,
      selected_at = excluded.selected_at,
      updated_at = CURRENT_TIMESTAMP
  `).bind(selection.citySlug, selection.targetDate, selection.candidateId, selection.selectedAt).run();
}

export async function clearDailyInsightManualSelection(
  db: D1Database,
  citySlug: string,
  targetDate: string
): Promise<void> {
  if (!databaseAvailable(db)) throw new Error("daily_insight_manual_selection_database_unavailable");
  await db.prepare(`
    DELETE FROM daily_insight_manual_selections
    WHERE city_slug = ? AND target_date = ?
  `).bind(citySlug, targetDate).run();
}
