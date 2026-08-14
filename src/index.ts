import { getCity } from "./config/cities";
import { runAllCities, runOneCity } from "./pipeline";
import { forecastHistory, latestForecast, shadowHistory, shadowHistoryForDate } from "./storage/db";
import { loadShadowMetricRows } from "./storage/shadowMetrics";
import { calculateShadowMetrics } from "./analytics/shadowMetrics";
import { evaluateV24Readiness } from "./analytics/readiness";
import { resolveSceneEngineMode } from "./engine/engineMode";
import { buildV24PublicPayloadPreview } from "./engine/publicPreview";
import { ensureEngineControl, requestV24Preview, rollbackToLegacy } from "./storage/engineControl";
import { auditRollback, confirmV24Approval, getV24ApprovalOverview, prepareV24Approval } from "./storage/engineApproval";
import type { Env, LokaForecast, Scene24Candidate, SceneDecisionV24, DayProfile } from "./types";
import { renderAdmin, renderDashboard } from "./ui/dashboard";
import { renderInstagramGenerator } from "./ui/instagram";
import { renderInstagram24 } from "./ui/instagram24";
import { renderV24PrepublicationDashboard } from "./ui/prepublication24";
import { renderInstagramPrepublication24 } from "./ui/instagramPrepublication24";

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
      latestResolution: latestPipelineResolution
    },
    invariant: {
      forecastSceneStillLegacy: true,
      productionActivationAvailable: false,
      rollbackAlwaysAvailable: true,
      selectorConnectedToPipeline: true
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
      return json(await latestForecast(env.DB, slug));
    }

    if (url.pathname === "/api/decision") {
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      return json(forecast);
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
          "Bloc 12.2 exige /api/admin/engine/approval/prepare puis /confirm. Aucun état moteur n'a été modifié."
      }, 409);
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
            productionActivationLocked: true,
            effectiveProduction: "LEGACY"
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
            productionEngine: "LEGACY",
            productionActivationLocked: true
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
            productionEngine: "LEGACY",
            productionActivationLocked: true
          }, result.error === "confirmation_phrase_mismatch" ? 400 : 409);
        }

        return json({
          ...result,
          productionEngine: "LEGACY",
          productionActivationLocked: true,
          nextStep:
            "Approval stored. Effective V24 production remains unavailable until a later Bloc 12 removes the lock."
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

      await rollbackToLegacy(env.DB, slug, reason);

      try {
        await auditRollback(env.DB, slug, reason);
      } catch {
        // Rollback remains authoritative even if the audit table is unavailable.
      }

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

      return new Response(
        renderInstagramGenerator(
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
      const forecast = await latestForecast(env.DB, "tarnos");

      return new Response(renderDashboard(forecast), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
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
