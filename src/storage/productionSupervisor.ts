import type {
  ProductionSupervisorReport,
  ProductionSupervisorStatus
} from "../engine/productionSupervisor";

export interface ProductionSupervisorAuditRow {
  id: number;
  evaluatedAt: string;
  generatedAt: string;
  phase: "PRE_GO_LIVE" | "V24_LIVE";
  status: ProductionSupervisorStatus;
  publicEngine: string | null;
  requestedMode: string | null;
  v24Approved: boolean;
  sceneKey: string | null;
  readinessStatus: string | null;
  guardStatus: string | null;
  fallbackDetected: boolean;
  consecutiveV24Generations: number;
  recommendation: string;
}

export async function recentProductionSupervisorAudits(
  db: D1Database,
  citySlug: string,
  limit = 12
): Promise<ProductionSupervisorAuditRow[]> {
  const safeLimit = Math.max(
    1,
    Math.min(48, Math.floor(limit))
  );

  const result = await db.prepare(`
    SELECT
      id,
      evaluated_at,
      generated_at,
      phase,
      status,
      public_engine,
      requested_mode,
      v24_approved,
      scene_key,
      readiness_status,
      guard_status,
      fallback_detected,
      consecutive_v24_generations,
      recommendation
    FROM production_supervisor_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT ?
  `).bind(
    citySlug,
    safeLimit
  ).all<{
    id: number;
    evaluated_at: string;
    generated_at: string;
    phase: "PRE_GO_LIVE" | "V24_LIVE";
    status: ProductionSupervisorStatus;
    public_engine: string | null;
    requested_mode: string | null;
    v24_approved: number;
    scene_key: string | null;
    readiness_status: string | null;
    guard_status: string | null;
    fallback_detected: number;
    consecutive_v24_generations: number;
    recommendation: string;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    evaluatedAt: row.evaluated_at,
    generatedAt: row.generated_at,
    phase: row.phase,
    status: row.status,
    publicEngine: row.public_engine,
    requestedMode: row.requested_mode,
    v24Approved: row.v24_approved === 1,
    sceneKey: row.scene_key,
    readinessStatus: row.readiness_status,
    guardStatus: row.guard_status,
    fallbackDetected: row.fallback_detected === 1,
    consecutiveV24Generations:
      row.consecutive_v24_generations,
    recommendation: row.recommendation
  }));
}

export async function recordProductionSupervisorAudit(
  db: D1Database,
  report: ProductionSupervisorReport
): Promise<void> {
  if (!report.generatedAt) return;

  await db.prepare(`
    INSERT OR IGNORE INTO production_supervisor_audit (
      event_id,
      city_slug,
      release_version,
      evaluated_at,
      generated_at,
      phase,
      status,
      public_engine,
      requested_mode,
      v24_approved,
      scene_key,
      publication_fingerprint,
      readiness_status,
      final_rc_current,
      rehearsal_current,
      go_live_eligible,
      guard_status,
      fallback_detected,
      legacy_backup_available,
      consecutive_v24_generations,
      checks_json,
      recommendation,
      production_mutated,
      auto_rollback_triggered
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0
    )
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.evaluatedAt,
    report.generatedAt,
    report.phase,
    report.status,
    report.publicEngine,
    report.requestedMode,
    report.v24Approved ? 1 : 0,
    report.sceneKey,
    report.publicationFingerprint,
    report.readinessStatus,
    report.finalRcCurrent ? 1 : 0,
    report.rehearsalCurrent ? 1 : 0,
    report.goLiveEligible ? 1 : 0,
    report.guardStatus,
    report.fallbackDetected ? 1 : 0,
    report.legacyBackupAvailable ? 1 : 0,
    report.consecutiveV24Generations,
    JSON.stringify(report.checks),
    report.recommendation
  ).run();
}
