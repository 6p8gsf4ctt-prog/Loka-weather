import type {
  Env,
  LokaForecast
} from "../types";
import type {
  EngineControlState
} from "./engineMode";
import {
  ensureEngineControl,
  requestV24Locked,
  requestV24Preview
} from "../storage/engineControl";
import {
  executeGlobalRollback
} from "../storage/globalRollback";
import {
  getV24ApprovalOverview
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
  latestFaultInjectionAudit
} from "../storage/faultAudit";
import {
  latestSceneCatalogAudit
} from "../storage/sceneCatalogAudit";

export type RollbackDrillStatus =
  | "PASS"
  | "FAIL"
  | "REFUSED";

export interface RollbackDrillStep {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  detail: string;
}

export interface RollbackDrillSnapshot {
  generatedAt: string | null;
  control: EngineControlState;
  publicEngine: "LEGACY" | "V24" | "UNAVAILABLE";
  scene: string | null;
  fingerprint: string | null;
}

export interface RollbackDrillReport {
  version: "12.10.0";
  runAt: string;
  citySlug: string;
  status: RollbackDrillStatus;

  before: RollbackDrillSnapshot;
  after: RollbackDrillSnapshot;

  steps: RollbackDrillStep[];

  summary: {
    previewStepVerified: boolean;
    lockedIntentStepVerified: boolean;
    rollbackVerified: boolean;
    publicIdentityUnchanged: boolean;
    forecastGenerationUnchanged: boolean;
    v24ApprovalNeverGranted: boolean;
    engineControlMutated: boolean;
    emergencyCleanupUsed: boolean;
  };

  safety: {
    productionForecastMutated: false;
    v24ApprovalGranted: false;
    engineControlWasTemporarilyMutated: boolean;
    finalRequestedMode: "LEGACY" | string;
    finalV24Approved: boolean;
    goLiveInstagram: false;
  };

  reason: string;
}

export function rollbackDrillPhrase(
  citySlug: string
): string {
  return `TESTER ROLLBACK ${citySlug.toUpperCase()}`;
}

function step(
  id: string,
  status: RollbackDrillStep["status"],
  detail: string
): RollbackDrillStep {
  return { id, status, detail };
}

async function snapshot(
  env: Env,
  citySlug: string
): Promise<RollbackDrillSnapshot> {
  const control = await ensureEngineControl(
    env.DB,
    citySlug
  );

  let forecast: LokaForecast | null = null;

  try {
    forecast = await latestForecast(
      env.DB,
      citySlug
    );
  } catch {
    forecast = null;
  }

  if (!forecast) {
    return {
      generatedAt: null,
      control,
      publicEngine: "UNAVAILABLE",
      scene: null,
      fingerprint: null
    };
  }

  const surface = await resolvePublicSurfaceSafely(
    env,
    forecast
  );

  if (
    surface.engine === "UNAVAILABLE" ||
    !surface.forecast
  ) {
    return {
      generatedAt: forecast.generatedAt,
      control,
      publicEngine: "UNAVAILABLE",
      scene: null,
      fingerprint: null
    };
  }

  const identity = publicationIdentity(
    surface.forecast
  );

  return {
    generatedAt: surface.forecast.generatedAt,
    control,
    publicEngine: surface.engine,
    scene:
      identity?.scene ??
      String(surface.forecast.scene ?? ""),
    fingerprint:
      identity?.fingerprint ?? null
  };
}

function samePublicIdentity(
  before: RollbackDrillSnapshot,
  after: RollbackDrillSnapshot
): boolean {
  return (
    before.generatedAt === after.generatedAt &&
    before.publicEngine === after.publicEngine &&
    before.scene === after.scene &&
    before.fingerprint === after.fingerprint
  );
}

function refusedReport(args: {
  runAt: string;
  citySlug: string;
  before: RollbackDrillSnapshot;
  steps: RollbackDrillStep[];
  reason: string;
}): RollbackDrillReport {
  return {
    version: "12.10.0",
    runAt: args.runAt,
    citySlug: args.citySlug,
    status: "REFUSED",
    before: args.before,
    after: args.before,
    steps: args.steps,
    summary: {
      previewStepVerified: false,
      lockedIntentStepVerified: false,
      rollbackVerified:
        args.before.control.requestedMode === "LEGACY" &&
        !args.before.control.v24Approved,
      publicIdentityUnchanged: true,
      forecastGenerationUnchanged: true,
      v24ApprovalNeverGranted:
        !args.before.control.v24Approved,
      engineControlMutated: false,
      emergencyCleanupUsed: false
    },
    safety: {
      productionForecastMutated: false,
      v24ApprovalGranted: false,
      engineControlWasTemporarilyMutated: false,
      finalRequestedMode:
        args.before.control.requestedMode,
      finalV24Approved:
        args.before.control.v24Approved,
      goLiveInstagram: false
    },
    reason: args.reason
  };
}

export async function runRollbackDrill(
  env: Env,
  citySlug: string,
  confirmationPhrase: string
): Promise<RollbackDrillReport> {
  const runAt = new Date().toISOString();
  const steps: RollbackDrillStep[] = [];
  const before = await snapshot(env, citySlug);

  if (
    confirmationPhrase !==
    rollbackDrillPhrase(citySlug)
  ) {
    steps.push(
      step(
        "confirmation_phrase",
        "FAIL",
        "Phrase de confirmation incorrecte."
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_confirmation_phrase_mismatch"
    });
  }

  steps.push(
    step(
      "confirmation_phrase",
      "PASS",
      "Confirmation explicite reçue."
    )
  );

  // This drill is intentionally only allowed from the safest possible state.
  if (
    before.control.requestedMode !== "LEGACY" ||
    before.control.v24Approved
  ) {
    steps.push(
      step(
        "safe_initial_control_state",
        "FAIL",
        `État requis LEGACY/non approuvé, observé ${before.control.requestedMode}/${before.control.v24Approved ? "APPROUVÉ" : "NON APPROUVÉ"}.`
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_requires_pristine_legacy_state"
    });
  }

  steps.push(
    step(
      "safe_initial_control_state",
      "PASS",
      "Départ LEGACY avec V24 non approuvé."
    )
  );

  if (
    before.publicEngine !== "LEGACY" ||
    !before.generatedAt ||
    !before.fingerprint
  ) {
    steps.push(
      step(
        "safe_initial_public_state",
        "FAIL",
        "Une génération publique Legacy manifestée est requise."
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_requires_safe_legacy_public_surface"
    });
  }

  steps.push(
    step(
      "safe_initial_public_state",
      "PASS",
      `${before.generatedAt} · ${before.scene} · fingerprint ${before.fingerprint.slice(0, 12)}…`
    )
  );

  // No pending approval challenge may be destroyed by the drill.
  const approval = await getV24ApprovalOverview(
    env.DB,
    citySlug
  );

  if (approval.pendingChallenge) {
    steps.push(
      step(
        "no_pending_approval_challenge",
        "FAIL",
        "Un challenge d'autorisation V24 est en attente."
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_pending_approval_challenge"
    });
  }

  steps.push(
    step(
      "no_pending_approval_challenge",
      "PASS",
      "Aucun challenge d'autorisation en attente."
    )
  );

  // Previous safety blocks must already have passed.
  const [faultAudit, sceneAudit] = await Promise.all([
    latestFaultInjectionAudit(env.DB, citySlug),
    latestSceneCatalogAudit(env.DB, citySlug)
  ]);

  if (!faultAudit || faultAudit.status !== "PASS") {
    steps.push(
      step(
        "bloc_12_8_pass",
        "FAIL",
        "Le dernier audit de panne 12.8 n'est pas PASS."
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_requires_bloc_12_8_pass"
    });
  }

  steps.push(
    step(
      "bloc_12_8_pass",
      "PASS",
      `Audit panne #${faultAudit.id} PASS.`
    )
  );

  if (!sceneAudit || sceneAudit.status !== "PASS") {
    steps.push(
      step(
        "bloc_12_9_pass",
        "FAIL",
        "Le dernier audit 24 scènes 12.9 n'est pas PASS."
      )
    );

    return refusedReport({
      runAt,
      citySlug,
      before,
      steps,
      reason: "rollback_drill_requires_bloc_12_9_pass"
    });
  }

  steps.push(
    step(
      "bloc_12_9_pass",
      "PASS",
      `Audit catalogue #${sceneAudit.id} PASS 24/24.`
    )
  );

  let previewStepVerified = false;
  let lockedIntentStepVerified = false;
  let rollbackVerified = false;
  let engineControlMutated = false;
  let emergencyCleanupUsed = false;
  let v24ApprovalEverGranted = false;
  let after = before;

  try {
    // STEP A — real Preview write.
    const previewState = await requestV24Preview(
      env.DB,
      citySlug
    );
    engineControlMutated = true;

    previewStepVerified =
      previewState.requestedMode === "V24_PREVIEW" &&
      previewState.v24Approved === false;

    v24ApprovalEverGranted =
      v24ApprovalEverGranted ||
      previewState.v24Approved;

    steps.push(
      step(
        "real_preview_write",
        previewStepVerified ? "PASS" : "FAIL",
        `engine_control = ${previewState.requestedMode}, approved=${previewState.v24Approved ? "OUI" : "NON"}.`
      )
    );

    if (!previewStepVerified) {
      throw new Error(
        "rollback_drill_preview_state_not_verified"
      );
    }

    const previewPublic = await snapshot(
      env,
      citySlug
    );

    const previewPublicSafe =
      samePublicIdentity(before, previewPublic) &&
      previewPublic.publicEngine === "LEGACY";

    steps.push(
      step(
        "preview_public_unchanged",
        previewPublicSafe ? "PASS" : "FAIL",
        previewPublicSafe
          ? "Le passage réel en V24_PREVIEW n'a modifié ni forecast ni surface publique."
          : "La surface publique a changé pendant le Preview."
      )
    );

    if (!previewPublicSafe) {
      throw new Error(
        "rollback_drill_preview_changed_public_surface"
      );
    }

    // STEP B — real authoritative rollback from Preview.
    const rollbackPreview =
      await executeGlobalRollback(
        env.DB,
        citySlug,
        "bloc12_10_preview_rollback_drill"
      );

    const rollbackPreviewVerified =
      rollbackPreview.authoritativeRollbackVerified &&
      rollbackPreview.after.requestedMode === "LEGACY" &&
      !rollbackPreview.after.v24Approved;

    steps.push(
      step(
        "rollback_from_preview",
        rollbackPreviewVerified ? "PASS" : "FAIL",
        `Retour ${rollbackPreview.after.requestedMode}, approved=${rollbackPreview.after.v24Approved ? "OUI" : "NON"}, audit=${rollbackPreview.approvalAuditRecorded ? "OK" : "NON BLOQUANT"}.`
      )
    );

    if (!rollbackPreviewVerified) {
      throw new Error(
        "rollback_drill_preview_rollback_failed"
      );
    }

    // STEP C — real unapproved V24 intent write.
    const lockedState = await requestV24Locked(
      env.DB,
      citySlug
    );

    lockedIntentStepVerified =
      lockedState.requestedMode === "V24" &&
      lockedState.v24Approved === false;

    v24ApprovalEverGranted =
      v24ApprovalEverGranted ||
      lockedState.v24Approved;

    steps.push(
      step(
        "real_locked_v24_intent",
        lockedIntentStepVerified ? "PASS" : "FAIL",
        `Intent réel ${lockedState.requestedMode}, approved=${lockedState.v24Approved ? "OUI" : "NON"}.`
      )
    );

    if (!lockedIntentStepVerified) {
      throw new Error(
        "rollback_drill_locked_intent_not_verified"
      );
    }

    const lockedPublic = await snapshot(
      env,
      citySlug
    );

    const lockedPublicSafe =
      samePublicIdentity(before, lockedPublic) &&
      lockedPublic.publicEngine === "LEGACY";

    steps.push(
      step(
        "locked_intent_public_unchanged",
        lockedPublicSafe ? "PASS" : "FAIL",
        lockedPublicSafe
          ? "L'intent V24 non approuvé n'a pas modifié la surface publique."
          : "La surface publique a changé pendant l'intent V24."
      )
    );

    if (!lockedPublicSafe) {
      throw new Error(
        "rollback_drill_locked_intent_changed_public_surface"
      );
    }

    // STEP D — actual global rollback path used by the Admin button.
    const rollbackLocked =
      await executeGlobalRollback(
        env.DB,
        citySlug,
        "bloc12_10_locked_intent_rollback_drill"
      );

    rollbackVerified =
      rollbackLocked.authoritativeRollbackVerified &&
      rollbackLocked.after.requestedMode === "LEGACY" &&
      !rollbackLocked.after.v24Approved;

    steps.push(
      step(
        "rollback_from_locked_v24",
        rollbackVerified ? "PASS" : "FAIL",
        `Rollback global réel => ${rollbackLocked.after.requestedMode}, approved=${rollbackLocked.after.v24Approved ? "OUI" : "NON"}.`
      )
    );

    if (!rollbackVerified) {
      throw new Error(
        "rollback_drill_global_rollback_failed"
      );
    }

    after = await snapshot(env, citySlug);
  } catch (error) {
    emergencyCleanupUsed = true;

    try {
      await executeGlobalRollback(
        env.DB,
        citySlug,
        "bloc12_10_emergency_cleanup"
      );

      steps.push(
        step(
          "emergency_cleanup",
          "PASS",
          "Nettoyage de secours : engine_control remis en LEGACY."
        )
      );
    } catch (cleanupError) {
      steps.push(
        step(
          "emergency_cleanup",
          "FAIL",
          `ÉCHEC CRITIQUE du nettoyage : ${
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError)
          }`
        )
      );
    }

    after = await snapshot(env, citySlug);

    return {
      version: "12.10.0",
      runAt,
      citySlug,
      status: "FAIL",
      before,
      after,
      steps: [
        ...steps,
        step(
          "drill_exception",
          "FAIL",
          error instanceof Error
            ? error.message
            : String(error)
        )
      ],
      summary: {
        previewStepVerified,
        lockedIntentStepVerified,
        rollbackVerified:
          after.control.requestedMode === "LEGACY" &&
          !after.control.v24Approved,
        publicIdentityUnchanged:
          samePublicIdentity(before, after),
        forecastGenerationUnchanged:
          before.generatedAt === after.generatedAt,
        v24ApprovalNeverGranted:
          !v24ApprovalEverGranted &&
          !after.control.v24Approved,
        engineControlMutated,
        emergencyCleanupUsed
      },
      safety: {
        productionForecastMutated: false,
        v24ApprovalGranted: false,
        engineControlWasTemporarilyMutated:
          engineControlMutated,
        finalRequestedMode:
          after.control.requestedMode,
        finalV24Approved:
          after.control.v24Approved,
        goLiveInstagram: false
      },
      reason: "rollback_drill_failed_but_cleanup_attempted"
    };
  }

  const publicIdentityUnchanged =
    samePublicIdentity(before, after);

  const forecastGenerationUnchanged =
    before.generatedAt === after.generatedAt;

  const finalControlSafe =
    after.control.requestedMode === "LEGACY" &&
    after.control.v24Approved === false;

  const v24ApprovalNeverGranted =
    !v24ApprovalEverGranted &&
    !after.control.v24Approved;

  steps.push(
    step(
      "final_control_state",
      finalControlSafe ? "PASS" : "FAIL",
      `Final : ${after.control.requestedMode}, approved=${after.control.v24Approved ? "OUI" : "NON"}.`
    )
  );

  steps.push(
    step(
      "forecast_never_regenerated",
      forecastGenerationUnchanged ? "PASS" : "FAIL",
      forecastGenerationUnchanged
        ? `generatedAt inchangé : ${before.generatedAt}.`
        : `${before.generatedAt} -> ${after.generatedAt}.`
    )
  );

  steps.push(
    step(
      "public_identity_unchanged",
      publicIdentityUnchanged ? "PASS" : "FAIL",
      publicIdentityUnchanged
        ? "Moteur public, scène et fingerprint strictement inchangés."
        : "L'identité publique a changé pendant le drill."
    )
  );

  steps.push(
    step(
      "approval_never_granted",
      v24ApprovalNeverGranted ? "PASS" : "FAIL",
      v24ApprovalNeverGranted
        ? "Aucune approbation V24 n'a existé pendant le test."
        : "Une approbation V24 a été observée."
    )
  );

  const passed =
    previewStepVerified &&
    lockedIntentStepVerified &&
    rollbackVerified &&
    finalControlSafe &&
    publicIdentityUnchanged &&
    forecastGenerationUnchanged &&
    v24ApprovalNeverGranted;

  return {
    version: "12.10.0",
    runAt,
    citySlug,
    status: passed ? "PASS" : "FAIL",
    before,
    after,
    steps,
    summary: {
      previewStepVerified,
      lockedIntentStepVerified,
      rollbackVerified,
      publicIdentityUnchanged,
      forecastGenerationUnchanged,
      v24ApprovalNeverGranted,
      engineControlMutated,
      emergencyCleanupUsed
    },
    safety: {
      productionForecastMutated: false,
      v24ApprovalGranted: false,
      engineControlWasTemporarilyMutated:
        engineControlMutated,
      finalRequestedMode:
        after.control.requestedMode,
      finalV24Approved:
        after.control.v24Approved,
      goLiveInstagram: false
    },
    reason: passed
      ? "real_global_rollback_drill_verified"
      : "rollback_drill_postconditions_failed"
  };
}
