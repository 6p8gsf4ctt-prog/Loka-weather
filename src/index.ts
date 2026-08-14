import { getCity } from "./config/cities";
import { runAllCities, runOneCity } from "./pipeline";
import { forecastHistory, latestForecast, shadowHistory, shadowHistoryForDate } from "./storage/db";
import { loadShadowMetricRows } from "./storage/shadowMetrics";
import { calculateShadowMetrics } from "./analytics/shadowMetrics";
import { evaluateV24Readiness } from "./analytics/readiness";
import { resolveSceneEngineMode } from "./engine/engineMode";
import { buildV24PublicPayloadPreview } from "./engine/publicPreview";
import { ensureEngineControl, requestV24Preview } from "./storage/engineControl";
import { confirmV24Approval, getLatestV24ApprovalProof, getV24ApprovalOverview, prepareV24Approval } from "./storage/engineApproval";
import { evaluateV24ActivationGuard } from "./engine/activationGuard";
import { verifyV24CandidateMasterAsset } from "./engine/masterAsset";
import { resolvePublicSurfaceSafely } from "./engine/publicFailSafe";
import {
  publicationIdentity,
  publicationResponseHeaders,
  verifyPublicationManifest,
  type PublicationSurface
} from "./engine/publicationManifest";
import { runFallbackSelfTest } from "./engine/fallbackSelfTest";
import { recentPublicationFallbackAudit } from "./storage/publicationSafety";
import {
  latestPublicationGenerationAudit,
  latestSurfaceCoherenceAudit,
  recordSurfaceCoherenceAudit,
  type PublicSurfaceObservation
} from "./storage/publicationAudit";
import { renderDashboard24 } from "./ui/dashboard24";
import { renderInstagramOfficial24 } from "./ui/instagramOfficial24";
import type { Env, LokaForecast, Scene24Candidate, SceneDecisionV24, DayProfile } from "./types";
import { renderAdmin, renderDashboard } from "./ui/dashboard";
import { renderInstagramGenerator } from "./ui/instagram";
import { renderInstagram24 } from "./ui/instagram24";
import { renderV24PrepublicationDashboard } from "./ui/prepublication24";
import { renderInstagramPrepublication24 } from "./ui/instagramPrepublication24";
import {
  evaluateReleaseCandidate,
  latestReleaseCandidateAudit,
  recordReleaseCandidateAudit
} from "./engine/releaseCandidate";
import { runFaultInjectionLab } from "./engine/faultLab";
import {
  latestFaultInjectionAudit,
  recordFaultInjectionAudit
} from "./storage/faultAudit";
import { runSceneCatalogAudit } from "./engine/sceneCatalogAudit";
import {
  latestSceneCatalogAudit,
  recordSceneCatalogAudit
} from "./storage/sceneCatalogAudit";
import { executeGlobalRollback } from "./storage/globalRollback";
import {
  rollbackDrillPhrase,
  runRollbackDrill
} from "./engine/rollbackDrill";
import {
  latestRollbackDrillAudit,
  recordRollbackDrillAudit
} from "./storage/rollbackDrillAudit";
import {
  evaluateFinalReleaseAudit
} from "./engine/finalReleaseAudit";
import {
  latestFinalReleaseAudit,
  recordFinalReleaseAudit
} from "./storage/finalReleaseAudit";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function unauthorized(): Response {
  return json({ error: "unauthorized" }, 401);
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === "Bearer " + env.ADMIN_TOKEN;
}

function localHour(timezone: string, epochMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(epochMs));

  return Number(parts.find((p) => p.type === "hour")?.value ?? -1);
}

function compactShadowComparison(forecast: LokaForecast): unknown {
  const diagnostics = forecast.diagnostics ?? {};

  const sceneLegacy =
    diagnostics.sceneLegacy && typeof diagnostics.sceneLegacy === "object"
      ? diagnostics.sceneLegacy
      : {
          scene: forecast.scene ?? null,
          score: forecast.decisionLog?.selectedScore ?? null,
          version: forecast.decisionLog?.version ?? null
        };

  const scene24 =
    diagnostics.scene24 && typeof diagnostics.scene24 === "object"
      ? diagnostics.scene24 as SceneDecisionV24
      : null;

  const dayProfile24 =
    diagnostics.dayProfile24 && typeof diagnostics.dayProfile24 === "object"
      ? diagnostics.dayProfile24 as DayProfile
      : null;

  const eligibleCandidates = scene24?.candidates
    ?.filter((candidate: Scene24Candidate) => candidate.eligible)
    .sort((a: Scene24Candidate, b: Scene24Candidate) => b.score - a.score)
    .slice(0, 5)
    .map((candidate: Scene24Candidate) => ({
      sceneId: candidate.sceneId,
      sceneKey: candidate.sceneKey,
      score: candidate.score,
      confidence: candidate.confidence,
      reasons: candidate.reasons,
      penalties: candidate.penalties
    })) ?? [];

  return {
    ok: true,
    mode: "shadow",
    productionClassifier: diagnostics.sceneClassifierProduction ?? "legacy6",
    city: forecast.city,
    citySlug: forecast.citySlug,
    forecastDate: forecast.date,
    generatedAt: forecast.generatedAt,

    legacy: sceneLegacy,

    v24: scene24
      ? {
          sceneId: scene24.sceneId,
          sceneKey: scene24.sceneKey,
          sceneLabel: scene24.sceneLabel,
          score: scene24.score,
          confidence: scene24.confidence,
          runnerUp: scene24.runnerUp,
          reasons: scene24.reasons,
          fallbackUsed: scene24.fallbackUsed,
          hysteresisApplied: scene24.hysteresisApplied
        }
      : null,

    topCandidates: eligibleCandidates,

    profile: dayProfile24
      ? {
          light: dayProfile24.light,
          cloud: dayProfile24.cloud,
          rain: dayProfile24.rain,
          wind: dayProfile24.wind,
          convection: dayProfile24.convection,
          visibility: dayProfile24.visibility,
          evolution: dayProfile24.evolution,
          structure: dayProfile24.structure
        }
      : null,

    error:
      typeof diagnostics.scene24Error === "string"
        ? diagnostics.scene24Error
        : diagnostics.scene24Error ?? null
  };
}


async function engineStatus(
  env: Env,
  citySlug: string
): Promise<Record<string, unknown>> {
  const control = await ensureEngineControl(env.DB, citySlug);

  let readinessStatus: "NOT_READY" | "OBSERVATION" | "READY_CANDIDATE" | "UNAVAILABLE" = "UNAVAILABLE";
  try {
    const rows = await loadShadowMetricRows(env.DB, citySlug, 30, 1000);
    readinessStatus = evaluateV24Readiness(rows).status;
  } catch {
    // Engine control and rollback must remain available even if analytics fail.
    readinessStatus = "UNAVAILABLE";
  }

  let hasValidV24Decision = false;
  let latestPipelineResolution: Record<string, unknown> | null = null;
  let latestActivationGuard: Record<string, unknown> | null = null;
  let latestForecastGeneratedAt: string | null = null;

  try {
    const forecast = await latestForecast(env.DB, citySlug);
    latestForecastGeneratedAt = forecast?.generatedAt ?? null;

    const scene24 = forecast?.diagnostics?.scene24;
    hasValidV24Decision =
      !!scene24 &&
      typeof scene24 === "object" &&
      typeof (scene24 as Record<string, unknown>).sceneId === "number";

    const pipeline = forecast?.diagnostics?.sceneEngine;
    latestPipelineResolution =
      pipeline && typeof pipeline === "object"
        ? pipeline as Record<string, unknown>
        : null;

    const guard = forecast?.diagnostics?.v24ActivationGuard;
    latestActivationGuard =
      guard && typeof guard === "object"
        ? guard as Record<string, unknown>
        : null;
  } catch {
    hasValidV24Decision = false;
  }

  const configuredMode = (env as Env & { SCENE_ENGINE_MODE?: string }).SCENE_ENGINE_MODE;

  const resolution = resolveSceneEngineMode({
    configuredMode,
    control,
    readiness: readinessStatus,
    hasValidV24Decision
  });

  return {
    ok: true,
    citySlug,
    control,
    resolution,
    pipeline: {
      connected: latestPipelineResolution?.connectedInPipeline === true,
      generatedAt: latestForecastGeneratedAt,
      latestResolution: latestPipelineResolution,
      latestActivationGuard,
      actualEffectiveProduction:
        latestPipelineResolution?.effectiveProduction ?? "LEGACY"
    },
    invariant: {
      productionMayBeV24OnlyAfterGuardPass: true,
      rollbackAlwaysAvailable: true,
      selectorConnectedToPipeline: true,
      requestTimeSurfaceFallback: "LEGACY"
    }
  };
}



async function approvalContext(env: Env, citySlug: string) {
  const rows = await loadShadowMetricRows(env.DB, citySlug, 30, 1000);
  const readiness = evaluateV24Readiness(rows);
  const forecast = await latestForecast(env.DB, citySlug);

  if (!forecast) throw new Error("no_forecast");

  return { readiness, forecast };
}


async function v24Prepublication(env:Env,citySlug:string){
  const status=await engineStatus(env,citySlug);
  const resolution=status.resolution&&typeof status.resolution==="object"?status.resolution as Record<string,unknown>:{};
  if(resolution.previewEnabled!==true) throw new Error("v24_preview_not_enabled");
  const forecast=await latestForecast(env.DB,citySlug);
  if(!forecast) throw new Error("no_forecast");
  const payload=buildV24PublicPayloadPreview(forecast);
  return {status,forecast,payload};
}


async function safePublicSurface(
  env: Env,
  forecast: LokaForecast | null
) {
  if (!forecast) return null;
  return resolvePublicSurfaceSafely(env, forecast);
}


function publicHeaders(
  forecast: LokaForecast,
  surface: PublicationSurface,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "cache-control": "no-store",
    ...publicationResponseHeaders(forecast, surface),
    ...extra
  };
}

function publicJson(
  data: unknown,
  forecast: LokaForecast,
  surface: PublicationSurface,
  status = 200
): Response {
  return Response.json(data, {
    status,
    headers: publicHeaders(
      forecast,
      surface,
      { "access-control-allow-origin": "*" }
    )
  });
}

function publicUnavailableJson(reason: string): Response {
  return json({
    error: "public_forecast_temporarily_unavailable",
    reason,
    safety: {
      unsafeV24Served: false,
      fallbackAttempted: true
    }
  }, 503);
}

function publicUnavailableHtml(reason: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA!</title><style>body{margin:0;background:#f3f1ed;color:#22272d;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}.box{max-width:520px;background:#fff;border-radius:28px;padding:28px;text-align:center}.brand{letter-spacing:.16em;font-size:12px;color:#777}.title{font-size:27px;margin:18px 0 10px}.muted{font-size:14px;line-height:1.5;color:#73777a}</style></head><body><div class="box"><div class="brand">LOKA!</div><div class="title">Prévision temporairement indisponible</div><div class="muted">LOKA a refusé de servir un produit météo dont le fallback ne pouvait pas être vérifié. La dernière donnée sûre sera rétablie dès que possible.</div><!-- ${reason.replace(/--/g, "")} --></div></body></html>`;
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "LOKA Weather",
        version: "0.6.6.1",
        time: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/latest") {
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);
      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json(null);

      const surface = await safePublicSurface(env, forecast);
      if (!surface || surface.engine === "UNAVAILABLE") {
        return publicUnavailableJson(
          surface?.reason ?? "no_safe_public_surface"
        );
      }

      return publicJson(
        surface.forecast,
        surface.forecast,
        "api_latest"
      );
    }

    if (url.pathname === "/api/decision") {
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      const surface = await safePublicSurface(env, forecast);
      if (!surface || surface.engine === "UNAVAILABLE") {
        return publicUnavailableJson(
          surface?.reason ?? "no_safe_public_surface"
        );
      }

      return publicJson(
        surface.forecast,
        surface.forecast,
        "api_decision"
      );
    }

    if (url.pathname === "/api/shadow") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      return json(compactShadowComparison(forecast));
    }

    // Bloc 9: append-only historical V24 shadow generations.
    if (url.pathname === "/api/shadow/history") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const includeDetail = url.searchParams.get("detail") === "1";
      const date = url.searchParams.get("date");

      if (date) {
        return json(await shadowHistoryForDate(env.DB, slug, date, includeDetail));
      }

      const limit = Number(url.searchParams.get("limit") || 30);
      return json(await shadowHistory(env.DB, slug, limit, includeDetail));
    }

    if (url.pathname === "/api/shadow/metrics") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const days = Number(url.searchParams.get("days") || 14);
      const limit = Number(url.searchParams.get("limit") || 500);
      const rows = await loadShadowMetricRows(env.DB, slug, days, limit);

      return json(calculateShadowMetrics(rows));
    }

    if (url.pathname === "/api/shadow/readiness") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const days = Number(url.searchParams.get("days") || 30);
      const limit = Number(url.searchParams.get("limit") || 1000);
      const rows = await loadShadowMetricRows(env.DB, slug, days, limit);

      return json(evaluateV24Readiness(rows));
    }

    // Bloc 11.1 — engine control plane.
    if (url.pathname === "/api/admin/engine" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        return json(await engineStatus(env, slug));
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/preview" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      await requestV24Preview(env.DB, slug);
      return json(await engineStatus(env, slug));
    }

    if (url.pathname === "/api/admin/engine/request-v24" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      return json({
        error: "use_double_confirmation_flow",
        message:
          "Bloc 12.11 exige /api/admin/engine/approval/prepare puis /confirm. Aucun état moteur n'a été modifié."
      }, 409);
    }

    if (url.pathname === "/api/admin/engine/activation-check" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const { readiness, forecast } = await approvalContext(env, slug);
        const control = await ensureEngineControl(env.DB, slug);
        const proof = await getLatestV24ApprovalProof(env.DB, slug);

        const configuredMode =
          (env as Env & { SCENE_ENGINE_MODE?: string }).SCENE_ENGINE_MODE;

        const scene24 = forecast.diagnostics.scene24;
        const resolution = resolveSceneEngineMode({
          configuredMode,
          control,
          readiness: readiness.status,
          hasValidV24Decision:
            !!scene24 &&
            typeof scene24 === "object" &&
            typeof (scene24 as Record<string, unknown>).sceneId === "number"
        });

        const masterAvailability =
          await verifyV24CandidateMasterAsset(
            env,
            forecast,
            resolution.effectiveProduction === "V24"
          );

        const guard = evaluateV24ActivationGuard({
          forecast,
          resolution,
          approvalProof: proof,
          masterAvailability
        });

        return json({
          ok: true,
          citySlug: slug,
          resolution,
          guard,
          safety: {
            resolverEngine: resolution.effectiveProduction,
            guardStatus: guard.status,
            cutoverWouldBeV24:
              resolution.effectiveProduction === "V24" &&
              guard.status === "PASS",
            fallbackIfBlocked: "LEGACY",
            publicCutoverConditional: true
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            fallbackEngine: "LEGACY",
            publicCutoverConditional: true
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/fallback-self-test" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      try {
        const report = await runFallbackSelfTest(env, forecast);
        const audit = await recentPublicationFallbackAudit(
          env.DB,
          slug,
          12
        );

        return json({
          ok: report.status !== "FAIL",
          report,
          recentFallbackAudit: audit,
          safety: {
            productionMutationPerformed: false,
            publicEngineUnchanged: true
          }
        }, report.status === "FAIL" ? 409 : 200);
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            productionMutationPerformed: false,
            publicEngineUnchanged: true
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/publication/coherence" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      try {
        const surface = await resolvePublicSurfaceSafely(
          env,
          forecast
        );

        if (surface.engine === "UNAVAILABLE" || !surface.forecast) {
          return json({
            ok: false,
            status: "FAIL",
            reason: surface.reason
          }, 409);
        }

        const manifest = await verifyPublicationManifest(
          surface.forecast
        );
        const identity = publicationIdentity(surface.forecast);
        const generationAudit =
          await latestPublicationGenerationAudit(env.DB, slug);
        const latestSurfaceAudit =
          await latestSurfaceCoherenceAudit(env.DB, slug);

        const generationAuditMatches =
          !!identity &&
          !!generationAudit &&
          generationAudit.generatedAt === identity.generatedAt &&
          generationAudit.effectiveEngine === identity.engine &&
          generationAudit.sceneKey === identity.scene &&
          generationAudit.fingerprint === identity.fingerprint &&
          generationAudit.verificationStatus === "VERIFIED";

        return json({
          ok:
            manifest.valid &&
            !!identity &&
            generationAuditMatches,
          status:
            manifest.valid &&
            !!identity &&
            generationAuditMatches
              ? "READY_FOR_BROWSER_CHECK"
              : "PENDING_OR_FAIL",
          identity,
          manifest: {
            valid: manifest.valid,
            reason: manifest.reason
          },
          generationAudit,
          generationAuditMatches,
          latestSurfaceAudit,
          requiredSurfaces: [
            "api_latest",
            "api_decision",
            "dashboard",
            "instagram"
          ],
          safety: {
            browserCheckMutatesForecast: false,
            browserCheckOnlyWritesAppendOnlyAudit: true
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/publication/coherence/record" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      let body: { observations?: unknown } = {};

      try {
        body = await request.json() as typeof body;
      } catch {
        return json({ error: "invalid_json" }, 400);
      }

      if (!Array.isArray(body.observations)) {
        return json({ error: "observations_required" }, 400);
      }

      const observations: PublicSurfaceObservation[] =
        body.observations
          .filter((x): x is Record<string, unknown> =>
            !!x && typeof x === "object" && !Array.isArray(x)
          )
          .map((x) => ({
            surface: String(x.surface) as PublicationSurface,
            status:
              typeof x.status === "number" ? x.status : 0,
            version:
              typeof x.version === "string" ? x.version : null,
            generatedAt:
              typeof x.generatedAt === "string"
                ? x.generatedAt
                : null,
            engine:
              typeof x.engine === "string" ? x.engine : null,
            scene:
              typeof x.scene === "string" ? x.scene : null,
            fingerprint:
              typeof x.fingerprint === "string"
                ? x.fingerprint
                : null
          }));

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      try {
        const surface = await resolvePublicSurfaceSafely(
          env,
          forecast
        );

        if (surface.engine === "UNAVAILABLE" || !surface.forecast) {
          return json({
            error: "safe_public_surface_unavailable",
            reason: surface.reason
          }, 409);
        }

        const result = await recordSurfaceCoherenceAudit(
          env.DB,
          slug,
          surface.forecast,
          observations
        );

        return json({
          ok: result.status === "PASS",
          ...result,
          safety: {
            forecastMutated: false,
            engineControlMutated: false,
            auditAppendOnly: true
          }
        }, result.status === "PASS" ? 200 : 409);
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/final-release-audit" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const latest = await latestFinalReleaseAudit(
          env.DB,
          slug
        );

        return json({
          ok: true,
          latest,
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            goLiveInstagram: false,
            nextBlock: "12.12"
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error
            ? error.message
            : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/final-release-audit/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const report =
          await evaluateFinalReleaseAudit(
            env,
            slug
          );

        await recordFinalReleaseAudit(
          env.DB,
          report
        );

        return json({
          ok:
            report.status ===
            "FINAL_RC_PASS",
          report,
          safety: report.safety
        }, report.status === "FINAL_RC_PASS"
          ? 200
          : report.status === "FINAL_RC_PENDING"
            ? 409
            : 422
        );
      } catch (error) {
        return json({
          error: error instanceof Error
            ? error.message
            : String(error),
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            goLiveInstagram: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/rollback-drill" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const latest = await latestRollbackDrillAudit(
          env.DB,
          slug
        );

        return json({
          ok: true,
          confirmationPhrase:
            rollbackDrillPhrase(slug),
          latest,
          safety: {
            requiresPristineLegacy: true,
            requiresV24ApprovedFalse: true,
            mutatesEngineControlTemporarily: true,
            writesForecast: false,
            grantsV24Approval: false,
            goLiveInstagram: false
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error
            ? error.message
            : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/rollback-drill/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      let body: {
        confirmationPhrase?: unknown;
      } = {};

      try {
        body = await request.json() as typeof body;
      } catch {
        return json({
          error: "invalid_json"
        }, 400);
      }

      if (
        typeof body.confirmationPhrase !== "string"
      ) {
        return json({
          error: "confirmation_phrase_required"
        }, 400);
      }

      try {
        const report = await runRollbackDrill(
          env,
          slug,
          body.confirmationPhrase
        );

        try {
          await recordRollbackDrillAudit(
            env.DB,
            report
          );
        } catch (auditError) {
          // The drill has already restored LEGACY. Surface audit failure
          // explicitly without attempting any new engine mutation.
          return json({
            error: "rollback_drill_audit_write_failed",
            detail: auditError instanceof Error
              ? auditError.message
              : String(auditError),
            report,
            safety: report.safety
          }, 500);
        }

        return json({
          ok: report.status === "PASS",
          report
        }, report.status === "PASS"
          ? 200
          : report.status === "REFUSED"
            ? 409
            : 500
        );
      } catch (error) {
        // runRollbackDrill owns emergency cleanup. Do not perform a second
        // independent mutation here.
        return json({
          error: error instanceof Error
            ? error.message
            : String(error),
          safety: {
            goLiveInstagram: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/scenes24/audit" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const latest = await latestSceneCatalogAudit(
          env.DB,
          slug
        );

        return json({
          ok: true,
          latest,
          safety: {
            productionMutated: false,
            engineControlMutated: false
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error
            ? error.message
            : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/scenes24/audit/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      try {
        const report = await runSceneCatalogAudit(
          env,
          slug,
          forecast
        );

        await recordSceneCatalogAudit(
          env.DB,
          report
        );

        return json({
          ok: report.status === "PASS",
          report,
          safety: report.safety
        }, report.status === "FAIL" ? 409 : 200);
      } catch (error) {
        return json({
          error: error instanceof Error
            ? error.message
            : String(error),
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            forecastWritten: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/fault-lab" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const latest = await latestFaultInjectionAudit(
          env.DB,
          slug
        );

        return json({
          ok: true,
          latest,
          safety: {
            productionMutated: false,
            engineControlMutated: false
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/fault-lab/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const report = await runFaultInjectionLab(env, slug);
        await recordFaultInjectionAudit(env.DB, report);

        return json({
          ok: report.status === "PASS",
          report,
          safety: report.safety
        }, report.status === "FAIL" ? 409 : 200);
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            forecastWritten: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/release-candidate" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const report = await evaluateReleaseCandidate(env, slug);
        const latestAudit =
          await latestReleaseCandidateAudit(env.DB, slug);

        return json({
          ok: report.technicalStatus === "RC_TECHNICAL_READY",
          report,
          latestAudit,
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            goLiveInstagram: false,
            goLiveBlock: "12.13"
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            productionMutated: false,
            goLiveInstagram: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/release-candidate/validate" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const report = await evaluateReleaseCandidate(env, slug);
        await recordReleaseCandidateAudit(env.DB, report);

        return json({
          ok: report.technicalStatus === "RC_TECHNICAL_READY",
          report,
          safety: {
            productionMutated: false,
            engineControlMutated: false,
            goLiveInstagram: false,
            auditOnlyMutation: true,
            goLiveBlock: "12.13"
          }
        }, report.technicalStatus === "RC_TECHNICAL_READY" ? 200 : 409);
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            productionMutated: false,
            goLiveInstagram: false
          }
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/approval" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const { readiness, forecast } = await approvalContext(env, slug);
        const control = await ensureEngineControl(env.DB, slug);
        const overview = await getV24ApprovalOverview(env.DB, slug);

        return json({
          ok: true,
          citySlug: slug,
          readiness: {
            status: readiness.status,
            summary: readiness.summary,
            blockers: readiness.blockers,
            sample: readiness.metrics.sample
          },
          forecast: {
            generatedAt: forecast.generatedAt,
            sceneLegacy: forecast.scene ?? null,
            scene24:
              forecast.diagnostics.scene24 &&
              typeof forecast.diagnostics.scene24 === "object"
                ? forecast.diagnostics.scene24
                : null
          },
          control,
          ...overview,
          safety: {
            doubleConfirmationRequired: true,
            readinessMustBe: "READY_CANDIDATE",
            perGenerationGuardRequired: true,
            publicCutoverConditional: true
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/approval/prepare" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      try {
        const { readiness, forecast } = await approvalContext(env, slug);
        const result = await prepareV24Approval(
          env.DB,
          slug,
          readiness,
          forecast
        );

        if (!result.ok) {
          return json({
            ...result,
            currentGenerationUnchanged: true,
            publicCutoverConditional: true
          }, result.error === "readiness_not_ready" ? 423 : 409);
        }

        return json({
          ...result,
          productionEngine: "LEGACY",
          productionActivationLocked: true
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/approval/confirm" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      let body: {
        challengeId?: unknown;
        confirmationPhrase?: unknown;
      } = {};

      try {
        body = await request.json() as typeof body;
      } catch {
        return json({ error: "invalid_json" }, 400);
      }

      if (
        typeof body.challengeId !== "string" ||
        typeof body.confirmationPhrase !== "string"
      ) {
        return json({ error: "challenge_and_phrase_required" }, 400);
      }

      try {
        const { readiness, forecast } = await approvalContext(env, slug);
        const result = await confirmV24Approval(env.DB, slug, {
          challengeId: body.challengeId,
          confirmationPhrase: body.confirmationPhrase,
          readiness,
          forecast
        });

        if (!result.ok) {
          return json({
            ...result,
            currentGenerationUnchanged: true,
            publicCutoverConditional: true
          }, result.error === "confirmation_phrase_mismatch" ? 400 : 409);
        }

        return json({
          ...result,
          currentGenerationUnchanged: true,
          publicCutoverConditional: true,
          nextStep:
            "Autorisation enregistrée. La prochaine génération pourra utiliser V24 uniquement si le garde-fou 12.4 passe ; sinon elle restera Legacy."
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    if (url.pathname === "/api/admin/engine/rollback" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      let reason = "manual_admin_rollback";
      try {
        const body = await request.json() as { reason?: unknown };
        if (typeof body?.reason === "string" && body.reason.trim()) {
          reason = body.reason.trim();
        }
      } catch {
        // Body is optional; rollback must remain easy.
      }

      await executeGlobalRollback(
        env.DB,
        slug,
        reason
      );

      return json(await engineStatus(env, slug));
    }

    if (url.pathname === "/api/admin/engine/preview-payload" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const status = await engineStatus(env, slug);
      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      try {
        const payload = buildV24PublicPayloadPreview(forecast);
        return json({
          ok: true,
          engine: status,
          payload,
          safety: {
            publishable: false,
            forecastSceneUnchanged: forecast.scene ?? null,
            productionEngine: "LEGACY"
          }
        });
      } catch (error) {
        return json({
          error: error instanceof Error ? error.message : String(error),
          safety: {
            publishable: false,
            forecastSceneUnchanged: forecast.scene ?? null,
            productionEngine: "LEGACY"
          }
        }, 409);
      }
    }

    if (url.pathname === "/api/admin/v24/prepublication" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug=url.searchParams.get("city")||"tarnos";
      if(!getCity(slug)) return json({error:"unknown_city"},404);
      try{
        const x=await v24Prepublication(env,slug);
        return json({ok:true,mode:"V24_PREPUBLICATION",payload:x.payload,engine:x.status,surfaces:{dashboard:"/preview24",instagram:"/instagram24-preview"},safety:{publishable:false,productionEngine:"LEGACY",forecastSceneUnchanged:x.forecast.scene??null,requiresPreviewMode:true}});
      }catch(error){
        const m=error instanceof Error?error.message:String(error);
        return json({error:m},m==="v24_preview_not_enabled"?423:409);
      }
    }

    if (url.pathname === "/api/history") {
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const limit = Number(url.searchParams.get("limit") || 30);
      return json(await forecastHistory(env.DB, slug, limit));
    }

    if (url.pathname === "/api/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);

      try {
        return json(await runOneCity(env, city, "manual"));
      } catch (error) {
        return json(
          { error: error instanceof Error ? error.message : String(error) },
          500
        );
      }
    }

    if (url.pathname === "/admin") {
      return new Response(renderAdmin(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    if (url.pathname === "/instagram") {
      const city = getCity("tarnos")!;
      const forecast = await latestForecast(env.DB, "tarnos");

      if (forecast) {
        const surface = await safePublicSurface(env, forecast);

        if (!surface || surface.engine === "UNAVAILABLE") {
          return new Response(
            publicUnavailableHtml(
              surface?.reason ?? "no_safe_public_surface"
            ),
            {
              status: 503,
              headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store"
              }
            }
          );
        }

        if (surface.engine === "V24") {
          return new Response(
            renderInstagramOfficial24(surface.payload, city.timezone),
            {
              headers: {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store"
              }
            }
          );
        }

        return new Response(
          renderInstagramGenerator(
            surface.forecast,
            city.latitude,
            city.longitude,
            city.timezone
          ),
          {
            headers: publicHeaders(
              surface.forecast,
              "instagram",
              { "content-type": "text/html; charset=utf-8" }
            )
          }
        );
      }

      return new Response(
        renderInstagramGenerator(
          null,
          city.latitude,
          city.longitude,
          city.timezone
        ),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store"
          }
        }
      );
    }

    if (url.pathname === "/preview24") {
      try{
        const x=await v24Prepublication(env,"tarnos");
        const city=getCity("tarnos")!;
        return new Response(renderV24PrepublicationDashboard(x.payload,city.timezone),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"}});
      }catch{
        return new Response("V24 preview unavailable",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"}});
      }
    }

    if (url.pathname === "/instagram24-preview") {
      try{
        const x=await v24Prepublication(env,"tarnos");
        const city=getCity("tarnos")!;
        return new Response(renderInstagramPrepublication24(x.payload,city.timezone),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"}});
      }catch{
        return new Response("V24 preview unavailable",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-robots-tag":"noindex, nofollow, noarchive"}});
      }
    }

    if (url.pathname === "/instagram24") {
      const city = getCity("tarnos")!;
      const forecast = await latestForecast(env.DB, "tarnos");

      return new Response(
        renderInstagram24(
          forecast,
          city.latitude,
          city.longitude,
          city.timezone
        ),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store"
          }
        }
      );
    }

    if (url.pathname === "/" || url.pathname === "/tarnos") {
      const city = getCity("tarnos")!;
      const forecast = await latestForecast(env.DB, "tarnos");

      if (!forecast) {
        return new Response(renderDashboard(null), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      }

      const surface = await safePublicSurface(env, forecast);

      if (!surface || surface.engine === "UNAVAILABLE") {
        return new Response(
          publicUnavailableHtml(
            surface?.reason ?? "no_safe_public_surface"
          ),
          {
            status: 503,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store"
            }
          }
        );
      }

      return new Response(
        surface.engine === "V24"
          ? renderDashboard24(surface.payload, city.timezone)
          : renderDashboard(surface.forecast),
        {
          headers: publicHeaders(
            surface.forecast,
            "dashboard",
            { "content-type": "text/html; charset=utf-8" }
          )
        }
      );
    }

    return json({ error: "not_found" }, 404);
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const hourInParis = localHour("Europe/Paris", controller.scheduledTime);
    if (hourInParis !== 5) return;

    ctx.waitUntil(runAllCities(env, "cron").then(() => undefined));
  }
};
