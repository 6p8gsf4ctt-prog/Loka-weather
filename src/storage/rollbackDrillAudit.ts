import type {
  RollbackDrillReport
} from "../engine/rollbackDrill";

export async function recordRollbackDrillAudit(
  db: D1Database,
  report: RollbackDrillReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO rollback_drill_audit (
      event_id,
      city_slug,
      release_version,
      run_at,
      generated_at_before,
      generated_at_after,
      status,
      requested_mode_before,
      requested_mode_after,
      approved_before,
      approved_after,
      public_engine_before,
      public_engine_after,
      public_fingerprint_before,
      public_fingerprint_after,
      preview_step_verified,
      locked_intent_step_verified,
      rollback_verified,
      public_identity_unchanged,
      production_forecast_mutated,
      v24_approval_granted,
      engine_control_mutated,
      emergency_cleanup_used,
      steps_json,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.runAt,
    report.before.generatedAt,
    report.after.generatedAt,
    report.status,
    report.before.control.requestedMode,
    report.after.control.requestedMode,
    report.before.control.v24Approved ? 1 : 0,
    report.after.control.v24Approved ? 1 : 0,
    report.before.publicEngine,
    report.after.publicEngine,
    report.before.fingerprint,
    report.after.fingerprint,
    report.summary.previewStepVerified ? 1 : 0,
    report.summary.lockedIntentStepVerified ? 1 : 0,
    report.summary.rollbackVerified ? 1 : 0,
    report.summary.publicIdentityUnchanged ? 1 : 0,
    report.summary.engineControlMutated ? 1 : 0,
    report.summary.emergencyCleanupUsed ? 1 : 0,
    JSON.stringify(report.steps),
    report.reason
  ).run();
}

export async function latestRollbackDrillAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  runAt: string;
  status: "PASS" | "FAIL" | "REFUSED";
  generatedAtBefore: string | null;
  generatedAtAfter: string | null;
  requestedModeBefore: string | null;
  requestedModeAfter: string | null;
  rollbackVerified: boolean;
  publicIdentityUnchanged: boolean;
  emergencyCleanupUsed: boolean;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      run_at,
      status,
      generated_at_before,
      generated_at_after,
      requested_mode_before,
      requested_mode_after,
      rollback_verified,
      public_identity_unchanged,
      emergency_cleanup_used,
      reason
    FROM rollback_drill_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    run_at: string;
    status: "PASS" | "FAIL" | "REFUSED";
    generated_at_before: string | null;
    generated_at_after: string | null;
    requested_mode_before: string | null;
    requested_mode_after: string | null;
    rollback_verified: number;
    public_identity_unchanged: number;
    emergency_cleanup_used: number;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    runAt: row.run_at,
    status: row.status,
    generatedAtBefore: row.generated_at_before,
    generatedAtAfter: row.generated_at_after,
    requestedModeBefore: row.requested_mode_before,
    requestedModeAfter: row.requested_mode_after,
    rollbackVerified: row.rollback_verified === 1,
    publicIdentityUnchanged:
      row.public_identity_unchanged === 1,
    emergencyCleanupUsed:
      row.emergency_cleanup_used === 1,
    reason: row.reason
  } : null;
}
