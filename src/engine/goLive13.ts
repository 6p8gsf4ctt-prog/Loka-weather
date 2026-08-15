import type {
  Env,
  LokaForecast
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
  buildApprovalSnapshot,
  getV24ApprovalOverview
} from "../storage/engineApproval";
import {
  latestForecast
} from "../storage/db";
import {
  buildV24PublicPayloadPreview
} from "./publicPreview";
import {
  verifyV24CandidateMasterAsset
} from "./masterAsset";
import {
  resolveSceneEngineMode
} from "./engineMode";
import {
  evaluateV24ActivationGuard
} from "./activationGuard";
import {
  publicationIdentity
} from "./publicationManifest";
import {
  resolvePublicSurfaceSafely
} from "./publicFailSafe";
import {
  loadLegacyPublicBackup
} from "../storage/publicationSafety";
import {
  executeGlobalRollback
} from "../storage/globalRollback";
import {
  appendGoLiveAudit,
  armGoLiveControl,
  cancelPendingGoLiveChallenges,
  createGoLiveChallenge,
  getGoLiveChallenge,
  latestFinalReleaseEvidence,
  latestGoLiveAudit,
  latestGoLiveChallenge,
  latestMobileRehearsalEvidence,
  markGoLiveChallengeConfirmed,
  markGoLiveChallengeFailed
} from "../storage/goLive13";
import {
  activeCertificationWindow,
  closeCertificationWindow
} from "../storage/certificationWindow";

type Obj = Record<string, unknown>;

const VERSION = "12.13.0" as const;
const CHALLENGE_TTL_MS =
  10 * 60 * 1000;

function asObj(
  value: unknown
): Obj | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as Obj
    : null;
}

function shaHex(
  bytes: Uint8Array
): string {
  return [...bytes]
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}

async function sha256(
  value: string
): Promise<string> {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );

  return shaHex(
    new Uint8Array(digest)
  );
}

export function goLivePhrase(
  citySlug: string
): string {
  return `ACTIVER V24 OFFICIEL ${citySlug.toUpperCase()}`;
}

export interface GoLiveCheck {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  detail: string;
}

export interface GoLiveEligibility {
  version: "12.13.0";
  evaluatedAt: string;
  citySlug: string;

  status:
    | "BLOCKED"
    | "ELIGIBLE"
    | "ALREADY_ACTIVE";

  eligible: boolean;
  blockers: string[];
  checks: GoLiveCheck[];

  readinessStatus: string;

  current: {
    generatedAt: string | null;
    publicEngine: string | null;
    scene: string | null;
    fingerprint: string | null;
    requestedMode: string;
    v24Approved: boolean;
  };

  finalRelease: {
    id: number | null;
    status: string | null;
    currentGeneration: boolean;
  };

  rehearsal: {
    id: number | null;
    status: string | null;
    currentGeneration: boolean;
  };

  candidate: {
    sceneId: number | null;
    sceneKey: string | null;
    score: number | null;
    confidence: string | null;
    masterFileName: string | null;
    masterAvailable: boolean;
  };

  guard: {
    status: string;
    reason: string;
    activationReadyForCutover: boolean;
  };

  legacyBackupAvailable: boolean;

  certificationWindow: {
    active: boolean;
    currentGeneration: boolean;
    windowId: string | null;
    expiresAt: string | null;
  };

  readinessFingerprint: string | null;
  snapshotJson: string;
  snapshotFingerprint: string;
}

function addCheck(
  checks: GoLiveCheck[],
  blockers: string[],
  id: string,
  passed: boolean,
  detail: string,
  blocker = true
) {
  checks.push({
    id,
    status: passed
      ? "PASS"
      : blocker
        ? "FAIL"
        : "INFO",
    detail
  });

  if (!passed && blocker) {
    blockers.push(id);
  }
}

export async function evaluateGoLiveEligibility(
  env: Env,
  citySlug: string
): Promise<GoLiveEligibility> {
  const evaluatedAt =
    new Date().toISOString();
  const checks: GoLiveCheck[] = [];
  const blockers: string[] = [];

  const control =
    await ensureEngineControl(
      env.DB,
      citySlug
    );

  const forecast =
    await latestForecast(
      env.DB,
      citySlug
    );

  let generatedAt: string | null = null;
  let publicEngine: string | null = null;
  let publicScene: string | null = null;
  let publicFingerprint: string | null =
    null;

  if (forecast) {
    const surface =
      await resolvePublicSurfaceSafely(
        env,
        forecast
      );

    if (
      surface.engine !== "UNAVAILABLE" &&
      surface.forecast
    ) {
      const identity =
        publicationIdentity(
          surface.forecast
        );

      generatedAt =
        identity?.generatedAt ??
        surface.forecast.generatedAt;
      publicEngine =
        identity?.engine ??
        surface.engine;
      publicScene =
        identity?.scene ??
        String(
          surface.forecast.scene ?? ""
        );
      publicFingerprint =
        identity?.fingerprint ?? null;
    }
  }

  const alreadyActive =
    control.requestedMode === "V24" &&
    control.v24Approved &&
    publicEngine === "V24";

  addCheck(
    checks,
    blockers,
    "forecast_public_identity",
    !!forecast &&
      !!generatedAt &&
      !!publicFingerprint,
    forecast
      ? `${generatedAt ?? "—"} · ${publicEngine ?? "UNAVAILABLE"} · ${publicScene ?? "—"}.`
      : "Aucun forecast courant."
  );

  addCheck(
    checks,
    blockers,
    "pristine_legacy_control",
    alreadyActive ||
      (
        control.requestedMode === "LEGACY" &&
        control.v24Approved === false &&
        publicEngine === "LEGACY"
      ),
    `requested=${control.requestedMode} · approved=${control.v24Approved ? "OUI" : "NON"} · public=${publicEngine ?? "UNAVAILABLE"}.`
  );

  let readinessStatus = "UNAVAILABLE";
  let readinessFingerprint:
    string | null = null;
  let approvalSnapshotJson:
    string | null = null;

  if (forecast) {
    try {
      const rows =
        await loadShadowMetricRows(
          env.DB,
          citySlug,
          30,
          1000
        );

      const readiness =
        evaluateV24Readiness(rows);

      readinessStatus =
        readiness.status;

      const approvalSnapshot =
        await buildApprovalSnapshot(
          readiness,
          forecast
        );

      readinessFingerprint =
        approvalSnapshot.fingerprint;
      approvalSnapshotJson =
        approvalSnapshot.snapshotJson;

      addCheck(
        checks,
        blockers,
        "readiness_ready_candidate",
        readiness.status ===
          "READY_CANDIDATE",
        `${readiness.status}.`
      );
    } catch (error) {
      addCheck(
        checks,
        blockers,
        "readiness_ready_candidate",
        false,
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  } else {
    addCheck(
      checks,
      blockers,
      "readiness_ready_candidate",
      false,
      "Forecast absent."
    );
  }

  const approval =
    await getV24ApprovalOverview(
      env.DB,
      citySlug
    );

  addCheck(
    checks,
    blockers,
    "no_legacy_approval_challenge",
    approval.pendingChallenge === null,
    approval.pendingChallenge
      ? "Un ancien challenge d'autorisation V24 est encore PENDING."
      : "Aucun challenge historique en attente."
  );

  const finalRelease =
    await latestFinalReleaseEvidence(
      env.DB,
      citySlug
    );

  const finalCurrent =
    !!finalRelease &&
    finalRelease.status ===
      "FINAL_RC_PASS" &&
    finalRelease.rehearsal_eligible === 1 &&
    finalRelease.generated_at ===
      generatedAt &&
    finalRelease.effective_engine ===
      "LEGACY" &&
    finalRelease.scene_key ===
      publicScene &&
    finalRelease.publication_fingerprint ===
      publicFingerprint;

  addCheck(
    checks,
    blockers,
    "final_rc_current",
    finalCurrent,
    finalRelease
      ? `#${finalRelease.id} · ${finalRelease.status} · generation=${finalRelease.generated_at ?? "—"}.`
      : "Aucun FINAL_RC_PASS."
  );

  const rehearsal =
    await latestMobileRehearsalEvidence(
      env.DB,
      citySlug
    );

  const rehearsalCurrent =
    !!rehearsal &&
    rehearsal.status ===
      "REHEARSAL_PASS" &&
    rehearsal.final_release_audit_id ===
      finalRelease?.id &&
    rehearsal.generated_at_before ===
      generatedAt &&
    rehearsal.generated_at_after ===
      generatedAt &&
    rehearsal.public_engine_before ===
      "LEGACY" &&
    rehearsal.public_engine_after ===
      "LEGACY" &&
    rehearsal.public_scene_before ===
      publicScene &&
    rehearsal.public_scene_after ===
      publicScene &&
    rehearsal.public_fingerprint_before ===
      publicFingerprint &&
    rehearsal.public_fingerprint_after ===
      publicFingerprint &&
    rehearsal.rollback_verified === 1 &&
    rehearsal.final_control_legacy === 1 &&
    rehearsal.public_identity_unchanged === 1 &&
    rehearsal.v24_approval_granted === 0;

  addCheck(
    checks,
    blockers,
    "mobile_rehearsal_current",
    rehearsalCurrent,
    rehearsal
      ? `#${rehearsal.id} · ${rehearsal.status} · finalRC=${rehearsal.final_release_audit_id ?? "—"}.`
      : "Aucun REHEARSAL_PASS."
  );

  let legacyBackupAvailable = false;
  try {
    legacyBackupAvailable =
      (await loadLegacyPublicBackup(
        env.DB,
        citySlug
      )) !== null;
  } catch {
    legacyBackupAvailable = false;
  }

  addCheck(
    checks,
    blockers,
    "persistent_legacy_backup",
    legacyBackupAvailable,
    legacyBackupAvailable
      ? "Backup Legacy vérifié et disponible."
      : "Aucun backup Legacy vérifiable."
  );

  let certificationWindow = null;
  try {
    certificationWindow =
      await activeCertificationWindow(
        env.DB,
        citySlug
      );
  } catch {
    certificationWindow = null;
  }

  const certificationWindowCurrent =
    !!certificationWindow &&
    !!generatedAt &&
    !!publicFingerprint &&
    certificationWindow.generated_at === generatedAt &&
    certificationWindow.publication_fingerprint === publicFingerprint &&
    certificationWindow.readiness_status === "READY_CANDIDATE";

  addCheck(
    checks,
    blockers,
    "certification_window_current",
    certificationWindowCurrent,
    certificationWindowCurrent
      ? `ACTIVE · ${certificationWindow?.window_id} · expires=${certificationWindow?.expires_at}.`
      : "Aucune fenêtre 12.15 ACTIVE correspondant à la génération courante."
  );

  let candidateSceneId:
    number | null = null;
  let candidateSceneKey:
    string | null = null;
  let candidateScore:
    number | null = null;
  let candidateConfidence:
    string | null = null;
  let candidateMaster:
    string | null = null;
  let masterAvailable = false;
  let guardStatus = "BLOCKED";
  let guardReason =
    "preflight_not_evaluated";
  let activationReady = false;
  let guardChecks: unknown[] = [];

  if (
    forecast &&
    readinessStatus ===
      "READY_CANDIDATE"
  ) {
    try {
      const preview =
        buildV24PublicPayloadPreview(
          forecast
        );

      candidateSceneId =
        preview.scene.id;
      candidateSceneKey =
        preview.scene.key;
      candidateScore =
        preview.scene.score;
      candidateConfidence =
        preview.scene.confidence;
      candidateMaster =
        preview.scene.masterFileName;

      const master =
        await verifyV24CandidateMasterAsset(
          env,
          forecast,
          true
        );

      masterAvailable =
        master.checked &&
        master.available;

      const scene24 =
        asObj(
          forecast.diagnostics.scene24
        );

      const syntheticControl = {
        ...control,
        requestedMode:
          "V24" as const,
        v24Approved: true
      };

      const resolution =
        resolveSceneEngineMode({
          control: syntheticControl,
          readiness:
            "READY_CANDIDATE",
          hasValidV24Decision:
            !!scene24 &&
            typeof scene24.sceneId ===
              "number"
        });

      const guard =
        evaluateV24ActivationGuard({
          forecast,
          resolution,
          approvalProof: {
            eventId:
              "bloc12_13_preflight",
            eventAt: evaluatedAt,
            challengeId: null,
            readinessFingerprint
          },
          masterAvailability: master
        });

      guardStatus =
        guard.status;
      guardReason =
        guard.reason;
      activationReady =
        guard.activationReadyForCutover;
      guardChecks =
        guard.checks;

      addCheck(
        checks,
        blockers,
        "candidate_master",
        masterAvailable,
        masterAvailable
          ? `${preview.scene.masterFileName} accessible.`
          : `Master indisponible : ${master.reason}.`
      );

      addCheck(
        checks,
        blockers,
        "per_generation_guard_preflight",
        guard.status === "PASS" &&
          guard.activationReadyForCutover,
        `${guard.status} · ${guard.reason}.`
      );
    } catch (error) {
      addCheck(
        checks,
        blockers,
        "candidate_master",
        false,
        error instanceof Error
          ? error.message
          : String(error)
      );

      addCheck(
        checks,
        blockers,
        "per_generation_guard_preflight",
        false,
        "Préflight V24 impossible."
      );
    }
  } else {
    addCheck(
      checks,
      blockers,
      "candidate_master",
      false,
      "Non évalué tant que READY_CANDIDATE n'est pas atteint."
    );

    addCheck(
      checks,
      blockers,
      "per_generation_guard_preflight",
      false,
      "Non évalué tant que READY_CANDIDATE n'est pas atteint."
    );
  }

  const snapshot = {
    schemaVersion: VERSION,
    evaluatedData: {
      citySlug,
      current: {
        generatedAt,
        publicEngine,
        scene:
          publicScene,
        fingerprint:
          publicFingerprint,
        requestedMode:
          control.requestedMode,
        v24Approved:
          control.v24Approved
      },
      readiness: {
        status:
          readinessStatus,
        fingerprint:
          readinessFingerprint,
        approvalSnapshotJson
      },
      finalRelease: finalRelease
        ? {
            id:
              finalRelease.id,
            status:
              finalRelease.status,
            generatedAt:
              finalRelease.generated_at,
            fingerprint:
              finalRelease.publication_fingerprint
          }
        : null,
      rehearsal: rehearsal
        ? {
            id:
              rehearsal.id,
            status:
              rehearsal.status,
            finalReleaseAuditId:
              rehearsal.final_release_audit_id,
            generatedAtBefore:
              rehearsal.generated_at_before,
            generatedAtAfter:
              rehearsal.generated_at_after,
            fingerprintBefore:
              rehearsal.public_fingerprint_before,
            fingerprintAfter:
              rehearsal.public_fingerprint_after
          }
        : null,
      candidate: {
        sceneId:
          candidateSceneId,
        sceneKey:
          candidateSceneKey,
        score:
          candidateScore,
        confidence:
          candidateConfidence,
        masterFileName:
          candidateMaster,
        masterAvailable
      },
      guard: {
        status:
          guardStatus,
        reason:
          guardReason,
        activationReady,
        checks:
          guardChecks
      },
      legacyBackupAvailable,
      certificationWindow:
        certificationWindow
          ? {
              windowId:
                certificationWindow.window_id,
              generatedAt:
                certificationWindow.generated_at,
              fingerprint:
                certificationWindow.publication_fingerprint,
              openedAt:
                certificationWindow.opened_at,
              expiresAt:
                certificationWindow.expires_at
            }
          : null
    }
  };

  const snapshotJson =
    JSON.stringify(snapshot);
  const snapshotFingerprint =
    await sha256(snapshotJson);

  const eligible =
    !alreadyActive &&
    blockers.length === 0;

  return {
    version: VERSION,
    evaluatedAt,
    citySlug,
    status: alreadyActive
      ? "ALREADY_ACTIVE"
      : eligible
        ? "ELIGIBLE"
        : "BLOCKED",
    eligible,
    blockers,
    checks,
    readinessStatus,
    current: {
      generatedAt,
      publicEngine,
      scene:
        publicScene,
      fingerprint:
        publicFingerprint,
      requestedMode:
        control.requestedMode,
      v24Approved:
        control.v24Approved
    },
    finalRelease: {
      id:
        finalRelease?.id ?? null,
      status:
        finalRelease?.status ?? null,
      currentGeneration:
        finalCurrent
    },
    rehearsal: {
      id:
        rehearsal?.id ?? null,
      status:
        rehearsal?.status ?? null,
      currentGeneration:
        rehearsalCurrent
    },
    candidate: {
      sceneId:
        candidateSceneId,
      sceneKey:
        candidateSceneKey,
      score:
        candidateScore,
      confidence:
        candidateConfidence,
      masterFileName:
        candidateMaster,
      masterAvailable
    },
    guard: {
      status:
        guardStatus,
      reason:
        guardReason,
      activationReadyForCutover:
        activationReady
    },
    legacyBackupAvailable,
    certificationWindow: {
      active:
        !!certificationWindow,
      currentGeneration:
        certificationWindowCurrent,
      windowId:
        certificationWindow?.window_id ?? null,
      expiresAt:
        certificationWindow?.expires_at ?? null
    },
    readinessFingerprint,
    snapshotJson,
    snapshotFingerprint
  };
}

export async function getGoLiveOverview(
  env: Env,
  citySlug: string
) {
  const eligibility =
    await evaluateGoLiveEligibility(
      env,
      citySlug
    );

  const challenge =
    await latestGoLiveChallenge(
      env.DB,
      citySlug
    );

  const recent =
    await latestGoLiveAudit(
      env.DB,
      citySlug
    );

  return {
    version: VERSION,
    eligibility,
    pendingChallenge:
      challenge?.status === "PENDING"
        ? {
            challengeId:
              challenge.challenge_id,
            createdAt:
              challenge.created_at,
            expiresAt:
              challenge.expires_at,
            confirmationPhrase:
              goLivePhrase(citySlug),
            scene24: {
              id:
                challenge.scene24_id,
              key:
                challenge.scene24_key,
              score:
                challenge.scene24_score,
              confidence:
                challenge.scene24_confidence,
              masterFileName:
                challenge.master_file_name
            }
          }
        : null,
    latestAudit: recent,
    safety: {
      installsWithoutActivation: true,
      readinessRequired:
        "READY_CANDIDATE",
      finalRcRequired:
        "FINAL_RC_PASS current generation",
      rehearsalRequired:
        "REHEARSAL_PASS current generation",
      generationGuardRequired:
        "PASS",
      doubleConfirmationRequired:
        true,
      immediateFreshGeneration:
        true,
      certificationWindowRequired:
        true,
      certificationWindowBlocksOtherGenerations:
        true,
      legacyRollbackAlwaysAvailable:
        true
    }
  };
}

export async function prepareGoLive(
  env: Env,
  citySlug: string
) {
  const eligibility =
    await evaluateGoLiveEligibility(
      env,
      citySlug
    );

  if (!eligibility.eligible) {
    await appendGoLiveAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "PREPARE_REFUSED",
        generatedAtBefore:
          eligibility.current.generatedAt,
        requestedModeBefore:
          eligibility.current.requestedMode,
        requestedModeAfter:
          eligibility.current.requestedMode,
        approvedBefore:
          eligibility.current.v24Approved,
        approvedAfter:
          eligibility.current.v24Approved,
        readinessStatus:
          eligibility.readinessStatus,
        readinessFingerprint:
          eligibility.readinessFingerprint,
        finalReleaseAuditId:
          eligibility.finalRelease.id,
        mobileRehearsalAuditId:
          eligibility.rehearsal.id,
        snapshotFingerprint:
          eligibility.snapshotFingerprint,
        snapshotJson:
          eligibility.snapshotJson,
        reason:
          eligibility.status ===
            "ALREADY_ACTIVE"
            ? "v24_already_active"
            : `go_live_blocked:${eligibility.blockers.join(",")}`
      }
    );

    return {
      ok: false as const,
      error:
        eligibility.status ===
          "ALREADY_ACTIVE"
          ? "v24_already_active"
          : "go_live_not_eligible",
      eligibility
    };
  }

  await cancelPendingGoLiveChallenges(
    env.DB,
    citySlug,
    "replaced_by_new_go_live_challenge"
  );

  const challengeId =
    crypto.randomUUID();
  const createdAt =
    new Date().toISOString();
  const expiresAt =
    new Date(
      Date.now() +
      CHALLENGE_TTL_MS
    ).toISOString();

  await createGoLiveChallenge(
    env.DB,
    {
      challengeId,
      citySlug,
      createdAt,
      expiresAt,
      forecastGeneratedAt:
        eligibility.current.generatedAt!,
      publicFingerprint:
        eligibility.current.fingerprint!,
      readinessStatus:
        eligibility.readinessStatus,
      readinessFingerprint:
        eligibility.readinessFingerprint!,
      finalReleaseAuditId:
        eligibility.finalRelease.id!,
      mobileRehearsalAuditId:
        eligibility.rehearsal.id!,
      scene24Id:
        eligibility.candidate.sceneId!,
      scene24Key:
        eligibility.candidate.sceneKey!,
      scene24Score:
        eligibility.candidate.score!,
      scene24Confidence:
        eligibility.candidate.confidence!,
      masterFileName:
        eligibility.candidate.masterFileName!,
      snapshotJson:
        eligibility.snapshotJson,
      snapshotFingerprint:
        eligibility.snapshotFingerprint
    }
  );

  await appendGoLiveAudit(
    env.DB,
    {
      citySlug,
      eventType:
        "PREPARED",
      challengeId,
      generatedAtBefore:
        eligibility.current.generatedAt,
      requestedModeBefore:
        eligibility.current.requestedMode,
      requestedModeAfter:
        eligibility.current.requestedMode,
      approvedBefore: false,
      approvedAfter: false,
      readinessStatus:
        eligibility.readinessStatus,
      readinessFingerprint:
        eligibility.readinessFingerprint,
      finalReleaseAuditId:
        eligibility.finalRelease.id,
      mobileRehearsalAuditId:
        eligibility.rehearsal.id,
      snapshotFingerprint:
        eligibility.snapshotFingerprint,
      snapshotJson:
        eligibility.snapshotJson,
      reason:
        "go_live_challenge_created"
    }
  );

  return {
    ok: true as const,
    challenge: {
      challengeId,
      createdAt,
      expiresAt,
      confirmationPhrase:
        goLivePhrase(citySlug),
      scene24:
        eligibility.candidate,
      generatedAt:
        eligibility.current.generatedAt,
      fingerprint:
        eligibility.snapshotFingerprint
    },
    eligibility
  };
}

async function safeCurrentIdentity(
  env: Env,
  citySlug: string
): Promise<{
  generatedAt: string | null;
  engine: string | null;
  scene: string | null;
  fingerprint: string | null;
}> {
  const forecast =
    await latestForecast(
      env.DB,
      citySlug
    );

  if (!forecast) {
    return {
      generatedAt: null,
      engine: null,
      scene: null,
      fingerprint: null
    };
  }

  const surface =
    await resolvePublicSurfaceSafely(
      env,
      forecast
    );

  if (
    surface.engine === "UNAVAILABLE" ||
    !surface.forecast
  ) {
    return {
      generatedAt:
        forecast.generatedAt,
      engine:
        "UNAVAILABLE",
      scene: null,
      fingerprint: null
    };
  }

  const identity =
    publicationIdentity(
      surface.forecast
    );

  return {
    generatedAt:
      identity?.generatedAt ??
      surface.forecast.generatedAt,
    engine:
      identity?.engine ??
      surface.engine,
    scene:
      identity?.scene ??
      String(
        surface.forecast.scene ?? ""
      ),
    fingerprint:
      identity?.fingerprint ?? null
  };
}

export async function confirmGoLiveAndActivate(
  env: Env,
  citySlug: string,
  args: {
    challengeId: string;
    confirmationPhrase: string;
    runFreshGeneration:
      () => Promise<LokaForecast>;
  }
): Promise<
  | {
      ok: true;
      status: "GO_LIVE_ACTIVE";
      challengeId: string;
      forecast: LokaForecast;
      publicIdentity: Awaited<
        ReturnType<
          typeof safeCurrentIdentity
        >
      >;
    }
  | {
      ok: false;
      status:
        | "GO_LIVE_REFUSED"
        | "GO_LIVE_ABORTED";
      error: string;
      rollback?: unknown;
      publicIdentity?: Awaited<
        ReturnType<
          typeof safeCurrentIdentity
        >
      >;
    }
> {
  const challenge =
    await getGoLiveChallenge(
      env.DB,
      citySlug,
      args.challengeId
    );

  if (
    !challenge ||
    challenge.status !== "PENDING"
  ) {
    await appendGoLiveAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "CONFIRM_REFUSED",
        challengeId:
          args.challengeId,
        reason:
          "go_live_challenge_not_pending"
      }
    );

    return {
      ok: false,
      status:
        "GO_LIVE_REFUSED",
      error:
        "go_live_challenge_not_pending"
    };
  }

  if (
    args.confirmationPhrase.trim() !==
    goLivePhrase(citySlug)
  ) {
    await appendGoLiveAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "CONFIRM_REFUSED",
        challengeId:
          challenge.challenge_id,
        generatedAtBefore:
          challenge.forecast_generated_at,
        readinessStatus:
          challenge.readiness_status,
        readinessFingerprint:
          challenge.readiness_fingerprint,
        finalReleaseAuditId:
          challenge.final_release_audit_id,
        mobileRehearsalAuditId:
          challenge.mobile_rehearsal_audit_id,
        snapshotFingerprint:
          challenge.snapshot_fingerprint,
        reason:
          "go_live_confirmation_phrase_mismatch"
      }
    );

    return {
      ok: false,
      status:
        "GO_LIVE_REFUSED",
      error:
        "go_live_confirmation_phrase_mismatch"
    };
  }

  const eligibility =
    await evaluateGoLiveEligibility(
      env,
      citySlug
    );

  if (
    !eligibility.eligible ||
    eligibility.snapshotFingerprint !==
      challenge.snapshot_fingerprint
  ) {
    await markGoLiveChallengeFailed(
      env.DB,
      challenge.challenge_id,
      "go_live_snapshot_changed"
    );

    await appendGoLiveAudit(
      env.DB,
      {
        citySlug,
        eventType:
          "CONFIRM_REFUSED",
        challengeId:
          challenge.challenge_id,
        generatedAtBefore:
          eligibility.current.generatedAt,
        requestedModeBefore:
          eligibility.current.requestedMode,
        requestedModeAfter:
          eligibility.current.requestedMode,
        approvedBefore:
          eligibility.current.v24Approved,
        approvedAfter:
          eligibility.current.v24Approved,
        readinessStatus:
          eligibility.readinessStatus,
        readinessFingerprint:
          eligibility.readinessFingerprint,
        finalReleaseAuditId:
          eligibility.finalRelease.id,
        mobileRehearsalAuditId:
          eligibility.rehearsal.id,
        snapshotFingerprint:
          eligibility.snapshotFingerprint,
        snapshotJson:
          eligibility.snapshotJson,
        reason:
          eligibility.eligible
            ? "go_live_snapshot_fingerprint_changed"
            : `go_live_no_longer_eligible:${eligibility.blockers.join(",")}`
      }
    );

    return {
      ok: false,
      status:
        "GO_LIVE_REFUSED",
      error:
        eligibility.eligible
          ? "go_live_snapshot_changed"
          : "go_live_no_longer_eligible"
    };
  }

  const control =
    await ensureEngineControl(
      env.DB,
      citySlug
    );

  await armGoLiveControl(
    env.DB,
    {
      citySlug,
      challenge,
      requestedModeBefore:
        control.requestedMode,
      approvedBefore:
        control.v24Approved
    }
  );

  await appendGoLiveAudit(
    env.DB,
    {
      citySlug,
      eventType:
        "ACTIVATION_STARTED",
      challengeId:
        challenge.challenge_id,
      generatedAtBefore:
        challenge.forecast_generated_at,
      requestedModeBefore:
        control.requestedMode,
      requestedModeAfter:
        "V24",
      approvedBefore:
        control.v24Approved,
      approvedAfter: true,
      readinessStatus:
        challenge.readiness_status,
      readinessFingerprint:
        challenge.readiness_fingerprint,
      finalReleaseAuditId:
        challenge.final_release_audit_id,
      mobileRehearsalAuditId:
        challenge.mobile_rehearsal_audit_id,
      snapshotFingerprint:
        challenge.snapshot_fingerprint,
      snapshotJson:
        challenge.snapshot_json,
      reason:
        "go_live_control_armed_fresh_generation_starting"
    }
  );

  let published:
    LokaForecast | null = null;
  let activationError:
    string | null = null;

  try {
    published =
      await args.runFreshGeneration();
  } catch (error) {
    activationError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  const publishedEngine =
    published
      ? asObj(
          published.diagnostics
            .sceneEngine
        )?.effectiveProduction
      : null;

  if (
    published &&
    publishedEngine === "V24"
  ) {
    const publicIdentity =
      await safeCurrentIdentity(
        env,
        citySlug
      );

    if (
      publicIdentity.engine === "V24" &&
      publicIdentity.generatedAt ===
        published.generatedAt &&
      publicIdentity.fingerprint
    ) {
      await markGoLiveChallengeConfirmed(
        env.DB,
        challenge.challenge_id
      );

      await appendGoLiveAudit(
        env.DB,
        {
          citySlug,
          eventType:
            "ACTIVATED",
          challengeId:
            challenge.challenge_id,
          generatedAtBefore:
            challenge.forecast_generated_at,
          generatedAtAfter:
            publicIdentity.generatedAt,
          requestedModeBefore:
            control.requestedMode,
          requestedModeAfter:
            "V24",
          approvedBefore:
            control.v24Approved,
          approvedAfter: true,
          effectiveEngineAfter:
            "V24",
          sceneKeyAfter:
            publicIdentity.scene,
          publicationFingerprintAfter:
            publicIdentity.fingerprint,
          readinessStatus:
            challenge.readiness_status,
          readinessFingerprint:
            challenge.readiness_fingerprint,
          finalReleaseAuditId:
            challenge.final_release_audit_id,
          mobileRehearsalAuditId:
            challenge.mobile_rehearsal_audit_id,
          snapshotFingerprint:
            challenge.snapshot_fingerprint,
          snapshotJson:
            challenge.snapshot_json,
          legacyRestoreRequired:
            false,
          legacyRestoreVerified:
            false,
          reason:
            "go_live_v24_publication_verified"
        }
      );

      try {
        await closeCertificationWindow(
          env.DB,
          citySlug,
          {
            status:
              "CONSUMED",
            reason:
              "go_live_12_13_activated",
            source:
              "go_live_12_13"
          }
        );
      } catch {
        // A window cleanup failure cannot invalidate an already verified
        // V24 cutover. The expired window will fail closed on future reuse.
      }

      return {
        ok: true,
        status:
          "GO_LIVE_ACTIVE",
        challengeId:
          challenge.challenge_id,
        forecast: published,
        publicIdentity
      };
    }

    activationError =
      `v24_public_surface_not_verified:${publicIdentity.engine ?? "null"}`;
  } else if (published) {
    const sceneEngine =
      asObj(
        published.diagnostics
          .sceneEngine
      );

    activationError =
      `fresh_generation_fell_back_to_legacy:${String(sceneEngine?.reason ?? "unknown")}`;
  }

  const rollback =
    await executeGlobalRollback(
      env.DB,
      citySlug,
      "bloc12_13_activation_abort"
    );

  await markGoLiveChallengeFailed(
    env.DB,
    challenge.challenge_id,
    activationError ??
      "go_live_activation_generation_failed"
  );

  const finalIdentity =
    await safeCurrentIdentity(
      env,
      citySlug
    );

  await appendGoLiveAudit(
    env.DB,
    {
      citySlug,
      eventType:
        "ACTIVATION_ABORTED",
      challengeId:
        challenge.challenge_id,
      generatedAtBefore:
        challenge.forecast_generated_at,
      generatedAtAfter:
        finalIdentity.generatedAt,
      requestedModeBefore:
        control.requestedMode,
      requestedModeAfter:
        "LEGACY",
      approvedBefore:
        control.v24Approved,
      approvedAfter: false,
      effectiveEngineAfter:
        finalIdentity.engine,
      sceneKeyAfter:
        finalIdentity.scene,
      publicationFingerprintAfter:
        finalIdentity.fingerprint,
      readinessStatus:
        challenge.readiness_status,
      readinessFingerprint:
        challenge.readiness_fingerprint,
      finalReleaseAuditId:
        challenge.final_release_audit_id,
      mobileRehearsalAuditId:
        challenge.mobile_rehearsal_audit_id,
      snapshotFingerprint:
        challenge.snapshot_fingerprint,
      snapshotJson:
        challenge.snapshot_json,
      legacyRestoreRequired:
        rollback.publicRestoreRequired,
      legacyRestoreVerified:
        rollback.publicRestoreVerified,
      reason:
        activationError ??
        "go_live_activation_generation_failed"
    }
  );

  try {
    await closeCertificationWindow(
      env.DB,
      citySlug,
      {
        status:
          "CONSUMED",
        reason:
          "go_live_12_13_aborted",
        source:
          "go_live_12_13"
      }
    );
  } catch {
    // Rollback result remains authoritative.
  }

  return {
    ok: false,
    status:
      "GO_LIVE_ABORTED",
    error:
      activationError ??
      "go_live_activation_generation_failed",
    rollback,
    publicIdentity:
      finalIdentity
  };
}
