import type {
  Env
} from "../types";
import {
  evaluateV24Readiness
} from "../analytics/readiness";
import {
  loadShadowMetricRows
} from "../storage/shadowMetrics";
import {
  ensureEngineControl
} from "../storage/engineControl";
import {
  buildApprovalSnapshot
} from "../storage/engineApproval";
import {
  latestForecast
} from "../storage/db";
import {
  resolvePublicSurfaceSafely
} from "./publicFailSafe";
import {
  publicationIdentity
} from "./publicationManifest";
import {
  activeCertificationWindow,
  appendCertificationWindowAudit,
  closeCertificationWindow,
  latestCertificationWindow,
  openCertificationWindowRow,
  recentCertificationWindowAudit
} from "../storage/certificationWindow";

const VERSION = "12.15.0" as const;
const TTL_MS =
  45 * 60 * 1000;

export function certificationWindowPhrase(
  citySlug: string
): string {
  return `GELER CERTIFICATION ${citySlug.toUpperCase()}`;
}

async function currentContext(
  env: Env,
  citySlug: string
) {
  const [
    control,
    forecast,
    rows
  ] = await Promise.all([
    ensureEngineControl(
      env.DB,
      citySlug
    ),
    latestForecast(
      env.DB,
      citySlug
    ),
    loadShadowMetricRows(
      env.DB,
      citySlug,
      30,
      1000
    )
  ]);

  if (!forecast) {
    throw new Error(
      "certification_window_no_forecast"
    );
  }

  const readiness =
    evaluateV24Readiness(rows);

  const surface =
    await resolvePublicSurfaceSafely(
      env,
      forecast
    );

  if (
    surface.engine === "UNAVAILABLE" ||
    !surface.forecast
  ) {
    throw new Error(
      "certification_window_safe_public_surface_unavailable"
    );
  }

  const identity =
    publicationIdentity(
      surface.forecast
    );

  if (!identity) {
    throw new Error(
      "certification_window_public_identity_unavailable"
    );
  }

  const approvalSnapshot =
    await buildApprovalSnapshot(
      readiness,
      forecast
    );

  return {
    control,
    forecast,
    readiness,
    surface,
    identity,
    readinessFingerprint:
      approvalSnapshot.fingerprint
  };
}

export async function certificationWindowOverview(
  env: Env,
  citySlug: string
) {
  const [
    active,
    latest,
    recent
  ] = await Promise.all([
    activeCertificationWindow(
      env.DB,
      citySlug
    ),
    latestCertificationWindow(
      env.DB,
      citySlug
    ),
    recentCertificationWindowAudit(
      env.DB,
      citySlug,
      12
    )
  ]);

  let current = null;

  try {
    const context =
      await currentContext(
        env,
        citySlug
      );

    current = {
      generatedAt:
        context.identity.generatedAt,
      publicEngine:
        context.identity.engine,
      scene:
        context.identity.scene,
      fingerprint:
        context.identity.fingerprint,
      readiness:
        context.readiness.status,
      requestedMode:
        context.control.requestedMode,
      v24Approved:
        context.control.v24Approved,
      readinessFingerprint:
        context.readinessFingerprint
    };
  } catch (error) {
    current = {
      error:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }

  const activeCurrent =
    !!active &&
    !!current &&
    !("error" in current) &&
    active.generated_at ===
      current.generatedAt &&
    active.publication_fingerprint ===
      current.fingerprint &&
    active.readiness_status ===
      "READY_CANDIDATE" &&
    current.readiness ===
      "READY_CANDIDATE";

  return {
    version: VERSION,
    citySlug,
    status: active
      ? activeCurrent
        ? "ACTIVE"
        : "STALE"
      : "INACTIVE",
    active: active
      ? {
          windowId:
            active.window_id,
          openedAt:
            active.opened_at,
          expiresAt:
            active.expires_at,
          generatedAt:
            active.generated_at,
          publicEngine:
            active.public_engine,
          scene:
            active.scene_key,
          fingerprint:
            active.publication_fingerprint,
          readiness:
            active.readiness_status,
          readinessFingerprint:
            active.readiness_fingerprint,
          current:
            activeCurrent
        }
      : null,
    latest: latest
      ? {
          windowId:
            latest.window_id,
          status:
            latest.status,
          openedAt:
            latest.opened_at,
          expiresAt:
            latest.expires_at,
          closedAt:
            latest.closed_at,
          generatedAt:
            latest.generated_at,
          closeReason:
            latest.close_reason
        }
      : null,
    current,
    confirmationPhrase:
      certificationWindowPhrase(
        citySlug
      ),
    ttlMinutes: 45,
    recentAudit: recent,
    safety: {
      requiresReadyCandidate: true,
      requiresLegacyProduction: true,
      blocksManualGeneration: true,
      blocksCronGeneration: true,
      allowsOnlyGoLiveCutoverGeneration:
        true,
      automaticV24Activation: false,
      automaticRollback: false
    }
  };
}

export async function openCertificationWindow(
  env: Env,
  citySlug: string,
  confirmationPhrase: string
) {
  if (
    confirmationPhrase.trim() !==
    certificationWindowPhrase(
      citySlug
    )
  ) {
    await appendCertificationWindowAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "OPEN_REFUSED",
        reason:
          "certification_window_confirmation_phrase_mismatch"
      }
    );

    throw new Error(
      "certification_window_confirmation_phrase_mismatch"
    );
  }

  const context =
    await currentContext(
      env,
      citySlug
    );

  const blockers: string[] = [];

  if (
    context.readiness.status !==
      "READY_CANDIDATE"
  ) {
    blockers.push(
      "readiness_not_ready_candidate"
    );
  }

  if (
    context.control.requestedMode !==
      "LEGACY" ||
    context.control.v24Approved
  ) {
    blockers.push(
      "engine_control_not_pristine_legacy"
    );
  }

  if (
    context.identity.engine !==
      "LEGACY"
  ) {
    blockers.push(
      "public_engine_not_legacy"
    );
  }

  if (blockers.length) {
    await appendCertificationWindowAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "OPEN_REFUSED",
        generatedAt:
          context.identity.generatedAt,
        reason:
          `certification_window_blocked:${blockers.join(",")}`,
        snapshotJson:
          JSON.stringify({
            readiness:
              context.readiness.status,
            requestedMode:
              context.control.requestedMode,
            v24Approved:
              context.control.v24Approved,
            publicEngine:
              context.identity.engine
          })
      }
    );

    return {
      ok: false as const,
      error:
        "certification_window_not_eligible",
      blockers,
      current: {
        readiness:
          context.readiness.status,
        generatedAt:
          context.identity.generatedAt,
        publicEngine:
          context.identity.engine
      }
    };
  }

  const windowId =
    crypto.randomUUID();
  const openedAt =
    new Date().toISOString();
  const expiresAt =
    new Date(
      Date.now() + TTL_MS
    ).toISOString();

  const snapshot = {
    version: VERSION,
    citySlug,
    windowId,
    openedAt,
    expiresAt,
    generatedAt:
      context.identity.generatedAt,
    publicEngine:
      context.identity.engine,
    scene:
      context.identity.scene,
    fingerprint:
      context.identity.fingerprint,
    readiness:
      context.readiness.status,
    readinessFingerprint:
      context.readinessFingerprint,
    requestedMode:
      context.control.requestedMode,
    v24Approved:
      context.control.v24Approved
  };

  await openCertificationWindowRow(
    env.DB,
    {
      citySlug,
      windowId,
      openedAt,
      expiresAt,
      generatedAt:
        context.identity.generatedAt,
      publicEngine:
        context.identity.engine,
      sceneKey:
        context.identity.scene,
      publicationFingerprint:
        context.identity.fingerprint,
      readinessStatus:
        context.readiness.status,
      readinessFingerprint:
        context.readinessFingerprint,
      openedBy:
        "bloc12_15_mobile_admin",
      snapshotJson:
        JSON.stringify(snapshot)
    }
  );

  return {
    ok: true as const,
    window: snapshot,
    next:
      "Run 12.8 -> 12.9 -> 12.10 -> 12.11 -> 12.12 -> 12.13 before expiry."
  };
}

export async function cancelCertificationWindow(
  env: Env,
  citySlug: string,
  reason = "manual_mobile_admin"
) {
  const cancelled =
    await closeCertificationWindow(
      env.DB,
      citySlug,
      {
        status:
          "CANCELLED",
        reason:
          `certification_window_cancelled:${reason}`,
        source:
          "admin"
      }
    );

  return {
    ok: true,
    cancelled
  };
}
