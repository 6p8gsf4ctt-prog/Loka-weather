function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface WeeklySelectionPanelCandidate {
  candidate: {
    signal: { id: string; forecast: { value: number; unit: string } };
    detector: string;
  };
  scores: { total: number };
  eligible: boolean;
  rejectionReasons: string[];
  rank: number | null;
}

export function renderWeeklySelectionPanel(input: {
  citySlug: string;
  startDate: string;
  endDate: string;
  candidates: WeeklySelectionPanelCandidate[];
}): string {
  const cards = input.candidates.map((item) => {
    const id = item.candidate.signal.id;
    const value = `${item.candidate.signal.forecast.value} ${item.candidate.signal.forecast.unit}`;
    const state = item.eligible ? `Éligible · score ${item.scores.total}` : `Écartée · ${item.rejectionReasons.join(", ")}`;
    return `<label class="candidate ${item.eligible ? "candidate-ok" : "candidate-off"}"><input type="checkbox" value="${escapeHtml(id)}" ${item.eligible ? "" : "disabled"}><span><strong>${escapeHtml(item.candidate.detector)}</strong><b>${escapeHtml(value)}</b><small>${escapeHtml(state)}</small></span></label>`;
  }).join("");
  return `<section class="selection-panel"><div class="selection-title">CHOISIR LA PUBLICATION OFFICIELLE</div><p class="selection-help">Sélectionnez jusqu’à trois données fiables pour les slides 2, 3 et 4. La slide 1 reste inchangée. Sans sélection, seule la slide 1 sera publiée.</p><div class="candidate-grid">${cards || "<p>Aucune donnée complémentaire suffisamment fiable cette semaine.</p>"}</div><div class="selection-actions"><input id="weeklyAdminToken" type="password" placeholder="Mot de passe administrateur" autocomplete="current-password"><button id="publishWeeklySelection" type="button">Enregistrer cette sélection</button></div><p id="weeklySelectionStatus" class="selection-status" role="status"></p></section><style>.selection-panel{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.selection-title{font-size:12px;font-weight:850;letter-spacing:.1em;color:#6f716f}.selection-help{font-size:13px;color:#6f716f;line-height:1.45}.candidate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.candidate{display:flex;gap:10px;align-items:flex-start;border:1px solid #e0e0dc;border-radius:14px;padding:12px;cursor:pointer}.candidate-ok{background:#f8fbff}.candidate-off{opacity:.58;background:#f4f3f0;cursor:not-allowed}.candidate input{margin-top:4px}.candidate span{display:grid;gap:4px;font-size:12px}.candidate b{font-size:20px;color:#12264a}.candidate small{color:#6f716f;line-height:1.3}.selection-actions{display:flex;gap:10px;margin-top:16px}.selection-actions input{min-width:230px;flex:1;border:1px solid #d7d7d2;border-radius:11px;padding:12px}.selection-actions button{border:0;border-radius:11px;padding:12px 15px;background:#12264a;color:#fff;font-weight:750;cursor:pointer}.selection-status{font-size:13px;color:#21613b;min-height:18px}.selection-status.error{color:#8c302b}</style><script>(function(){const boxes=[...document.querySelectorAll('.candidate-ok input')];const status=document.getElementById('weeklySelectionStatus');boxes.forEach(function(box){box.addEventListener('change',function(){const count=boxes.filter(function(item){return item.checked;}).length;if(count>3){box.checked=false;status.textContent='Trois données maximum peuvent être publiées.';status.className='selection-status error';}else{status.textContent='';status.className='selection-status';}});});const button=document.getElementById('publishWeeklySelection');if(button)button.addEventListener('click',async function(){const token=document.getElementById('weeklyAdminToken').value.trim();const signalIds=boxes.filter(function(item){return item.checked;}).map(function(item){return item.value;});if(!token){status.textContent='Le mot de passe administrateur est requis.';status.className='selection-status error';return;}button.disabled=true;status.textContent='Prévol et enregistrement en cours…';status.className='selection-status';try{const response=await fetch('/api/admin/weekly/publish-selection',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({city:'${escapeHtml(input.citySlug)}',start:'${escapeHtml(input.startDate)}',signalIds})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'publication_impossible');status.textContent='Publication officielle enregistrée pour ${escapeHtml(input.startDate)} → ${escapeHtml(input.endDate)}.';}catch(error){status.textContent=error.message||String(error);status.className='selection-status error';}finally{button.disabled=false;}});})();</script>`;
}

export function renderWeeklyPreviewGate(message = ""): string {
  const feedback = message
    ? `<p class="feedback">${escapeHtml(message)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Publication indisponible · LOKA</title>
<style>:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);background:#fff;border-radius:26px;padding:26px;box-shadow:0 14px 46px rgba(18,38,74,.12)}.brand{font-size:28px;font-weight:850;letter-spacing:.06em}.brand::after{content:"";display:block;width:72px;height:3px;background:var(--gold);margin-top:8px}.eyebrow{margin:26px 0 8px;font-size:12px;font-weight:780;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.card h1{font-size:30px;line-height:1.05;margin:0 0 12px}.intro{color:var(--muted);font-size:15px;line-height:1.5}.feedback{background:#f9e9e7;color:#8c302b;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.4}.primary{display:block;text-align:center;text-decoration:none;border-radius:13px;padding:14px;margin-top:22px;background:var(--ink);color:#fff;font:750 14px -apple-system,BlinkMacSystemFont,sans-serif}.note{margin:20px 0 0;color:var(--muted);font-size:12px;line-height:1.45}</style></head><body><main class="card"><div class="brand">LOKA!</div><div class="eyebrow">Publication hebdomadaire</div><h1>Les slides ne sont pas disponibles</h1><p class="intro">La génération des prévisions réelles n’a pas pu aboutir. Réessaie dans quelques instants.</p>${feedback}<a class="primary" href="/weekly-preview">Réessayer</a><p class="note">La page publique utilise toujours les prévisions réelles et le prochain lundi. Aucun mode Démo n’est utilisé.</p></main></body></html>`;
}
