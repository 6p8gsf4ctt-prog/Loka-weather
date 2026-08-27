import { CITIES, getCity } from "./config/cities";
import { MODELS } from "./config/models";
import { resolvePublicSurfaceSafely } from "./engine/publicFailSafe";
import { renderInstagramV3Assets, serveInstagramV3Asset } from "./automation/instagramV3Renderer";
import { resolveInstagramV3RenderSource } from "./automation/instagramV3RenderSource";
import { buildInstagramV3ShadowPlan, finalizeInstagramV3ShadowPlanWithRender } from "./engine/instagramV3Shadow";
import { localDate, runManualCity, runScheduledCity } from "./pipeline";
import { generationHistory, officialForDate, officialHistory } from "./storage/db";
import { annualSceneReport, promoteVerifiedGeneration } from "./storage/dailySceneLedger";
import { editorialFeedbackForOfficial, saveEditorialFeedback } from "./storage/editorialFeedback";
import { recentInstagramV3ShadowAudits, recordInstagramV3ShadowAudit } from "./storage/instagramV3Shadow";
import { buildEditorialLearningExport } from "./storage/editorialFeedbackExport";
import type { Env } from "./types";
import { renderAdmin } from "./ui/admin";
import { renderDashboard24 } from "./ui/dashboard24";
import { enhanceInstagramWithEditorialStudio } from "./ui/instagramEditorialStudio";
import { enhanceInstagramWithEditorialPersistence } from "./ui/instagramEditorialPersistence";
import { enhanceInstagramWithEditorialExport } from "./ui/instagramEditorialExport";
import { renderInstagramOfficial24 } from "./ui/instagramOfficial24";
import { renderInstagramCarouselV3Preview } from "./ui/instagramCarouselV3Preview";
import { enhanceInstagramWithV3OfficialStudio } from "./ui/instagramV3ParallelStudio";
import { enhanceInstagramWithV3MediaAccess } from "./ui/instagramV3MediaAccess";
import { renderInstagramRecovery } from "./ui/instagramRecovery";
import { renderScenePreviewFrame, renderScenePreviewGallery, renderScenePreviewStudio, type PreviewGalleryView } from "./ui/instagramScenePreview24";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
}
function unauthorized(): Response { return json({ error: "unauthorized" }, 401); }
function isAuthorized(request: Request, env: Env): boolean {
  return !!env.ADMIN_TOKEN && request.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
}
function localHour(timezone: string, epochMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(epochMs));
  return Number(parts.find((p) => p.type === "hour")?.value ?? -1);
}
function unavailable(reason: string): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA! indisponible</title><style>body{margin:0;background:#071b3b;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:30px}strong{color:#fdb515;font-size:32px}p{color:#c2cede;max-width:480px}</style></head><body><main><strong>LOKA!</strong><p>La prévision V24 officielle est temporairement indisponible.</p><small>${reason.replace(/[<>&]/g, "")}</small></main></body></html>`, {
    status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}
async function safeToday(env: Env, citySlug: string) {
  const city = getCity(citySlug);
  if (!city) return null;
  const date = localDate(city.timezone);
  const stored = await officialForDate(env.DB, city.slug, date);
  const surface = await resolvePublicSurfaceSafely(stored?.payload ?? null, stored?.manifest ?? null);
  return { city, date, surface };
}

async function masterAvailable(request: Request, env: Env, path: string): Promise<boolean> {
  if (!env.ASSETS) return true;
  try {
    const url = new URL(request.url); url.pathname = path;
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method: "HEAD" }));
    return response.ok;
  } catch { return false; }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/media/instagram-v3/")) return serveInstagramV3Asset(env, url.pathname);
    if (url.pathname === "/api/health") return json({ ok: true, engine: "V24", version: "2.0.0", models: MODELS.map((m) => m.id), sceneCount: 24 });

    if (url.pathname === "/api/latest") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      return json(result.surface.payload);
    }
    if (url.pathname === "/api/decision") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      return json(result.surface.payload.decision);
    }
    if (url.pathname === "/api/history") {
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);
      return json(await officialHistory(env.DB, slug, Number(url.searchParams.get("limit") || 30)));
    }
    if (url.pathname === "/instagram-scenes-preview") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug); if (!city) return json({ error: "unknown_city" }, 404);
      const pack = Number(url.searchParams.get("pack") || 1);
      const rawView = url.searchParams.get("view");
      const view: PreviewGalleryView = rawView === "feed" || rawView === "engagement" ? rawView : "story";
      return new Response(renderScenePreviewGallery(city, pack, view), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/instagram-scenes-preview/frame") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug); if (!city) return json({ error: "unknown_city" }, 404);
      const sceneId = Number(url.searchParams.get("scene") || 1) as any;
      if (!Number.isInteger(sceneId) || sceneId < 1 || sceneId > 24) return json({ error: "invalid_scene" }, 400);
      const rawView = url.searchParams.get("view");
      const view: PreviewGalleryView = rawView === "feed" || rawView === "engagement" ? rawView : "story";
      return new Response(renderScenePreviewFrame(city, sceneId, view), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname === "/instagram-scenes-preview/studio") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug); if (!city) return json({ error: "unknown_city" }, 404);
      const sceneId = Number(url.searchParams.get("scene") || 1) as any;
      if (!Number.isInteger(sceneId) || sceneId < 1 || sceneId > 24) return json({ error: "invalid_scene" }, 400);
      return new Response(renderScenePreviewStudio(city, sceneId), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }

    if (url.pathname === "/api/scenes/year") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug); if (!city) return json({ error: "unknown_city" }, 404);
      const year = Number(url.searchParams.get("year") || localDate(city.timezone).slice(0, 4));
      if (!Number.isInteger(year) || year < 2020 || year > 2100) return json({ error: "invalid_year" }, 400);
      return json(await annualSceneReport(env.DB, slug, year, localDate(city.timezone)));
    }

    if (url.pathname === "/api/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug); if (!city) return json({ error: "unknown_city" }, 404);
      try {
        const generated = await runManualCity(env, city);
        return json({ ok: true, previewOnly: true, generationId: generated.generationId, payload: generated.payload, manifest: generated.manifest });
      } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 500); }
    }
    if (url.pathname === "/api/admin/instagram/prepare" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);

      const existing = await safeToday(env, slug);
      if (existing && existing.surface.engine === "V24") {
        return json({
          ok: true,
          alreadyOfficial: true,
          scene: { id: existing.surface.payload.scene.id, label: existing.surface.payload.scene.label }
        });
      }

      try {
        const generated = await runManualCity(env, city);

        // A scheduled job may have officialized the day while the manual generation was running.
        // In that case, keep the manual generation only as an archived preview and never create a correction.
        const concurrent = await safeToday(env, slug);
        if (concurrent && concurrent.surface.engine === "V24") {
          return json({
            ok: true,
            alreadyOfficial: true,
            archivedPreviewGenerationId: generated.generationId,
            scene: { id: concurrent.surface.payload.scene.id, label: concurrent.surface.payload.scene.label }
          });
        }

        try {
          const ledger = await promoteVerifiedGeneration(
            env.DB,
            generated.generationId,
            "Préparation Instagram manuelle"
          );
          const prepared = await safeToday(env, slug);
          if (!prepared || prepared.surface.engine === "UNAVAILABLE") {
            throw new Error("prepared_surface_unavailable");
          }
          return json({
            ok: true,
            prepared: true,
            generationId: generated.generationId,
            ledger: { revision: ledger.revision, status: ledger.status },
            scene: { id: prepared.surface.payload.scene.id, label: prepared.surface.payload.scene.label }
          });
        } catch (promotionError) {
          // If another request won the race, a valid official surface is enough: do not retry promotion.
          const raced = await safeToday(env, slug);
          if (raced && raced.surface.engine === "V24") {
            return json({
              ok: true,
              alreadyOfficial: true,
              archivedPreviewGenerationId: generated.generationId,
              scene: { id: raced.surface.payload.scene.id, label: raced.surface.payload.scene.label }
            });
          }
          throw promotionError;
        }
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    if (url.pathname === "/api/admin/instagram/editorial-feedback") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);

      const date = localDate(city.timezone);
      const stored = await officialForDate(env.DB, city.slug, date);
      const surface = await resolvePublicSurfaceSafely(stored?.payload ?? null, stored?.manifest ?? null);
      if (!stored || surface.engine === "UNAVAILABLE") {
        return json({ error: surface.engine === "UNAVAILABLE" ? surface.reason : "official_v24_unavailable" }, 409);
      }

      if (request.method === "GET") {
        try {
          const feedback = await editorialFeedbackForOfficial(env.DB, surface.payload, stored.manifest);
          return json({
            ok: true,
            feedback: feedback ? {
              storyEdited: feedback.storyEdited,
              feedEdited: feedback.feedEdited,
              updatedAt: feedback.updatedAt
            } : null
          });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : String(error) }, 409);
        }
      }

      if (request.method === "POST") {
        let body: { story?: unknown; feed?: unknown } = {};
        try { body = await request.json() as typeof body; }
        catch { return json({ error: "invalid_json" }, 400); }

        try {
          const feedback = await saveEditorialFeedback(env.DB, {
            payload: surface.payload,
            manifest: stored.manifest,
            story: (body.story ?? null) as Parameters<typeof saveEditorialFeedback>[1]["story"],
            feed: (body.feed ?? null) as Parameters<typeof saveEditorialFeedback>[1]["feed"]
          });
          return json({
            ok: true,
            feedback: feedback ? {
              storyEdited: feedback.storyEdited,
              feedEdited: feedback.feedEdited,
              updatedAt: feedback.updatedAt
            } : null
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status = message.startsWith("editorial_feedback_invalid_") || message.includes("too_long") ? 400 : 409;
          return json({ error: message }, status);
        }
      }

      return json({ error: "method_not_allowed" }, 405);
    }

    if (url.pathname === "/api/admin/instagram/editorial-feedback/export" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);
      const limit = Number(url.searchParams.get("limit") || 100);
      try {
        const dataset = await buildEditorialLearningExport(env.DB, slug, limit);
        const date = localDate(city.timezone);
        return new Response(JSON.stringify(dataset, null, 2), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": `attachment; filename="loka-editorial-feedback-${slug}-${date}.json"`,
            "cache-control": "no-store"
          }
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    if (url.pathname === "/api/admin/instagram/v3-shadow" && request.method === "GET") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);
      try {
        return json({
          mode: "DRY_RUN",
          realInstagramPublicationAllowed: false,
          audits: await recentInstagramV3ShadowAudits(env.DB, slug, Number(url.searchParams.get("limit") || 14))
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }
    if (url.pathname === "/api/admin/instagram/v3-shadow/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      try {
        const renderSource = await resolveInstagramV3RenderSource(result.surface.payload, {
          loadHistory: () => generationHistory(env.DB, slug, 30),
          generateFresh: async () => {
            const generated = await runManualCity(env, result.city);
            return { payload: generated.payload, generationId: generated.generationId };
          }
        });
        const shadow = await buildInstagramV3ShadowPlan(renderSource.payload, renderSource.generationId, "MANUAL_ADMIN");
        const render = await renderInstagramV3Assets(env, renderSource.payload, shadow);
        const plan = await finalizeInstagramV3ShadowPlanWithRender(shadow, render);
        await recordInstagramV3ShadowAudit(env.DB, plan);
        return json({ ok: plan.status === "DRY_RUN_READY", renderStatus: render.status, renderSource: renderSource.source, plan });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }

    if (url.pathname === "/api/admin/generations") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      if (!getCity(slug)) return json({ error: "unknown_city" }, 404);
      return json(await generationHistory(env.DB, slug, Number(url.searchParams.get("limit") || 30)));
    }
    if (url.pathname === "/api/admin/scene/promote" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      let body: { generationId?: unknown; reason?: unknown } = {};
      try { body = await request.json() as typeof body; } catch { return json({ error: "invalid_json" }, 400); }
      const generationId = Number(body.generationId);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!Number.isInteger(generationId) || generationId < 1 || reason.length < 3) return json({ error: "generationId_and_reason_required" }, 400);
      try { return json({ ok: true, ledger: await promoteVerifiedGeneration(env.DB, generationId, reason) }); }
      catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 409); }
    }

    if (url.pathname === "/admin") return new Response(renderAdmin(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });


    if (url.pathname === "/instagram-v3-preview") {
      const result = await safeToday(env, "tarnos");
      if (!result) return unavailable("unknown_city");
      if (result.surface.engine === "UNAVAILABLE") return unavailable(result.surface.reason);
      if (!await masterAvailable(request, env, result.surface.payload.scene.masterUrl)) return unavailable("master_graphic_unavailable");
      const requestedPage = url.searchParams.get("page") === "2" ? 2 : 1;
      return new Response(renderInstagramCarouselV3Preview(result.surface.payload, result.city, {
        embedded: url.searchParams.get("embed") === "1",
        studioPrimary: url.searchParams.get("studio") === "primary",
        studioOfficial: url.searchParams.get("studio") === "official",
        automationRender: url.searchParams.get("automation") === "render",
        automationPage: requestedPage
      }), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/instagram") {
      const result = await safeToday(env, "tarnos");
      if (!result) return unavailable("unknown_city");
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      if (!await masterAvailable(request, env, result.surface.payload.scene.masterUrl)) return unavailable("master_graphic_unavailable");
      const instagramHtml = renderInstagramOfficial24(result.surface.payload, result.city);
      const studioHtml = result.surface.payload.analysis ? enhanceInstagramWithV3OfficialStudio(instagramHtml) : instagramHtml;
      const mediaHtml = enhanceInstagramWithV3MediaAccess(studioHtml);
      const editorialHtml = enhanceInstagramWithEditorialStudio(mediaHtml);
      const persistentHtml = enhanceInstagramWithEditorialPersistence(editorialHtml, result.city.slug);
      const exportHtml = enhanceInstagramWithEditorialExport(persistentHtml, result.city.slug);
      return new Response(exportHtml, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }

    if (url.pathname === "/" || url.pathname === "/tarnos") {
      const result = await safeToday(env, "tarnos");
      if (!result || result.surface.engine === "UNAVAILABLE") return unavailable(result && result.surface.engine === "UNAVAILABLE" ? result.surface.reason : "unknown_city");
      return new Response(renderDashboard24(result.surface.payload, result.city.timezone), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }

    return json({ error: "not_found" }, 404);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const instant = new Date(controller.scheduledTime);
    const jobs: Promise<unknown>[] = [];
    for (const city of Object.values(CITIES)) {
      const hour = localHour(city.timezone, controller.scheduledTime);
      if (hour === 5) jobs.push(runScheduledCity(env, city, "PRIMARY", instant));
      else if (hour === 6) jobs.push(runScheduledCity(env, city, "RETRY", instant));
    }
    if (jobs.length) ctx.waitUntil(Promise.allSettled(jobs).then(() => undefined));
  }
};
