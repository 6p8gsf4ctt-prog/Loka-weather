import type { Env, LokaForecast } from "../types";
import { latestForecast } from "../storage/db";
import {
  loadLegacyPublicBackup
} from "../storage/publicationSafety";
import {
  buildV24PublicPayloadPreview
} from "./publicPreview";
import {
  captureLegacyPublicFallback,
  promoteV24PreviewToOfficial,
  restoreLegacyPublicForecast
} from "./publicProduct";
import {
  attachPublicationManifest
} from "./publicationManifest";
import {
  resolvePublicSurfaceWithDependencies
} from "./publicFailSafe";
import {
  publicationFailureAction,
  requestFallbackAction
} from "./publicationRecoveryPolicy";
import {
  evaluateV24ActivationGuard,
  type V24ActivationGuardResult
} from "./activationGuard";
import {
  resolveSceneEngineMode,
  type EngineControlState,
  type SceneEngineResolution
} from "./engineMode";
import type {
  V24MasterAvailability
} from "./masterAsset";

type Obj = Record<string, unknown>;

export type FaultScenarioStatus =
  | "PASS"
  | "FAIL"
  | "PENDING";

export interface FaultScenarioResult {
  id: string;
  label: string;
  category:
    | "DATA"
    | "ENGINE"
    | "ASSET"
    | "STORAGE"
    | "PUBLIC_SURFACE"
    | "RECOVERY";
  status: FaultScenarioStatus;
  expected: string;
  observed: string;
  safety: string;
}

export interface FaultInjectionReport {
  version: "12.8.0";
  runAt: string;
  citySlug: string;
  generatedAt: string | null;
  effectiveEngine: "LEGACY" | "V24" | null;
  status: FaultScenarioStatus;
  scenarios: FaultScenarioResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
  safety: {
    productionMutated: false;
    engineControlMutated: false;
    forecastWritten: false;
    faultAuditOnlyMutation: true;
  };
  reason: string;
}

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function result(
  id: string,
  label: string,
  category: FaultScenarioResult["category"],
  passed: boolean,
  expected: string,
  observed: string,
  safety: string,
  pending = false
): FaultScenarioResult {
  return {
    id,
    label,
    category,
    status: pending ? "PENDING" : passed ? "PASS" : "FAIL",
    expected,
    observed,
    safety
  };
}

function currentEngine(
  forecast: LokaForecast
): "LEGACY" | "V24" {
  const engine = asObj(forecast.diagnostics?.sceneEngine);
  return engine?.effectiveProduction === "V24"
    ? "V24"
    : "LEGACY";
}

function approvalControl(
  approved: boolean
): EngineControlState {
  return {
    citySlug: "tarnos",
    requestedMode: "V24",
    v24Approved: approved,
    approvedAt: approved ? new Date().toISOString() : null,
    approvedBy: approved ? "fault_lab" : null,
    rollbackAt: null,
    rollbackReason: null,
    updatedAt: new Date().toISOString()
  };
}

function armedResolution(
  forecast: LokaForecast
): SceneEngineResolution {
  return resolveSceneEngineMode({
    control: approvalControl(true),
    readiness: "READY_CANDIDATE",
    hasValidV24Decision:
      !!asObj(forecast.diagnostics?.scene24)
  });
}

function syntheticMaster(
  available: boolean,
  reason = available
    ? "fault_lab_available"
    : "fault_lab_missing"
): V24MasterAvailability {
  return {
    version: "12.5.0",
    checked: true,
    available,
    masterUrl: "/masters24/fault-lab.png",
    status: available ? 200 : 404,
    contentType: available ? "image/png" : "text/plain",
    reason,
    error: null
  };
}

function fakeApprovalProof() {
  return {
    eventId: "fault-lab-approved",
    eventAt: new Date().toISOString(),
    challengeId: "fault-lab",
    readinessFingerprint: "fault-lab"
  };
}

function syntheticPassGuard(): V24ActivationGuardResult {
  return {
    version: "12.5.0",
    status: "PASS",
    evaluatedAt: new Date().toISOString(),
    fallbackRequired: false,
    activationReadyForCutover: true,
    reason: "fault_lab_pass",
    checks: [],
    candidate: null
  };
}

async function syntheticV24Forecast(
  base: LokaForecast
): Promise<LokaForecast> {
  const preview = buildV24PublicPayloadPreview(base);
  const official = promoteV24PreviewToOfficial(
    preview,
    syntheticPassGuard()
  );

  const out = clone(base);
  out.diagnostics.legacyPublicFallback =
    captureLegacyPublicFallback(base);

  out.scene = preview.scene.key as never;
  out.subtitle = preview.editorial.subtitle ?? undefined;
  out.summaryLines = [...preview.editorial.summaryLines];
  out.mainVerdict = preview.editorial.mainVerdict;
  out.rainVerdict = preview.editorial.rainVerdict;
  out.notableEvent = preview.editorial.notableEvent;

  out.diagnostics.scene = preview.scene.key;
  out.diagnostics.subtitle =
    preview.editorial.subtitle ?? null;
  out.diagnostics.summaryLines =
    [...preview.editorial.summaryLines];

  out.diagnostics.sceneEngine = {
    ...(asObj(out.diagnostics.sceneEngine) ?? {}),
    connectedInPipeline: true,
    effectiveProduction: "V24",
    publicSurfaceEngine: "V24",
    generationFallbackRequired: false
  };

  out.diagnostics.v24ActivationGuard =
    syntheticPassGuard();
  out.diagnostics.v24OfficialProduct = official;

  return attachPublicationManifest(out);
}

export async function runFaultInjectionLab(
  env: Env,
  citySlug: string
): Promise<FaultInjectionReport> {
  const runAt = new Date().toISOString();
  const scenarios: FaultScenarioResult[] = [];

  const forecast = await latestForecast(env.DB, citySlug);

  if (!forecast) {
    return {
      version: "12.8.0",
      runAt,
      citySlug,
      generatedAt: null,
      effectiveEngine: null,
      status: "FAIL",
      scenarios: [
        result(
          "no_forecast",
          "Forecast de base",
          "DATA",
          false,
          "forecast disponible",
          "aucun forecast",
          "Aucune mutation effectuée."
        )
      ],
      summary: {
        total: 1,
        passed: 0,
        failed: 1,
        pending: 0
      },
      safety: {
        productionMutated: false,
        engineControlMutated: false,
        forecastWritten: false,
        faultAuditOnlyMutation: true
      },
      reason: "fault_lab_no_forecast"
    };
  }

  const baseEngine = currentEngine(forecast);

  // 1. Readiness unavailable must never arm V24.
  const unavailable = resolveSceneEngineMode({
    control: approvalControl(true),
    readiness: "UNAVAILABLE",
    hasValidV24Decision: true
  });

  scenarios.push(
    result(
      "readiness_unavailable",
      "Readiness indisponible",
      "ENGINE",
      unavailable.effectiveProduction === "LEGACY",
      "LEGACY",
      unavailable.effectiveProduction,
      "Aucun changement engine_control."
    )
  );

  // 2. Approval absent must never arm V24.
  const noApproval = resolveSceneEngineMode({
    control: approvalControl(false),
    readiness: "READY_CANDIDATE",
    hasValidV24Decision: true
  });

  scenarios.push(
    result(
      "approval_missing",
      "Autorisation V24 absente",
      "ENGINE",
      noApproval.effectiveProduction === "LEGACY",
      "LEGACY",
      noApproval.effectiveProduction,
      "Double confirmation non contournée."
    )
  );

  // 3. Degraded model count must block an otherwise armed generation.
  const lowModels = clone(forecast);
  lowModels.diagnostics.modelCount = 3;

  const lowModelsGuard = evaluateV24ActivationGuard({
    forecast: lowModels,
    resolution: armedResolution(lowModels),
    approvalProof: fakeApprovalProof(),
    masterAvailability: syntheticMaster(true)
  });

  scenarios.push(
    result(
      "models_degraded",
      "Modèles météo insuffisants",
      "DATA",
      lowModelsGuard.status === "BLOCKED" &&
        lowModelsGuard.reason.includes("model_count"),
      "BLOCKED · model_count",
      `${lowModelsGuard.status} · ${lowModelsGuard.reason}`,
      "La génération officielle resterait Legacy."
    )
  );

  // 4. Internal V24 error must block.
  const v24Error = clone(forecast);
  v24Error.diagnostics.scene24Error =
    "fault_lab_scene24_error";
  v24Error.diagnostics.modelCount = 5;

  const v24ErrorGuard = evaluateV24ActivationGuard({
    forecast: v24Error,
    resolution: armedResolution(v24Error),
    approvalProof: fakeApprovalProof(),
    masterAvailability: syntheticMaster(true)
  });

  scenarios.push(
    result(
      "scene24_error",
      "Erreur moteur V24",
      "ENGINE",
      v24ErrorGuard.status === "BLOCKED" &&
        v24ErrorGuard.reason.includes("scene24_error_free"),
      "BLOCKED · scene24_error_free",
      `${v24ErrorGuard.status} · ${v24ErrorGuard.reason}`,
      "Aucune publication V24 possible."
    )
  );

  // 5. Missing master must be a blocking activation check.
  const missingMasterForecast = clone(forecast);
  missingMasterForecast.diagnostics.modelCount = 5;
  missingMasterForecast.diagnostics.scene24Error = null;

  const missingMasterGuard = evaluateV24ActivationGuard({
    forecast: missingMasterForecast,
    resolution: armedResolution(missingMasterForecast),
    approvalProof: fakeApprovalProof(),
    masterAvailability: syntheticMaster(false)
  });

  scenarios.push(
    result(
      "master_missing_guard",
      "Master officiel absent au cutover",
      "ASSET",
      missingMasterGuard.status === "BLOCKED" &&
        missingMasterGuard.reason.includes("master_asset"),
      "BLOCKED · master_asset",
      `${missingMasterGuard.status} · ${missingMasterGuard.reason}`,
      "La scène sans master ne peut pas devenir officielle."
    )
  );

  // Some request-time tests need a valid synthetic V24 product. If the
  // current generation cannot even build a preview, report PENDING instead
  // of inventing test data.
  let synthetic: LokaForecast | null = null;
  let syntheticError: string | null = null;

  try {
    synthetic = await syntheticV24Forecast(forecast);
  } catch (error) {
    syntheticError =
      error instanceof Error ? error.message : String(error);
  }

  let persistent: LokaForecast | null = null;
  try {
    persistent =
      await loadLegacyPublicBackup(env.DB, citySlug);
  } catch {
    persistent = null;
  }

  if (!synthetic) {
    for (const [id, label] of [
      ["request_master_missing", "Master supprimé après génération"],
      ["request_manifest_tampered", "Manifest altéré après écriture"],
      ["persistent_backup_missing", "Backup D1 indisponible"],
      ["all_backups_missing", "Tous les backups indisponibles"]
    ] as const) {
      scenarios.push(
        result(
          id,
          label,
          "PUBLIC_SURFACE",
          false,
          "simulation V24",
          syntheticError ?? "synthetic_v24_unavailable",
          "Aucune mutation de production.",
          true
        )
      );
    }
  } else {
    const persistentForLab =
      persistent ??
      restoreLegacyPublicForecast(synthetic);

    // 6. Master disappears after V24 generation -> persistent Legacy.
    const missingAtRequest =
      await resolvePublicSurfaceWithDependencies(
        synthetic,
        {
          loadLegacyBackup: async () => persistentForLab,
          verifyMaster: async () => syntheticMaster(false)
        }
      );

    scenarios.push(
      result(
        "request_master_missing",
        "Master supprimé après génération",
        "PUBLIC_SURFACE",
        missingAtRequest.engine === "LEGACY",
        "LEGACY",
        missingAtRequest.engine,
        "Le navigateur ne reçoit jamais le V24 sans master."
      )
    );

    // 7. Manifest tampered after write -> persistent Legacy.
    const tampered = clone(synthetic);
    const tamperedProduct = asObj(
      tampered.diagnostics.v24OfficialProduct
    );
    const tamperedEditorial = tamperedProduct
      ? asObj(tamperedProduct.editorial)
      : null;

    if (tamperedEditorial) {
      tamperedEditorial.mainVerdict =
        String(tamperedEditorial.mainVerdict ?? "") +
        " __FAULT__";
    }

    const tamperedSurface =
      await resolvePublicSurfaceWithDependencies(
        tampered,
        {
          loadLegacyBackup: async () => persistentForLab,
          verifyMaster: async () => syntheticMaster(true)
        }
      );

    scenarios.push(
      result(
        "request_manifest_tampered",
        "Manifest / contenu incohérent",
        "PUBLIC_SURFACE",
        tamperedSurface.engine === "LEGACY",
        "LEGACY",
        tamperedSurface.engine,
        "Fingerprint invalide => fallback immédiat."
      )
    );

    // 8. Persistent backup unavailable but inline valid -> inline Legacy.
    const inlineFallback =
      await resolvePublicSurfaceWithDependencies(
        synthetic,
        {
          loadLegacyBackup: async () => null,
          verifyMaster: async () => syntheticMaster(true)
        }
      );

    const inlineEngine = asObj(
      inlineFallback.forecast?.diagnostics?.sceneEngine
    );

    scenarios.push(
      result(
        "persistent_backup_missing",
        "Backup Legacy persistant indisponible",
        "STORAGE",
        inlineFallback.engine === "LEGACY" &&
          inlineEngine?.requestTimeFallbackSource === "INLINE_BACKUP",
        "LEGACY · INLINE_BACKUP",
        `${inlineFallback.engine} · ${
          String(inlineEngine?.requestTimeFallbackSource ?? "—")
        }`,
        "Le snapshot Legacy inline prend le relais."
      )
    );

    // 9. Persistent + inline missing -> safe 503 / UNAVAILABLE.
    const noBackups = clone(synthetic);
    delete noBackups.diagnostics.legacyPublicFallback;

    const unavailableSurface =
      await resolvePublicSurfaceWithDependencies(
        noBackups,
        {
          loadLegacyBackup: async () => null,
          verifyMaster: async () => syntheticMaster(true)
        }
      );

    scenarios.push(
      result(
        "all_backups_missing",
        "Aucun fallback Legacy vérifiable",
        "PUBLIC_SURFACE",
        unavailableSurface.engine === "UNAVAILABLE",
        "UNAVAILABLE / HTTP 503 sûr",
        unavailableSurface.engine,
        "LOKA refuse un V24 non sécurisé au lieu d'improviser."
      )
    );
  }

  // 10-15. Storage failure policy used by production publicationSafety.
  const policyCases = [
    {
      id: "backup_write_failure",
      label: "Échec backup avant cutover V24",
      stage: "PERSISTENT_BACKUP" as const,
      engine: "V24" as const,
      fallback: true,
      expected: "FORCE_LEGACY_CURRENT"
    },
    {
      id: "v24_write_failure",
      label: "Échec écriture forecast V24",
      stage: "OFFICIAL_WRITE" as const,
      engine: "V24" as const,
      fallback: true,
      expected: "RECOVER_LEGACY"
    },
    {
      id: "v24_readback_failure",
      label: "Échec relecture / vérification V24",
      stage: "READBACK_VERIFY" as const,
      engine: "V24" as const,
      fallback: true,
      expected: "RECOVER_LEGACY"
    },
    {
      id: "v24_audit_failure",
      label: "Échec audit génération V24",
      stage: "GENERATION_AUDIT" as const,
      engine: "V24" as const,
      fallback: true,
      expected: "RECOVER_LEGACY"
    },
    {
      id: "legacy_write_failure",
      label: "Échec écriture génération Legacy",
      stage: "OFFICIAL_WRITE" as const,
      engine: "LEGACY" as const,
      fallback: false,
      expected: "RETAIN_PREVIOUS_FORECAST"
    },
    {
      id: "recovery_write_failure",
      label: "Échec de l'écriture de récupération Legacy",
      stage: "LEGACY_RECOVERY_WRITE" as const,
      engine: "LEGACY" as const,
      fallback: true,
      expected: "RETAIN_PREVIOUS_FORECAST"
    }
  ];

  for (const item of policyCases) {
    const observed = publicationFailureAction({
      stage: item.stage,
      targetEngine: item.engine,
      legacyFallbackAvailable: item.fallback
    });

    scenarios.push(
      result(
        item.id,
        item.label,
        "RECOVERY",
        observed === item.expected,
        item.expected,
        observed,
        observed === "RECOVER_LEGACY"
          ? "La nouvelle génération fautive est remplacée par Legacy."
          : observed === "FORCE_LEGACY_CURRENT"
            ? "Le cutover V24 est annulé avant publication."
            : "Le forecast précédent reste la source de confiance."
      )
    );
  }

  // 16. Request fallback policy can never choose unsafe V24.
  const noBackupPolicy = requestFallbackAction({
    persistentLegacyAvailable: false,
    inlineLegacyAvailable: false
  });

  scenarios.push(
    result(
      "request_no_backup_policy",
      "Politique de requête sans backup",
      "RECOVERY",
      noBackupPolicy === "SAFE_503",
      "SAFE_503",
      noBackupPolicy,
      "Aucune réponse V24 n'est fabriquée."
    )
  );

  const failed = scenarios.filter(
    (x) => x.status === "FAIL"
  ).length;
  const pending = scenarios.filter(
    (x) => x.status === "PENDING"
  ).length;
  const passed = scenarios.filter(
    (x) => x.status === "PASS"
  ).length;

  const status: FaultScenarioStatus =
    failed > 0
      ? "FAIL"
      : pending > 0
        ? "PENDING"
        : "PASS";

  return {
    version: "12.8.0",
    runAt,
    citySlug,
    generatedAt: forecast.generatedAt,
    effectiveEngine: baseEngine,
    status,
    scenarios,
    summary: {
      total: scenarios.length,
      passed,
      failed,
      pending
    },
    safety: {
      productionMutated: false,
      engineControlMutated: false,
      forecastWritten: false,
      faultAuditOnlyMutation: true
    },
    reason:
      status === "PASS"
        ? "all_controlled_faults_resolve_safely"
        : status === "PENDING"
          ? "fault_lab_waiting_v24_candidate_fixture"
          : "fault_lab_detected_unsafe_behavior"
  };
}
