import type {
  Env,
  LokaForecast
} from "../types";
import {
  ensureEngineControl
} from "../storage/engineControl";
import {
  latestForecast
} from "../storage/db";
import {
  loadShadowMetricRows
} from "../storage/shadowMetrics";
import {
  evaluateV24Readiness
} from "../analytics/readiness";
import {
  resolvePublicSurfaceSafely
} from "./publicFailSafe";
import {
  publicationIdentity,
  verifyPublicationManifest
} from "./publicationManifest";
import {
  loadLegacyPublicBackup
} from "../storage/publicationSafety";
import {
  evaluateGoLiveEligibility
} from "./goLive13";
import {
  recentProductionSupervisorAudits
} from "../storage/productionSupervisor";

type Obj = Record<string, unknown>;

const VERSION = "12.14.0" as const;
const STABLE_V24_GENERATIONS = 6;

export type ProductionSupervisorStatus =
  | "WAITING_READINESS"
  | "RECERTIFICATION_REQUIRED"
  | "GO_LIVE_ELIGIBLE"
  | "PRE_GO_LIVE_BLOCKED"
  | "V24_LIVE_HEALTHY"
  | "V24_LIVE_STABLE"
  | "V24_LIVE_WATCH"
  | "ROLLBACK_RECOMMENDED"
  | "UNAVAILABLE";

export interface ProductionSupervisorCheck {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  detail: string;
}

export interface ProductionSupervisorReport {
  version: "12.14.0";
  evaluatedAt: string;
  citySlug: string;
  generatedAt: string | null;
  phase: "PRE_GO_LIVE" | "V24_LIVE";
  status: ProductionSupervisorStatus;

  publicEngine: string | null;
  requestedMode: string;
  v24Approved: boolean;
  sceneKey: string | null;
  publicationFingerprint: string | null;
  readinessStatus: string;

  finalRcCurrent: boolean;
  rehearsalCurrent: boolean;
  goLiveEligible: boolean;

  guardStatus: string;
  fallbackDetected: boolean;
  legacyBackupAvailable: boolean;
  consecutiveV24Generations: number;

  checks: ProductionSupervisorCheck[];
  recommendation: string;

  safety: {
    productionMutated: false;
    autoRollbackTriggered: false;
    globalRollbackRemainsSeparate: true;
  };
}

function asObj(value: unknown): Obj | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value as Obj
      : null;
}

function check(
  id: string,
  passed: boolean,
  detail: string,
  informational = false
): ProductionSupervisorCheck {
  return {
    id,
    status: informational
      ? "INFO"
      : passed
        ? "PASS"
        : "FAIL",
    detail
  };
}

function leadingHealthyV24(
  rows: Awaited<ReturnType<typeof recentProductionSupervisorAudits>>,
  currentGeneratedAt: string | null
): number {
  let count = 0;

  for (const row of rows) {
    if (
      currentGeneratedAt &&
      row.generatedAt === currentGeneratedAt
    ) {
      continue;
    }

    if (
      row.phase === "V24_LIVE" &&
      (
        row.status === "V24_LIVE_HEALTHY" ||
        row.status === "V24_LIVE_STABLE"
      ) &&
      row.publicEngine === "V24" &&
      !row.fallbackDetected
    ) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}

function leadingFallbacks(
  rows: Awaited<ReturnType<typeof recentProductionSupervisorAudits>>,
  currentGeneratedAt: string | null
): number {
  let count = 0;

  for (const row of rows) {
    if (
      currentGeneratedAt &&
      row.generatedAt === currentGeneratedAt
    ) {
      continue;
    }

    if (
      row.phase === "V24_LIVE" &&
      row.fallbackDetected
    ) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}

export async function evaluateProductionSupervisor(
  env: Env,
  citySlug: string
): Promise<ProductionSupervisorReport> {
  const evaluatedAt = new Date().toISOString();
  const checks: ProductionSupervisorCheck[] = [];

  const control = await ensureEngineControl(
    env.DB,
    citySlug
  );

  const forecast = await latestForecast(
    env.DB,
    citySlug
  );

  if (!forecast) {
    return {
      version: VERSION,
      evaluatedAt,
      citySlug,
      generatedAt: null,
      phase: "PRE_GO_LIVE",
      status: "UNAVAILABLE",
      publicEngine: null,
      requestedMode: control.requestedMode,
      v24Approved: control.v24Approved,
      sceneKey: null,
      publicationFingerprint: null,
      readinessStatus: "UNAVAILABLE",
      finalRcCurrent: false,
      rehearsalCurrent: false,
      goLiveEligible: false,
      guardStatus: "UNAVAILABLE",
      fallbackDetected: false,
      legacyBackupAvailable: false,
      consecutiveV24Generations: 0,
      checks: [
        check(
          "forecast_available",
          false,
          "Aucun forecast public courant."
        )
      ],
      recommendation:
        "Aucune décision de production ne doit être prise tant qu'un forecast sûr n'est pas disponible.",
      safety: {
        productionMutated: false,
        autoRollbackTriggered: false,
        globalRollbackRemainsSeparate: true
      }
    };
  }

  const surface = await resolvePublicSurfaceSafely(
    env,
    forecast
  );

  const publicForecast =
    surface.engine !== "UNAVAILABLE" &&
    surface.forecast
      ? surface.forecast
      : null;

  const identity = publicForecast
    ? publicationIdentity(publicForecast)
    : null;

  const generatedAt =
    identity?.generatedAt ??
    publicForecast?.generatedAt ??
    forecast.generatedAt;

  const publicEngine =
    identity?.engine ??
    (surface.engine === "UNAVAILABLE"
      ? "UNAVAILABLE"
      : surface.engine);

  const sceneKey =
    identity?.scene ??
    (publicForecast
      ? String(publicForecast.scene ?? "")
      : null);

  const publicationFingerprint =
    identity?.fingerprint ?? null;

  let readinessStatus = "UNAVAILABLE";
  try {
    const rows = await loadShadowMetricRows(
      env.DB,
      citySlug,
      30,
      1000
    );
    readinessStatus =
      evaluateV24Readiness(rows).status;
  } catch {
    readinessStatus = "UNAVAILABLE";
  }

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

  const recent = await recentProductionSupervisorAudits(
    env.DB,
    citySlug,
    12
  );

  const isV24Armed =
    control.requestedMode === "V24" &&
    control.v24Approved;

  // --------------------------------------------------------------
  // PRE GO LIVE
  // --------------------------------------------------------------
  if (!isV24Armed) {
    const goLive = await evaluateGoLiveEligibility(
      env,
      citySlug
    );

    checks.push(
      check(
        "public_legacy",
        publicEngine === "LEGACY",
        `public=${publicEngine ?? "UNAVAILABLE"}.`
      ),
      check(
        "readiness",
        goLive.readinessStatus === "READY_CANDIDATE",
        goLive.readinessStatus
      ),
      check(
        "final_rc_current",
        goLive.finalRelease.currentGeneration,
        goLive.finalRelease.currentGeneration
          ? `PASS #${goLive.finalRelease.id}`
          : "Preuve FINAL_RC absente ou périmée."
      ),
      check(
        "rehearsal_current",
        goLive.rehearsal.currentGeneration,
        goLive.rehearsal.currentGeneration
          ? `PASS #${goLive.rehearsal.id}`
          : "Preuve REHEARSAL absente ou périmée."
      ),
      check(
        "legacy_backup",
        legacyBackupAvailable,
        legacyBackupAvailable
          ? "Backup Legacy disponible."
          : "Backup Legacy indisponible."
      )
    );

    let status: ProductionSupervisorStatus;
    let recommendation: string;

    if (goLive.readinessStatus !== "READY_CANDIDATE") {
      status = "WAITING_READINESS";
      recommendation =
        "Continuer Shadow. Ne pas refaire la chaîne 12.8→12.12 à chaque génération : attendre READY_CANDIDATE, puis recertifier une seule génération courante.";
    } else if (
      !goLive.finalRelease.currentGeneration ||
      !goLive.rehearsal.currentGeneration
    ) {
      status = "RECERTIFICATION_REQUIRED";
      recommendation =
        "READY_CANDIDATE est atteint. Sur une seule génération courante, exécuter 12.8 → 12.9 → 12.10 → 12.11 → 12.12, puis revenir immédiatement au 12.13.";
    } else if (goLive.eligible) {
      status = "GO_LIVE_ELIGIBLE";
      recommendation =
        "Tous les contrôles sont alignés. Le GO LIVE 12.13 peut être préparé, avec double confirmation humaine.";
    } else {
      status = "PRE_GO_LIVE_BLOCKED";
      recommendation =
        `GO LIVE toujours bloqué : ${goLive.blockers.join(", ") || "cause non déterminée"}.`;
    }

    return {
      version: VERSION,
      evaluatedAt,
      citySlug,
      generatedAt,
      phase: "PRE_GO_LIVE",
      status,
      publicEngine,
      requestedMode: control.requestedMode,
      v24Approved: control.v24Approved,
      sceneKey,
      publicationFingerprint,
      readinessStatus: goLive.readinessStatus,
      finalRcCurrent:
        goLive.finalRelease.currentGeneration,
      rehearsalCurrent:
        goLive.rehearsal.currentGeneration,
      goLiveEligible: goLive.eligible,
      guardStatus: goLive.guard.status,
      fallbackDetected: false,
      legacyBackupAvailable,
      consecutiveV24Generations: 0,
      checks,
      recommendation,
      safety: {
        productionMutated: false,
        autoRollbackTriggered: false,
        globalRollbackRemainsSeparate: true
      }
    };
  }

  // --------------------------------------------------------------
  // V24 LIVE / ARMED
  // --------------------------------------------------------------
  const sceneEngine = asObj(
    forecast.diagnostics.sceneEngine
  );
  const guard = asObj(
    forecast.diagnostics.v24ActivationGuard
  );

  const effectiveProduction =
    typeof sceneEngine?.effectiveProduction === "string"
      ? sceneEngine.effectiveProduction
      : publicEngine;

  const guardStatus =
    typeof guard?.status === "string"
      ? guard.status
      : "UNAVAILABLE";

  const fallbackDetected =
    effectiveProduction !== "V24" ||
    publicEngine !== "V24";

  let manifestValid = false;
  let manifestReason = "manifest_unavailable";

  if (publicForecast) {
    try {
      const manifest = await verifyPublicationManifest(
        publicForecast
      );
      manifestValid = manifest.valid;
      manifestReason = manifest.reason;
    } catch (error) {
      manifestValid = false;
      manifestReason =
        error instanceof Error
          ? error.message
          : String(error);
    }
  }

  checks.push(
    check(
      "v24_control_armed",
      isV24Armed,
      `requested=${control.requestedMode} · approved=${control.v24Approved ? "OUI" : "NON"}.`
    ),
    check(
      "public_engine_v24",
      publicEngine === "V24",
      `public=${publicEngine ?? "UNAVAILABLE"}.`
    ),
    check(
      "generation_guard",
      guardStatus === "PASS",
      `guard=${guardStatus}.`
    ),
    check(
      "publication_manifest",
      manifestValid,
      manifestReason
    ),
    check(
      "legacy_backup",
      legacyBackupAvailable,
      legacyBackupAvailable
        ? "Backup Legacy disponible pour rollback."
        : "Backup Legacy indisponible."
    )
  );

  const priorHealthy = leadingHealthyV24(
    recent,
    generatedAt
  );

  const consecutiveV24Generations =
    !fallbackDetected &&
    guardStatus === "PASS" &&
    manifestValid &&
    legacyBackupAvailable
      ? priorHealthy + 1
      : 0;

  const priorFallbacks = leadingFallbacks(
    recent,
    generatedAt
  );

  let status: ProductionSupervisorStatus;
  let recommendation: string;

  if (
    publicEngine === "UNAVAILABLE" ||
    !manifestValid ||
    !legacyBackupAvailable ||
    (
      fallbackDetected &&
      priorFallbacks >= 1
    )
  ) {
    status = "ROLLBACK_RECOMMENDED";
    recommendation =
      "État V24 non suffisamment sûr. Utiliser le rollback global Admin et analyser les audits avant toute nouvelle activation.";
  } else if (fallbackDetected) {
    status = "V24_LIVE_WATCH";
    recommendation =
      "Un fallback de génération a été observé. Conserver la séparation prévue : fallback local maintenant, rollback global seulement si le problème se répète ou si l'opérateur le décide.";
  } else if (
    guardStatus !== "PASS"
  ) {
    status = "ROLLBACK_RECOMMENDED";
    recommendation =
      "Le moteur est armé V24 mais le garde-fou courant n'est pas PASS. Revenir à Legacy avant de poursuivre.";
  } else if (
    consecutiveV24Generations >=
      STABLE_V24_GENERATIONS
  ) {
    status = "V24_LIVE_STABLE";
    recommendation =
      `V24 a ${consecutiveV24Generations} générations consécutives saines. Continuer la surveillance ; le rollback global reste disponible.`;
  } else {
    status = "V24_LIVE_HEALTHY";
    recommendation =
      `V24 est saine sur la génération courante. Stabilisation en cours : ${consecutiveV24Generations}/${STABLE_V24_GENERATIONS} générations consécutives saines.`;
  }

  return {
    version: VERSION,
    evaluatedAt,
    citySlug,
    generatedAt,
    phase: "V24_LIVE",
    status,
    publicEngine,
    requestedMode: control.requestedMode,
    v24Approved: control.v24Approved,
    sceneKey,
    publicationFingerprint,
    readinessStatus,
    finalRcCurrent: false,
    rehearsalCurrent: false,
    goLiveEligible: false,
    guardStatus,
    fallbackDetected,
    legacyBackupAvailable,
    consecutiveV24Generations,
    checks,
    recommendation,
    safety: {
      productionMutated: false,
      autoRollbackTriggered: false,
      globalRollbackRemainsSeparate: true
    }
  };
}
