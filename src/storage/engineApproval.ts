import type { V24ReadinessReport } from "../analytics/readiness";
import type { LokaForecast } from "../types";
import { buildV24PublicPayloadPreview } from "../engine/publicPreview";
import { ensureEngineControl, getEngineControl } from "./engineControl";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export type ApprovalAuditEventType =
  | "PREPARE_REFUSED"
  | "PREPARED"
  | "CONFIRM_REFUSED"
  | "APPROVED"
  | "ROLLBACK";

interface ChallengeRow {
  challenge_id: string;
  city_slug: string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  readiness_status: string;
  readiness_fingerprint: string;
  snapshot_json: string;
  forecast_generated_at: string;
  scene24_id: number;
  scene24_key: string;
  scene24_score: number;
}

interface AuditRow {
  id: number;
  event_id: string;
  city_slug: string;
  event_type: ApprovalAuditEventType;
  event_at: string;
  challenge_id: string | null;
  readiness_status: string | null;
  readiness_fingerprint: string | null;
  snapshot_json: string | null;
  requested_mode_before: string | null;
  requested_mode_after: string | null;
  v24_approved_before: number | null;
  v24_approved_after: number | null;
  reason: string | null;
}

export interface ApprovalSnapshot {
  schemaVersion: "12.2.0";
  readiness: {
    version: string;
    status: string;
    sampleSufficient: boolean;
    criteria: Array<{
      id: string;
      passed: boolean;
      blocking: boolean;
      value: number | null;
      target: string;
      reason: string;
    }>;
    blockers: string[];
    problematicFamilies: Array<{
      family: string;
      generations: number;
      status: string;
      reasons: string[];
    }>;
    sample: unknown;
    stability: unknown;
    scoring: unknown;
    reliability: unknown;
  };
  forecast: {
    date: string;
    generatedAt: string;
    legacyScene: unknown;
    v24: {
      id: number;
      key: string;
      score: number;
      confidence: string;
    };
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function phraseFor(citySlug: string): string {
  return `ACTIVER V24 ${citySlug.toUpperCase()}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function appendAudit(
  db: D1Database,
  args: {
    citySlug: string;
    eventType: ApprovalAuditEventType;
    challengeId?: string | null;
    readinessStatus?: string | null;
    readinessFingerprint?: string | null;
    snapshotJson?: string | null;
    requestedModeBefore?: string | null;
    requestedModeAfter?: string | null;
    approvedBefore?: boolean | null;
    approvedAfter?: boolean | null;
    reason?: string | null;
  }
): Promise<void> {
  await db.prepare(`
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    args.citySlug,
    args.eventType,
    nowIso(),
    args.challengeId ?? null,
    args.readinessStatus ?? null,
    args.readinessFingerprint ?? null,
    args.snapshotJson ?? null,
    args.requestedModeBefore ?? null,
    args.requestedModeAfter ?? null,
    args.approvedBefore === null || args.approvedBefore === undefined
      ? null
      : args.approvedBefore ? 1 : 0,
    args.approvedAfter === null || args.approvedAfter === undefined
      ? null
      : args.approvedAfter ? 1 : 0,
    args.reason ?? null
  ).run();
}

export async function buildApprovalSnapshot(
  readiness: V24ReadinessReport,
  forecast: LokaForecast
): Promise<{
  snapshot: ApprovalSnapshot;
  snapshotJson: string;
  fingerprint: string;
}> {
  const preview = buildV24PublicPayloadPreview(forecast);

  const snapshot: ApprovalSnapshot = {
    schemaVersion: "12.2.0",
    readiness: {
      version: readiness.version,
      status: readiness.status,
      sampleSufficient: readiness.sampleSufficient,
      criteria: readiness.criteria.map((item) => ({
        id: item.id,
        passed: item.passed,
        blocking: item.blocking,
        value: item.value,
        target: item.target,
        reason: item.reason
      })),
      blockers: [...readiness.blockers],
      problematicFamilies: readiness.problematicFamilies.map((family) => ({
        family: family.family,
        generations: family.generations,
        status: family.status,
        reasons: [...family.reasons]
      })),
      sample: readiness.metrics.sample,
      stability: readiness.metrics.stability,
      scoring: readiness.metrics.scoring,
      reliability: readiness.metrics.reliability
    },
    forecast: {
      date: forecast.date,
      generatedAt: forecast.generatedAt,
      legacyScene: forecast.scene ?? null,
      v24: {
        id: preview.scene.id,
        key: preview.scene.key,
        score: preview.scene.score,
        confidence: preview.scene.confidence
      }
    }
  };

  const snapshotJson = JSON.stringify(snapshot);
  return {
    snapshot,
    snapshotJson,
    fingerprint: await sha256(snapshotJson)
  };
}

async function expireOldChallenges(
  db: D1Database,
  citySlug: string
): Promise<void> {
  await db.prepare(`
    UPDATE engine_approval_challenge
    SET status = 'EXPIRED'
    WHERE city_slug = ?
      AND status = 'PENDING'
      AND expires_at <= ?
  `).bind(citySlug, nowIso()).run();
}

async function cancelPendingChallenges(
  db: D1Database,
  citySlug: string
): Promise<void> {
  await db.prepare(`
    UPDATE engine_approval_challenge
    SET status = 'CANCELLED'
    WHERE city_slug = ?
      AND status = 'PENDING'
  `).bind(citySlug).run();
}

export async function prepareV24Approval(
  db: D1Database,
  citySlug: string,
  readiness: V24ReadinessReport,
  forecast: LokaForecast
): Promise<
  | {
      ok: true;
      challenge: {
        challengeId: string;
        createdAt: string;
        expiresAt: string;
        confirmationPhrase: string;
        readinessStatus: "READY_CANDIDATE";
        fingerprint: string;
        scene24: {
          id: number;
          key: string;
          score: number;
        };
      };
    }
  | {
      ok: false;
      error: string;
      readinessStatus: string;
      blockers: string[];
    }
> {
  const control = await ensureEngineControl(db, citySlug);

  let built: Awaited<ReturnType<typeof buildApprovalSnapshot>>;
  try {
    built = await buildApprovalSnapshot(readiness, forecast);
  } catch (error) {
    await appendAudit(db, {
      citySlug,
      eventType: "PREPARE_REFUSED",
      readinessStatus: readiness.status,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: error instanceof Error ? error.message : String(error)
    });

    return {
      ok: false,
      error: "v24_payload_invalid",
      readinessStatus: readiness.status,
      blockers: readiness.blockers
    };
  }

  if (readiness.status !== "READY_CANDIDATE") {
    await appendAudit(db, {
      citySlug,
      eventType: "PREPARE_REFUSED",
      readinessStatus: readiness.status,
      readinessFingerprint: built.fingerprint,
      snapshotJson: built.snapshotJson,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: "readiness_not_ready"
    });

    return {
      ok: false,
      error: "readiness_not_ready",
      readinessStatus: readiness.status,
      blockers: readiness.blockers
    };
  }

  await expireOldChallenges(db, citySlug);
  await cancelPendingChallenges(db, citySlug);

  const challengeId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

  await db.prepare(`
    INSERT INTO engine_approval_challenge (
      challenge_id,
      city_slug,
      status,
      created_at,
      expires_at,
      confirmed_at,
      readiness_status,
      readiness_fingerprint,
      snapshot_json,
      forecast_generated_at,
      scene24_id,
      scene24_key,
      scene24_score
    ) VALUES (?, ?, 'PENDING', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    challengeId,
    citySlug,
    createdAt,
    expiresAt,
    readiness.status,
    built.fingerprint,
    built.snapshotJson,
    forecast.generatedAt,
    built.snapshot.forecast.v24.id,
    built.snapshot.forecast.v24.key,
    built.snapshot.forecast.v24.score
  ).run();

  await appendAudit(db, {
    citySlug,
    eventType: "PREPARED",
    challengeId,
    readinessStatus: readiness.status,
    readinessFingerprint: built.fingerprint,
    snapshotJson: built.snapshotJson,
    requestedModeBefore: control.requestedMode,
    requestedModeAfter: control.requestedMode,
    approvedBefore: control.v24Approved,
    approvedAfter: control.v24Approved,
    reason: "double_confirmation_challenge_created"
  });

  return {
    ok: true,
    challenge: {
      challengeId,
      createdAt,
      expiresAt,
      confirmationPhrase: phraseFor(citySlug),
      readinessStatus: "READY_CANDIDATE",
      fingerprint: built.fingerprint,
      scene24: {
        id: built.snapshot.forecast.v24.id,
        key: built.snapshot.forecast.v24.key,
        score: built.snapshot.forecast.v24.score
      }
    }
  };
}

export async function confirmV24Approval(
  db: D1Database,
  citySlug: string,
  args: {
    challengeId: string;
    confirmationPhrase: string;
    readiness: V24ReadinessReport;
    forecast: LokaForecast;
  }
): Promise<
  | {
      ok: true;
      approvedAt: string;
      control: Awaited<ReturnType<typeof getEngineControl>>;
      message: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  await expireOldChallenges(db, citySlug);

  const challenge = await db.prepare(`
    SELECT *
    FROM engine_approval_challenge
    WHERE challenge_id = ?
      AND city_slug = ?
    LIMIT 1
  `).bind(args.challengeId, citySlug).first<ChallengeRow>();

  const control = await ensureEngineControl(db, citySlug);

  if (!challenge || challenge.status !== "PENDING") {
    await appendAudit(db, {
      citySlug,
      eventType: "CONFIRM_REFUSED",
      challengeId: args.challengeId,
      readinessStatus: args.readiness.status,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: "challenge_not_pending"
    });
    return { ok: false, error: "challenge_not_pending" };
  }

  if (args.confirmationPhrase.trim() !== phraseFor(citySlug)) {
    await appendAudit(db, {
      citySlug,
      eventType: "CONFIRM_REFUSED",
      challengeId: challenge.challenge_id,
      readinessStatus: args.readiness.status,
      readinessFingerprint: challenge.readiness_fingerprint,
      snapshotJson: challenge.snapshot_json,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: "confirmation_phrase_mismatch"
    });
    return { ok: false, error: "confirmation_phrase_mismatch" };
  }

  if (args.readiness.status !== "READY_CANDIDATE") {
    await db.prepare(`
      UPDATE engine_approval_challenge
      SET status = 'CANCELLED'
      WHERE challenge_id = ?
        AND status = 'PENDING'
    `).bind(challenge.challenge_id).run();

    await appendAudit(db, {
      citySlug,
      eventType: "CONFIRM_REFUSED",
      challengeId: challenge.challenge_id,
      readinessStatus: args.readiness.status,
      readinessFingerprint: challenge.readiness_fingerprint,
      snapshotJson: challenge.snapshot_json,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: "readiness_no_longer_ready"
    });
    return { ok: false, error: "readiness_no_longer_ready" };
  }

  const current = await buildApprovalSnapshot(args.readiness, args.forecast);

  if (current.fingerprint !== challenge.readiness_fingerprint) {
    await db.prepare(`
      UPDATE engine_approval_challenge
      SET status = 'CANCELLED'
      WHERE challenge_id = ?
        AND status = 'PENDING'
    `).bind(challenge.challenge_id).run();

    await appendAudit(db, {
      citySlug,
      eventType: "CONFIRM_REFUSED",
      challengeId: challenge.challenge_id,
      readinessStatus: args.readiness.status,
      readinessFingerprint: current.fingerprint,
      snapshotJson: current.snapshotJson,
      requestedModeBefore: control.requestedMode,
      requestedModeAfter: control.requestedMode,
      approvedBefore: control.v24Approved,
      approvedAfter: control.v24Approved,
      reason: "readiness_or_forecast_snapshot_changed"
    });
    return { ok: false, error: "readiness_or_forecast_snapshot_changed" };
  }

  const approvedAt = nowIso();

  // The confirmation is a real administrative approval, but Bloc 12.2 still
  // keeps effectiveProduction hard-locked to LEGACY in engineMode.ts.
  await db.batch([
    db.prepare(`
      UPDATE engine_approval_challenge
      SET
        status = 'CONFIRMED',
        confirmed_at = ?
      WHERE challenge_id = ?
        AND status = 'PENDING'
    `).bind(approvedAt, challenge.challenge_id),

    db.prepare(`
      UPDATE engine_control
      SET
        requested_mode = 'V24',
        v24_approved = 1,
        approved_at = ?,
        approved_by = 'admin_double_confirmation',
        updated_at = CURRENT_TIMESTAMP
      WHERE city_slug = ?
    `).bind(approvedAt, citySlug),

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
      ) VALUES (?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?, 'V24', ?, 1, ?)
    `).bind(
      crypto.randomUUID(),
      citySlug,
      approvedAt,
      challenge.challenge_id,
      challenge.readiness_status,
      challenge.readiness_fingerprint,
      challenge.snapshot_json,
      control.requestedMode,
      control.v24Approved ? 1 : 0,
      "human_double_confirmation_completed"
    )
  ]);

  return {
    ok: true,
    approvedAt,
    control: await getEngineControl(db, citySlug),
    message:
      "V24 autorisé administrativement. Bloc 12.2 maintient encore la production effective sur LEGACY."
  };
}

export async function getV24ApprovalOverview(
  db: D1Database,
  citySlug: string
): Promise<{
  pendingChallenge: null | {
    challengeId: string;
    createdAt: string;
    expiresAt: string;
    confirmationPhrase: string;
    readinessStatus: string;
    fingerprint: string;
    scene24: {
      id: number;
      key: string;
      score: number;
    };
  };
  recentAudit: Array<{
    id: number;
    eventType: ApprovalAuditEventType;
    eventAt: string;
    challengeId: string | null;
    readinessStatus: string | null;
    reason: string | null;
  }>;
}> {
  await expireOldChallenges(db, citySlug);

  const pending = await db.prepare(`
    SELECT *
    FROM engine_approval_challenge
    WHERE city_slug = ?
      AND status = 'PENDING'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(citySlug).first<ChallengeRow>();

  const audit = await db.prepare(`
    SELECT *
    FROM engine_activation_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 12
  `).bind(citySlug).all<AuditRow>();

  return {
    pendingChallenge: pending ? {
      challengeId: pending.challenge_id,
      createdAt: pending.created_at,
      expiresAt: pending.expires_at,
      confirmationPhrase: phraseFor(citySlug),
      readinessStatus: pending.readiness_status,
      fingerprint: pending.readiness_fingerprint,
      scene24: {
        id: pending.scene24_id,
        key: pending.scene24_key,
        score: pending.scene24_score
      }
    } : null,
    recentAudit: audit.results.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      eventAt: row.event_at,
      challengeId: row.challenge_id,
      readinessStatus: row.readiness_status,
      reason: row.reason
    }))
  };
}

export async function auditRollback(
  db: D1Database,
  citySlug: string,
  reason: string
): Promise<void> {
  // Rollback itself must never depend on this table. Callers should invoke this
  // only AFTER rollbackToLegacy() and swallow audit errors.
  await cancelPendingChallenges(db, citySlug);

  await appendAudit(db, {
    citySlug,
    eventType: "ROLLBACK",
    requestedModeAfter: "LEGACY",
    approvedAfter: false,
    reason
  });
}
