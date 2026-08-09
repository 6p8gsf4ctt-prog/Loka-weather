import { getCity } from "./config/cities";
import { runAllCities, runOneCity } from "./pipeline";
import { forecastHistory, latestForecast } from "./storage/db";
import type { Env } from "./types";
import { renderAdmin, renderDashboard } from "./ui/dashboard";
import { renderInstagramGenerator } from "./ui/instagram";

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "LOKA Weather",
        version: "0.5.2",
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
