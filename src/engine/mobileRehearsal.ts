import type {
  Env,
  LokaForecast
} from "../types";
import {
  ensureEngineControl,
  requestV24Preview
} from "../storage/engineControl";
import {
  getV24ApprovalOverview
} from "../storage/engineApproval";
import {
  latestForecast
} from "../storage/db";
import {
  executeGlobalRollback
} from "../storage/globalRollback";
import {
  latestFinalReleaseAudit
} from "../storage/finalReleaseAudit";
import {
  resolvePublicSurfaceSafely
} from "./publicFailSafe";
import {
  publicationIdentity
} from "./publicationManifest";
import {
  buildV24PublicPayloadPreview
} from "./publicPreview";
import {
  verifyV24MasterAsset
} from "./masterAsset";

export type MobileRehearsalStatus =
  | "REHEARSAL_PASS"
  | "REHEARSAL_FAIL"
  | "REHEARSAL_REFUSED";

export type MobileRehearsalSurface =
  | "api_latest"
  | "api_decision"
  | "dashboard"
  | "instagram"
  | "preview_dashboard"
  | "preview_instagram";

export interface MobileRehearsalObservation {
  surface: MobileRehearsalSurface;
  status: number;

  publicationVersion: string | null;
  generatedAt: string | null;
  engine: string | null;
  scene: string | null;
  fingerprint: string | null;

  previewVersion: string | null;
  previewGeneratedAt: string | null;
  previewScene: string | null;
  previewMode: string | null;
}

export interface MobileRehearsalSnapshot {
  generatedAt: string | null;
  publicEngine: "LEGACY" | "V24" | "UNAVAILABLE";
  scene: string | null;
  fingerprint: string | null;
  requestedMode: string;
  v24Approved: boolean;
}

export interface MobileRehearsalCheck {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  detail: string;
}

export interface MobileRehearsalReport {
  version: "12.12.0";
  runAt: string;
  citySlug: string;
  status: MobileRehearsalStatus;

  finalReleaseAuditId: number | null;

  before: MobileRehearsalSnapshot;
  after: MobileRehearsalSnapshot;

  preview: {
    generatedAt: string | null;
    sceneId: number | null;
    sceneKey: string | null;
    masterFileName: string | null;
    masterUrl: string | null;
  };

  checks: MobileRehearsalCheck[];
  observations: MobileRehearsalObservation[];

  summary: {
    publicSurfacesVerified: boolean;
    previewDashboardVerified: boolean;
    previewInstagramVerified: boolean;
    previewMasterVerified: boolean;
    rollbackVerified: boolean;
    finalControlLegacy: boolean;
    publicIdentityUnchanged: boolean;
    forecastGenerationUnchanged: boolean;
    v24ApprovalNeverGranted: boolean;
    engineControlTemporarilyMutated: boolean;
  };

  safety: {
    productionForecastMutated: false;
    v24ApprovalGranted: false;
    engineControlTemporarilyMutated: boolean;
    goLiveInstagram: false;
    nextBlock: "12.13";
  };

  reason: string;
}

export interface MobileRehearsalPreparation {
  version: "12.12.0";
  citySlug: string;
  finalReleaseAuditId: number;
  before: MobileRehearsalSnapshot;
  preview: {
    generatedAt: string;
    sceneId: number;
    sceneKey: string;
    label: string;
    masterFileName: string;
    masterUrl: string;
  };
  control: {
    requestedMode: "V24_PREVIEW";
    v24Approved: false;
  };
  safety: {
    productionRemainsLegacy: true;
    v24ApprovalGranted: false;
    previewOnly: true;
  };
}

const PUBLIC_SURFACES: MobileRehearsalSurface[] = [
  "api_latest",
  "api_decision",
  "dashboard",
  "instagram"
];

export function mobileRehearsalPhrase(
  citySlug: string
): string {
  return `REPETER LOKA ${citySlug.toUpperCase()}`;
}

function check(
  id: string,
  passed: boolean,
  detail: string
): MobileRehearsalCheck {
  return {
    id,
    status: passed ? "PASS" : "FAIL",
    detail
  };
}

async function snapshot(
  env: Env,
  citySlug: string
): Promise<MobileRehearsalSnapshot> {
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
      publicEngine: "UNAVAILABLE",
      scene: null,
      fingerprint: null,
      requestedMode: control.requestedMode,
      v24Approved: control.v24Approved
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
      publicEngine: "UNAVAILABLE",
      scene: null,
      fingerprint: null,
      requestedMode: control.requestedMode,
      v24Approved: control.v24Approved
    };
  }

  const identity = publicationIdentity(
    surface.forecast
  );

  return {
    generatedAt:
      identity?.generatedAt ??
      surface.forecast.generatedAt,
    publicEngine: surface.engine,
    scene:
      identity?.scene ??
      String(surface.forecast.scene ?? ""),
    fingerprint:
      identity?.fingerprint ?? null,
    requestedMode: control.requestedMode,
    v24Approved: control.v24Approved
  };
}

function samePublicIdentity(
  before: MobileRehearsalSnapshot,
  after: MobileRehearsalSnapshot
): boolean {
  return (
    before.generatedAt === after.generatedAt &&
    before.publicEngine === after.publicEngine &&
    before.scene === after.scene &&
    before.fingerprint === after.fingerprint
  );
}

async function currentPreview(
  env: Env,
  citySlug: string
) {
  const forecast = await latestForecast(
    env.DB,
    citySlug
  );

  if (!forecast) {
    throw new Error("mobile_rehearsal_no_forecast");
  }

  const payload =
    buildV24PublicPayloadPreview(
      forecast
    );

  const master = await verifyV24MasterAsset(
    env,
    payload.scene.masterUrl
  );

  return {
    forecast,
    payload,
    master
  };
}

async function assertFinalRcExact(
  env: Env,
  citySlug: string,
  before: MobileRehearsalSnapshot
) {
  const finalAudit =
    await latestFinalReleaseAudit(
      env.DB,
      citySlug
    );

  if (
    !finalAudit ||
    finalAudit.status !== "FINAL_RC_PASS" ||
    !finalAudit.rehearsalEligible
  ) {
    throw new Error(
      "mobile_rehearsal_requires_final_rc_pass"
    );
  }

  if (
    finalAudit.generatedAt !== before.generatedAt ||
    finalAudit.effectiveEngine !== before.publicEngine ||
    finalAudit.sceneKey !== before.scene ||
    finalAudit.publicationFingerprint !== before.fingerprint
  ) {
    throw new Error(
      "mobile_rehearsal_final_rc_not_current_generation"
    );
  }

  return finalAudit;
}

export async function prepareMobileRehearsal(
  env: Env,
  citySlug: string,
  confirmationPhrase: string
): Promise<MobileRehearsalPreparation> {
  if (
    confirmationPhrase !==
    mobileRehearsalPhrase(citySlug)
  ) {
    throw new Error(
      "mobile_rehearsal_confirmation_phrase_mismatch"
    );
  }

  const before = await snapshot(
    env,
    citySlug
  );

  if (
    before.requestedMode !== "LEGACY" ||
    before.v24Approved ||
    before.publicEngine !== "LEGACY" ||
    !before.generatedAt ||
    !before.fingerprint
  ) {
    throw new Error(
      "mobile_rehearsal_requires_pristine_legacy_state"
    );
  }

  const approval =
    await getV24ApprovalOverview(
      env.DB,
      citySlug
    );

  if (approval.pendingChallenge) {
    throw new Error(
      "mobile_rehearsal_pending_v24_challenge"
    );
  }

  const finalAudit =
    await assertFinalRcExact(
      env,
      citySlug,
      before
    );

  // Validate the candidate and physical master BEFORE touching engine_control.
  const preview =
    await currentPreview(
      env,
      citySlug
    );

  if (!preview.master.available) {
    throw new Error(
      `mobile_rehearsal_master_unavailable:${preview.master.reason}`
    );
  }

  const control = await requestV24Preview(
    env.DB,
    citySlug
  );

  if (
    control.requestedMode !== "V24_PREVIEW" ||
    control.v24Approved
  ) {
    try {
      await executeGlobalRollback(
        env.DB,
        citySlug,
        "bloc12_12_prepare_cleanup"
      );
    } catch {
      // Surface the original verification error; Admin remains able to rollback.
    }

    throw new Error(
      "mobile_rehearsal_preview_control_not_verified"
    );
  }

  return {
    version: "12.12.0",
    citySlug,
    finalReleaseAuditId:
      finalAudit.id,
    before,
    preview: {
      generatedAt:
        preview.payload.generatedAt,
      sceneId:
        preview.payload.scene.id,
      sceneKey:
        preview.payload.scene.key,
      label:
        preview.payload.scene.label,
      masterFileName:
        preview.payload.scene.masterFileName,
      masterUrl:
        preview.payload.scene.masterUrl
    },
    control: {
      requestedMode: "V24_PREVIEW",
      v24Approved: false
    },
    safety: {
      productionRemainsLegacy: true,
      v24ApprovalGranted: false,
      previewOnly: true
    }
  };
}

function observationFor(
  observations: MobileRehearsalObservation[],
  surface: MobileRehearsalSurface
): MobileRehearsalObservation | null {
  return observations.find(
    (item) => item.surface === surface
  ) ?? null;
}

function publicObservationValid(
  item: MobileRehearsalObservation | null,
  expected: MobileRehearsalSnapshot
): boolean {
  return !!item &&
    item.status >= 200 &&
    item.status < 300 &&
    item.publicationVersion === "12.6.0" &&
    item.generatedAt === expected.generatedAt &&
    item.engine === "LEGACY" &&
    item.scene === expected.scene &&
    item.fingerprint === expected.fingerprint;
}

function previewObservationValid(
  item: MobileRehearsalObservation | null,
  expected: {
    generatedAt: string;
    sceneKey: string;
  }
): boolean {
  return !!item &&
    item.status >= 200 &&
    item.status < 300 &&
    item.previewVersion === "12.12.0" &&
    item.previewGeneratedAt === expected.generatedAt &&
    item.previewScene === expected.sceneKey &&
    item.previewMode === "V24_PREVIEW";
}

export async function completeMobileRehearsal(
  env: Env,
  citySlug: string,
  observations: MobileRehearsalObservation[]
): Promise<MobileRehearsalReport> {
  const runAt = new Date().toISOString();
  const checks: MobileRehearsalCheck[] = [];

  const before = await snapshot(
    env,
    citySlug
  );

  // At completion we must still be in Preview, never approved, with public Legacy.
  const previewControlSafe =
    before.requestedMode === "V24_PREVIEW" &&
    !before.v24Approved &&
    before.publicEngine === "LEGACY" &&
    !!before.generatedAt &&
    !!before.fingerprint;

  checks.push(
    check(
      "preview_control_safe",
      previewControlSafe,
      `requested=${before.requestedMode} · approved=${before.v24Approved ? "OUI" : "NON"} · public=${before.publicEngine}.`
    )
  );

  let finalReleaseAuditId: number | null = null;
  let finalRcExact = false;

  try {
    const finalAudit =
      await assertFinalRcExact(
        env,
        citySlug,
        before
      );
    finalReleaseAuditId = finalAudit.id;
    finalRcExact = true;
  } catch (error) {
    checks.push(
      check(
        "final_rc_exact",
        false,
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  if (finalRcExact) {
    checks.push(
      check(
        "final_rc_exact",
        true,
        `FINAL_RC_PASS #${finalReleaseAuditId} correspond exactement à la génération courante.`
      )
    );
  }

  let preview = {
    generatedAt: null as string | null,
    sceneId: null as number | null,
    sceneKey: null as string | null,
    masterFileName: null as string | null,
    masterUrl: null as string | null
  };

  let previewMasterVerified = false;

  try {
    const current =
      await currentPreview(
        env,
        citySlug
      );

    preview = {
      generatedAt:
        current.payload.generatedAt,
      sceneId:
        current.payload.scene.id,
      sceneKey:
        current.payload.scene.key,
      masterFileName:
        current.payload.scene.masterFileName,
      masterUrl:
        current.payload.scene.masterUrl
    };

    previewMasterVerified =
      current.master.checked &&
      current.master.available;

    checks.push(
      check(
        "preview_master",
        previewMasterVerified,
        previewMasterVerified
          ? `${current.payload.scene.masterFileName} accessible.`
          : `${current.master.reason}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "preview_master",
        false,
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  const publicSurfacesVerified =
    PUBLIC_SURFACES.every(
      (surface) =>
        publicObservationValid(
          observationFor(
            observations,
            surface
          ),
          before
        )
    );

  checks.push(
    check(
      "public_surfaces_during_preview",
      publicSurfacesVerified,
      publicSurfacesVerified
        ? "Les 4 surfaces officielles sont restées sur la même génération Legacy pendant V24_PREVIEW."
        : "Au moins une surface officielle ne correspond pas à l'identité Legacy attendue."
    )
  );

  const previewDashboardVerified =
    !!preview.generatedAt &&
    !!preview.sceneKey &&
    previewObservationValid(
      observationFor(
        observations,
        "preview_dashboard"
      ),
      {
        generatedAt: preview.generatedAt,
        sceneKey: preview.sceneKey
      }
    );

  checks.push(
    check(
      "preview_dashboard",
      previewDashboardVerified,
      previewDashboardVerified
        ? "Dashboard V24 de prépublication reçu et identifié."
        : "Dashboard V24 de prépublication non vérifié."
    )
  );

  const previewInstagramVerified =
    !!preview.generatedAt &&
    !!preview.sceneKey &&
    previewObservationValid(
      observationFor(
        observations,
        "preview_instagram"
      ),
      {
        generatedAt: preview.generatedAt,
        sceneKey: preview.sceneKey
      }
    );

  checks.push(
    check(
      "preview_instagram",
      previewInstagramVerified,
      previewInstagramVerified
        ? "Studio Instagram V24 de prépublication reçu et identifié."
        : "Studio Instagram V24 de prépublication non vérifié."
    )
  );

  let rollbackVerified = false;
  let rollbackError: string | null = null;

  try {
    const rollback =
      await executeGlobalRollback(
        env.DB,
        citySlug,
        "bloc12_12_mobile_rehearsal_complete"
      );

    rollbackVerified =
      rollback.authoritativeRollbackVerified &&
      rollback.after.requestedMode === "LEGACY" &&
      rollback.after.v24Approved === false;
  } catch (error) {
    rollbackError =
      error instanceof Error
        ? error.message
        : String(error);
  }

  checks.push(
    check(
      "global_rollback",
      rollbackVerified,
      rollbackVerified
        ? "Rollback global officiel vérifié."
        : `Rollback non vérifié : ${rollbackError ?? "unknown"}.`
    )
  );

  const after = await snapshot(
    env,
    citySlug
  );

  const finalControlLegacy =
    after.requestedMode === "LEGACY" &&
    after.v24Approved === false;

  const publicIdentityUnchanged =
    samePublicIdentity(
      before,
      after
    );

  const forecastGenerationUnchanged =
    before.generatedAt === after.generatedAt;

  const v24ApprovalNeverGranted =
    !before.v24Approved &&
    !after.v24Approved;

  checks.push(
    check(
      "final_control",
      finalControlLegacy,
      `Final requested=${after.requestedMode} · approved=${after.v24Approved ? "OUI" : "NON"}.`
    )
  );

  checks.push(
    check(
      "public_identity_unchanged",
      publicIdentityUnchanged,
      publicIdentityUnchanged
        ? "Génération, moteur, scène et fingerprint publics inchangés."
        : "L'identité publique a changé pendant la répétition."
    )
  );

  checks.push(
    check(
      "forecast_generation_unchanged",
      forecastGenerationUnchanged,
      forecastGenerationUnchanged
        ? `generatedAt inchangé : ${before.generatedAt}.`
        : `${before.generatedAt} -> ${after.generatedAt}.`
    )
  );

  checks.push(
    check(
      "v24_approval_never_granted",
      v24ApprovalNeverGranted,
      v24ApprovalNeverGranted
        ? "Aucune approbation V24 n'a existé."
        : "Une approbation V24 a été observée."
    )
  );

  const passed =
    previewControlSafe &&
    finalRcExact &&
    previewMasterVerified &&
    publicSurfacesVerified &&
    previewDashboardVerified &&
    previewInstagramVerified &&
    rollbackVerified &&
    finalControlLegacy &&
    publicIdentityUnchanged &&
    forecastGenerationUnchanged &&
    v24ApprovalNeverGranted;

  return {
    version: "12.12.0",
    runAt,
    citySlug,
    status:
      passed
        ? "REHEARSAL_PASS"
        : "REHEARSAL_FAIL",
    finalReleaseAuditId,
    before,
    after,
    preview,
    checks,
    observations,
    summary: {
      publicSurfacesVerified,
      previewDashboardVerified,
      previewInstagramVerified,
      previewMasterVerified,
      rollbackVerified,
      finalControlLegacy,
      publicIdentityUnchanged,
      forecastGenerationUnchanged,
      v24ApprovalNeverGranted,
      engineControlTemporarilyMutated: true
    },
    safety: {
      productionForecastMutated: false,
      v24ApprovalGranted: false,
      engineControlTemporarilyMutated: true,
      goLiveInstagram: false,
      nextBlock: "12.13"
    },
    reason:
      passed
        ? "full_mobile_rehearsal_pass"
        : "full_mobile_rehearsal_failed"
  };
}

export async function cleanupMobileRehearsal(
  env: Env,
  citySlug: string
) {
  return executeGlobalRollback(
    env.DB,
    citySlug,
    "bloc12_12_mobile_rehearsal_cleanup"
  );
}
