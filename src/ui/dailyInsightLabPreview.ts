import type { CityConfig } from "../types";
import type { DailyInsightCandidateV2, DailyInsightSelectionResult } from "../engine/dailyInsight/editorialSelection";
import type { DailyInsightLabPreviewResult } from "../dailyInsightLab";
import { LOKA_LOGO_DATA_URL } from "./lokaBrand";
import { solarPictogramDataUrl, temperaturePictogramDataUrl, weatherPictogramDataUrl } from "./pictogramLibrary";
import { dailyInsightCanvasCard, dailyInsightStoryRuntime, type DailyInsightStoryModel } from "./dailyInsightStory";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

function theme(candidate: DailyInsightCandidateV2): DailyInsightStoryModel["theme"] {
  if (candidate.family === "RAIN") return "WET_WEATHER";
  if (candidate.family === "WIND") return "WIND";
  if (candidate.family === "VISIBILITY") return "VISIBILITY";
  if (candidate.family === "CALENDAR" || candidate.family === "ATMOSPHERE" || candidate.family === "MARINE") return "CALENDAR";
  if (candidate.format === "F2_EVOLUTION_RAPIDE") return "TEMP_SHIFT";
  if (candidate.format === "F3_SEQUENCE") return "SEQUENCE";
  return "TEMP_RARE";
}

function pictogram(candidate: DailyInsightCandidateV2): string {
  if (candidate.family === "RAIN") return weatherPictogramDataUrl("rain");
  if (candidate.family === "WIND") return weatherPictogramDataUrl("wind");
  if (candidate.family === "VISIBILITY") return weatherPictogramDataUrl("fog");
  if (candidate.family === "CALENDAR" || candidate.family === "ATMOSPHERE" || candidate.family === "MARINE") return solarPictogramDataUrl("sunrise");
  return temperaturePictogramDataUrl("thermometer");
}

function master(candidate: DailyInsightCandidateV2): string {
  if (candidate.family === "RAIN") return "/masters24/12_PLUIE_SOUTENUE.png";
  if (candidate.family === "WIND") return "/masters24/10_VENT_FORT.png";
  if (candidate.family === "VISIBILITY") return "/masters24/08_BRUME_BROUILLARD.png";
  return "/masters24/03_ECLAIRCIES.png";
}

function storyModel(city: CityConfig, targetDate: string, candidate: DailyInsightCandidateV2): DailyInsightStoryModel {
  return {
    version: "1.0.0",
    canvasId: "dailyInsightLabStory",
    label: "Daily Insight Lab · proposition",
    city: city.name,
    date: targetDate,
    timezone: city.timezone,
    masterUrl: master(candidate),
    logoUrl: LOKA_LOGO_DATA_URL,
    pictogramUrl: pictogram(candidate),
    detectorId: candidate.detectorId,
    theme: theme(candidate),
    format: candidate.format,
    valueLabel: candidate.valueLabel,
    line1: candidate.headline,
    line2: candidate.proofLine,
    evidence: candidate.evidence.slice(0, 3).map((item) => ({ label: item.metric, value: `${item.value}${item.unit ? ` ${item.unit}` : ""}` }))
  };
}

function sourceChips(result: DailyInsightLabPreviewResult): string {
  if (!result.bundle) return `<span class="bad">Référence indisponible</span>`;
  return Object.entries(result.bundle.sources).map(([name, source]) => `<span class="${source.state === "READY" ? "good" : source.state === "PARTIAL" ? "warn" : "bad"}">${escapeHtml(name)} · ${escapeHtml(source.state)}</span>`).join("");
}

function candidateCard(candidate: DailyInsightCandidateV2, winnerId: string | null): string {
  const selected = candidate.id === winnerId;
  return `<article class="candidate ${selected ? "winner" : ""}">
    <header><div><b>${escapeHtml(candidate.detectorId)}</b><span>${escapeHtml(candidate.priority)} · ${escapeHtml(candidate.family)} · ${escapeHtml(candidate.format)}</span></div><strong>${candidate.score.final}/100</strong></header>
    <div class="copy"><em>${escapeHtml(candidate.valueLabel)}</em><h3>${escapeHtml(candidate.headline)}</h3><p>${escapeHtml(candidate.proofLine)}</p></div>
    <div class="state ${candidate.eligible ? "eligible" : "rejected"}">${selected ? "SÉLECTIONNÉ" : candidate.eligible ? "PUBLIABLE" : "REJETÉ"}</div>
    ${candidate.score.penalties.length ? `<p class="penalties">${candidate.score.penalties.map((item) => `−${item.value} ${escapeHtml(item.code)}`).join(" · ")}</p>` : ""}
    ${candidate.rejectionReasons.length ? `<p class="reasons">${candidate.rejectionReasons.map(escapeHtml).join(" · ")}</p>` : ""}
    <details><summary>Preuves et trace</summary><ul>${candidate.evidence.map((item) => `<li><b>${escapeHtml(item.metric)}</b> · ${escapeHtml(item.value)} ${escapeHtml(item.unit ?? "")}<small>${escapeHtml(item.source)} · ${escapeHtml(item.window)} · ${escapeHtml(item.detail)}</small></li>`).join("")}</ul><p><b>Seuil :</b> ${escapeHtml(candidate.trace.threshold)}<br><b>Mesuré :</b> ${escapeHtml(candidate.trace.observed)}<br><b>Données :</b> ${candidate.trace.sourceKeys.map(escapeHtml).join(", ")}</p></details>
  </article>`;
}

function emptyPanel(result: DailyInsightLabPreviewResult): string {
  const title = result.status === "REFERENCE_UNAVAILABLE" ? "Le cache climatique n’est pas prêt." : result.status === "FAILED" ? "La génération du laboratoire a échoué." : "Aucun candidat publiable aujourd’hui.";
  return `<section class="empty"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(result.detail)}</p><p>Aucune information de remplacement n’est inventée.</p></section>`;
}

export function renderDailyInsightLabPreview(city: CityConfig, result: DailyInsightLabPreviewResult): string {
  const selection: DailyInsightSelectionResult | null = result.selection;
  const winner = selection?.winner ?? null;
  const story = winner ? storyModel(city, result.targetDate, winner) : null;
  const candidates = selection?.candidates ?? [];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · Daily Insight Lab</title><style>
  :root{--ink:#12264a;--gold:#fdb515;--paper:#eef2f7;--line:#d8e0eb;--muted:#64748b;--green:#087f5b;--red:#b42318}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1220px,calc(100% - 28px));margin:30px auto 70px}.top{display:flex;justify-content:space-between;gap:20px;align-items:end}.brand{font-size:38px;font-weight:900;letter-spacing:-2px}.brand i{font-style:normal;color:var(--gold)}h1{margin:4px 0 0;font-size:25px}.meta{text-align:right;color:var(--muted)}.warning{margin:22px 0;background:var(--ink);color:white;border-radius:20px;padding:20px 24px;display:flex;justify-content:space-between;gap:20px}.warning b{color:var(--gold)}.warning p{margin:4px 0 0;color:#d9e4f2}.refresh{display:flex;gap:8px;align-items:center}.refresh input,.refresh button{border:0;border-radius:10px;padding:10px 12px}.refresh button{background:var(--gold);color:var(--ink);font-weight:800;cursor:pointer}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 26px}.chips span{background:white;border:1px solid var(--line);padding:7px 10px;border-radius:999px;font-size:12px}.chips .good{color:var(--green)}.chips .warn{color:#9a6700}.chips .bad{color:var(--red)}.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:0 0 28px}.summary div{background:white;border:1px solid var(--line);border-radius:14px;padding:14px}.summary small{display:block;color:var(--muted)}.summary b{font-size:18px}.section-title{display:flex;justify-content:space-between;align-items:end;margin:28px 0 12px}.section-title h2{margin:0}.section-title span{color:var(--muted)}.story-zone{display:grid;grid-template-columns:minmax(320px,540px) 1fr;gap:24px;align-items:start}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:24px;overflow:hidden;background:#ccd5e0;box-shadow:0 18px 55px #17376720}.story-canvas canvas{display:block;width:100%;height:auto}.story-card button{width:100%;margin-top:10px;border:0;border-radius:14px;padding:14px;background:var(--ink);color:white;font-weight:800;cursor:pointer}.audit{background:white;border:1px solid var(--line);border-radius:20px;padding:22px}.audit h3{margin-top:0}.audit dl{display:grid;grid-template-columns:1fr auto;gap:8px}.audit dt{color:var(--muted)}.audit dd{margin:0;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.candidate{background:white;border:1px solid var(--line);border-radius:18px;padding:18px}.candidate.winner{border:2px solid var(--gold);box-shadow:0 12px 34px #f8b71922}.candidate header{display:flex;justify-content:space-between;gap:12px}.candidate header span{display:block;color:var(--muted);font-size:11px}.candidate header strong{font-size:22px}.copy{margin:18px 0}.copy em{font-style:normal;font-size:30px;font-weight:900}.copy h3{font-size:18px;margin:4px 0}.copy p{margin:0;color:var(--muted)}.state{display:inline-block;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:850}.eligible{background:#dff7ec;color:var(--green)}.rejected{background:#fee4e2;color:var(--red)}.penalties,.reasons{font-size:12px;color:var(--red)}details{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}summary{cursor:pointer;font-weight:750}details ul{padding-left:18px}details li{margin:8px 0}details small{display:block;color:var(--muted)}.empty{background:white;border:1px solid var(--line);border-radius:20px;padding:28px}.empty h2{margin-top:0}@media(max-width:820px){.top,.warning{display:block}.meta{text-align:left;margin-top:10px}.refresh{margin-top:14px}.summary{grid-template-columns:repeat(2,1fr)}.story-zone,.grid{grid-template-columns:1fr}}
  </style></head><body><main>
  <header class="top"><div><div class="brand">LOKA<i>!</i></div><h1>Daily Insight Lab Preview</h1></div><div class="meta">${escapeHtml(city.name)} · ${escapeHtml(result.targetDate)}<br>OP3 · ${escapeHtml(result.status)}</div></header>
  <section class="warning"><div><b>LABORATOIRE INDÉPENDANT</b><p>Aucune publication automatique. Cette page ne lit ni ne modifie la prévision Daily officielle.</p></div><form class="refresh" method="get"><input type="hidden" name="city" value="${escapeHtml(city.slug)}"><input type="date" name="date" value="${escapeHtml(result.targetDate)}"><button type="submit">Regénérer</button></form></section>
  <div class="chips">${sourceChips(result)}</div>
  <section class="summary"><div><small>Modèles</small><b>${result.forecast.modelCount}/5</b></div><div><small>Candidats</small><b>${selection?.audit.generated ?? 0}</b></div><div><small>Éligibles</small><b>${selection?.audit.eligible ?? 0}</b></div><div><small>Sélection</small><b>${escapeHtml(winner?.detectorId ?? "—")}</b></div><div><small>Durée totale</small><b>${result.timings.totalMs} ms</b></div></section>
  ${story ? `<div class="section-title"><h2>STORY proposée</h2><span>export manuel uniquement</span></div><section class="story-zone">${dailyInsightCanvasCard(story)}<aside class="audit"><h3>Décision éditoriale</h3><dl><dt>Priorité</dt><dd>${escapeHtml(winner!.priority)}</dd><dt>Famille</dt><dd>${escapeHtml(winner!.family)}</dd><dt>Score</dt><dd>${winner!.score.final}/100</dd><dt>Confiance</dt><dd>${escapeHtml(winner!.claim)}</dd><dt>Format</dt><dd>${escapeHtml(winner!.format)}</dd><dt>Bundle</dt><dd>${escapeHtml(result.bundle?.id.slice(0, 18) ?? "—")}…</dd></dl><p>Le bouton enregistre uniquement un PNG local. Aucun appel Instagram n’est effectué.</p></aside></section>` : emptyPanel(result)}
  <div class="section-title"><h2>Candidats analysés</h2><span>preuves, exclusions et pénalités</span></div><section class="grid">${candidates.length ? candidates.map((candidate) => candidateCard(candidate, winner?.id ?? null)).join("") : `<article class="candidate"><p>Aucun candidat généré.</p></article>`}</section>
  </main>${story ? dailyInsightStoryRuntime([story]) : ""}</body></html>`;
}
