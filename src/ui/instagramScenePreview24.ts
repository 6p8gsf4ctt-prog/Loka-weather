import { scene24DisplayTitle } from "../engine/scenes24/displayTitles";
import { scene24ById } from "../engine/scenes24/registry";
import { buildPreviewPayload, previewSceneIdsForPack } from "../preview/scenePreview24";
import type { CityConfig, Scene24Id } from "../types";
import { renderInstagramOfficial24 } from "./instagramOfficial24";

export type PreviewGalleryView = "story" | "engagement" | "feed";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

function previewTitle(sceneId: Scene24Id): string {
  return scene24DisplayTitle(sceneId);
}

function compactHeight(view: PreviewGalleryView): number {
  if (view === "feed") return 840;
  return 1120;
}

function compactifyInstagramHtml(html: string, view: PreviewGalleryView): string {
  const keepId = view === "feed" ? "feed" : view === "engagement" ? "engagementStory" : "story";
  const injectedStyle = `<style id="loka-preview-compact-style">html,body{margin:0;background:transparent!important}body{padding:0!important}.wrap{width:100%!important;max-width:none!important;margin:0!important}.canvas-wrap{border-radius:24px!important;box-shadow:none!important}.visual-card{margin:0!important}.visual-head{padding:0 0 8px!important}.visual-title,.visual-size,button,.toolbar,.caption-card,.note{display:none!important}</style>`;
  const injectedScript = `<script>(function(){const keepCanvas=document.getElementById(${JSON.stringify(keepId)});const keepCard=keepCanvas?keepCanvas.closest('.visual-card'):null;document.querySelectorAll('.toolbar,.caption-card,.note').forEach((node)=>node.remove());document.querySelectorAll('.visual-card').forEach((node)=>{if(node!==keepCard)node.remove();});if(keepCard){keepCard.querySelectorAll('button').forEach((node)=>node.remove());}const wrap=document.querySelector('.wrap');if(wrap){wrap.style.width='100%';wrap.style.maxWidth='none';wrap.style.margin='0';}document.body.style.padding='0';document.body.style.background='transparent';})();</script>`;
  return html
    .replace("<!--LOKA_EDITORIAL_STYLE_MOUNT-->", `${injectedStyle}<!--LOKA_EDITORIAL_STYLE_MOUNT-->`)
    .replace("<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->", `<!--LOKA_EDITORIAL_SCRIPT_MOUNT-->${injectedScript}`);
}

export function renderScenePreviewStudio(city: CityConfig, sceneId: Scene24Id): string {
  const payload = buildPreviewPayload(city, sceneId);
  return renderInstagramOfficial24(payload, city);
}

export function renderScenePreviewFrame(city: CityConfig, sceneId: Scene24Id, view: PreviewGalleryView): string {
  return compactifyInstagramHtml(renderScenePreviewStudio(city, sceneId), view);
}

export function renderScenePreviewGallery(city: CityConfig, pack: number, view: PreviewGalleryView): string {
  const normalizedPack = Number.isFinite(pack) ? Math.max(1, Math.min(5, Math.trunc(pack))) : 1;
  const scenes = previewSceneIdsForPack(normalizedPack);
  const frameHeight = compactHeight(view);
  const packLabel = `Pack ${normalizedPack}`;
  const nav = Array.from({ length: 5 }, (_, index) => index + 1)
    .map((item) => `<a class="${item === normalizedPack ? "tab active" : "tab"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${item}&view=${view}">Pack ${item}</a>`)
    .join("");
  const cards = scenes.map((sceneId) => {
    const scene = scene24ById(sceneId);
    const fullUrl = `/instagram-scenes-preview/studio?city=${encodeURIComponent(city.slug)}&scene=${sceneId}`;
    const storyUrl = `/instagram-scenes-preview/frame?city=${encodeURIComponent(city.slug)}&scene=${sceneId}&view=story`;
    const feedUrl = `/instagram-scenes-preview/frame?city=${encodeURIComponent(city.slug)}&scene=${sceneId}&view=feed`;
    const engagementUrl = `/instagram-scenes-preview/frame?city=${encodeURIComponent(city.slug)}&scene=${sceneId}&view=engagement`;
    const activeFrame = view === "feed" ? feedUrl : view === "engagement" ? engagementUrl : storyUrl;
    return `<article class="scene-card">
      <div class="scene-top">
        <div>
          <div class="scene-kicker">SCÈNE ${String(sceneId).padStart(2, "0")}</div>
          <h2>${esc(previewTitle(sceneId))}</h2>
          <p class="scene-meta">${esc(scene.label)} · ${esc(scene.family)}</p>
        </div>
        <div class="scene-actions inline">
          <a href="${fullUrl}" target="_blank" rel="noopener">Studio complet</a>
        </div>
      </div>
      <div class="quick-switches">
        <a class="${view === "story" ? "mini active" : "mini"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=story#scene-${sceneId}">Story</a>
        <a class="${view === "engagement" ? "mini active" : "mini"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=engagement#scene-${sceneId}">Story 2</a>
        <a class="${view === "feed" ? "mini active" : "mini"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=feed#scene-${sceneId}">Publication</a>
      </div>
      <div class="frame-wrap" id="scene-${sceneId}"><iframe title="Scène ${sceneId}" loading="lazy" src="${activeFrame}"></iframe></div>
      <div class="scene-links">
        <a href="${storyUrl}" target="_blank" rel="noopener">Ouvrir Story</a>
        <a href="${engagementUrl}" target="_blank" rel="noopener">Ouvrir Story 2</a>
        <a href="${feedUrl}" target="_blank" rel="noopener">Ouvrir Publication</a>
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>LOKA! — Preview 24 scènes</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#ecebe7;color:#171715;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:16px 12px 34px}.wrap{width:min(100%,900px);margin:auto}.hero{background:#fff;border-radius:28px;padding:18px 18px 20px;box-shadow:0 18px 48px rgba(0,0,0,.06)}.badge{display:inline-block;padding:7px 10px;border-radius:999px;background:#fff1cc;color:#8a6100;font-size:11px;font-weight:760;letter-spacing:.08em;text-transform:uppercase}.hero h1{font-size:30px;line-height:1.04;margin:12px 0 6px}.muted{font-size:13px;line-height:1.55;color:#6d6b67}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.tab,.view-pill,.cta,.mini,.scene-actions a,.scene-links a{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:14px;padding:12px 14px;font-weight:650;font-size:13px}.tab{background:#f1f1ee;color:#171715}.tab.active,.view-pill.active,.mini.active{background:#171715;color:#fff}.view-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.view-pill{background:#f1f1ee;color:#171715;padding:10px 12px}.cta{background:#171715;color:#fff;margin-top:14px}.list{display:grid;gap:18px;margin-top:18px}.scene-card{background:#fff;border-radius:28px;padding:16px;box-shadow:0 18px 48px rgba(0,0,0,.05)}.scene-top{display:flex;justify-content:space-between;gap:10px;align-items:start}.scene-kicker{font-size:11px;font-weight:760;letter-spacing:.12em;color:#8a6100}.scene-card h2{font-size:26px;line-height:1.06;margin:8px 0 6px}.scene-meta{margin:0;color:#6d6b67;font-size:12px;letter-spacing:.04em;text-transform:uppercase}.scene-actions.inline a{background:#f1f1ee;color:#171715}.quick-switches{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 10px}.mini{background:#f4f3f0;color:#171715;padding:8px 10px;border-radius:999px;font-size:12px}.frame-wrap{background:#deddd9;border-radius:24px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.03)}iframe{display:block;border:0;width:100%;height:${frameHeight}px;background:transparent}.scene-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.scene-links a{background:#f4f3f0;color:#171715;padding:10px 12px}.footer-note{margin-top:18px;color:#6d6b67;font-size:12px;line-height:1.55;text-align:center}.top-back{margin-top:12px}.top-back a{color:#171715;text-decoration:none;font-size:13px;font-weight:650}.title-row{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}@media(max-width:760px){.scene-top{flex-direction:column}.scene-card h2{font-size:22px}iframe{height:${frameHeight}px}}@media(max-width:460px){body{padding:12px 8px 24px}.hero h1{font-size:24px}.scene-card{padding:12px;border-radius:22px}.scene-card h2{font-size:20px}}
</style></head><body><main class="wrap"><section class="hero"><div class="badge">Preview interne · 24 scènes</div><div class="title-row"><div><h1>Mode preview du moteur · ${esc(packLabel)}</h1><p class="muted">Visualisation par paquets de 5, avec données fictives et rendu généré par le vrai Studio Instagram V24. Ce mode n’écrit rien en base et n’impacte jamais la production officielle.</p></div><div class="top-back"><a href="/admin">← Retour admin</a></div></div><div class="toolbar">${nav}</div><div class="view-row"><a class="${view === "story" ? "view-pill active" : "view-pill"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=story">Vue Story</a><a class="${view === "engagement" ? "view-pill active" : "view-pill"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=engagement">Vue Story 2</a><a class="${view === "feed" ? "view-pill active" : "view-pill"}" href="/instagram-scenes-preview?city=${encodeURIComponent(city.slug)}&pack=${normalizedPack}&view=feed">Vue Publication</a></div><a class="cta" href="/instagram-scenes-preview/studio?city=${encodeURIComponent(city.slug)}&scene=${scenes[0]}" target="_blank" rel="noopener">Ouvrir un studio complet d’exemple</a></section><section class="list">${cards}</section><p class="footer-note">Packs : 1 (scènes 1 à 5), 2 (6 à 10), 3 (11 à 15), 4 (16 à 20), 5 (21 à 24). Route principale : <code>/instagram-scenes-preview</code>.</p></main></body></html>`;
}
