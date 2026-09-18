function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import { buildWeeklySignalCopy } from "../engine/weekly";
import type { RankedWeeklySignalCandidate } from "../engine/weekly";

function detectorLabel(detector: string): string {
  const labels: Record<string, string> = {
    CLIMATE_ANOMALY: "Écart à la normale",
    INTRADAY_CHANGE: "Amplitude dans la journée",
    EXTREME_PERCENTILE: "Valeur statistiquement remarquable",
    RECORD_PROXIMITY: "Proximité d’un record",
    HISTORICAL_SINCE: "Situation rare dans l’historique",
    SEASONAL_FIRST: "Premier passage saisonnier",
    REMARKABLE_SERIES: "Série remarquable",
    IMPACT_PHENOMENON: "Phénomène météo important",
    REGIME_CHANGE: "Changement de régime météo"
  };
  return labels[detector] ?? "Information météo remarquable";
}

function candidatePreview(item: RankedWeeklySignalCandidate): { value: string; primary: string; secondary: string; source: string } {
  try {
    const copy = buildWeeklySignalCopy({ ...item, eligible: true, rejectionReasons: [], rank: item.rank ?? 1 });
    return { value: copy.displayValue, primary: copy.primaryLine, secondary: copy.secondaryLine, source: copy.sourceNote };
  } catch { /* The card remains visible even when its copy contract is not publishable. */ }
  const signal = item.candidate.signal;
  const value = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(signal.forecast.value);
  const unit = signal.forecast.unit === "C" ? "°C" : signal.forecast.unit;
  return {
    value: `${value} ${unit}`,
    primary: "Cette information a été détectée et reste disponible pour votre choix.",
    secondary: `Contrôle automatique : ${item.rejectionReasons.join(", ") || "à vérifier au prévol"}.`,
    source: "Candidate conservée dans le classement complet."
  };
}

function candidatePreviewHref(input: { startDate: string }, item: RankedWeeklySignalCandidate, copy: { value: string; primary: string; secondary: string; source: string }): string {
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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu · LOKA</title><style>:root{--ink:#102b55;--gold:#c39a3d;--paper:#f2f0ea;--muted:#657083}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;display:grid;place-items:center;padding:24px}.page{width:min(100%,620px)}.back{display:inline-block;margin:0 0 14px;color:var(--ink);font-size:14px;font-weight:750;text-decoration:none}.slide{aspect-ratio:3/4;background:linear-gradient(145deg,#f5f0df 0%,#dce6ee 42%,#17365e 100%);border-radius:28px;padding:42px 38px;box-shadow:0 18px 50px rgba(16,43,85,.18);display:flex;flex-direction:column;position:relative;overflow:hidden}.slide:before{content:"";position:absolute;inset:-25%;background:radial-gradient(ellipse at 25% 20%,rgba(255,255,255,.85),transparent 43%),radial-gradient(ellipse at 70% 48%,rgba(255,255,255,.5),transparent 38%);transform:rotate(-10deg)}.content{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}.header{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;letter-spacing:.18em}.logo{font-size:25px;letter-spacing:.03em}.logo span{color:#f2b317}.date{font-size:11px;letter-spacing:.08em}.eyebrow{margin-top:70px;border:1px solid rgba(255,255,255,.82);border-radius:18px;padding:18px 20px;font-size:20px;font-weight:850;background:rgba(255,255,255,.18)}.line{width:58px;height:3px;background:var(--gold);margin:14px 0 0}.value{margin:auto 0 18px;font-size:clamp(42px,10vw,72px);font-weight:850;line-height:1.02;letter-spacing:-.04em}.primary{font-size:clamp(20px,4vw,29px);font-weight:800;line-height:1.18;max-width:95%}.secondary{margin-top:18px;font-size:16px;line-height:1.4;color:#33455e}.source{margin-top:auto;padding-top:24px;font-size:12px;line-height:1.4;color:#566579}.status{margin-top:14px;color:#7a5b16;font-size:12px;font-weight:750;letter-spacing:.05em;text-transform:uppercase}</style></head><body><main class="page"><a class="back" href="/weekly-preview?start=${encodeURIComponent(date)}">← Retour au classement</a><article class="slide"><div class="content"><div class="header"><div class="logo">LOKA<span>!</span></div><div class="date">${escapeHtml(date)}</div></div><div class="eyebrow">${escapeHtml(title)}<div class="line"></div></div><div class="value">${escapeHtml(value)}</div><div class="primary">${escapeHtml(primary)}</div><div class="secondary">${escapeHtml(secondary)}</div><div class="source">${escapeHtml(source)}<div class="status">${escapeHtml(status)} · aperçu sans publication</div></div></div></article></main></body></html>`;
}

export function renderWeeklySelectionPanel(input: {
  citySlug: string;
  startDate: string;
  endDate: string;
  draftId: string;
  candidates: RankedWeeklySignalCandidate[];
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
  return `<section class="selection-panel"><div class="selection-title">CHOISIR LA PUBLICATION OFFICIELLE</div><p class="selection-help">Le classement automatique vous aide à comparer les candidates, mais aucune donnée n’est retirée. Ouvrez « Voir l’aperçu » puis sélectionnez une, deux ou trois publications. Vous pouvez aussi choisir une candidate moins bien classée.</p><div class="candidate-grid">${renderedCards}</div><div class="selection-actions"><button id="publishWeeklySelection" type="button">Générer la publication</button></div><p id="weeklySelectionStatus" class="selection-status" role="status"></p></section><style>.selection-panel{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.selection-title{font-size:12px;font-weight:850;letter-spacing:.1em;color:#6f716f}.selection-help{font-size:13px;color:#6f716f;line-height:1.45}.candidate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.candidate{display:block;border:1px solid #e0e0dc;border-radius:16px;padding:14px;cursor:pointer}.candidate-ok{background:#f8fbff}.candidate-review{background:#fffaf0}.candidate-row{display:flex;gap:11px;align-items:flex-start}.candidate input{margin-top:5px}.candidate-content{display:grid;gap:5px;min-width:0}.candidate-content strong{font-size:13px;color:#12264a}.candidate-content b{font-size:25px;color:#12264a}.candidate-content em{font-size:14px;font-style:normal;font-weight:700;color:#12264a;line-height:1.3}.candidate-content small{font-size:12px;color:#596879;line-height:1.35}.candidate-content .source{color:#6f716f}.candidate-meta{font-size:11px;color:#6f716f}.candidate-preview{display:inline-block;width:max-content;margin-top:4px;color:#12264a;font-size:12px;font-weight:800;text-decoration:underline}.selection-actions{display:flex;gap:10px;margin-top:16px}.selection-actions button{border:0;border-radius:11px;padding:12px 15px;background:#12264a;color:#fff;font-weight:750;cursor:pointer}.selection-status{font-size:13px;color:#21613b;min-height:18px}.selection-status.error{color:#8c302b}.selection-status a{color:#12264a;font-weight:800}</style><script>(function(){const boxes=[...document.querySelectorAll('.candidate input')];const status=document.getElementById('weeklySelectionStatus');boxes.forEach(function(box){box.addEventListener('change',function(){const count=boxes.filter(function(item){return item.checked;}).length;if(count>3){box.checked=false;status.textContent='Trois données maximum peuvent être publiées.';status.className='selection-status error';}else{status.textContent='';status.className='selection-status';}});});const button=document.getElementById('publishWeeklySelection');if(button)button.addEventListener('click',async function(){const signalIds=boxes.filter(function(item){return item.checked;}).map(function(item){return item.value;});button.disabled=true;status.textContent='Génération et enregistrement en cours…';status.className='selection-status';try{const response=await fetch('/api/admin/weekly/publish-selection',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({draftId:'${escapeHtml(input.draftId)}',city:'${escapeHtml(input.citySlug)}',start:'${escapeHtml(input.startDate)}',signalIds})});const text=await response.text();let payload;try{payload=JSON.parse(text);}catch{throw new Error('Le Worker a renvoyé une erreur non JSON. Réessayez après le redéploiement.');}if(!response.ok)throw new Error(payload.error||'publication_impossible');status.innerHTML='Publication enregistrée. <a href="'+payload.publicationUrl+'" target="_blank" rel="noopener">Afficher le carrousel publié</a>';}catch(error){status.textContent=error.message||String(error);status.className='selection-status error';}finally{button.disabled=false;}});})();</script>`;
}

export function renderWeeklyPreviewGate(message = ""): string {
  const feedback = message
    ? `<p class="feedback">${escapeHtml(message)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Publication indisponible · LOKA</title>
<style>:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);background:#fff;border-radius:26px;padding:26px;box-shadow:0 14px 46px rgba(18,38,74,.12)}.brand{font-size:28px;font-weight:850;letter-spacing:.06em}.brand::after{content:"";display:block;width:72px;height:3px;background:var(--gold);margin-top:8px}.eyebrow{margin:26px 0 8px;font-size:12px;font-weight:780;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.card h1{font-size:30px;line-height:1.05;margin:0 0 12px}.intro{color:var(--muted);font-size:15px;line-height:1.5}.feedback{background:#f9e9e7;color:#8c302b;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.4}.primary{display:block;text-align:center;text-decoration:none;border-radius:13px;padding:14px;margin-top:22px;background:var(--ink);color:#fff;font:750 14px -apple-system,BlinkMacSystemFont,sans-serif}.note{margin:20px 0 0;color:var(--muted);font-size:12px;line-height:1.45}</style></head><body><main class="card"><div class="brand">LOKA!</div><div class="eyebrow">Publication hebdomadaire</div><h1>Les slides ne sont pas disponibles</h1><p class="intro">La génération des prévisions réelles n’a pas pu aboutir. Réessaie dans quelques instants.</p>${feedback}<a class="primary" href="/weekly-preview">Réessayer</a><p class="note">La page publique utilise toujours les prévisions réelles et le prochain lundi. Aucun mode Démo n’est utilisé.</p></main></body></html>`;
}
