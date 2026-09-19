function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import { buildWeeklyComplementaryPresentation, buildWeeklySignalCopy } from "../engine/weekly";
import type { RankedWeeklySignalCandidate, WeeklyComplementaryPresentation } from "../engine/weekly";

function detectorLabel(detector: string): string {
  const labels: Record<string, string> = {
    CLIMATE_ANOMALY: "Écart à la normale",
    INTRADAY_CHANGE: "Amplitude dans la journée",
    EXTREME_PERCENTILE: "Valeur statistiquement remarquable",
    RECORD_PROXIMITY: "Proximité d’un record",
    HISTORICAL_SINCE: "Situation rare dans l’historique",
    RECENT_EXTREME: "Extrême récent",
    SEASONAL_FIRST: "Premier passage saisonnier",
    REMARKABLE_SERIES: "Série remarquable",
    IMPACT_PHENOMENON: "Phénomène météo important",
    REGIME_CHANGE: "Changement de régime météo"
  };
  return labels[detector] ?? "Information météo remarquable";
}

const DETECTOR_ORDER = [
  "IMPACT_PHENOMENON", "REGIME_CHANGE", "INTRADAY_CHANGE", "RECENT_EXTREME",
  "CLIMATE_ANOMALY", "EXTREME_PERCENTILE", "HISTORICAL_SINCE", "RECORD_PROXIMITY",
  "SEASONAL_FIRST", "REMARKABLE_SERIES"
] as const;

function candidatePreview(item: RankedWeeklySignalCandidate): { value: string; primary: string; secondary: string; source: string; presentation: WeeklyComplementaryPresentation | null } {
  try {
    const selectable = { ...item, eligible: true, rejectionReasons: [], rank: item.rank ?? 1 };
    const copy = buildWeeklySignalCopy(selectable);
    const presentation = buildWeeklyComplementaryPresentation(selectable, copy);
    return { value: presentation.headline, primary: presentation.subtitle, secondary: presentation.editorialLine, source: copy.sourceNote, presentation };
  } catch { /* The card remains visible even when its copy contract is not publishable. */ }
  const signal = item.candidate.signal;
  const value = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(signal.forecast.value);
  const unit = signal.forecast.unit === "C" ? "°C" : signal.forecast.unit;
  return {
    value: `${value} ${unit}`,
    primary: "Cette information a été détectée et reste disponible pour votre choix.",
    secondary: `Contrôle automatique : ${item.rejectionReasons.join(", ") || "à vérifier au prévol"}.`,
    source: "Candidate conservée dans le classement complet.",
    presentation: null
  };
}

function candidatePreviewHref(input: { startDate: string }, item: RankedWeeklySignalCandidate, copy: ReturnType<typeof candidatePreview>): string {
  const params = new URLSearchParams({
    date: input.startDate,
    title: detectorLabel(item.candidate.detector),
    value: copy.value,
    primary: copy.primary,
    secondary: copy.secondary,
    source: copy.source,
    rank: String(item.automaticRank),
    status: item.rejectionReasons.length ? "CLASSEMENT AUTOMATIQUE" : "CANDIDATE RETENUE PAR LE CLASSEMENT"
  });
  if (copy.presentation?.comparison) {
    params.set("leftValue", copy.presentation.comparison.left.value);
    params.set("leftLabel", copy.presentation.comparison.left.label);
    params.set("rightValue", copy.presentation.comparison.right.value);
    params.set("rightLabel", copy.presentation.comparison.right.label);
  }
  return `/weekly-candidate-preview?${params.toString()}`;
}

export function renderWeeklyCandidatePreview(params: URLSearchParams): string {
  const read = (key: string, fallback: string): string => params.get(key)?.trim() || fallback;
  const title = read("title", "Information météo");
  const value = read("value", "—");
  const primary = read("primary", "Information détectée par le moteur éditorial.");
  const secondary = read("secondary", "");
  const source = read("source", "Source moteur LOKA.");
  const date = read("date", "Semaine à venir");
  const status = read("status", "Aperçu éditorial");
  const leftValue = read("leftValue", ""); const leftLabel = read("leftLabel", "");
  const rightValue = read("rightValue", ""); const rightLabel = read("rightLabel", "");
  const comparison = leftValue && rightValue ? `<div class="comparison"><div><b>${escapeHtml(leftValue)}</b><span>${escapeHtml(leftLabel)}</span></div><i></i><div><b>${escapeHtml(rightValue)}</b><span>${escapeHtml(rightLabel)}</span></div></div>` : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu · LOKA</title><style>:root{--ink:#102b55;--gold:#c39a3d;--paper:#f2f0ea}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;display:grid;place-items:center;padding:24px}.page{width:min(100%,620px)}.back{display:inline-block;margin:0 0 14px;color:var(--ink);font-size:14px;font-weight:750;text-decoration:none}.slide{aspect-ratio:3/4;background:linear-gradient(145deg,#f5f0df 0%,#dce6ee 42%,#17365e 100%);border-radius:28px;padding:30px;box-shadow:0 18px 50px rgba(16,43,85,.18);position:relative;overflow:hidden}.slide:before{content:"";position:absolute;inset:-25%;background:radial-gradient(ellipse at 25% 20%,rgba(255,255,255,.85),transparent 43%),radial-gradient(ellipse at 70% 48%,rgba(255,255,255,.5),transparent 38%);transform:rotate(-10deg)}.content{position:relative;z-index:1;height:100%;display:flex;flex-direction:column}.header{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;letter-spacing:.18em}.logo{font-size:25px}.logo span{color:#f2b317}.date{font-size:11px;letter-spacing:.08em}.title{margin-top:34px;border:1px solid rgba(255,255,255,.82);border-radius:18px;padding:18px 20px;font-size:20px;font-weight:850;background:rgba(255,255,255,.18)}.title:after,.accent{content:"";display:block;width:58px;height:3px;background:var(--gold);margin-top:12px}.box{flex:1;margin-top:16px;border:1px solid rgba(255,255,255,.82);border-radius:20px;background:rgba(255,255,255,.14);display:flex;flex-direction:column;align-items:center;text-align:center;padding:34px 28px}.icon{font-size:48px;line-height:1}.value{margin-top:18px;font-size:clamp(54px,12vw,78px);font-weight:850;line-height:1}.primary{margin-top:10px;font-size:clamp(18px,4vw,25px);font-weight:850;line-height:1.12}.accent{margin:18px auto 0}.comparison{width:100%;display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;margin-top:28px}.comparison i{width:1px;height:72px;background:rgba(16,43,85,.3)}.comparison div{display:grid;gap:5px}.comparison b{font-size:clamp(24px,6vw,38px)}.comparison span{font-size:12px;font-weight:750}.secondary{margin-top:28px;font-size:clamp(16px,3.6vw,22px);line-height:1.3;font-weight:650}.source{margin-top:auto;padding-top:18px;font-size:10px;line-height:1.35;color:#4f6077}.status{margin-top:7px;color:#7a5b16;font-weight:750;text-transform:uppercase}</style></head><body><main class="page"><a class="back" href="/weekly-preview?start=${encodeURIComponent(date)}">← Retour au classement</a><article class="slide"><div class="content"><div class="header"><div class="logo">LOKA<span>!</span></div><div class="date">${escapeHtml(date)}</div></div><div class="title">${escapeHtml(title)}</div><div class="box"><div class="icon">◉</div><div class="value">${escapeHtml(value)}</div><div class="primary">${escapeHtml(primary)}</div><div class="accent"></div>${comparison}<div class="secondary">${escapeHtml(secondary)}</div><div class="source">${escapeHtml(source)}<div class="status">${escapeHtml(status)} · aperçu sans publication</div></div></div></div></article></main></body></html>`;
}

function renderWeeklySelectionPanelLegacy(input: {
  citySlug: string;
  startDate: string;
  endDate: string;
  draftId: string;
  candidates: RankedWeeklySignalCandidate[];
  research: {
    rawCandidateCount: number;
    displayedCandidateCount: number;
    automaticSelectedCount: number;
    automaticallyClassifiedCount: number;
    detectorCounts: Record<string, number>;
  };
}): string {
  const cards: string[] = [];
  input.candidates.forEach((item) => {
    const id = item.candidate.signal.id;
    const copy = candidatePreview(item);
    const preview = `<a class="candidate-preview" target="_blank" rel="noopener" href="${escapeHtml(candidatePreviewHref(input, item, copy))}">Voir l’aperçu</a>`;
    const automaticStatus = item.rejectionReasons.length ? `Contrôle automatique : ${item.rejectionReasons.join(", ")}` : "Retenue par la sélection automatique";
    const card = `<label class="candidate ${item.rejectionReasons.length ? "candidate-review" : "candidate-ok"}"><div class="candidate-row"><input type="checkbox" value="${escapeHtml(id)}"><span class="candidate-content"><strong>${escapeHtml(detectorLabel(item.candidate.detector))}</strong><b>${escapeHtml(copy.value)}</b><em>${escapeHtml(copy.primary)}</em><small>${escapeHtml(copy.secondary)}</small><small class="source">${escapeHtml(copy.source)}</small><span class="candidate-meta">${escapeHtml(automaticStatus)} · score ${item.scores.total} · classement automatique n°${item.automaticRank}</span>${preview}</span></div></label>`;
    cards.push(card);
  });
  const renderedCards = cards.join("") || "<p>Aucune donnée détectée cette semaine.</p>";
  const auditRows = DETECTOR_ORDER.map((detector) => `<li><span>${escapeHtml(detectorLabel(detector))}</span><b>${input.research.detectorCounts[detector] ?? 0}</b></li>`).join("");
  const audit = `<details class="research-audit"><summary>Vérifier les recherches du moteur</summary><p><strong>${input.research.rawCandidateCount}</strong> signalements détectés · <strong>${input.research.displayedCandidateCount}</strong> candidates affichées · <strong>${input.research.automaticSelectedCount}</strong> retenues par le classement automatique · <strong>${Math.max(0, input.research.automaticallyClassifiedCount - input.research.automaticSelectedCount)}</strong> classées hors sélection automatique. Aucune candidate n’est supprimée.</p><ul>${auditRows}</ul></details>`;
  return `<section class="selection-panel"><div class="selection-title">CHOISIR LA PUBLICATION OFFICIELLE</div><p class="selection-help">Le classement automatique vous aide à comparer les candidates, mais aucune donnée n’est retirée. Ouvrez « Voir l’aperçu » puis sélectionnez une, deux ou trois publications. Vous pouvez aussi choisir une candidate moins bien classée.</p>${audit}<div class="candidate-grid">${renderedCards}</div><div class="selection-actions"><input id="weeklyAdminToken" type="password" placeholder="Mot de passe administrateur" autocomplete="current-password"><button id="publishWeeklySelection" type="button">Enregistrer cette sélection</button></div><p id="weeklySelectionStatus" class="selection-status" role="status"></p></section><style>.selection-panel{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.selection-title{font-size:12px;font-weight:850;letter-spacing:.1em;color:#6f716f}.selection-help{font-size:13px;color:#6f716f;line-height:1.45}.research-audit{margin:12px 0;padding:11px 13px;border:1px solid #e1e3e6;border-radius:12px;background:#f7f9fb;color:#596879;font-size:12px;line-height:1.4}.research-audit summary{cursor:pointer;color:#12264a;font-weight:800}.research-audit p{margin:9px 0}.research-audit ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 14px;margin:8px 0 0;padding:0;list-style:none}.research-audit li{display:flex;justify-content:space-between;border-bottom:1px solid #e4e7ea;padding:3px 0}.research-audit li b{color:#12264a}.candidate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.candidate{display:block;border:1px solid #e0e0dc;border-radius:16px;padding:14px;cursor:pointer}.candidate-ok{background:#f8fbff}.candidate-review{background:#fffaf0}.candidate-row{display:flex;gap:11px;align-items:flex-start}.candidate input{margin-top:5px}.candidate-content{display:grid;gap:5px;min-width:0}.candidate-content strong{font-size:13px;color:#12264a}.candidate-content b{font-size:25px;color:#12264a}.candidate-content em{font-size:14px;font-style:normal;font-weight:700;color:#12264a;line-height:1.3}.candidate-content small{font-size:12px;color:#596879;line-height:1.35}.candidate-content .source{color:#6f716f}.candidate-meta{font-size:11px;color:#6f716f}.candidate-preview{display:inline-block;width:max-content;margin-top:4px;color:#12264a;font-size:12px;font-weight:800;text-decoration:underline}.selection-actions{display:flex;gap:10px;margin-top:16px}.selection-actions input{min-width:230px;flex:1;border:1px solid #d7d7d2;border-radius:11px;padding:12px}.selection-actions button{border:0;border-radius:11px;padding:12px 15px;background:#12264a;color:#fff;font-weight:750;cursor:pointer}.selection-status{font-size:13px;color:#21613b;min-height:18px}.selection-status.error{color:#8c302b}.selection-status a{color:#12264a;font-weight:800}</style><script>(function(){const boxes=[...document.querySelectorAll('.candidate input')];const status=document.getElementById('weeklySelectionStatus');boxes.forEach(function(box){box.addEventListener('change',function(){const count=boxes.filter(function(item){return item.checked;}).length;if(count>3){box.checked=false;status.textContent='Trois données maximum peuvent être publiées.';status.className='selection-status error';}else{status.textContent='';status.className='selection-status';}});});const button=document.getElementById('publishWeeklySelection');if(button)button.addEventListener('click',async function(){const token=document.getElementById('weeklyAdminToken').value.trim();const signalIds=boxes.filter(function(item){return item.checked;}).map(function(item){return item.value;});if(!token){status.textContent='Le mot de passe administrateur est requis.';status.className='selection-status error';return;}button.disabled=true;status.textContent='Prévol et enregistrement en cours…';status.className='selection-status';try{const response=await fetch('/api/admin/weekly/publish-selection',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({draftId:'${escapeHtml(input.draftId)}',city:'${escapeHtml(input.citySlug)}',start:'${escapeHtml(input.startDate)}',signalIds})});const text=await response.text();let payload;try{payload=JSON.parse(text);}catch{throw new Error('Le Worker a renvoyé une erreur non JSON. Réessayez après le redéploiement.');}if(!response.ok)throw new Error(payload.error||'publication_impossible');const publicationUrl=String(payload.publicationUrl||'');if(!publicationUrl)throw new Error('lien_publication_absent');status.innerHTML='Publication enregistrée. <a href="'+publicationUrl.replace(/"/g,'&quot;')+'" target="_blank" rel="noopener">Ouvrir le carrousel publié</a>';}catch(error){status.textContent=error.message||String(error);status.className='selection-status error';}finally{button.disabled=false;}});})();</script>`;
}

/** Passwordless manual workflow backed by a short-lived, unpredictable D1 draft id. */
export function renderWeeklySelectionPanel(input: {
  citySlug: string;
  startDate: string;
  endDate: string;
  draftId: string;
  candidates: RankedWeeklySignalCandidate[];
  research: {
    rawCandidateCount: number;
    displayedCandidateCount: number;
    automaticSelectedCount: number;
    automaticallyClassifiedCount: number;
    detectorCounts: Record<string, number>;
  };
}): string {
  const cards = input.candidates.map((item) => {
    const copy = candidatePreview(item);
    const id = item.candidate.signal.id;
    const automaticStatus = item.rejectionReasons.length ? `Contrôle automatique : ${item.rejectionReasons.join(", ")}` : "Retenue par le classement automatique";
    return `<label class="candidate ${item.rejectionReasons.length ? "candidate-review" : "candidate-ok"}"><div class="candidate-row"><input type="checkbox" value="${escapeHtml(id)}"><span class="candidate-content"><strong>${escapeHtml(detectorLabel(item.candidate.detector))}</strong><b>${escapeHtml(copy.value)}</b><em>${escapeHtml(copy.primary)}</em><small>${escapeHtml(copy.secondary)}</small><small class="source">${escapeHtml(copy.source)}</small><span class="candidate-meta">${escapeHtml(automaticStatus)} · score ${item.scores.total} · classement automatique n°${item.automaticRank}</span><a class="candidate-preview" target="_blank" rel="noopener" href="${escapeHtml(candidatePreviewHref(input, item, copy))}">Voir l’aperçu</a></span></div></label>`;
  }).join("") || "<p>Aucune donnée détectée cette semaine.</p>";
  const auditRows = DETECTOR_ORDER.map((detector) => `<li><span>${escapeHtml(detectorLabel(detector))}</span><b>${input.research.detectorCounts[detector] ?? 0}</b></li>`).join("");
  const audit = `<details class="research-audit"><summary>Vérifier les recherches du moteur</summary><p><strong>${input.research.rawCandidateCount}</strong> signalements détectés · <strong>${input.research.displayedCandidateCount}</strong> candidates affichées · <strong>${input.research.automaticSelectedCount}</strong> retenues par le classement automatique · <strong>${Math.max(0, input.research.automaticallyClassifiedCount - input.research.automaticSelectedCount)}</strong> classées hors sélection automatique. Aucune candidate n’est supprimée.</p><ul>${auditRows}</ul></details>`;
  return `<section class="selection-panel"><div class="selection-title">CHOISIR LA PUBLICATION OFFICIELLE</div><p class="selection-help">Sélectionnez une, deux ou trois publications. Aucune donnée détectée n’est retirée et chaque aperçu reprend la composition finale.</p>${audit}<div class="candidate-grid">${cards}</div><div class="selection-actions"><button id="publishWeeklySelection" type="button">Générer la publication</button></div><p id="weeklySelectionStatus" class="selection-status" role="status"></p></section>
<style>.selection-panel{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.selection-title{font-size:12px;font-weight:850;letter-spacing:.1em;color:#6f716f}.selection-help{font-size:13px;color:#6f716f;line-height:1.45}.research-audit{margin:12px 0;padding:11px 13px;border:1px solid #e1e3e6;border-radius:12px;background:#f7f9fb;color:#596879;font-size:12px;line-height:1.4}.research-audit summary{cursor:pointer;color:#12264a;font-weight:800}.research-audit ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 14px;margin:8px 0 0;padding:0;list-style:none}.research-audit li{display:flex;justify-content:space-between;border-bottom:1px solid #e4e7ea;padding:3px 0}.candidate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.candidate{display:block;border:1px solid #e0e0dc;border-radius:16px;padding:14px;cursor:pointer}.candidate-ok{background:#f8fbff}.candidate-review{background:#fffaf0}.candidate-row{display:flex;gap:11px;align-items:flex-start}.candidate input{margin-top:5px}.candidate-content{display:grid;gap:5px;min-width:0}.candidate-content strong{font-size:13px;color:#12264a}.candidate-content b{font-size:25px;color:#12264a}.candidate-content em{font-size:14px;font-style:normal;font-weight:800;color:#12264a}.candidate-content small,.candidate-meta{font-size:12px;color:#596879;line-height:1.35}.candidate-preview{width:max-content;color:#12264a;font-size:12px;font-weight:800}.selection-actions{margin-top:16px}.selection-actions button{border:0;border-radius:11px;padding:13px 18px;background:#12264a;color:#fff;font-weight:800;cursor:pointer}.selection-status{font-size:13px;color:#21613b;min-height:18px}.selection-status.error{color:#8c302b}.selection-status a{color:#12264a;font-weight:800}</style>
<script>(function(){const boxes=[...document.querySelectorAll('.candidate input')],status=document.getElementById('weeklySelectionStatus'),button=document.getElementById('publishWeeklySelection');boxes.forEach(function(box){box.addEventListener('change',function(){const count=boxes.filter(function(item){return item.checked;}).length;if(count>3){box.checked=false;status.textContent='Trois données maximum peuvent être publiées.';status.className='selection-status error';}else{status.textContent='';status.className='selection-status';}});});if(button)button.addEventListener('click',async function(){const signalIds=boxes.filter(function(item){return item.checked;}).map(function(item){return item.value;});button.disabled=true;status.textContent='Prévol et génération en cours…';status.className='selection-status';try{const response=await fetch('/api/admin/weekly/publish-selection',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({draftId:'${escapeHtml(input.draftId)}',city:'${escapeHtml(input.citySlug)}',start:'${escapeHtml(input.startDate)}',signalIds})});const text=await response.text();let payload;try{payload=JSON.parse(text);}catch{throw new Error('Le Worker a renvoyé une erreur non JSON.');}if(!response.ok)throw new Error(payload.error||'publication_impossible');if(!payload.publicationUrl)throw new Error('lien_publication_absent');status.innerHTML='Publication générée. <a href="'+String(payload.publicationUrl).replace(/"/g,'&quot;')+'" target="_blank" rel="noopener">Afficher le carrousel</a>';}catch(error){status.textContent=error.message||String(error);status.className='selection-status error';}finally{button.disabled=false;}});})();</script>`;
}

export function renderWeeklyPreviewGate(message = ""): string {
  const feedback = message
    ? `<p class="feedback">${escapeHtml(message)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Publication indisponible · LOKA</title>
<style>:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);background:#fff;border-radius:26px;padding:26px;box-shadow:0 14px 46px rgba(18,38,74,.12)}.brand{font-size:28px;font-weight:850;letter-spacing:.06em}.brand::after{content:"";display:block;width:72px;height:3px;background:var(--gold);margin-top:8px}.eyebrow{margin:26px 0 8px;font-size:12px;font-weight:780;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.card h1{font-size:30px;line-height:1.05;margin:0 0 12px}.intro{color:var(--muted);font-size:15px;line-height:1.5}.feedback{background:#f9e9e7;color:#8c302b;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.4}.primary{display:block;text-align:center;text-decoration:none;border-radius:13px;padding:14px;margin-top:22px;background:var(--ink);color:#fff;font:750 14px -apple-system,BlinkMacSystemFont,sans-serif}.note{margin:20px 0 0;color:var(--muted);font-size:12px;line-height:1.45}</style></head><body><main class="card"><div class="brand">LOKA!</div><div class="eyebrow">Publication hebdomadaire</div><h1>Les slides ne sont pas disponibles</h1><p class="intro">La génération des prévisions réelles n’a pas pu aboutir. Réessaie dans quelques instants.</p>${feedback}<a class="primary" href="/weekly-preview">Réessayer</a><p class="note">La page publique utilise toujours les prévisions réelles et le prochain lundi. Aucun mode Démo n’est utilisé.</p></main></body></html>`;
}
