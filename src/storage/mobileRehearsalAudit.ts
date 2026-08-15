import type {
  MobileRehearsalReport
} from "../engine/mobileRehearsal";

export async function recordMobileRehearsalAudit(
  db: D1Database,
  report: MobileRehearsalReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO mobile_rehearsal_audit (
      event_id,
      city_slug,
      release_version,
      run_at,
      status,
      final_release_audit_id,
      generated_at_before,
      generated_at_after,
      public_engine_before,
      public_engine_after,
      public_scene_before,
      public_scene_after,
      public_fingerprint_before,
      public_fingerprint_after,
      preview_scene_id,
      preview_scene_key,
      preview_master_file_name,
      public_surfaces_verified,
      preview_dashboard_verified,
      preview_instagram_verified,
      preview_master_verified,
      rollback_verified,
      final_control_legacy,
      public_identity_unchanged,
      production_forecast_mutated,
      v24_approval_granted,
      engine_control_temporarily_mutated,
      checks_json,
      observations_json,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.runAt,
    report.status,
    report.finalReleaseAuditId,
    report.before.generatedAt,
    report.after.generatedAt,
    report.before.publicEngine,
    report.after.publicEngine,
    report.before.scene,
    report.after.scene,
    report.before.fingerprint,
    report.after.fingerprint,
    report.preview.sceneId,
    report.preview.sceneKey,
    report.preview.masterFileName,
    report.summary.publicSurfacesVerified ? 1 : 0,
    report.summary.previewDashboardVerified ? 1 : 0,
    report.summary.previewInstagramVerified ? 1 : 0,
    report.summary.previewMasterVerified ? 1 : 0,
    report.summary.rollbackVerified ? 1 : 0,
    report.summary.finalControlLegacy ? 1 : 0,
    report.summary.publicIdentityUnchanged ? 1 : 0,
    report.summary.engineControlTemporarilyMutated ? 1 : 0,
    JSON.stringify(report.checks),
    JSON.stringify(report.observations),
    report.reason
  ).run();
}

export async function latestMobileRehearsalAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  runAt: string;
  status:
    | "REHEARSAL_PASS"
    | "REHEARSAL_FAIL"
    | "REHEARSAL_REFUSED";
  generatedAtBefore: string | null;
  generatedAtAfter: string | null;
  publicEngineBefore: string | null;
  publicEngineAfter: string | null;
  previewSceneKey: string | null;
  rollbackVerified: boolean;
  finalControlLegacy: boolean;
  publicIdentityUnchanged: boolean;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      run_at,
      status,
      generated_at_before,
      generated_at_after,
      public_engine_before,
      public_engine_after,
      preview_scene_key,
      rollback_verified,
      final_control_legacy,
      public_identity_unchanged,
      reason
    FROM mobile_rehearsal_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    run_at: string;
    status:
      | "REHEARSAL_PASS"
      | "REHEARSAL_FAIL"
      | "REHEARSAL_REFUSED";
    generated_at_before: string | null;
    generated_at_after: string | null;
    public_engine_before: string | null;
    public_engine_after: string | null;
    preview_scene_key: string | null;
    rollback_verified: number;
    final_control_legacy: number;
    public_identity_unchanged: number;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    runAt: row.run_at,
    status: row.status,
    generatedAtBefore: row.generated_at_before,
    generatedAtAfter: row.generated_at_after,
    publicEngineBefore: row.public_engine_before,
    publicEngineAfter: row.public_engine_after,
    previewSceneKey: row.preview_scene_key,
    rollbackVerified: row.rollback_verified === 1,
    finalControlLegacy: row.final_control_legacy === 1,
    publicIdentityUnchanged:
      row.public_identity_unchanged === 1,
    reason: row.reason
  } : null;
}
