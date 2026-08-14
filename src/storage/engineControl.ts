import type {
  EngineControlState,
  SceneEngineMode
} from "../engine/engineMode";

interface EngineControlRow {
  city_slug: string;
  requested_mode: string;
  v24_approved: number;
  approved_at: string | null;
  approved_by: string | null;
  rollback_at: string | null;
  rollback_reason: string | null;
  updated_at: string | null;
}

function asMode(value: string): SceneEngineMode {
  return value === "V24_PREVIEW" || value === "V24"
    ? value
    : "LEGACY";
}

function fromRow(row: EngineControlRow): EngineControlState {
  return {
    citySlug: row.city_slug,
    requestedMode: asMode(row.requested_mode),
    v24Approved: row.v24_approved === 1,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rollbackAt: row.rollback_at,
    rollbackReason: row.rollback_reason,
    updatedAt: row.updated_at
  };
}

export async function getEngineControl(
  db: D1Database,
  citySlug: string
): Promise<EngineControlState | null> {
  const row = await db.prepare(`
    SELECT *
    FROM engine_control
    WHERE city_slug = ?
    LIMIT 1
  `).bind(citySlug).first<EngineControlRow>();

  return row ? fromRow(row) : null;
}

export async function ensureEngineControl(
  db: D1Database,
  citySlug: string
): Promise<EngineControlState> {
  await db.prepare(`
    INSERT OR IGNORE INTO engine_control (
      city_slug,
      requested_mode,
      v24_approved
    ) VALUES (?, 'LEGACY', 0)
  `).bind(citySlug).run();

  const state = await getEngineControl(db, citySlug);
  if (!state) throw new Error("engine_control_unavailable");
  return state;
}

/**
 * Enables preview only.
 * Production remains LEGACY by construction in Bloc 11.1.
 */
export async function requestV24Preview(
  db: D1Database,
  citySlug: string
): Promise<EngineControlState> {
  await ensureEngineControl(db, citySlug);

  await db.prepare(`
    UPDATE engine_control
    SET
      requested_mode = 'V24_PREVIEW',
      v24_approved = 0,
      approved_at = NULL,
      approved_by = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE city_slug = ?
  `).bind(citySlug).run();

  return ensureEngineControl(db, citySlug);
}

/**
 * Global administrative rollback.
 *
 * Deliberately independent from readiness/shadow tables: rollback must remain
 * possible even if V24 analytics are broken.
 */
export async function rollbackToLegacy(
  db: D1Database,
  citySlug: string,
  reason: string
): Promise<EngineControlState> {
  await ensureEngineControl(db, citySlug);

  await db.prepare(`
    UPDATE engine_control
    SET
      requested_mode = 'LEGACY',
      v24_approved = 0,
      approved_at = NULL,
      approved_by = NULL,
      rollback_at = ?,
      rollback_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE city_slug = ?
  `).bind(
    new Date().toISOString(),
    reason.slice(0, 500),
    citySlug
  ).run();

  return ensureEngineControl(db, citySlug);
}

/**
 * Stores a V24 intent without granting production approval.
 * Useful for testing the double-lock contract.
 */
export async function requestV24Locked(
  db: D1Database,
  citySlug: string
): Promise<EngineControlState> {
  await ensureEngineControl(db, citySlug);

  await db.prepare(`
    UPDATE engine_control
    SET
      requested_mode = 'V24',
      v24_approved = 0,
      approved_at = NULL,
      approved_by = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE city_slug = ?
  `).bind(citySlug).run();

  return ensureEngineControl(db, citySlug);
}
