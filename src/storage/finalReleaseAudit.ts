import type {
  FinalReleaseAuditReport,
  FinalReleaseStatus
} from "../engine/finalReleaseAudit";

export async function recordFinalReleaseAudit(
  db: D1Database,
  report: FinalReleaseAuditReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO final_release_audit (
      event_id,
      city_slug,
      release_version,
      evaluated_at,
      generated_at,
      effective_engine,
      scene_key,
      publication_fingerprint,
      status,
      readiness_status,
      requested_mode,
      v24_approved,
      blocking_pass_count,
      blocking_fail_count,
      blocking_pending_count,
      checks_json,
      evidence_json,
      summary_json,
      rehearsal_eligible,
      go_live_instagram,
      production_mutated,
      engine_control_mutated,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.evaluatedAt,
    report.generatedAt,
    report.effectiveEngine,
    report.sceneKey,
    report.publicationFingerprint,
    report.status,
    report.summary.readiness,
    report.summary.requestedMode,
    report.summary.v24Approved ? 1 : 0,
    report.summary.blockingPass,
    report.summary.blockingFail,
    report.summary.blockingPending,
    JSON.stringify(report.checks),
    JSON.stringify(report.evidence),
    JSON.stringify(report.summary),
    report.summary.rehearsalEligible ? 1 : 0,
    report.reason
  ).run();
}

export async function latestFinalReleaseAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  releaseVersion: string;
  evaluatedAt: string;
  generatedAt: string | null;
  effectiveEngine: string | null;
  sceneKey: string | null;
  publicationFingerprint: string | null;
  status: FinalReleaseStatus;
  readinessStatus: string | null;
  requestedMode: string | null;
  v24Approved: boolean;
  rehearsalEligible: boolean;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      release_version,
      evaluated_at,
      generated_at,
      effective_engine,
      scene_key,
      publication_fingerprint,
      status,
      readiness_status,
      requested_mode,
      v24_approved,
      rehearsal_eligible,
      reason
    FROM final_release_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    release_version: string;
    evaluated_at: string;
    generated_at: string | null;
    effective_engine: string | null;
    scene_key: string | null;
    publication_fingerprint: string | null;
    status: FinalReleaseStatus;
    readiness_status: string | null;
    requested_mode: string | null;
    v24_approved: number;
    rehearsal_eligible: number;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    releaseVersion:
      row.release_version,
    evaluatedAt:
      row.evaluated_at,
    generatedAt:
      row.generated_at,
    effectiveEngine:
      row.effective_engine,
    sceneKey:
      row.scene_key,
    publicationFingerprint:
      row.publication_fingerprint,
    status:
      row.status,
    readinessStatus:
      row.readiness_status,
    requestedMode:
      row.requested_mode,
    v24Approved:
      row.v24_approved === 1,
    rehearsalEligible:
      row.rehearsal_eligible === 1,
    reason:
      row.reason
  } : null;
}
