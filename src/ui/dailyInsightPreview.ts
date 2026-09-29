import type { OfficialPublicPayloadV24 } from "../types";
import type { DailyInsightCandidate, DailyInsightPreviewResult } from "../engine/dailyInsight/previewEngine";
import { buildDailyInsightStoryModel, dailyInsightCanvasCard, dailyInsightStoryRuntime } from "./dailyInsightStory";

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function candidateCard(item: DailyInsightCandidate, winnerId: string | null): string {
  const winner = item.id === winnerId;
  const scores = [
    ["Rareté", item.score.rarity, 25], ["Ampleur", item.score.magnitude, 20],
    ["Utilité", item.score.utility, 20], ["Local", item.score.localSpecificity, 15],
    ["Clarté", item.score.clarity, 10], ["Confiance", item.score.confidence, 10]
  ];
  return `<article class="candidate ${winner ? "winner" : ""}">
    <div class="candidate-head">
      <div><span class="detector">${escapeHtml(item.detectorId)}</span><span class="priority">${escapeHtml(item.priority)}</span><span class="format">${escapeHtml(item.format)}</span></div>
      <strong class="total">${item.score.total}/100</strong>
    </div>
    <div class="copy"><b>${escapeHtml(item.valueLabel)}</b><h3>${escapeHtml(item.line1)}</h3><p>${escapeHtml(item.line2)}</p></div>
    <div class="status ${item.eligible ? "eligible" : "rejected"}">${winner ? "SÉLECTIONNÉ" : item.eligible ? "PUBLIABLE" : escapeHtml(item.rejectionReason ?? "REJETÉ")}</div>
    <div class="scores">${scores.map(([label, value, maximum]) => `<div><span>${label}</span><i><em style="width:${Number(value) / Number(maximum) * 100}%"></em></i><small>${value}/${maximum}</small></div>`).join("")}</div>
    ${item.score.penalties.length ? `<p class="penalties">${item.score.penalties.map((penalty) => `−${penalty.value} ${escapeHtml(penalty.code)}`).join(" · ")}</p>` : ""}
    <ul class="evidence">${item.evidence.map((evidence) => `<li><span>${escapeHtml(evidence.label)}</span><strong>${escapeHtml(evidence.value)}</strong><small>${escapeHtml(evidence.kind)}</small></li>`).join("")}</ul>
  </article>`;
}

export function renderDailyInsightPreview(
  payload: OfficialPublicPayloadV24,
  result: DailyInsightPreviewResult | null,
  cacheDetail: string
): string {
  const winner = result?.winner ?? null;
  const state = result?.status ?? "CACHE_UNAVAILABLE";
  const candidates = result?.candidates ?? [];
  const story = winner ? buildDailyInsightStoryModel(payload, winner, "dailyInsightStory", "Signal réel sélectionné") : null;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LOKA · Daily Insight Preview</title><style>
  :root{--navy:#071f49;--gold:#f8b719;--ink:#10264b;--muted:#64748b;--line:#dce4ee;--green:#087f5b;--red:#b42318;--paper:#f4f7fb}
  *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{width:min(1120px,calc(100% - 32px));margin:34px auto 70px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px}.brand{font-size:38px;font-weight:900;letter-spacing:-2px;color:var(--navy)}.brand b{color:var(--gold)}h1{margin:4px 0 0;font-size:24px}.meta{text-align:right;color:var(--muted)}
  .banner{background:var(--navy);color:white;border-radius:24px;padding:26px 30px;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center;box-shadow:0 18px 50px #17376720}.banner.no{background:#34445f}.banner.stale{background:#7c2d12}.banner small{letter-spacing:.14em;font-weight:800}.banner h2{font-size:30px;margin:7px 0}.banner p{margin:0;color:#dce6f5}.big-score{font-size:58px;font-weight:900;color:var(--gold)}
  .reference{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 28px}.reference span{background:white;border:1px solid var(--line);border-radius:999px;padding:8px 12px;color:var(--muted)}
  .section-title{display:flex;justify-content:space-between;align-items:end;margin:30px 0 12px}.section-title h2{margin:0}.section-title span{color:var(--muted)}
  .story-zone{display:grid;grid-template-columns:minmax(300px,520px) 1fr;gap:24px;align-items:start}.story-card{min-width:0}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block;font-size:18px}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:24px;overflow:hidden;box-shadow:0 18px 55px #17376720;background:#cad4e1}.story-canvas canvas{display:block;width:100%;height:auto}.story-card button{width:100%;margin-top:10px;border:0;border-radius:14px;padding:14px;background:var(--navy);color:white;font-weight:800;cursor:pointer}.story-note{background:white;border:1px solid var(--line);border-radius:20px;padding:22px}.story-note h3{margin:0 0 8px}.story-note p{color:var(--muted)}.story-note a{display:inline-block;margin-top:8px;border-radius:12px;padding:12px 16px;background:var(--gold);color:var(--navy);font-weight:850;text-decoration:none}.story-empty{background:white;border:1px solid var(--line);border-radius:20px;padding:24px}.story-empty b{font-size:19px}.story-empty p{margin-bottom:0;color:var(--muted)}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.candidate{background:white;border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 8px 30px #1737670c}.candidate.winner{border:2px solid var(--gold);box-shadow:0 12px 34px #f8b71924}.candidate-head{display:flex;justify-content:space-between;align-items:center}.candidate-head span{display:inline-block;margin-right:6px;border-radius:7px;padding:4px 7px;font-size:11px;font-weight:900}.detector{background:var(--navy);color:white}.priority{background:#fff3cd;color:#7a5200}.format{background:#e9eef6;color:#43526a}.total{font-size:24px}.copy{margin:20px 0}.copy>b{font-size:34px;color:var(--navy)}.copy h3{font-size:19px;margin:6px 0}.copy p{margin:0;color:var(--muted)}.status{display:inline-block;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.eligible{background:#dff7ec;color:var(--green)}.rejected{background:#fee4e2;color:var(--red)}
  .scores{margin-top:18px}.scores>div{display:grid;grid-template-columns:72px 1fr 42px;gap:8px;align-items:center;margin:7px 0;font-size:12px}.scores i{display:block;height:7px;background:#edf1f6;border-radius:9px;overflow:hidden}.scores em{display:block;height:100%;background:var(--navy)}.scores small{text-align:right;color:var(--muted)}.penalties{color:var(--red);font-size:12px;font-weight:700}.evidence{padding:12px 0 0;margin:15px 0 0;border-top:1px solid var(--line);list-style:none}.evidence li{display:grid;grid-template-columns:1fr auto;gap:2px 12px;margin:8px 0}.evidence li span{color:var(--muted)}.evidence li small{grid-column:1/-1;color:#94a3b8;font-size:10px;letter-spacing:.08em}
  .deferred{background:white;border:1px solid var(--line);border-radius:20px;padding:18px 22px}.deferred li{margin:8px 0;color:var(--muted)}.deferred b{color:var(--ink)}
  @media(max-width:760px){.top,.banner{display:block}.meta{text-align:left;margin-top:12px}.big-score{margin-top:18px}.grid,.story-zone{grid-template-columns:1fr}.banner h2{font-size:24px}}
  </style></head><body><main>
    <header class="top"><div><div class="brand">LOKA<b>!</b></div><h1>Daily Insight Preview</h1></div><div class="meta"><b>${escapeHtml(payload.city)}</b><br>${escapeHtml(payload.date)}<br>Preview isolée · aucune publication</div></header>
    <section class="banner ${state === "NO_DAILY_INSIGHT" || state === "CACHE_UNAVAILABLE" ? "no" : state === "REFERENCE_STALE" ? "stale" : ""}">
      <div><small>${escapeHtml(state)}</small><h2>${winner ? escapeHtml(winner.line1) : state === "REFERENCE_STALE" ? "La référence locale doit être rafraîchie." : state === "CACHE_UNAVAILABLE" ? "Le cache Daily Insight n’est pas encore préparé." : "Aucun fait ne franchit le seuil éditorial aujourd’hui."}</h2><p>${winner ? escapeHtml(winner.line2) : escapeHtml(cacheDetail)}</p></div>
      <div class="big-score">${winner ? winner.score.total : "—"}</div>
    </section>
    <div class="reference">${result ? `<span>Station ${escapeHtml(result.reference.stationId)}</span><span>${escapeHtml(result.reference.stationLabel)}</span><span>Archive ${escapeHtml(result.reference.firstDate)} → ${escapeHtml(result.reference.lastDate)}</span><span>Âge ${result.reference.ageDays} j</span><span>Seuil ${result.publicationThreshold}/100</span>` : `<span>${escapeHtml(cacheDetail)}</span>`}</div>
    <div class="section-title"><h2>STORY comparative</h2><span>prévisualisation isolée · export manuel uniquement</span></div>
    ${story ? `<section class="story-zone">${dailyInsightCanvasCard(story)}<aside class="story-note"><h3>Pourquoi cette slide ?</h3><p>Elle matérialise uniquement le fait classé premier par le moteur éditorial. Aucun second signal n’est publié et aucun envoi vers Instagram n’est effectué.</p><a href="/daily-insight-preview/scenarios?city=${encodeURIComponent(payload.citySlug)}">Tester les six scénarios graphiques</a></aside></section>` : `<section class="story-empty"><b>Aucune STORY comparative aujourd’hui.</b><p>Le silence éditorial est conservé lorsque le cache manque, devient obsolète ou qu’aucun signal ne franchit le seuil. <a href="/daily-insight-preview/scenarios?city=${encodeURIComponent(payload.citySlug)}">Voir les scénarios de contrôle</a>.</p></section>`}
    <div class="section-title"><h2>Candidats analysés</h2><span>${candidates.length} candidat${candidates.length > 1 ? "s" : ""}</span></div>
    <section class="grid">${candidates.length ? candidates.map((item) => candidateCard(item, winner?.id ?? null)).join("") : `<article class="candidate"><p>Aucun candidat disponible.</p></article>`}</section>
    <div class="section-title"><h2>Détecteurs différés</h2><span>preuve encore insuffisante</span></div>
    <ul class="deferred">${(result?.deferred ?? []).map((item) => `<li><b>${escapeHtml(item.detectorId)}</b> · ${escapeHtml(item.reason)}</li>`).join("") || "<li>Le cache doit être disponible pour afficher cet audit.</li>"}</ul>
  </main>${story ? dailyInsightStoryRuntime([story]) : ""}</body></html>`;
}
