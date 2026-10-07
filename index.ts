import { CITIES, getCity } from "./config/cities";
import { MODELS } from "./config/models";
import { resolvePublicSurfaceSafely } from "./engine/publicFailSafe";
import { buildDailyInsightPreview } from "./engine/dailyInsight/previewEngine";
import { evaluateDailyInsightStoryRollout, isDailyInsightStoryEnabled, isDailyInsightStoryRollbackRequested, logDailyInsightStoryRollout } from "./engine/dailyInsight/rollout";
import { evaluateDailyInsightOp5, isDailyInsightOp5Enabled, isDailyInsightOp5RollbackRequested } from "./engine/dailyInsight/op5Rollout";
import { applyDailyInsightManualSelection, clearDailyInsightManualSelection as restoreDailyInsightAutomaticSelection, dailyInsightCandidateManualStatus } from "./engine/dailyInsight/editorialSelection";
import { DAILY_INSIGHT_BOOTSTRAP_CRON, dailyInsightOp5ScheduledAction, dailyInsightScheduledAction } from "./engine/dailyInsight/schedule";
import { generateDailyInsightLabPreview } from "./dailyInsightLab";
import { WEEKLY_CLIMATE_STATION_ID } from "./engine/weekly/climateReferences";
import { isWeeklyEnabled, renderWeeklyCarousel, resolveWeeklyPublicSurface, logWeeklyProgressivePublication } from "./engine/weekly";
import { applyWeeklyManualSelection, generateWeeklyCalmVisualPreview, generateWeeklyContextualVisualPreview, generateWeeklyCity, generateWeeklyPreviewCity, localDateIsMonday, runManualWeeklyCity, runScheduledWeeklyCity, weeklyPreviewRenderOptions, weeklyRangeForDate } from "./weeklyPipeline";
import { localDate, runManualCity, runScheduledCity } from "./pipeline";
import { generationHistory, officialForDate, officialHistory } from "./storage/db";
import { annualSceneReport, promoteVerifiedGeneration } from "./storage/dailySceneLedger";
import { editorialFeedbackForOfficial, saveEditorialFeedback } from "./storage/editorialFeedback";
import { buildEditorialLearningExport } from "./storage/editorialFeedbackExport";
import { saveWeeklyPublication, weeklyPublicationForRange } from "./storage/weeklyPublications";
import { loadWeeklyPreviewDraft, saveWeeklyPreviewDraft } from "./storage/weeklyPreviewDrafts";
import { loadDailyInsightReference } from "./storage/dailyInsightReferences";
import { loadDailyInsightEditorialDraft, saveDailyInsightEditorialDraft } from "./storage/dailyInsightEditorialDrafts";
import { clearDailyInsightManualSelection, saveDailyInsightManualSelection } from "./storage/dailyInsightManualSelections";
import type { Env } from "./types";
import { renderAdmin } from "./ui/admin";
import { enhanceInstagramWithEditorialStudio } from "./ui/instagramEditorialStudio";
import { enhanceInstagramWithEditorialPersistence } from "./ui/instagramEditorialPersistence";
import { enhanceInstagramWithEditorialExport } from "./ui/instagramEditorialExport";
import { renderInstagramDailyGraphicPreview } from "./ui/instagramDailyGraphicPreview";
import { renderDailyInsightPreview } from "./ui/dailyInsightPreview";
import { renderDailyInsightLabPreview } from "./ui/dailyInsightLabPreview";
import { renderDailyInsightOp4Gallery, renderDailyInsightOp4Scenario } from "./ui/dailyInsightOp4Gallery";
import { renderDailyInsightCandidateStory, renderDailyInsightOp5Story } from "./ui/dailyInsightOp5Story";
import { renderDailyInsightScenarioGallery, renderDailyInsightStoryPage, renderDailyInsightStorySilence } from "./ui/dailyInsightStory";
import { renderDailyInsightControl } from "./ui/dailyInsightControl";
import { renderInstagramOfficial24 } from "./ui/instagramOfficial24";
import { renderInstagramRecovery } from "./ui/instagramRecovery";
import { renderScenePreviewFrame, renderScenePreviewGallery, renderScenePreviewStudio, type PreviewGalleryView } from "./ui/instagramScenePreview24";
import { renderWeeklyCandidatePreview, renderWeeklyPreviewGate, renderWeeklySelectionPanel } from "./ui/weeklyPreview";
import { ensureDailyInsightBackgroundReference } from "./weather/dailyInsightReference";
import { normalizeWorkerPathname } from "./http/normalizePathname";
import { canonicalPublicRedirect } from "./http/canonicalPublicRoutes";

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
async function currentWeekly(env: Env, citySlug: string, requestedStartDate?: string) {
  const city = getCity(citySlug);
  if (!city) return null;
  const range = weeklyRangeForDate(requestedStartDate || localDate(city.timezone));
  const publication = await weeklyPublicationForRange(env.DB, city.slug, range.startDate, range.endDate);
  return { city, range, publication };
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
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    url.pathname = normalizeWorkerPathname(url.pathname);
    const canonicalRedirect = canonicalPublicRedirect(url.toString(), request.method);
    if (canonicalRedirect) {
      console.info("LOKA_LEGACY_PUBLIC_ROUTE_REDIRECT", JSON.stringify({ from: url.pathname, to: new URL(canonicalRedirect).pathname }));
      return new Response(null, {
        status: 302,
        headers: {
          "location": canonicalRedirect,
          "cache-control": "no-store",
          "x-loka-route-cleanup": "phase-1-redirect"
        }
      });
    }
    if (url.pathname === "/api/health") return json({
      ok: true, engine: "V24", version: "2.0.0", models: MODELS.map((m) => m.id), sceneCount: 24,
      dailyInsightStory: {
        enabled: isDailyInsightStoryEnabled(env),
        rollback: isDailyInsightStoryRollbackRequested(env),
        op5: { enabled: isDailyInsightOp5Enabled(env), rollback: isDailyInsightOp5RollbackRequested(env) }
      }
    });
    if (url.pathname === "/api/daily-insight/status" && request.method === "GET") {
      const cache = await loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID);
      const city = CITIES.tarnos;
      const targetDate = localDate(city.timezone);
      const draft = await loadDailyInsightEditorialDraft(env.DB, city.slug, targetDate);
      const op5 = evaluateDailyInsightOp5(env, draft, new Date());
      return json({
        story: { enabled: isDailyInsightStoryEnabled(env), rollback: isDailyInsightStoryRollbackRequested(env) },
        op5: { enabled: isDailyInsightOp5Enabled(env), rollback: isDailyInsightOp5RollbackRequested(env), mode: op5.mode, reason: op5.reason, targetDate, draftStatus: draft.status },
        cache: { status: cache.status, detail: cache.detail }
      });
    }
    if (url.pathname === "/api/admin/daily-insight/rebuild-reference" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      try {
        // A first climate import can exceed the short lifetime granted to an
        // HTTP waitUntil task. Keep the request open so Cloudflare cannot stop
        // the archive import before the reference cache is committed.
        const result = await ensureDailyInsightBackgroundReference(env, new Date());
        console.info("LOKA_DAILY_INSIGHT_MANUAL_REBUILD", JSON.stringify({ status: result.status, detail: result.detail, rebuilt: result.rebuilt }));
        if (result.status !== "READY") {
          return json({ ok: false, error: result.detail, status: result.status, rebuilt: result.rebuilt }, 503);
        }
        return json({ ok: true, status: result.status, detail: result.detail, rebuilt: result.rebuilt });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error("LOKA_DAILY_INSIGHT_MANUAL_REBUILD_FAILED", detail);
        return json({ ok: false, error: detail, status: "FAILED", rebuilt: false }, 503);
      }
    }
    if (url.pathname === "/daily-insight-control" && request.method === "GET") {
      return new Response(renderDailyInsightControl(), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/daily-insight-lab-preview" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);
      const targetDate = url.searchParams.get("date") || localDate(city.timezone);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
        return json({ error: "invalid_date" }, 400);
      }
      const preview = await generateDailyInsightLabPreview(env, city, targetDate, new Date());
      return new Response(renderDailyInsightLabPreview(city, preview), {
        status: preview.status === "READY" ? 200 : 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-insight-lab": preview.status,
          "server-timing": `reference;dur=${preview.timings.referenceMs}, forecast;dur=${preview.timings.forecastMs}, enrichment;dur=${preview.timings.enrichmentMs}, selection;dur=${preview.timings.selectionMs}, persistence;dur=${preview.timings.persistenceMs}, total;dur=${preview.timings.totalMs}`
        }
      });
    }

    if (url.pathname === "/daily-insight-lab-shared-story" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      const targetDate = url.searchParams.get("date") || result.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
        return json({ error: "invalid_date" }, 400);
      }
      const preview = await generateDailyInsightLabPreview(env, result.city, targetDate, new Date());
      const winner = preview.selection?.winner;
      if (!winner) return new Response(renderDailyInsightStorySilence({ city: result.city.name, date: targetDate, reason: preview.detail }), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
      return new Response(renderDailyInsightCandidateStory({ ...result.surface.payload, date: targetDate }, result.city, winner), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-loka-graphic-engine": "daily-shared" }
      });
    }

    if (url.pathname === "/daily-insight-candidate-story" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      const targetDate = url.searchParams.get("date") || result.date;
      const candidateId = url.searchParams.get("candidate") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || !candidateId) return json({ error: "date_and_candidate_required" }, 400);
      let draft = await loadDailyInsightEditorialDraft(env.DB, result.city.slug, targetDate);
      if (draft.status !== "READY" || !draft.selection) {
        await generateDailyInsightLabPreview(env, result.city, targetDate, new Date());
        draft = await loadDailyInsightEditorialDraft(env.DB, result.city.slug, targetDate);
      }
      const candidate = draft.selection?.candidates.find((item) => item.id === candidateId) ?? null;
      if (!candidate) return json({ error: "candidate_not_found" }, 404);
      if (dailyInsightCandidateManualStatus(candidate) === "BLOCKED") return json({ error: "candidate_blocked" }, 409);
      return new Response(renderDailyInsightCandidateStory({ ...result.surface.payload, date: targetDate }, result.city, candidate), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-loka-daily-insight-candidate": candidate.detectorId }
      });
    }

    if (url.pathname === "/api/admin/daily-insight/select" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      let body: { city?: unknown; date?: unknown; candidateId?: unknown };
      try { body = await request.json() as typeof body; } catch { return json({ error: "invalid_json" }, 400); }
      const city = getCity(typeof body.city === "string" ? body.city : "tarnos");
      const targetDate = typeof body.date === "string" ? body.date : "";
      const candidateId = typeof body.candidateId === "string" ? body.candidateId : body.candidateId === null ? null : undefined;
      if (!city || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || candidateId === undefined) return json({ error: "city_date_and_candidate_required" }, 400);
      const draft = await loadDailyInsightEditorialDraft(env.DB, city.slug, targetDate);
      if (draft.status !== "READY" || !draft.selection) return json({ error: "daily_insight_draft_unavailable" }, 409);
      try {
        if (candidateId === null) {
          const automatic = restoreDailyInsightAutomaticSelection(draft.selection);
          await clearDailyInsightManualSelection(env.DB, city.slug, targetDate);
          await saveDailyInsightEditorialDraft(env.DB, automatic);
          return json({ ok: true, mode: "AUTOMATIC", candidateId: automatic.winner?.id ?? null, detectorId: automatic.winner?.detectorId ?? null });
        }
        const selectedAt = new Date().toISOString();
        const selected = applyDailyInsightManualSelection(draft.selection, candidateId, selectedAt);
        await saveDailyInsightManualSelection(env.DB, { citySlug: city.slug, targetDate, candidateId, selectedAt });
        await saveDailyInsightEditorialDraft(env.DB, selected);
        return json({ ok: true, mode: "MANUAL", candidateId, detectorId: selected.winner?.detectorId ?? null, classification: selected.manualOverride?.classification });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 409);
      }
    }

    if (url.pathname === "/daily-insight-op4-gallery" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);
      const targetDate = url.searchParams.get("date") || localDate(city.timezone);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
        return json({ error: "invalid_date" }, 400);
      }
      const preview = await generateDailyInsightLabPreview(env, city, targetDate, new Date());
      return new Response(renderDailyInsightOp4Gallery(city, targetDate, preview), {
        status: preview.status === "READY" ? 200 : 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-insight-op4": preview.status
        }
      });
    }

    if (url.pathname === "/daily-insight-op4-scenario" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      const targetDate = url.searchParams.get("date") || result.date;
      const caseId = url.searchParams.get("case") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`))) {
        return json({ error: "invalid_date" }, 400);
      }
      const html = renderDailyInsightOp4Scenario(
        { ...result.surface.payload, date: targetDate },
        result.city,
        targetDate,
        caseId
      );
      if (!html) return json({ error: "unknown_scenario" }, 404);
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-graphic-engine": "daily-shared"
        }
      });
    }

    if (url.pathname === "/api/latest") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") return json({ error: result.surface.reason }, 503);
      return json(result.surface.payload);
    }
    if (url.pathname === "/api/weekly" && request.method === "GET") {
      if (!isWeeklyEnabled(env)) return json({ error: "weekly_disabled" }, 404);
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await currentWeekly(env, slug, url.searchParams.get("start") || undefined);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (!result.publication) return json({ error: "weekly_not_found", ...result.range }, 404);
      const surface = resolveWeeklyPublicSurface(env, result.publication.editorial, result.publication.carousel);
      logWeeklyProgressivePublication(surface.rollout, { citySlug: result.publication.citySlug, startDate: result.publication.startDate, endDate: result.publication.endDate });
      return json({ ...result.publication, editorial: surface.editorial, carousel: surface.carousel, rollout: surface.rollout });
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

    if (url.pathname === "/api/admin/weekly/preview" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);
      try {
        const generated = await generateWeeklyPreviewCity(env, city, new Date(), url.searchParams.get("start") || undefined);
        return json({ ok: true, previewOnly: true, pilot: generated.pilot, activation: generated.activation, editorial: generated.editorial, carousel: generated.carousel });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message === "weekly_preview_start_requires_monday" ? 400 : message.startsWith("LOKA_WEEKLY_NEEDS_3_MODELS") ? 503 : 500;
        return json({ error: message }, status);
      }
    }

    if (url.pathname === "/api/admin/weekly/run" && request.method === "POST") {
      if (!isAuthorized(request, env)) return unauthorized();
      if (!isWeeklyEnabled(env)) return json({ error: "weekly_disabled" }, 404);
      const slug = url.searchParams.get("city") || "tarnos";
      const city = getCity(slug);
      if (!city) return json({ error: "unknown_city" }, 404);
      try {
        const publication = await runManualWeeklyCity(env, city);
        return json({
          ok: true,
          publication: {
            id: publication.id,
            citySlug: publication.citySlug,
            startDate: publication.startDate,
            endDate: publication.endDate,
            generatedAt: publication.generatedAt,
            status: publication.status,
            carousel: publication.carousel
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message === "weekly_generation_requires_monday" ? 409 : 500;
        return json({ error: message }, status);
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

    if (url.pathname === "/instagram" || url.pathname === "/tarnos") {
      const destination = new URL(request.url);
      destination.pathname = "/";
      destination.search = "";
      return Response.redirect(destination.toString(), 308);
    }

    if (url.pathname === "/daily-graphic-preview" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      if (!await masterAvailable(request, env, result.surface.payload.scene.masterUrl)) return unavailable("master_graphic_unavailable");
      // Do not reconstruct the complete historical D1 archive in an
      // interactive request: it exceeds Cloudflare's CPU limit (1102).
      // The primary daily graphic remains available; comparison material is
      // produced only when a background-prepared reference can be consumed.
      const comparison = null;
      const previewHtml = renderInstagramDailyGraphicPreview(result.surface.payload, result.city, comparison);
      const editorialHtml = enhanceInstagramWithEditorialStudio(previewHtml);
      const persistentHtml = enhanceInstagramWithEditorialPersistence(editorialHtml, result.city.slug);
      const exportHtml = enhanceInstagramWithEditorialExport(persistentHtml, result.city.slug);
      return new Response(exportHtml, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-graphic-variant": "weekly-inspired-v5-safe-hourly-precipitation",
          "x-loka-daily-story-deck": "primary-active-complements-test"
        }
      });
    }

    if (url.pathname === "/daily-insight-preview/scenarios" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      return new Response(renderDailyInsightScenarioGallery(result.surface.payload), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-insight": "scenario-gallery"
        }
      });
    }

    if (url.pathname === "/daily-insight-story" && request.method === "GET") {
      const startedAt = performance.now();
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      const op5DraftStartedAt = performance.now();
      const op5Draft = await loadDailyInsightEditorialDraft(env.DB, result.city.slug, result.date);
      const op5Decision = evaluateDailyInsightOp5(env, op5Draft, new Date());
      const op5DraftDurationMs = performance.now() - op5DraftStartedAt;
      console.info("LOKA_DAILY_INSIGHT_OP5", JSON.stringify({ citySlug: result.city.slug, date: result.date, mode: op5Decision.mode, reason: op5Decision.reason, draftStatus: op5Draft.status }));
      if (op5Decision.mode === "LEGACY_FALLBACK" && isDailyInsightOp5Enabled(env) && !isDailyInsightOp5RollbackRequested(env)
        && op5Draft.status !== "READY" && ctx) {
        // A new editorial engine version invalidates the previous draft. The
        // first story request prepares its replacement out of band while the
        // already deployed legacy story remains available for this response.
        ctx.waitUntil(generateDailyInsightLabPreview(env, result.city, result.date, new Date()).then((preview) => {
          console.info("LOKA_DAILY_INSIGHT_OP5_LAZY_REFRESH", JSON.stringify({
            citySlug: result.city.slug,
            targetDate: result.date,
            status: preview.status,
            selection: preview.selection?.status ?? null,
            winner: preview.selection?.winner?.detectorId ?? null,
            persisted: preview.persistence.draftSaved
          }));
        }));
      }
      if (op5Decision.mode === "ACTIVE" && op5Decision.selection?.winner) {
        return new Response(renderDailyInsightOp5Story(result.surface.payload, result.city, op5Decision), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-loka-daily-insight-op5": op5Decision.mode,
            "x-loka-daily-insight-op5-reason": op5Decision.reason,
            "server-timing": `draft;dur=${op5DraftDurationMs.toFixed(2)}, total;dur=${(performance.now() - startedAt).toFixed(2)}`
          }
        });
      }
      if (op5Decision.mode === "EDITORIAL_SILENCE") {
        return new Response(renderDailyInsightStorySilence({ city: result.city.name, date: result.date, reason: op5Decision.reason }), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-loka-daily-insight-op5": op5Decision.mode,
            "x-loka-daily-insight-op5-reason": op5Decision.reason
          }
        });
      }
      // OP5 is unavailable, disabled or rolled back: preserve the previous
      // Daily Insight implementation as the immediate operational fallback.
      if (!await masterAvailable(request, env, result.surface.payload.scene.masterUrl)) return unavailable("master_graphic_unavailable");
      const cacheStartedAt = performance.now();
      const cache = await loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID);
      const cacheDurationMs = performance.now() - cacheStartedAt;
      const engineStartedAt = performance.now();
      const preview = cache.snapshot ? buildDailyInsightPreview(result.surface.payload, cache.snapshot) : null;
      const engineDurationMs = performance.now() - engineStartedAt;
      const decision = evaluateDailyInsightStoryRollout(env, preview, engineDurationMs);
      logDailyInsightStoryRollout(decision, { citySlug: result.city.slug, date: result.date, cacheStatus: cache.status });
      const renderStartedAt = performance.now();
      const html = decision.exposeStory && preview?.winner
        ? renderDailyInsightStoryPage(result.surface.payload, preview.winner, decision)
        : renderDailyInsightStorySilence({ city: result.city.name, date: result.date, reason: decision.reason });
      const renderDurationMs = performance.now() - renderStartedAt;
      const totalDurationMs = performance.now() - startedAt;
      return new Response(html, {
        status: decision.mode === "DISABLED" || decision.mode === "ROLLBACK" ? 404 : 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-insight-rollout": decision.mode,
          "x-loka-daily-insight-reason": decision.reason,
          "x-loka-daily-insight-op5": op5Decision.mode,
          "x-loka-daily-insight-op5-reason": op5Decision.reason,
          "x-loka-daily-insight-engine-ms": decision.engineDurationMs.toFixed(2),
          "server-timing": `cache;dur=${cacheDurationMs.toFixed(2)}, engine;dur=${engineDurationMs.toFixed(2)}, render;dur=${renderDurationMs.toFixed(2)}, total;dur=${totalDurationMs.toFixed(2)}`
        }
      });
    }

    if (url.pathname === "/daily-insight-preview" && request.method === "GET") {
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await safeToday(env, slug);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      const cache = await loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID);
      const preview = cache.snapshot ? buildDailyInsightPreview(result.surface.payload, cache.snapshot) : null;
      return new Response(renderDailyInsightPreview(result.surface.payload, preview, cache.detail), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-loka-daily-insight": preview?.status ?? cache.status
        }
      });
    }

    if (url.pathname === "/weekly-preview") {
      if (request.method !== "GET" && request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { "allow": "GET, POST" } });
      // This is the manual public workflow: always real forecasts, always the
      // next Monday by default, never a demo mode or an admin token.
      let form: FormData | null = null;
      if (request.method === "POST") {
        try { form = await request.formData(); } catch { form = null; }
      }
      const slugValue = form?.get("city") ?? url.searchParams.get("city");
      const slug = typeof slugValue === "string" && slugValue.trim() ? slugValue.trim() : "tarnos";
      const city = getCity(slug);
      if (!city) return new Response(renderWeeklyPreviewGate("Ville inconnue."), { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      const startValue = form?.get("start") ?? url.searchParams.get("start");
      const start = typeof startValue === "string" && startValue.trim() ? startValue.trim() : undefined;
      try {
        const generated = await generateWeeklyPreviewCity(env, city, new Date(), start);
        const candidateId = url.searchParams.get("candidate");
        const selectedPreview = candidateId ? applyWeeklyManualSelection(generated, [candidateId]) : null;
        const previewSource = selectedPreview ?? generated;
        const previewOptions = weeklyPreviewRenderOptions(previewSource);
        const fallback = !previewOptions.complementarySlides && previewSource.contextual.slides.slides.length > 0;
        const draftId = crypto.randomUUID();
        if (!selectedPreview) {
          try {
            await saveWeeklyPreviewDraft(env.DB, {
              draftId,
              citySlug: city.slug,
              startDate: generated.editorial.startDate,
              endDate: generated.editorial.endDate,
              generatedAt: generated.generatedAt,
              expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              payload: { profiles: generated.profiles, editorial: generated.editorial, contextual: generated.contextual }
            });
          } catch (error) {
            console.error("weekly_preview_draft_persistence_failed", error instanceof Error ? error.message : String(error));
          }
        }
        const selectionPanel = selectedPreview ? "" : renderWeeklySelectionPanel({
          citySlug: city.slug,
          startDate: generated.editorial.startDate,
          endDate: generated.editorial.endDate,
          draftId,
          candidates: generated.contextual.ranking.all,
          research: {
            rawCandidateCount: generated.contextual.candidates.length,
            displayedCandidateCount: generated.contextual.ranking.all.length,
            automaticSelectedCount: generated.contextual.ranking.selected.length,
            automaticallyClassifiedCount: generated.contextual.ranking.all.length,
            detectorCounts: generated.contextual.candidates.reduce<Record<string, number>>((counts, item) => {
              counts[item.detector] = (counts[item.detector] ?? 0) + 1;
              return counts;
            }, {})
          }
        });
        const html = renderWeeklyCarousel(previewSource.editorial, { ...previewOptions, includeSlides: false, includeStory: false })
          .replace('</main>', selectionPanel + '</main>');
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-loka-weekly-contextual": fallback ? "slide1-fallback" : previewOptions.complementarySlides ? "approved" : "no-signal"
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message === "weekly_preview_start_requires_monday" ? 400 : message.startsWith("LOKA_WEEKLY_NEEDS_3_MODELS") ? 503 : 500;
        return new Response(renderWeeklyPreviewGate(message), { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      }
    }

    if (url.pathname === "/weekly-candidate-preview" && request.method === "GET") {
      return new Response(renderWeeklyCandidatePreview(url.searchParams), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" }
      });
    }

    if (url.pathname === "/api/admin/weekly/publish-selection" && request.method === "POST") {
      let body: { draftId?: unknown; city?: unknown; start?: unknown; signalIds?: unknown };
      try { body = await request.json() as typeof body; } catch { return json({ error: "invalid_json" }, 400); }
      const city = getCity(typeof body.city === "string" ? body.city : "tarnos");
      const start = typeof body.start === "string" ? body.start : "";
      const signalIds = Array.isArray(body.signalIds) && body.signalIds.every((id) => typeof id === "string") ? body.signalIds as string[] : [];
      const draftId = typeof body.draftId === "string" ? body.draftId : "";
      if (!city || !start || !draftId) return json({ error: "draft_id_city_and_start_required" }, 400);
      if (signalIds.length > 3 || new Set(signalIds).size !== signalIds.length) return json({ error: "one_to_three_unique_signals_required" }, 400);
      try {
        const draft = await loadWeeklyPreviewDraft(env.DB, draftId);
        if (!draft) return json({ error: "weekly_preview_draft_expired_or_missing" }, 409);
        if (draft.editorial.citySlug !== city.slug || draft.editorial.startDate !== start) return json({ error: "weekly_preview_draft_scope_mismatch" }, 409);
        const selected = applyWeeklyManualSelection(draft as import("./weeklyPipeline").GeneratedWeekly, signalIds);
        const publication = await saveWeeklyPublication(env.DB, {
          citySlug: city.slug,
          startDate: selected.editorial.startDate,
          endDate: selected.editorial.endDate,
          generatedAt: new Date().toISOString(),
          source: "manual_weekly_selection",
          status: selected.editorial.status,
          engineVersion: "0.1.0",
          editorial: selected.editorial,
          carousel: selected.carousel
        });
        const publicationUrl = `/weekly?city=${encodeURIComponent(city.slug)}&start=${encodeURIComponent(publication.startDate)}`;
        return json({ ok: true, publicationId: publication.id, startDate: publication.startDate, endDate: publication.endDate, publicationUrl, selectedSignalIds: selected.contextual.slides.slides.map((slide) => slide.signalId) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return json({ error: message }, 409);
      }
    }

    if (url.pathname === "/") {
      const result = await safeToday(env, "tarnos");
      if (!result) return unavailable("unknown_city");
      if (result.surface.engine === "UNAVAILABLE") {
        return new Response(renderInstagramRecovery(result.city.slug, result.surface.reason), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
        });
      }
      if (!await masterAvailable(request, env, result.surface.payload.scene.masterUrl)) return unavailable("master_graphic_unavailable");
      const instagramHtml = renderInstagramOfficial24(result.surface.payload, result.city);
      const editorialHtml = enhanceInstagramWithEditorialStudio(instagramHtml);
      const persistentHtml = enhanceInstagramWithEditorialPersistence(editorialHtml, result.city.slug);
      const exportHtml = enhanceInstagramWithEditorialExport(persistentHtml, result.city.slug);
      return new Response(exportHtml, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }

    if (url.pathname === "/weekly" && request.method === "GET") {
      if (!isWeeklyEnabled(env)) return json({ error: "weekly_disabled" }, 404);
      const slug = url.searchParams.get("city") || "tarnos";
      const result = await currentWeekly(env, slug, url.searchParams.get("start") || undefined);
      if (!result) return json({ error: "unknown_city" }, 404);
      if (!result.publication) return json({ error: "weekly_not_found", ...result.range }, 404);
      if (!await masterAvailable(request, env, result.publication.editorial.overview.scene.masterUrl)) return unavailable("weekly_master_graphic_unavailable");
      const surface = resolveWeeklyPublicSurface(env, result.publication.editorial, result.publication.carousel);
      logWeeklyProgressivePublication(surface.rollout, { citySlug: result.publication.citySlug, startDate: result.publication.startDate, endDate: result.publication.endDate });
      return new Response(renderWeeklyCarousel(surface.editorial, surface.renderOptions), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    return json({ error: "not_found" }, 404);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const instant = new Date(controller.scheduledTime);
    const jobs: Promise<unknown>[] = [];
    if (controller.cron === DAILY_INSIGHT_BOOTSTRAP_CRON) {
      jobs.push(loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID).then((cache) => {
        if (cache.status === "READY") return cache;
        console.warn("LOKA_DAILY_INSIGHT_BOOTSTRAP", JSON.stringify({ status: cache.status, detail: cache.detail }));
        return ensureDailyInsightBackgroundReference(env, instant);
      }));
    }
    for (const city of Object.values(CITIES)) {
      const hour = localHour(city.timezone, controller.scheduledTime);
      if (city.slug === "tarnos" && dailyInsightScheduledAction(controller.cron, city.timezone, controller.scheduledTime) === "REFRESH") {
        // Daily Insight stays isolated from the active Daily generation. Its
        // historical reference is prepared one hour earlier, in background.
        jobs.push(ensureDailyInsightBackgroundReference(env, instant));
      }
      if (city.slug === "tarnos" && dailyInsightOp5ScheduledAction(controller.cron, city.timezone, controller.scheduledTime) === "GENERATE") {
        // OP5 writes only its independent data bundle and editorial draft.
        // It never promotes or mutates the active Daily forecast product.
        jobs.push(generateDailyInsightLabPreview(env, city, localDate(city.timezone, instant), instant).then((preview) => {
          console.info("LOKA_DAILY_INSIGHT_OP5_GENERATION", JSON.stringify({
            citySlug: city.slug,
            targetDate: preview.targetDate,
            status: preview.status,
            selection: preview.selection?.status ?? null,
            winner: preview.selection?.winner?.detectorId ?? null,
            durationMs: preview.timings.totalMs,
            persisted: preview.persistence.draftSaved
          }));
          return preview;
        }));
      }
      if (hour === 5) jobs.push(runScheduledCity(env, city, "PRIMARY", instant));
      else if (hour === 6) jobs.push(runScheduledCity(env, city, "RETRY", instant));
      if (hour === 5 && isWeeklyEnabled(env) && localDateIsMonday(city.timezone, instant)) {
        jobs.push(runScheduledWeeklyCity(env, city, instant));
      }
    }
    if (jobs.length) ctx.waitUntil(Promise.allSettled(jobs).then(() => undefined));
  }
};
