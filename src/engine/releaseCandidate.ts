import type { Env, LokaForecast } from "../types";
import { latestForecast } from "../storage/db";
import { loadShadowMetricRows } from "../storage/shadowMetrics";
import { evaluateV24Readiness } from "../analytics/readiness";
import { ensureEngineControl } from "../storage/engineControl";
import { getLatestV24ApprovalProof } from "../storage/engineApproval";
import {
  loadLegacyPublicBackup
} from "../storage/publicationSafety";
import {
  latestPublicationGenerationAudit,
  latestSurfaceCoherenceAudit
} from "../storage/publicationAudit";
import { runFallbackSelfTest } from "./fallbackSelfTest";
import { resolvePublicSurfaceSafely } from "./publicFailSafe";
import {
  publicationIdentity,
  verifyPublicationManifest
} from "./publicationManifest";
import { resolveSceneEngineMode } from "./engineMode";

type Obj = Record<string, unknown>;

export type ReleaseCandidateTechnicalStatus =
  | "RC_TECHNICAL_READY"
  | "RC_PENDING"
  | "RC_BLOCKED";

export type ReleaseActivationEligibility =
  | "NOT_REQUESTED"
  | "WAITING_READINESS"
  | "WAITING_APPROVAL"
  | "WAITING_VALID_V24"
  | "READY_TO_ARM"
  | "V24_EFFECTIVE"
  | "UNAVAILABLE";

export interface ReleaseCandidateCheck {
  id: string;
  label: string;
  blocking: boolean;
  status: "PASS" | "FAIL" | "PENDING" | "INFO";
  detail: string;
}

export interface ReleaseCandidateReport {
  version: "12.7.0";
  evaluatedAt: string;
  citySlug: string;

  technicalStatus: ReleaseCandidateTechnicalStatus;
  activationEligibility: ReleaseActivationEligibility;

  generatedAt: string | null;
  effectiveEngine: "LEGACY" | "V24" | null;
  sceneKey: string | null;
  publicationFingerprint: string | null;

  checks: ReleaseCandidateCheck[];

  summary: {
    blockingPass: number;
    blockingFail: number;
    blockingPending: number;
    totalChecks: number;
    fallbackSelfTest: string;
    coherence: string;
    readiness: string;
    requestedMode: string;
    v24Approved: boolean;
  };

  safety: {
    productionMutated: false;
    engineControlMutated: false;
    goLiveInstagram: false;
    releaseCandidateOnly: true;
  };

  reason: string;
}

const REQUIRED_SCHEMA_OBJECTS = [
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
  "release_candidate_audit"
] as const;

const SURFACE_AUDIT_MAX_AGE_MS = 30 * 60 * 1000;

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function check(
  id: string,
  label: string,
  status: ReleaseCandidateCheck["status"],
  detail: string,
  blocking = true
): ReleaseCandidateCheck {
  return { id, label, blocking, status, detail };
}

async function schemaCheck(db: D1Database): Promise<{
  present: string[];
  missing: string[];
}> {
  const placeholders = REQUIRED_SCHEMA_OBJECTS.map(() => "?").join(",");

  const result = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (${placeholders})
  `).bind(...REQUIRED_SCHEMA_OBJECTS).all<{ name: string }>();

  const present = result.results.map((row) => row.name);
  const missing = REQUIRED_SCHEMA_OBJECTS.filter(
    (name) => !present.includes(name)
  );

  return { present, missing: [...missing] };
}

function scene24Available(forecast: LokaForecast): boolean {
  const value = asObj(forecast.diagnostics?.scene24);
  return !!value && typeof value.sceneId === "number";
}

function dayProfileAvailable(forecast: LokaForecast): boolean {
  return !!asObj(forecast.diagnostics?.dayProfile24);
}

function pipelineConnected(forecast: LokaForecast): boolean {
  const engine = asObj(forecast.diagnostics?.sceneEngine);
  return engine?.connectedInPipeline === true;
}

function activationEligibility(args: {
  requested: string;
  readiness: string;
  approved: boolean;
  validV24: boolean;
  effective: "LEGACY" | "V24" | null;
}): ReleaseActivationEligibility {
  if (args.effective === "V24") return "V24_EFFECTIVE";
  if (args.requested !== "V24") return "NOT_REQUESTED";
  if (args.readiness !== "READY_CANDIDATE") {
    return "WAITING_READINESS";
  }
  if (!args.approved) return "WAITING_APPROVAL";
  if (!args.validV24) return "WAITING_VALID_V24";
  return "READY_TO_ARM";
}

export async function evaluateReleaseCandidate(
  env: Env,
  citySlug: string
): Promise<ReleaseCandidateReport> {
  const evaluatedAt = new Date().toISOString();
  const checks: ReleaseCandidateCheck[] = [];

  // 1. Required D1 schema through Bloc 12.7.
  try {
    const schema = await schemaCheck(env.DB);
    checks.push(
      check(
        "schema",
        "Schéma D1 12.7",
        schema.missing.length ? "FAIL" : "PASS",
        schema.missing.length
          ? `Objets manquants : ${schema.missing.join(", ")}`
          : `${schema.present.length} objets D1 requis présents.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "schema",
        "Schéma D1 12.7",
        "FAIL",
        `Lecture sqlite_master impossible : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  // 2. Latest official generation.
  let forecast: LokaForecast | null = null;
  try {
    forecast = await latestForecast(env.DB, citySlug);
  } catch (error) {
    checks.push(
      check(
        "latest_forecast",
        "Dernière génération officielle",
        "FAIL",
        `Lecture forecast impossible : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  if (!forecast) {
    if (!checks.some((x) => x.id === "latest_forecast")) {
      checks.push(
        check(
          "latest_forecast",
          "Dernière génération officielle",
          "FAIL",
          "Aucun forecast disponible."
        )
      );
    }

    const blocked = checks.filter(
      (x) => x.blocking && x.status === "FAIL"
    ).length;

    return {
      version: "12.7.0",
      evaluatedAt,
      citySlug,
      technicalStatus: "RC_BLOCKED",
      activationEligibility: "UNAVAILABLE",
      generatedAt: null,
      effectiveEngine: null,
      sceneKey: null,
      publicationFingerprint: null,
      checks,
      summary: {
        blockingPass: checks.filter(
          (x) => x.blocking && x.status === "PASS"
        ).length,
        blockingFail: blocked,
        blockingPending: 0,
        totalChecks: checks.length,
        fallbackSelfTest: "UNAVAILABLE",
        coherence: "UNAVAILABLE",
        readiness: "UNAVAILABLE",
        requestedMode: "UNAVAILABLE",
        v24Approved: false
      },
      safety: {
        productionMutated: false,
        engineControlMutated: false,
        goLiveInstagram: false,
        releaseCandidateOnly: true
      },
      reason: "release_candidate_no_forecast"
    };
  }

  checks.push(
    check(
      "latest_forecast",
      "Dernière génération officielle",
      "PASS",
      `${forecast.generatedAt} · scène ${String(forecast.scene ?? "—")}.`
    )
  );

  // 3. Pipeline selector must be physically connected.
  checks.push(
    check(
      "pipeline",
      "Sélecteur moteur connecté au pipeline",
      pipelineConnected(forecast) ? "PASS" : "FAIL",
      pipelineConnected(forecast)
        ? "diagnostics.sceneEngine.connectedInPipeline = true."
        : "Le forecast courant ne prouve pas la connexion du sélecteur."
    )
  );

  // 4. V24 computation path must exist even while public production is Legacy.
  const hasScene24 = scene24Available(forecast);
  const hasDayProfile = dayProfileAvailable(forecast);

  checks.push(
    check(
      "v24_candidate_path",
      "Chaîne V24 calculée",
      hasScene24 && hasDayProfile ? "PASS" : "FAIL",
      hasScene24 && hasDayProfile
        ? "scene24 et dayProfile24 sont présents."
        : `scene24=${hasScene24} · dayProfile24=${hasDayProfile}.`
    )
  );

  // 5. Safe public resolver + canonical manifest.
  let safeSurface: Awaited<
    ReturnType<typeof resolvePublicSurfaceSafely>
  > | null = null;

  try {
    safeSurface = await resolvePublicSurfaceSafely(env, forecast);
    checks.push(
      check(
        "safe_public_surface",
        "Surface publique sûre",
        safeSurface.engine === "UNAVAILABLE" ? "FAIL" : "PASS",
        safeSurface.engine === "UNAVAILABLE"
          ? `Indisponible : ${safeSurface.reason}.`
          : `${safeSurface.engine} · ${safeSurface.reason}.`
      )
    );
  } catch (error) {
    checks.push(
      check(
        "safe_public_surface",
        "Surface publique sûre",
        "FAIL",
        `Resolver fail-safe en erreur : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  const publicForecast =
    safeSurface && safeSurface.engine !== "UNAVAILABLE"
      ? safeSurface.forecast
      : null;

  let identity = publicForecast
    ? publicationIdentity(publicForecast)
    : null;

  if (publicForecast) {
    const verified = await verifyPublicationManifest(publicForecast);
    checks.push(
      check(
        "publication_manifest",
        "Manifest public canonique",
        verified.valid && !!identity ? "PASS" : "FAIL",
        verified.valid && identity
          ? `${identity.engine} · ${identity.scene} · ${identity.fingerprint.slice(0, 12)}…`
          : verified.reason
      )
    );
  } else {
    checks.push(
      check(
        "publication_manifest",
        "Manifest public canonique",
        "FAIL",
        "Aucune surface publique sûre à vérifier."
      )
    );
  }

  // 6. Immutable generation audit must match this exact generation.
  let generationAudit = null as Awaited<
    ReturnType<typeof latestPublicationGenerationAudit>
  >;

  try {
    generationAudit =
      await latestPublicationGenerationAudit(env.DB, citySlug);

    const matches =
      !!identity &&
      !!generationAudit &&
      generationAudit.generatedAt === identity.generatedAt &&
      generationAudit.effectiveEngine === identity.engine &&
      generationAudit.sceneKey === identity.scene &&
      generationAudit.fingerprint === identity.fingerprint &&
      generationAudit.verificationStatus === "VERIFIED";

    checks.push(
      check(
        "generation_audit",
        "Audit immuable de génération",
        matches ? "PASS" : "FAIL",
        matches
          ? `Audit #${generationAudit?.id} VERIFIED.`
          : "L'audit de génération ne correspond pas exactement au manifest courant."
      )
    );
  } catch (error) {
    checks.push(
      check(
        "generation_audit",
        "Audit immuable de génération",
        "FAIL",
        `Lecture audit impossible : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  // 7. Persistent Legacy backup is mandatory as the emergency floor.
  try {
    const backup = await loadLegacyPublicBackup(env.DB, citySlug);
    checks.push(
      check(
        "persistent_legacy_backup",
        "Backup Legacy persistant",
        backup ? "PASS" : "FAIL",
        backup
          ? `Backup checksum vérifié · ${backup.generatedAt}.`
          : "Aucun backup Legacy persistant valide."
      )
    );
  } catch (error) {
    checks.push(
      check(
        "persistent_legacy_backup",
        "Backup Legacy persistant",
        "FAIL",
        `Backup illisible : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  // 8. Bloc 12.5 self-test is recomputed server-side. We never trust a
  // previous button click for RC validation.
  let fallbackStatus = "UNAVAILABLE";

  try {
    const fallback = await runFallbackSelfTest(env, forecast);
    fallbackStatus = fallback.status;

    checks.push(
      check(
        "fallback_self_test",
        "Self-test fallbacks 12.5",
        fallback.status === "PASS"
          ? "PASS"
          : fallback.status === "PENDING"
            ? "PENDING"
            : "FAIL",
        fallback.status === "PASS"
          ? "Tous les tests de fallback non destructifs passent."
          : fallback.tests
              .filter((x) => x.status !== "PASS")
              .map((x) => `${x.id}:${x.status}`)
              .join(", ")
      )
    );
  } catch (error) {
    checks.push(
      check(
        "fallback_self_test",
        "Self-test fallbacks 12.5",
        "FAIL",
        `Self-test en erreur : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  // 9. The real four-surface browser audit must be PASS on the exact current
  // generation and recent enough to constitute this RC run.
  let coherenceStatus = "UNAVAILABLE";

  try {
    const surfaceAudit =
      await latestSurfaceCoherenceAudit(env.DB, citySlug);

    coherenceStatus = surfaceAudit?.status ?? "MISSING";

    const ageMs = surfaceAudit
      ? Date.now() - Date.parse(surfaceAudit.checkedAt)
      : Number.POSITIVE_INFINITY;

    const exact =
      !!identity &&
      !!surfaceAudit &&
      surfaceAudit.status === "PASS" &&
      surfaceAudit.generatedAt === identity.generatedAt &&
      surfaceAudit.expectedEngine === identity.engine &&
      surfaceAudit.expectedScene === identity.scene &&
      surfaceAudit.expectedFingerprint === identity.fingerprint &&
      ageMs >= 0 &&
      ageMs <= SURFACE_AUDIT_MAX_AGE_MS;

    checks.push(
      check(
        "surface_coherence",
        "Cohérence réelle des 4 surfaces",
        exact
          ? "PASS"
          : surfaceAudit?.status === "FAIL"
            ? "FAIL"
            : "PENDING",
        exact
          ? `PASS · audit #${surfaceAudit?.id} · même génération/fingerprint.`
          : !surfaceAudit
            ? "Lancer d'abord le contrôle navigateur des 4 surfaces."
            : surfaceAudit.status === "FAIL"
              ? `Dernier contrôle FAIL : ${surfaceAudit.reason}.`
              : ageMs > SURFACE_AUDIT_MAX_AGE_MS
                ? "Le dernier contrôle PASS est trop ancien ; relancer le contrôle."
                : "Le dernier contrôle ne correspond pas exactement à la génération courante."
      )
    );
  } catch (error) {
    checks.push(
      check(
        "surface_coherence",
        "Cohérence réelle des 4 surfaces",
        "FAIL",
        `Lecture audit surface impossible : ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }

  // 10. Control/readiness/approval layer. These are informational for the
  // technical RC because current NOT_READY must not block finishing the code.
  let readinessStatus = "UNAVAILABLE";
  let requestedMode = "UNAVAILABLE";
  let approved = false;
  let effectiveEngine: "LEGACY" | "V24" | null =
    identity?.engine ?? null;

  try {
    const [control, rows] = await Promise.all([
      ensureEngineControl(env.DB, citySlug),
      loadShadowMetricRows(env.DB, citySlug, 30, 1000)
    ]);

    const readiness = evaluateV24Readiness(rows);
    readinessStatus = readiness.status;
    requestedMode = control.requestedMode;
    approved = control.v24Approved;

    const configuredMode =
      (env as Env & { SCENE_ENGINE_MODE?: string })
        .SCENE_ENGINE_MODE;

    const resolution = resolveSceneEngineMode({
      configuredMode,
      control,
      readiness: readiness.status,
      hasValidV24Decision: hasScene24
    });

    const proof = await getLatestV24ApprovalProof(
      env.DB,
      citySlug
    );

    checks.push(
      check(
        "activation_state",
        "Éligibilité future activation V24",
        "INFO",
        `demandé=${resolution.requested} · readiness=${readiness.status} · approuvé=${control.v24Approved ? "OUI" : "NON"} · preuve=${proof ? "OUI" : "NON"}.`,
        false
      )
    );
  } catch (error) {
    checks.push(
      check(
        "activation_state",
        "Éligibilité future activation V24",
        "INFO",
        `Indisponible : ${
          error instanceof Error ? error.message : String(error)
        }`,
        false
      )
    );
  }

  const eligibility = activationEligibility({
    requested: requestedMode,
    readiness: readinessStatus,
    approved,
    validV24: hasScene24,
    effective: effectiveEngine
  });

  // 11. Explicit non-GO-LIVE contract. This is intentionally informational.
  checks.push(
    check(
      "instagram_go_live",
      "Publication Instagram réelle",
      "INFO",
      "NON autorisée par le Bloc 12.7. Le GO LIVE reste réservé au Bloc 12.13.",
      false
    )
  );

  const blocking = checks.filter((x) => x.blocking);
  const blockingFail = blocking.filter(
    (x) => x.status === "FAIL"
  ).length;
  const blockingPending = blocking.filter(
    (x) => x.status === "PENDING"
  ).length;
  const blockingPass = blocking.filter(
    (x) => x.status === "PASS"
  ).length;

  const technicalStatus: ReleaseCandidateTechnicalStatus =
    blockingFail > 0
      ? "RC_BLOCKED"
      : blockingPending > 0
        ? "RC_PENDING"
        : "RC_TECHNICAL_READY";

  return {
    version: "12.7.0",
    evaluatedAt,
    citySlug,
    technicalStatus,
    activationEligibility: eligibility,
    generatedAt: identity?.generatedAt ?? forecast.generatedAt,
    effectiveEngine,
    sceneKey: identity?.scene ?? String(forecast.scene ?? ""),
    publicationFingerprint: identity?.fingerprint ?? null,
    checks,
    summary: {
      blockingPass,
      blockingFail,
      blockingPending,
      totalChecks: checks.length,
      fallbackSelfTest: fallbackStatus,
      coherence: coherenceStatus,
      readiness: readinessStatus,
      requestedMode,
      v24Approved: approved
    },
    safety: {
      productionMutated: false,
      engineControlMutated: false,
      goLiveInstagram: false,
      releaseCandidateOnly: true
    },
    reason:
      technicalStatus === "RC_TECHNICAL_READY"
        ? "release_candidate_functional_chain_ready"
        : technicalStatus === "RC_PENDING"
          ? "release_candidate_waiting_fresh_surface_check_or_backup"
          : "release_candidate_blocking_check_failed"
  };
}

export async function recordReleaseCandidateAudit(
  db: D1Database,
  report: ReleaseCandidateReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO release_candidate_audit (
      event_id,
      city_slug,
      release_version,
      evaluated_at,
      generated_at,
      effective_engine,
      scene_key,
      publication_fingerprint,
      technical_status,
      activation_eligibility,
      checks_json,
      summary_json,
      go_live_instagram,
      production_mutated,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.evaluatedAt,
    report.generatedAt,
    report.effectiveEngine,
    report.sceneKey,
    report.publicationFingerprint,
    report.technicalStatus,
    report.activationEligibility,
    JSON.stringify(report.checks),
    JSON.stringify(report.summary),
    report.reason
  ).run();
}

export async function latestReleaseCandidateAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  releaseVersion: string;
  evaluatedAt: string;
  generatedAt: string | null;
  effectiveEngine: string | null;
  sceneKey: string | null;
  publicationFingerprint: string | null;
  technicalStatus: ReleaseCandidateTechnicalStatus;
  activationEligibility: ReleaseActivationEligibility;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      release_version,
      evaluated_at,
      generated_at,
      effective_engine,
      scene_key,
      publication_fingerprint,
      technical_status,
      activation_eligibility,
      reason
    FROM release_candidate_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    release_version: string;
    evaluated_at: string;
    generated_at: string | null;
    effective_engine: string | null;
    scene_key: string | null;
    publication_fingerprint: string | null;
    technical_status: ReleaseCandidateTechnicalStatus;
    activation_eligibility: ReleaseActivationEligibility;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    releaseVersion: row.release_version,
    evaluatedAt: row.evaluated_at,
    generatedAt: row.generated_at,
    effectiveEngine: row.effective_engine,
    sceneKey: row.scene_key,
    publicationFingerprint: row.publication_fingerprint,
    technicalStatus: row.technical_status,
    activationEligibility: row.activation_eligibility,
    reason: row.reason
  } : null;
}
