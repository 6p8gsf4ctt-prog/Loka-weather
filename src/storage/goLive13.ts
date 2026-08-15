export type GoLiveChallengeStatus =
  | "PENDING"
  | "ACTIVATING"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type GoLiveAuditEventType =
  | "PREPARE_REFUSED"
  | "PREPARED"
  | "CONFIRM_REFUSED"
  | "ACTIVATION_STARTED"
  | "ACTIVATED"
  | "ACTIVATION_ABORTED";

export interface GoLiveChallengeRow {
  challenge_id: string;
  city_slug: string;
  status: GoLiveChallengeStatus;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  forecast_generated_at: string;
  public_fingerprint: string;
  readiness_status: string;
  readiness_fingerprint: string;
  final_release_audit_id: number;
  mobile_rehearsal_audit_id: number;
  scene24_id: number;
  scene24_key: string;
  scene24_score: number;
  scene24_confidence: string;
  master_file_name: string;
  snapshot_json: string;
  snapshot_fingerprint: string;
  failure_reason: string | null;
}

export interface FinalReleaseEvidenceRow {
  id: number;
  evaluated_at: string;
  generated_at: string | null;
  effective_engine: string | null;
  scene_key: string | null;
  publication_fingerprint: string | null;
  status: string;
  rehearsal_eligible: number;
}

export interface MobileRehearsalEvidenceRow {
  id: number;
  run_at: string;
  status: string;
  final_release_audit_id: number | null;
  generated_at_before: string | null;
  generated_at_after: string | null;
  public_engine_before: string | null;
  public_engine_after: string | null;
  public_scene_before: string | null;
  public_scene_after: string | null;
  public_fingerprint_before: string | null;
  public_fingerprint_after: string | null;
  rollback_verified: number;
  final_control_legacy: number;
  public_identity_unchanged: number;
  v24_approval_granted: number;
}

export async function expireGoLiveChallenges(
  db: D1Database,
  citySlug: string
): Promise<void> {
  await db.prepare(`
    UPDATE go_live_challenge
    SET
      status = 'EXPIRED',
      failure_reason = COALESCE(
        failure_reason,
        'challenge_expired'
      )
    WHERE city_slug = ?
      AND status = 'PENDING'
      AND expires_at <= ?
  `).bind(
    citySlug,
    new Date().toISOString()
  ).run();
}

export async function cancelPendingGoLiveChallenges(
  db: D1Database,
  citySlug: string,
  reason: string
): Promise<void> {
  await db.prepare(`
    UPDATE go_live_challenge
    SET
      status = 'CANCELLED',
      failure_reason = ?
    WHERE city_slug = ?
      AND status = 'PENDING'
  `).bind(reason, citySlug).run();
}

export async function latestGoLiveChallenge(
  db: D1Database,
  citySlug: string
): Promise<GoLiveChallengeRow | null> {
  await expireGoLiveChallenges(db, citySlug);

  return db.prepare(`
    SELECT *
    FROM go_live_challenge
    WHERE city_slug = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(citySlug).first<GoLiveChallengeRow>();
}

export async function getGoLiveChallenge(
  db: D1Database,
  citySlug: string,
  challengeId: string
): Promise<GoLiveChallengeRow | null> {
  await expireGoLiveChallenges(db, citySlug);

  return db.prepare(`
    SELECT *
    FROM go_live_challenge
    WHERE city_slug = ?
      AND challenge_id = ?
    LIMIT 1
  `).bind(
    citySlug,
    challengeId
  ).first<GoLiveChallengeRow>();
}

export async function createGoLiveChallenge(
  db: D1Database,
  args: {
    challengeId: string;
    citySlug: string;
    createdAt: string;
    expiresAt: string;
    forecastGeneratedAt: string;
    publicFingerprint: string;
    readinessStatus: string;
    readinessFingerprint: string;
    finalReleaseAuditId: number;
    mobileRehearsalAuditId: number;
    scene24Id: number;
    scene24Key: string;
    scene24Score: number;
    scene24Confidence: string;
    masterFileName: string;
    snapshotJson: string;
    snapshotFingerprint: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO go_live_challenge (
      challenge_id,
      city_slug,
      status,
      created_at,
      expires_at,
      confirmed_at,
      forecast_generated_at,
      public_fingerprint,
      readiness_status,
      readiness_fingerprint,
      final_release_audit_id,
      mobile_rehearsal_audit_id,
      scene24_id,
      scene24_key,
      scene24_score,
      scene24_confidence,
      master_file_name,
      snapshot_json,
      snapshot_fingerprint,
      failure_reason
    ) VALUES (
      ?, ?, 'PENDING', ?, ?, NULL,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL
    )
  `).bind(
    args.challengeId,
    args.citySlug,
    args.createdAt,
    args.expiresAt,
    args.forecastGeneratedAt,
    args.publicFingerprint,
    args.readinessStatus,
    args.readinessFingerprint,
    args.finalReleaseAuditId,
    args.mobileRehearsalAuditId,
    args.scene24Id,
    args.scene24Key,
    args.scene24Score,
    args.scene24Confidence,
    args.masterFileName,
    args.snapshotJson,
    args.snapshotFingerprint
  ).run();
}

export async function markGoLiveChallengeFailed(
  db: D1Database,
  challengeId: string,
  reason: string
): Promise<void> {
  await db.prepare(`
    UPDATE go_live_challenge
    SET
      status = 'FAILED',
      failure_reason = ?
    WHERE challenge_id = ?
      AND status IN (
        'PENDING',
        'ACTIVATING'
      )
  `).bind(reason, challengeId).run();
}

export async function markGoLiveChallengeConfirmed(
  db: D1Database,
  challengeId: string
): Promise<void> {
  await db.prepare(`
    UPDATE go_live_challenge
    SET
      status = 'CONFIRMED',
      confirmed_at = COALESCE(
        confirmed_at,
        ?
      ),
      failure_reason = NULL
    WHERE challenge_id = ?
      AND status = 'ACTIVATING'
  `).bind(
    new Date().toISOString(),
    challengeId
  ).run();
}

export async function latestFinalReleaseEvidence(
  db: D1Database,
  citySlug: string
): Promise<FinalReleaseEvidenceRow | null> {
  return db.prepare(`
    SELECT
      id,
      evaluated_at,
      generated_at,
      effective_engine,
      scene_key,
      publication_fingerprint,
      status,
      rehearsal_eligible
    FROM final_release_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<FinalReleaseEvidenceRow>();
}

export async function latestMobileRehearsalEvidence(
  db: D1Database,
  citySlug: string
): Promise<MobileRehearsalEvidenceRow | null> {
  return db.prepare(`
    SELECT
      id,
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
      rollback_verified,
      final_control_legacy,
      public_identity_unchanged,
      v24_approval_granted
    FROM mobile_rehearsal_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<MobileRehearsalEvidenceRow>();
}

export async function appendGoLiveAudit(
  db: D1Database,
  args: {
    citySlug: string;
    eventType: GoLiveAuditEventType;
    challengeId?: string | null;
    generatedAtBefore?: string | null;
    generatedAtAfter?: string | null;
    requestedModeBefore?: string | null;
    requestedModeAfter?: string | null;
    approvedBefore?: boolean | null;
    approvedAfter?: boolean | null;
    effectiveEngineAfter?: string | null;
    sceneKeyAfter?: string | null;
    publicationFingerprintAfter?: string | null;
    readinessStatus?: string | null;
    readinessFingerprint?: string | null;
    finalReleaseAuditId?: number | null;
    mobileRehearsalAuditId?: number | null;
    snapshotFingerprint?: string | null;
    snapshotJson?: string | null;
    legacyRestoreRequired?: boolean;
    legacyRestoreVerified?: boolean;
    reason: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO go_live_audit (
      event_id,
      city_slug,
      release_version,
      event_type,
      event_at,
      challenge_id,
      generated_at_before,
      generated_at_after,
      requested_mode_before,
      requested_mode_after,
      v24_approved_before,
      v24_approved_after,
      effective_engine_after,
      scene_key_after,
      publication_fingerprint_after,
      readiness_status,
      readiness_fingerprint,
      final_release_audit_id,
      mobile_rehearsal_audit_id,
      snapshot_fingerprint,
      snapshot_json,
      legacy_restore_required,
      legacy_restore_verified,
      reason
    ) VALUES (
      ?, ?, '12.13.0', ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).bind(
    crypto.randomUUID(),
    args.citySlug,
    args.eventType,
    new Date().toISOString(),
    args.challengeId ?? null,
    args.generatedAtBefore ?? null,
    args.generatedAtAfter ?? null,
    args.requestedModeBefore ?? null,
    args.requestedModeAfter ?? null,
    args.approvedBefore === null ||
      args.approvedBefore === undefined
        ? null
        : args.approvedBefore ? 1 : 0,
    args.approvedAfter === null ||
      args.approvedAfter === undefined
        ? null
        : args.approvedAfter ? 1 : 0,
    args.effectiveEngineAfter ?? null,
    args.sceneKeyAfter ?? null,
    args.publicationFingerprintAfter ?? null,
    args.readinessStatus ?? null,
    args.readinessFingerprint ?? null,
    args.finalReleaseAuditId ?? null,
    args.mobileRehearsalAuditId ?? null,
    args.snapshotFingerprint ?? null,
    args.snapshotJson ?? null,
    args.legacyRestoreRequired ? 1 : 0,
    args.legacyRestoreVerified ? 1 : 0,
    args.reason
  ).run();
}

export async function armGoLiveControl(
  db: D1Database,
  args: {
    citySlug: string;
    challenge: GoLiveChallengeRow;
    requestedModeBefore: string;
    approvedBefore: boolean;
  }
): Promise<{
  approvedAt: string;
  approvalEventId: string;
}> {
  const approvedAt =
    new Date().toISOString();
  const approvalEventId =
    crypto.randomUUID();

  await db.batch([
    db.prepare(`
      UPDATE go_live_challenge
      SET
        status = 'ACTIVATING',
        confirmed_at = ?
      WHERE challenge_id = ?
        AND status = 'PENDING'
    `).bind(
      approvedAt,
      args.challenge.challenge_id
    ),

    db.prepare(`
      UPDATE engine_control
      SET
        requested_mode = 'V24',
        v24_approved = 1,
        approved_at = ?,
        approved_by = 'bloc12_13_go_live',
        updated_at = CURRENT_TIMESTAMP
      WHERE city_slug = ?
    `).bind(
      approvedAt,
      args.citySlug
    ),

    db.prepare(`
      INSERT INTO engine_activation_audit (
        event_id,
        city_slug,
        event_type,
        event_at,
        challenge_id,
        readiness_status,
        readiness_fingerprint,
        snapshot_json,
        requested_mode_before,
        requested_mode_after,
        v24_approved_before,
        v24_approved_after,
        reason
      ) VALUES (
        ?, ?, 'APPROVED', ?, ?, ?, ?, ?,
        ?, 'V24', ?, 1, ?
      )
    `).bind(
      approvalEventId,
      args.citySlug,
      approvedAt,
      args.challenge.challenge_id,
      args.challenge.readiness_status,
      args.challenge.readiness_fingerprint,
      args.challenge.snapshot_json,
      args.requestedModeBefore,
      args.approvedBefore ? 1 : 0,
      'bloc12_13_final_go_live_confirmation'
    )
  ]);

  return {
    approvedAt,
    approvalEventId
  };
}

export async function latestGoLiveAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  eventType: GoLiveAuditEventType;
  eventAt: string;
  challengeId: string | null;
  generatedAtAfter: string | null;
  effectiveEngineAfter: string | null;
  sceneKeyAfter: string | null;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      event_type,
      event_at,
      challenge_id,
      generated_at_after,
      effective_engine_after,
      scene_key_after,
      reason
    FROM go_live_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    event_type: GoLiveAuditEventType;
    event_at: string;
    challenge_id: string | null;
    generated_at_after: string | null;
    effective_engine_after: string | null;
    scene_key_after: string | null;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    eventType: row.event_type,
    eventAt: row.event_at,
    challengeId: row.challenge_id,
    generatedAtAfter: row.generated_at_after,
    effectiveEngineAfter:
      row.effective_engine_after,
    sceneKeyAfter:
      row.scene_key_after,
    reason: row.reason
  } : null;
}
