import { getCity } from "./config/cities";
import { runAllCities, runOneCity } from "./pipeline";
import { forecastHistory, latestForecast } from "./storage/db";
import type { Env, LokaForecast, Scene24Candidate, SceneDecisionV24, DayProfile } from "./types";
import { renderAdmin, renderDashboard } from "./ui/dashboard";
import { renderInstagramGenerator } from "./ui/instagram";
import { renderInstagram24 } from "./ui/instagram24";

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

    // Bloc 6: protected, compact shadow-mode observability.
    if (url.pathname === "/api/shadow") {
      if (!isAuthorized(request, env)) return unauthorized();

      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);

      const forecast = await latestForecast(env.DB, slug);
      if (!forecast) return json({ error: "no_forecast" }, 404);

      return json(compactShadowComparison(forecast));
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
