export type CertificationWindowStatus =
  | "ACTIVE"
  | "CONSUMED"
  | "CANCELLED"
  | "EXPIRED";

export type CertificationWindowAuditEvent =
  | "OPEN_REFUSED"
  | "OPENED"
  | "GENERATION_BLOCKED"
  | "CANCELLED"
  | "CONSUMED"
  | "EXPIRED";

export interface CertificationWindowRow {
  window_id: string;
  city_slug: string;
  status: CertificationWindowStatus;
  opened_at: string;
  expires_at: string;
  closed_at: string | null;
  generated_at: string;
  public_engine: string;
  scene_key: string;
  publication_fingerprint: string;
  readiness_status: string;
  readiness_fingerprint: string;
  opened_by: string;
  close_reason: string | null;
}

export interface CertificationGenerationGate {
  allowed: boolean;
  active: boolean;
  failOpenForWeather: boolean;
  windowId: string | null;
  expiresAt: string | null;
  generatedAt: string | null;
  source: string;
  reason:
    | "no_active_certification_window"
    | "go_live_cutover_allowed"
    | "certification_window_generation_blocked"
    | "certification_window_unavailable_fail_open_for_weather";
}

const RELEASE_VERSION = "12.15.0";

export async function appendCertificationWindowAudit(
  db: D1Database,
  args: {
    citySlug: string;
    eventType: CertificationWindowAuditEvent;
    windowId?: string | null;
    generatedAt?: string | null;
    source?: string | null;
    reason: string;
    snapshotJson?: string | null;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO certification_window_audit (
      event_id,
      city_slug,
      release_version,
      event_type,
      event_at,
      window_id,
      generated_at,
      source,
      reason,
      snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    args.citySlug,
    RELEASE_VERSION,
    args.eventType,
    new Date().toISOString(),
    args.windowId ?? null,
    args.generatedAt ?? null,
    args.source ?? null,
    args.reason,
    args.snapshotJson ?? null
  ).run();
}

async function expireCertificationWindows(
  db: D1Database,
  citySlug: string
): Promise<void> {
  const now = new Date().toISOString();

  const expired = await db.prepare(`
    SELECT *
    FROM certification_window
    WHERE city_slug = ?
      AND status = 'ACTIVE'
      AND expires_at <= ?
    ORDER BY opened_at DESC
    LIMIT 1
  `).bind(
    citySlug,
    now
  ).first<CertificationWindowRow>();

  if (!expired) return;

  await db.batch([
    db.prepare(`
      UPDATE certification_window
      SET
        status = 'EXPIRED',
        closed_at = ?,
        close_reason = 'certification_window_ttl_expired'
      WHERE window_id = ?
        AND status = 'ACTIVE'
    `).bind(
      now,
      expired.window_id
    ),

    db.prepare(`
      INSERT INTO certification_window_audit (
        event_id,
        city_slug,
        release_version,
        event_type,
        event_at,
        window_id,
        generated_at,
        source,
        reason,
        snapshot_json
      ) VALUES (?, ?, ?, 'EXPIRED', ?, ?, ?, NULL, ?, ?)
    `).bind(
      crypto.randomUUID(),
      citySlug,
      RELEASE_VERSION,
      now,
      expired.window_id,
      expired.generated_at,
      "certification_window_ttl_expired",
      JSON.stringify({
        expiresAt: expired.expires_at,
        generatedAt: expired.generated_at,
        fingerprint: expired.publication_fingerprint
      })
    )
  ]);
}

export async function activeCertificationWindow(
  db: D1Database,
  citySlug: string
): Promise<CertificationWindowRow | null> {
  await expireCertificationWindows(
    db,
    citySlug
  );

  return db.prepare(`
    SELECT *
    FROM certification_window
    WHERE city_slug = ?
      AND status = 'ACTIVE'
    ORDER BY opened_at DESC
    LIMIT 1
  `).bind(
    citySlug
  ).first<CertificationWindowRow>();
}

export async function latestCertificationWindow(
  db: D1Database,
  citySlug: string
): Promise<CertificationWindowRow | null> {
  await expireCertificationWindows(
    db,
    citySlug
  );

  return db.prepare(`
    SELECT *
    FROM certification_window
    WHERE city_slug = ?
    ORDER BY opened_at DESC
    LIMIT 1
  `).bind(
    citySlug
  ).first<CertificationWindowRow>();
}

export async function recentCertificationWindowAudit(
  db: D1Database,
  citySlug: string,
  limit = 12
): Promise<Array<{
  id: number;
  eventType: CertificationWindowAuditEvent;
  eventAt: string;
  windowId: string | null;
  generatedAt: string | null;
  source: string | null;
  reason: string;
}>> {
  const safeLimit = Math.max(
    1,
    Math.min(30, Math.floor(limit))
  );

  const result = await db.prepare(`
    SELECT
      id,
      event_type,
      event_at,
      window_id,
      generated_at,
      source,
      reason
    FROM certification_window_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT ?
  `).bind(
    citySlug,
    safeLimit
  ).all<{
    id: number;
    event_type: CertificationWindowAuditEvent;
    event_at: string;
    window_id: string | null;
    generated_at: string | null;
    source: string | null;
    reason: string;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    eventAt: row.event_at,
    windowId: row.window_id,
    generatedAt: row.generated_at,
    source: row.source,
    reason: row.reason
  }));
}

export async function openCertificationWindowRow(
  db: D1Database,
  args: {
    citySlug: string;
    windowId: string;
    openedAt: string;
    expiresAt: string;
    generatedAt: string;
    publicEngine: string;
    sceneKey: string;
    publicationFingerprint: string;
    readinessStatus: string;
    readinessFingerprint: string;
    openedBy: string;
    snapshotJson: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  await db.batch([
    db.prepare(`
      UPDATE certification_window
      SET
        status = 'CANCELLED',
        closed_at = ?,
        close_reason = 'replaced_by_new_certification_window'
      WHERE city_slug = ?
        AND status = 'ACTIVE'
    `).bind(
      now,
      args.citySlug
    ),

    db.prepare(`
      INSERT INTO certification_window (
        window_id,
        city_slug,
        status,
        opened_at,
        expires_at,
        closed_at,
        generated_at,
        public_engine,
        scene_key,
        publication_fingerprint,
        readiness_status,
        readiness_fingerprint,
        opened_by,
        close_reason
      ) VALUES (
        ?, ?, 'ACTIVE', ?, ?, NULL,
        ?, ?, ?, ?, ?, ?, ?, NULL
      )
    `).bind(
      args.windowId,
      args.citySlug,
      args.openedAt,
      args.expiresAt,
      args.generatedAt,
      args.publicEngine,
      args.sceneKey,
      args.publicationFingerprint,
      args.readinessStatus,
      args.readinessFingerprint,
      args.openedBy
    ),

    db.prepare(`
      INSERT INTO certification_window_audit (
        event_id,
        city_slug,
        release_version,
        event_type,
        event_at,
        window_id,
        generated_at,
        source,
        reason,
        snapshot_json
      ) VALUES (
        ?, ?, ?, 'OPENED', ?, ?, ?, NULL, ?, ?
      )
    `).bind(
      crypto.randomUUID(),
      args.citySlug,
      RELEASE_VERSION,
      args.openedAt,
      args.windowId,
      args.generatedAt,
      "certification_window_opened",
      args.snapshotJson
    )
  ]);
}

export async function closeCertificationWindow(
  db: D1Database,
  citySlug: string,
  args: {
    status: "CONSUMED" | "CANCELLED";
    reason: string;
    source?: string | null;
  }
): Promise<boolean> {
  const active = await activeCertificationWindow(
    db,
    citySlug
  );

  if (!active) return false;

  const now = new Date().toISOString();
  const eventType =
    args.status === "CONSUMED"
      ? "CONSUMED"
      : "CANCELLED";

  await db.batch([
    db.prepare(`
      UPDATE certification_window
      SET
        status = ?,
        closed_at = ?,
        close_reason = ?
      WHERE window_id = ?
        AND status = 'ACTIVE'
    `).bind(
      args.status,
      now,
      args.reason,
      active.window_id
    ),

    db.prepare(`
      INSERT INTO certification_window_audit (
        event_id,
        city_slug,
        release_version,
        event_type,
        event_at,
        window_id,
        generated_at,
        source,
        reason,
        snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      citySlug,
      RELEASE_VERSION,
      eventType,
      now,
      active.window_id,
      active.generated_at,
      args.source ?? null,
      args.reason,
      JSON.stringify({
        generatedAt:
          active.generated_at,
        fingerprint:
          active.publication_fingerprint
      })
    )
  ]);

  return true;
}

/**
 * Operational generation lock.
 *
 * Fail-open rule is intentional for normal weather:
 * if the 12.15 D1 layer itself is unavailable, Legacy weather generation
 * must continue. Conversely, GO LIVE 12.13 verifies the active window
 * independently and therefore fails closed for activation.
 */
export async function certificationGenerationGate(
  db: D1Database,
  citySlug: string,
  source: string
): Promise<CertificationGenerationGate> {
  try {
    const active = await activeCertificationWindow(
      db,
      citySlug
    );

    if (!active) {
      return {
        allowed: true,
        active: false,
        failOpenForWeather: false,
        windowId: null,
        expiresAt: null,
        generatedAt: null,
        source,
        reason:
          "no_active_certification_window"
      };
    }

    if (source === "go_live_12_13") {
      return {
        allowed: true,
        active: true,
        failOpenForWeather: false,
        windowId:
          active.window_id,
        expiresAt:
          active.expires_at,
        generatedAt:
          active.generated_at,
        source,
        reason:
          "go_live_cutover_allowed"
      };
    }

    try {
      await appendCertificationWindowAudit(
        db,
        {
          citySlug,
          eventType:
            "GENERATION_BLOCKED",
          windowId:
            active.window_id,
          generatedAt:
            active.generated_at,
          source,
          reason:
            "certification_window_generation_blocked",
          snapshotJson:
            JSON.stringify({
              expiresAt:
                active.expires_at,
              source
            })
        }
      );
    } catch {
      // Never turn an audit write failure into permission to invalidate
      // the certification window.
    }

    return {
      allowed: false,
      active: true,
      failOpenForWeather: false,
      windowId:
        active.window_id,
      expiresAt:
        active.expires_at,
      generatedAt:
        active.generated_at,
      source,
      reason:
        "certification_window_generation_blocked"
    };
  } catch {
    return {
      allowed: true,
      active: false,
      failOpenForWeather: true,
      windowId: null,
      expiresAt: null,
      generatedAt: null,
      source,
      reason:
        "certification_window_unavailable_fail_open_for_weather"
    };
  }
}
