import type {
  Env
} from "../types";
import {
  ensureEngineControl
} from "../storage/engineControl";
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
  loadLegacyPublicBackup
} from "../storage/publicationSafety";
import {
  evaluateProductionSupervisor
} from "./productionSupervisor";
import {
  certificationWindowOverview
} from "./certificationWindow15";
import {
  getGoLiveOverview
} from "./goLive13";

const VERSION = "12.16.0" as const;

const REQUIRED_TABLES = [
  "forecasts",
  "runs",
  "shadow_history",
  "engine_control",
  "engine_approval_challenge",
  "engine_activation_audit",
  "public_forecast_backup",
  "publication_fallback_audit",
  "publication_generation_audit",
  "publication_surface_audit",
  "release_candidate_audit",
  "fault_injection_audit",
  "scene_catalog_audit",
  "rollback_drill_audit",
  "final_release_audit",
  "mobile_rehearsal_audit",
  "go_live_challenge",
  "go_live_audit",
  "production_supervisor_audit",
  "certification_window",
  "certification_window_audit",
  "operational_handover_audit"
] as const;

export type OperationalHandoverStatus =
  | "SYSTEM_READY_WAITING_READINESS"
  | "SYSTEM_READY_FOR_CERTIFICATION"
  | "SYSTEM_READY_FOR_GO_LIVE"
  | "SYSTEM_READY_V24_LIVE"
  | "SYSTEM_LIVE_WATCH"
  | "SYSTEM_BLOCKED"
  | "UNAVAILABLE";

export interface OperationalHandoverCheck {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  detail: string;
}

export interface OperationalHandoverReport {
  version: "12.16.0";
  evaluatedAt: string;
  citySlug: string;
  generatedAt: string | null;
  status: OperationalHandoverStatus;

  publicEngine: string | null;
  requestedMode: string;
  v24Approved: boolean;
  readinessStatus: string;
  supervisorStatus: string;
  certificationWindowStatus: string;
  goLiveStatus: string;

  schemaComplete: boolean;
  missingTables: string[];
  legacyBackupAvailable: boolean;
  technicalChainComplete: boolean;
  architectureComplete: boolean;

  checks: OperationalHandoverCheck[];
  recommendation: string;

  safety: {
    productionMutated: false;
    v24Activated: false;
    rollbackTriggered: false;
    generationBlocked: false;
  };
}

function pass(
  id: string,
  ok: boolean,
  detail: string,
  info = false
): OperationalHandoverCheck {
  return {
    id,
    status: info
      ? "INFO"
      : ok
        ? "PASS"
        : "FAIL",
    detail
  };
}

async function schemaState(
  db: D1Database
): Promise<{
  complete: boolean;
  missing: string[];
}> {
  const result = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
  `).all<{ name: string }>();

  const names = new Set(
    result.results.map((row) => row.name)
  );

  const missing = REQUIRED_TABLES.filter(
    (name) => !names.has(name)
  );

  return {
    complete: missing.length === 0,
    missing: [...missing]
  };
}

export async function evaluateOperationalHandover(
  env: Env,
  citySlug: string
): Promise<OperationalHandoverReport> {
  const evaluatedAt = new Date().toISOString();
  const checks: OperationalHandoverCheck[] = [];

  const schema = await schemaState(env.DB);
  checks.push(
    pass(
      "schema_0016_complete",
      schema.complete,
      schema.complete
        ? `${REQUIRED_TABLES.length} tables critiques présentes.`
        : `Tables manquantes : ${schema.missing.join(", ")}.`
    )
  );

  const control = await ensureEngineControl(
    env.DB,
    citySlug
  );

  const forecast = await latestForecast(
    env.DB,
    citySlug
  );

  let generatedAt: string | null = null;
  let publicEngine: string | null = null;
  let scene: string | null = null;
  let publicIdentityOk = false;

  if (forecast) {
    const surface = await resolvePublicSurfaceSafely(
      env,
      forecast
    );

    if (
      surface.engine !== "UNAVAILABLE" &&
      surface.forecast
    ) {
      const identity = publicationIdentity(
        surface.forecast
      );

      generatedAt =
        identity?.generatedAt ??
        surface.forecast.generatedAt;
      publicEngine =
        identity?.engine ??
        surface.engine;
      scene =
        identity?.scene ??
        String(surface.forecast.scene ?? "");
      publicIdentityOk =
        !!generatedAt &&
        !!publicEngine &&
        !!scene;
    }
  }

  checks.push(
    pass(
      "public_identity_available",
      publicIdentityOk,
      publicIdentityOk
        ? `${generatedAt} · ${publicEngine} · ${scene}.`
        : "Identité publique indisponible."
    )
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

  checks.push(
    pass(
      "legacy_backup_available",
      legacyBackupAvailable,
      legacyBackupAvailable
        ? "Backup Legacy persistant disponible."
        : "Backup Legacy indisponible."
    )
  );

  const supervisor = await evaluateProductionSupervisor(
    env,
    citySlug
  );

  const cert = await certificationWindowOverview(
    env,
    citySlug
  );

  const goLive = await getGoLiveOverview(
    env,
    citySlug
  );

  const readinessStatus =
    supervisor.readinessStatus;
  const supervisorStatus =
    supervisor.status;
  const certificationWindowStatus =
    cert.status;
  const goLiveStatus =
    goLive.eligibility.status;

  checks.push(
    pass(
      "supervisor_available",
      supervisor.status !== "UNAVAILABLE",
      `${supervisor.phase} · ${supervisor.status}.`
    ),
    pass(
      "certification_control_available",
      cert.status === "INACTIVE" ||
        cert.status === "ACTIVE" ||
        cert.status === "STALE",
      cert.status
    ),
    pass(
      "go_live_control_available",
      goLiveStatus === "BLOCKED" ||
        goLiveStatus === "ELIGIBLE" ||
        goLiveStatus === "ALREADY_ACTIVE",
      goLiveStatus
    )
  );

  const controlConsistent =
    publicEngine === "V24"
      ? control.requestedMode === "V24" &&
        control.v24Approved
      : publicEngine === "LEGACY"
        ? (
            control.requestedMode === "LEGACY" &&
            !control.v24Approved
          ) ||
          (
            control.requestedMode === "V24_PREVIEW" &&
            !control.v24Approved
          )
        : false;

  checks.push(
    pass(
      "engine_control_consistent",
      controlConsistent,
      `requested=${control.requestedMode} · approved=${control.v24Approved ? "OUI" : "NON"} · public=${publicEngine ?? "UNAVAILABLE"}.`
    )
  );

  const technicalChainComplete =
    schema.complete &&
    publicIdentityOk &&
    legacyBackupAvailable &&
    supervisor.status !== "UNAVAILABLE" &&
    (
      cert.status === "INACTIVE" ||
      cert.status === "ACTIVE" ||
      cert.status === "STALE"
    ) &&
    (
      goLiveStatus === "BLOCKED" ||
      goLiveStatus === "ELIGIBLE" ||
      goLiveStatus === "ALREADY_ACTIVE"
    ) &&
    controlConsistent;

  checks.push(
    pass(
      "technical_chain_complete",
      technicalChainComplete,
      technicalChainComplete
        ? "Chaîne technique 12.1 → 12.16 cohérente."
        : "La chaîne technique finale contient au moins un blocage."
    )
  );

  let status: OperationalHandoverStatus;
  let recommendation: string;

  if (!technicalChainComplete) {
    status = "SYSTEM_BLOCKED";
    recommendation =
      "Ne pas activer V24. Corriger le contrôle technique en échec ; conserver ou restaurer Legacy.";
  } else if (publicEngine === "V24") {
    if (
      supervisorStatus === "V24_LIVE_HEALTHY" ||
      supervisorStatus === "V24_LIVE_STABLE"
    ) {
      status = "SYSTEM_READY_V24_LIVE";
      recommendation =
        "Handover terminé : V24 est officielle et saine. Utiliser le Studio Instagram officiel et surveiller le Bloc 12.14. Le rollback global reste disponible.";
    } else if (supervisorStatus === "V24_LIVE_WATCH") {
      status = "SYSTEM_LIVE_WATCH";
      recommendation =
        "V24 est officielle mais sous surveillance. Ne pas confondre fallback local et rollback global ; suivre la recommandation du Bloc 12.14.";
    } else {
      status = "SYSTEM_BLOCKED";
      recommendation =
        "V24 est armée mais la supervision ne confirme pas un état sain. Examiner 12.14 et utiliser le rollback global si recommandé.";
    }
  } else if (readinessStatus !== "READY_CANDIDATE") {
    status = "SYSTEM_READY_WAITING_READINESS";
    recommendation =
      "VERSION TECHNIQUE TERMINÉE. Continuer la météo Legacy et Shadow normalement. Aucun nouveau bloc d’architecture n’est requis ; attendre READY_CANDIDATE.";
  } else if (
    certificationWindowStatus !== "ACTIVE"
  ) {
    status = "SYSTEM_READY_FOR_CERTIFICATION";
    recommendation =
      "READY_CANDIDATE est atteint. Ouvrir la fenêtre 12.15, puis exécuter 12.8 → 12.9 → 12.10 → 12.11 → 12.12 sur la génération gelée.";
  } else if (goLiveStatus === "ELIGIBLE") {
    status = "SYSTEM_READY_FOR_GO_LIVE";
    recommendation =
      "Certification finale alignée. Utiliser le Bloc 12.13 pour la double confirmation GO LIVE ; aucune autre modification de code n’est requise.";
  } else {
    status = "SYSTEM_READY_FOR_CERTIFICATION";
    recommendation =
      "Fenêtre 12.15 active. Terminer la chaîne de recertification jusqu’à ce que le 12.13 devienne ELIGIBLE.";
  }

  return {
    version: VERSION,
    evaluatedAt,
    citySlug,
    generatedAt,
    status,
    publicEngine,
    requestedMode: control.requestedMode,
    v24Approved: control.v24Approved,
    readinessStatus,
    supervisorStatus,
    certificationWindowStatus,
    goLiveStatus,
    schemaComplete: schema.complete,
    missingTables: schema.missing,
    legacyBackupAvailable,
    technicalChainComplete,
    architectureComplete:
      technicalChainComplete,
    checks,
    recommendation,
    safety: {
      productionMutated: false,
      v24Activated: false,
      rollbackTriggered: false,
      generationBlocked: false
    }
  };
}
