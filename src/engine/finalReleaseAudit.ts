import type {
  Env,
  LokaForecast
} from "../types";
import {
  latestForecast
} from "../storage/db";
import {
  ensureEngineControl
} from "../storage/engineControl";
import {
  getV24ApprovalOverview
} from "../storage/engineApproval";
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
  latestPublicationGenerationAudit,
  latestSurfaceCoherenceAudit
} from "../storage/publicationAudit";
import {
  runFallbackSelfTest
} from "./fallbackSelfTest";
import {
  evaluateReleaseCandidate
} from "./releaseCandidate";
import {
  latestFaultInjectionAudit
} from "../storage/faultAudit";
import {
  latestSceneCatalogAudit
} from "../storage/sceneCatalogAudit";
import {
  latestRollbackDrillAudit
} from "../storage/rollbackDrillAudit";

export type FinalReleaseStatus =
  | "FINAL_RC_PASS"
  | "FINAL_RC_PENDING"
  | "FINAL_RC_BLOCKED";

export interface FinalReleaseCheck {
  id: string;
  label: string;
  blocking: boolean;
  status: "PASS" | "FAIL" | "PENDING" | "INFO";
  detail: string;
}

export interface FinalReleaseAuditReport {
  version: "12.11.0";
  evaluatedAt: string;
  citySlug: string;
  status: FinalReleaseStatus;

  generatedAt: string | null;
  effectiveEngine: "LEGACY" | "V24" | null;
  sceneKey: string | null;
  publicationFingerprint: string | null;

  checks: FinalReleaseCheck[];

  evidence: {
    generationAuditId: number | null;
    surfaceAuditId: number | null;
    faultAuditId: number | null;
    sceneCatalogAuditId: number | null;
    rollbackDrillAuditId: number | null;
  };

  summary: {
    blockingPass: number;
    blockingFail: number;
    blockingPending: number;
    totalChecks: number;
    readiness: string;
    requestedMode: string;
    v24Approved: boolean;
    fallbackSelfTest: string;
    releaseCandidateFreshStatus: string;
    rehearsalEligible: boolean;
  };

  safety: {
    productionMutated: false;
    engineControlMutated: false;
    goLiveInstagram: false;
    rehearsalOnlyNext: true;
  };

  reason: string;
}

const SURFACE_AUDIT_MAX_AGE_MS =
  30 * 60 * 1000;

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
  "final_release_audit"
] as const;

function check(
  id: string,
  label: string,
  status: FinalReleaseCheck["status"],
  detail: string,
  blocking = true
): FinalReleaseCheck {
  return {
    id,
    label,
    status,
    detail,
    blocking
  };
}

async function schemaCheck(
  db: D1Database
): Promise<{
  present: string[];
  missing: string[];
}> {
  const placeholders =
    REQUIRED_TABLES.map(() => "?").join(",");

  const result = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (${placeholders})
  `).bind(...REQUIRED_TABLES).all<{
    name: string;
  }>();

  const present = result.results.map(
    (row) => row.name
  );

  const missing = REQUIRED_TABLES.filter(
    (name) => !present.includes(name)
  );

  return {
    present,
    missing: [...missing]
  };
}

function exactCurrentGeneration(
  currentGeneratedAt: string | null,
  auditGeneratedAt: string | null
): boolean {
  return (
    !!currentGeneratedAt &&
    !!auditGeneratedAt &&
    currentGeneratedAt === auditGeneratedAt
  );
}

function ageMs(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() - parsed;
}

export async function evaluateFinalReleaseAudit(
  env: Env,
  citySlug: string
): Promise<FinalReleaseAuditReport> {
  const evaluatedAt = new Date().toISOString();
  const checks: FinalReleaseCheck[] = [];

  // ---------------------------------------------------------------
  // 1. D1 schema complete through Bloc 12.11.
  // ---------------------------------------------------------------
  try {
    const schema = await schemaCheck(env.DB);

    checks.push(
      check(
        "schema_12_11",
        "Schéma D1 complet jusqu'au Bloc 12.11",
        schema.missing.length === 0
          ? "PASS"
          : "FAIL",
        schema.missing.length === 0
          ? `${schema.present.length} tables requises présentes.`
          : `Tables manquantes : ${schema.missing.join(", ")}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "schema_12_11",
        "Schéma D1 complet jusqu'au Bloc 12.11",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 2. Current official forecast / public identity.
  // ---------------------------------------------------------------
  let forecast: LokaForecast | null = null;

  try {
    forecast = await latestForecast(
      env.DB,
      citySlug
    );
  } catch (error) {
    checks.push(
      check(
        "latest_forecast",
        "Forecast officiel courant",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  if (!forecast) {
    if (!checks.some(
      (item) => item.id === "latest_forecast"
    )) {
      checks.push(
        check(
          "latest_forecast",
          "Forecast officiel courant",
          "FAIL",
          "Aucun forecast disponible."
        )
      );
    }

    return finalize({
      evaluatedAt,
      citySlug,
      checks,
      generatedAt: null,
      effectiveEngine: null,
      sceneKey: null,
      publicationFingerprint: null,
      evidence: {
        generationAuditId: null,
        surfaceAuditId: null,
        faultAuditId: null,
        sceneCatalogAuditId: null,
        rollbackDrillAuditId: null
      },
      readiness: "UNAVAILABLE",
      requestedMode: "UNAVAILABLE",
      v24Approved: false,
      fallbackSelfTest: "UNAVAILABLE",
      releaseCandidateFreshStatus: "UNAVAILABLE"
    });
  }

  checks.push(
    check(
      "latest_forecast",
      "Forecast officiel courant",
      "PASS",
      `${forecast.generatedAt} · ${String(forecast.scene ?? "—")}.`
    )
  );

  let publicForecast: LokaForecast | null = null;
  let publicEngine: "LEGACY" | "V24" | null = null;

  try {
    const surface =
      await resolvePublicSurfaceSafely(
        env,
        forecast
      );

    if (
      surface.engine === "UNAVAILABLE" ||
      !surface.forecast
    ) {
      checks.push(
        check(
          "safe_public_surface",
          "Resolver public sécurisé",
          "FAIL",
          surface.reason
        )
      );
    } else {
      publicForecast = surface.forecast;
      publicEngine = surface.engine;

      checks.push(
        check(
          "safe_public_surface",
          "Resolver public sécurisé",
          "PASS",
          `${surface.engine} · ${surface.reason}.`
        )
      );
    }
  } catch (error) {
    checks.push(
      check(
        "safe_public_surface",
        "Resolver public sécurisé",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  const identity = publicForecast
    ? publicationIdentity(publicForecast)
    : null;

  if (publicForecast) {
    const manifest =
      await verifyPublicationManifest(
        publicForecast
      );

    checks.push(
      check(
        "publication_manifest",
        "Manifest / fingerprint courant",
        manifest.valid && !!identity
          ? "PASS"
          : "FAIL",
        manifest.valid && identity
          ? `${identity.engine} · ${identity.scene} · ${identity.fingerprint.slice(0, 12)}…`
          : manifest.reason
      )
    );
  } else {
    checks.push(
      check(
        "publication_manifest",
        "Manifest / fingerprint courant",
        "FAIL",
        "Aucune surface publique sûre."
      )
    );
  }

  // ---------------------------------------------------------------
  // 3. Current control state must be pristine Legacy before rehearsal.
  // ---------------------------------------------------------------
  let requestedMode = "UNAVAILABLE";
  let v24Approved = false;
  let readiness = "UNAVAILABLE";

  try {
    const [control, approval, rows] =
      await Promise.all([
        ensureEngineControl(
          env.DB,
          citySlug
        ),
        getV24ApprovalOverview(
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

    requestedMode = control.requestedMode;
    v24Approved = control.v24Approved;
    readiness =
      evaluateV24Readiness(rows).status;

    const pristine =
      control.requestedMode === "LEGACY" &&
      control.v24Approved === false &&
      approval.pendingChallenge === null &&
      publicEngine === "LEGACY";

    checks.push(
      check(
        "pristine_legacy_control",
        "État de départ sûr après rollback",
        pristine ? "PASS" : "FAIL",
        `requested=${control.requestedMode} · approved=${control.v24Approved ? "OUI" : "NON"} · challenge=${approval.pendingChallenge ? "OUI" : "NON"} · public=${publicEngine ?? "UNAVAILABLE"}.`
      )
    );

    checks.push(
      check(
        "weather_readiness",
        "Readiness météo V24",
        "INFO",
        `${readiness}. Non bloquant pour l'audit technique final ; toujours obligatoire pour le futur GO LIVE.`,
        false
      )
    );
  } catch (error) {
    checks.push(
      check(
        "pristine_legacy_control",
        "État de départ sûr après rollback",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 4. Generation audit.
  // ---------------------------------------------------------------
  let generationAuditId: number | null = null;

  try {
    const generation =
      await latestPublicationGenerationAudit(
        env.DB,
        citySlug
      );

    generationAuditId =
      generation?.id ?? null;

    const exact =
      !!identity &&
      !!generation &&
      generation.generatedAt ===
        identity.generatedAt &&
      generation.effectiveEngine ===
        identity.engine &&
      generation.sceneKey ===
        identity.scene &&
      generation.fingerprint ===
        identity.fingerprint &&
      generation.verificationStatus ===
        "VERIFIED";

    checks.push(
      check(
        "generation_audit",
        "Preuve immuable de génération",
        exact ? "PASS" : "FAIL",
        exact
          ? `Audit #${generation?.id} VERIFIED.`
          : "Le dernier audit génération ne correspond pas exactement au produit public courant."
      )
    );
  } catch (error) {
    checks.push(
      check(
        "generation_audit",
        "Preuve immuable de génération",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 5. Fresh four-surface browser coherence.
  // ---------------------------------------------------------------
  let surfaceAuditId: number | null = null;

  try {
    const surface =
      await latestSurfaceCoherenceAudit(
        env.DB,
        citySlug
      );

    surfaceAuditId = surface?.id ?? null;

    const age = ageMs(
      surface?.checkedAt ?? null
    );

    const exact =
      !!identity &&
      !!surface &&
      surface.status === "PASS" &&
      surface.generatedAt ===
        identity.generatedAt &&
      surface.expectedEngine ===
        identity.engine &&
      surface.expectedScene ===
        identity.scene &&
      surface.expectedFingerprint ===
        identity.fingerprint &&
      age >= 0 &&
      age <= SURFACE_AUDIT_MAX_AGE_MS;

    checks.push(
      check(
        "surface_coherence",
        "4 surfaces publiques cohérentes",
        exact
          ? "PASS"
          : surface?.status === "FAIL"
            ? "FAIL"
            : "PENDING",
        exact
          ? `Audit #${surface?.id} PASS · contrôle navigateur récent.`
          : !surface
            ? "Aucun contrôle 12.6 enregistré."
            : surface.status === "FAIL"
              ? surface.reason
              : age > SURFACE_AUDIT_MAX_AGE_MS
                ? "Dernier PASS trop ancien ; relancer le contrôle des 4 surfaces."
                : "Le contrôle ne correspond pas à la génération courante."
      )
    );
  } catch (error) {
    checks.push(
      check(
        "surface_coherence",
        "4 surfaces publiques cohérentes",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 6. Fresh non-destructive fallback self-test.
  // ---------------------------------------------------------------
  let fallbackSelfTest = "UNAVAILABLE";

  try {
    const fallback =
      await runFallbackSelfTest(
        env,
        forecast
      );

    fallbackSelfTest =
      fallback.status;

    checks.push(
      check(
        "fallback_self_test",
        "Fallbacks 12.5 recalculés",
        fallback.status === "PASS"
          ? "PASS"
          : fallback.status === "PENDING"
            ? "PENDING"
            : "FAIL",
        fallback.status === "PASS"
          ? "Tous les fallbacks non destructifs passent."
          : fallback.tests
              .filter(
                (item) => item.status !== "PASS"
              )
              .map(
                (item) =>
                  `${item.id}:${item.status}`
              )
              .join(", ")
      )
    );
  } catch (error) {
    checks.push(
      check(
        "fallback_self_test",
        "Fallbacks 12.5 recalculés",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 7. Fresh Release Candidate evaluator.
  // ---------------------------------------------------------------
  let releaseCandidateFreshStatus =
    "UNAVAILABLE";

  try {
    const rc =
      await evaluateReleaseCandidate(
        env,
        citySlug
      );

    releaseCandidateFreshStatus =
      rc.technicalStatus;

    checks.push(
      check(
        "release_candidate_fresh",
        "Release Candidate 12.7 recalculée",
        rc.technicalStatus ===
          "RC_TECHNICAL_READY"
          ? "PASS"
          : rc.technicalStatus ===
              "RC_PENDING"
            ? "PENDING"
            : "FAIL",
        `${rc.technicalStatus} · ${rc.reason}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "release_candidate_fresh",
        "Release Candidate 12.7 recalculée",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 8. Bloc 12.8 immutable fault audit.
  // ---------------------------------------------------------------
  let faultAuditId: number | null = null;

  try {
    const fault =
      await latestFaultInjectionAudit(
        env.DB,
        citySlug
      );

    faultAuditId = fault?.id ?? null;

    const exact =
      !!fault &&
      fault.status === "PASS" &&
      fault.failedCount === 0 &&
      fault.pendingCount === 0 &&
      fault.scenarioCount >= 16 &&
      exactCurrentGeneration(
        identity?.generatedAt ?? null,
        fault.generatedAt
      );

    checks.push(
      check(
        "fault_audit_12_8",
        "Bloc 12.8 · tests de panne",
        exact ? "PASS" : "FAIL",
        exact
          ? `Audit #${fault?.id} PASS · ${fault?.passedCount}/${fault?.scenarioCount}.`
          : !fault
            ? "Aucun audit 12.8."
            : `status=${fault.status} · failed=${fault.failedCount} · pending=${fault.pendingCount} · génération=${fault.generatedAt ?? "—"}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "fault_audit_12_8",
        "Bloc 12.8 · tests de panne",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 9. Bloc 12.9 immutable 24-scene catalog audit.
  // ---------------------------------------------------------------
  let sceneCatalogAuditId:
    number | null = null;

  try {
    const scene =
      await latestSceneCatalogAudit(
        env.DB,
        citySlug
      );

    sceneCatalogAuditId =
      scene?.id ?? null;

    const exact =
      !!scene &&
      scene.status === "PASS" &&
      scene.registryCount === 24 &&
      scene.sceneCount === 24 &&
      scene.passedCount === 24 &&
      scene.failedCount === 0 &&
      scene.pendingCount === 0 &&
      exactCurrentGeneration(
        identity?.generatedAt ?? null,
        scene.generatedAt
      );

    checks.push(
      check(
        "scene_catalog_12_9",
        "Bloc 12.9 · catalogue 24 scènes",
        exact ? "PASS" : "FAIL",
        exact
          ? `Audit #${scene?.id} PASS 24/24.`
          : !scene
            ? "Aucun audit 12.9."
            : `status=${scene.status} · pass=${scene.passedCount}/24 · fail=${scene.failedCount} · pending=${scene.pendingCount}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "scene_catalog_12_9",
        "Bloc 12.9 · catalogue 24 scènes",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 10. Bloc 12.10 real rollback drill.
  // ---------------------------------------------------------------
  let rollbackDrillAuditId:
    number | null = null;

  try {
    const drill =
      await latestRollbackDrillAudit(
        env.DB,
        citySlug
      );

    rollbackDrillAuditId =
      drill?.id ?? null;

    const exact =
      !!identity &&
      !!drill &&
      drill.status === "PASS" &&
      drill.rollbackVerified &&
      drill.publicIdentityUnchanged &&
      !drill.emergencyCleanupUsed &&
      drill.requestedModeBefore ===
        "LEGACY" &&
      drill.requestedModeAfter ===
        "LEGACY" &&
      drill.generatedAtBefore ===
        identity.generatedAt &&
      drill.generatedAtAfter ===
        identity.generatedAt;

    checks.push(
      check(
        "rollback_drill_12_10",
        "Bloc 12.10 · rollback réel",
        exact ? "PASS" : "FAIL",
        exact
          ? `Audit #${drill?.id} PASS · identité inchangée · cleanup NON.`
          : !drill
            ? "Aucun drill 12.10."
            : `status=${drill.status} · rollback=${drill.rollbackVerified ? "OK" : "NON"} · identité=${drill.publicIdentityUnchanged ? "OK" : "MODIFIÉE"} · cleanup=${drill.emergencyCleanupUsed ? "OUI" : "NON"}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "rollback_drill_12_10",
        "Bloc 12.10 · rollback réel",
        "FAIL",
        error instanceof Error
          ? error.message
          : String(error)
      )
    );
  }

  // ---------------------------------------------------------------
  // 11. Explicit go-live lock.
  // ---------------------------------------------------------------
  checks.push(
    check(
      "instagram_go_live_lock",
      "GO LIVE Instagram",
      "INFO",
      "NON autorisé au Bloc 12.11. Le prochain bloc est uniquement la répétition générale 12.12.",
      false
    )
  );

  return finalize({
    evaluatedAt,
    citySlug,
    checks,
    generatedAt:
      identity?.generatedAt ??
      forecast.generatedAt,
    effectiveEngine:
      identity?.engine ??
      publicEngine,
    sceneKey:
      identity?.scene ??
      String(forecast.scene ?? ""),
    publicationFingerprint:
      identity?.fingerprint ?? null,
    evidence: {
      generationAuditId,
      surfaceAuditId,
      faultAuditId,
      sceneCatalogAuditId,
      rollbackDrillAuditId
    },
    readiness,
    requestedMode,
    v24Approved,
    fallbackSelfTest,
    releaseCandidateFreshStatus
  });
}

function finalize(args: {
  evaluatedAt: string;
  citySlug: string;
  checks: FinalReleaseCheck[];
  generatedAt: string | null;
  effectiveEngine: "LEGACY" | "V24" | null;
  sceneKey: string | null;
  publicationFingerprint: string | null;
  evidence: FinalReleaseAuditReport["evidence"];
  readiness: string;
  requestedMode: string;
  v24Approved: boolean;
  fallbackSelfTest: string;
  releaseCandidateFreshStatus: string;
}): FinalReleaseAuditReport {
  const blocking = args.checks.filter(
    (item) => item.blocking
  );

  const blockingFail = blocking.filter(
    (item) => item.status === "FAIL"
  ).length;

  const blockingPending = blocking.filter(
    (item) => item.status === "PENDING"
  ).length;

  const blockingPass = blocking.filter(
    (item) => item.status === "PASS"
  ).length;

  const status: FinalReleaseStatus =
    blockingFail > 0
      ? "FINAL_RC_BLOCKED"
      : blockingPending > 0
        ? "FINAL_RC_PENDING"
        : "FINAL_RC_PASS";

  const rehearsalEligible =
    status === "FINAL_RC_PASS";

  return {
    version: "12.11.0",
    evaluatedAt: args.evaluatedAt,
    citySlug: args.citySlug,
    status,
    generatedAt: args.generatedAt,
    effectiveEngine:
      args.effectiveEngine,
    sceneKey: args.sceneKey,
    publicationFingerprint:
      args.publicationFingerprint,
    checks: args.checks,
    evidence: args.evidence,
    summary: {
      blockingPass,
      blockingFail,
      blockingPending,
      totalChecks: args.checks.length,
      readiness: args.readiness,
      requestedMode:
        args.requestedMode,
      v24Approved:
        args.v24Approved,
      fallbackSelfTest:
        args.fallbackSelfTest,
      releaseCandidateFreshStatus:
        args.releaseCandidateFreshStatus,
      rehearsalEligible
    },
    safety: {
      productionMutated: false,
      engineControlMutated: false,
      goLiveInstagram: false,
      rehearsalOnlyNext: true
    },
    reason:
      status === "FINAL_RC_PASS"
        ? "final_release_candidate_audit_pass"
        : status === "FINAL_RC_PENDING"
          ? "final_release_candidate_audit_pending_fresh_evidence"
          : "final_release_candidate_audit_blocked"
  };
}
