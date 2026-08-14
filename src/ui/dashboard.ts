import type { LokaForecast } from "../types";
function esc(value: unknown): string { return String(value ?? "").replace(/[&<>'\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c] as string)); }
function weatherGlyph(condition:string):string{if(condition==="soleil")return"☀︎";if(condition==="peu nuageux")return"◒";if(condition==="couvert")return"●";if(condition==="nuageux")return"◐";if(condition==="pluie"||condition==="averse")return"☂︎";if(condition==="orage")return"ϟ";return"◑";}
function formatForecastDate(date:string):string{try{return new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${date}T12:00:00+02:00`));}catch{return date}}
function formatGeneratedAt(value:string):string{try{return new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return""}}
export function renderDashboard(forecast:LokaForecast|null):string{const content=forecast?`<main class="shell"><header class="topbar"><div class="brand">LOKA!</div><div class="update">mis à jour à ${esc(formatGeneratedAt(forecast.generatedAt))}</div></header><section class="intro"><div class="city">${esc(forecast.city.toUpperCase())}</div><div class="date">${esc(formatForecastDate(forecast.date))}</div></section><section class="hero"><div class="temperature">${forecast.tempMaxC}<sup>°</sup></div><div class="minimum">minimum ${forecast.tempMinC}°</div><h1>${esc(forecast.mainVerdict)}</h1></section><section class="hours">${forecast.hourly.map(h=>`<div class="hour"><span class="hour-time">${h.hour}h</span><span class="icon">${weatherGlyph(h.condition)}</span><strong>${h.temperatureC}°</strong></div>`).join("")}</section><section class="decision"><div class="decision-label">Aujourd’hui</div><div class="decision-text">${esc(forecast.rainVerdict)}</div></section><a class="ig-link" href="/instagram">Créer le visuel Instagram</a>${forecast.notableEvent?`<section class="notable"><span class="notable-dot"></span><span>${esc(forecast.notableEvent)}</span></section>`:""}<footer>Ici, aujourd’hui.</footer></main>`:`<main class="shell empty"><div class="brand">LOKA!</div><h1>Aucune prévision enregistrée.</h1></main>`;return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Tarnos</title><style>:root{--ink:#22272d;--secondary:#7b8085;--paper:#f3f1ed;--surface:rgba(255,255,255,.78);--line:rgba(56,62,68,.08);--accent:#d6a84a}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 76% 8%,rgba(255,229,174,.32),transparent 26rem),radial-gradient(circle at 4% 92%,rgba(197,214,229,.34),transparent 30rem),var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:20px 14px 28px}.shell{width:min(100%,580px);min-height:calc(100vh - 48px);margin:0 auto;padding:24px 18px 28px;display:flex;flex-direction:column}.topbar{display:flex;justify-content:space-between}.brand{font-size:12px;font-weight:620;letter-spacing:.16em;color:#77736e}.update{color:#a3a09b;font-size:11px}.intro{text-align:center;padding-top:46px}.city{font-size:17px;font-weight:560;letter-spacing:.24em}.date{margin-top:8px;color:var(--secondary);font-size:13px}.hero{text-align:center;padding:28px 0 38px}.temperature{font-size:clamp(96px,31vw,156px);line-height:.82;font-weight:300;letter-spacing:-.075em}.temperature sup{font-size:.33em}.minimum{margin-top:20px;color:#999691;font-size:12px}h1{font-size:clamp(23px,6.2vw,32px);line-height:1.16;font-weight:470;margin:22px auto 0;max-width:430px}.hours{background:var(--surface);border-radius:34px;padding:22px 11px 21px;display:grid;grid-template-columns:repeat(6,1fr)}.hour{text-align:center;display:grid;gap:10px}.hour-time{color:#8e9296;font-size:11px}.icon{font-size:24px;color:var(--accent)}.hour strong{font-size:17px;font-weight:430}.decision{margin-top:18px;background:rgba(255,255,255,.46);border-radius:27px;padding:22px 24px;text-align:center}.decision-label{color:#a19e99;text-transform:uppercase;letter-spacing:.16em;font-size:9px}.decision-text{margin-top:7px;font-size:20px}.ig-link{display:block;margin-top:14px;padding:15px 18px;text-align:center;background:#171715;color:#fff;text-decoration:none;border-radius:18px;font-size:14px;font-weight:650}.notable{margin-top:12px;border-radius:23px;padding:17px 20px;background:rgba(234,225,207,.72);text-align:center}footer{margin-top:auto;padding-top:34px;text-align:center;color:#aaa6a0;font-family:Georgia,serif;font-size:17px;font-style:italic}</style></head><body>${content}</body></html>`;}

export function renderAdmin():string{return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA Admin</title><style>
*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f2;color:#171715;margin:0;padding:24px}.box{max-width:720px;margin:auto;background:#fff;border-radius:28px;padding:28px}input,button,a{width:100%;padding:16px;border-radius:14px;font-size:16px}input{border:1px solid #ddd;margin:18px 0 12px}button{border:0;background:#171715;color:#fff;font-weight:650;cursor:pointer}.secondary{margin-top:10px;background:#ecece8;color:#171715}.ig{display:block;box-sizing:border-box;margin-top:12px;text-align:center;text-decoration:none;background:#ecece8;color:#171715;font-weight:650}pre{white-space:pre-wrap;background:#f5f5f2;padding:14px;border-radius:14px;min-height:80px;overflow:auto}.shadow,.metrics,.readiness10,.engine11{margin-top:28px;padding-top:24px;border-top:1px solid #ecece8}.shadow h2,.metrics h2,.readiness10 h2,.engine11 h2{font-size:22px;margin:0 0 6px}.muted{font-size:13px;color:#777;line-height:1.45}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.card{background:#f5f5f2;border-radius:18px;padding:16px}.card .label{font-size:10px;letter-spacing:.12em;color:#8a8a84;text-transform:uppercase}.card .scene{font-size:18px;font-weight:700;margin-top:7px}.card .meta{font-size:13px;color:#666;margin-top:5px}.candidate{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e5e5e1;padding:9px 0;font-size:13px}.candidate:first-child{border-top:0}.ok{color:#26764a}.warn{color:#a16516}.error{color:#a12828}
.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.metric-card{background:#f5f5f2;border-radius:18px;padding:15px}.metric-title{font-size:10px;letter-spacing:.1em;color:#898984;text-transform:uppercase}.metric-value{font-size:25px;font-weight:720;margin-top:7px}.metric-sub{font-size:12px;color:#6f6f6a;margin-top:4px;line-height:1.35}.metric-section{margin-top:16px}.metric-section h3{font-size:14px;margin:0 0 8px}.bar-row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:8px 0;border-top:1px solid #e4e4df;font-size:13px}.bar-row:first-child{border-top:0}.readiness{margin-top:14px;border-radius:18px;padding:15px;background:#f5f5f2}.readiness strong{display:block;margin-bottom:5px}.good{color:#26764a}.caution{color:#a16516}.bad{color:#a12828}.ready-status{border-radius:20px;padding:18px;margin-top:14px;background:#f5f5f2}.ready-status .big{font-size:25px;font-weight:760}.criterion{display:grid;grid-template-columns:1fr auto;gap:12px;padding:10px 0;border-top:1px solid #e3e3de;font-size:13px}.criterion:first-child{border-top:0}.family-pill{display:inline-block;padding:5px 8px;border-radius:999px;background:#ecece8;margin:3px 4px 3px 0;font-size:11px}.engine-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.danger{background:#6f2020;color:#fff}.locked{background:#f3e7e7;color:#8e2d2d}.engine-mode{font-size:27px;font-weight:760;margin-top:7px}
@media(max-width:560px){body{padding:14px}.box{padding:20px;border-radius:22px}.comparison,.metric-grid{grid-template-columns:1fr}}
</style></head><body><div class="box"><strong>LOKA!</strong><h1>Lancer Tarnos maintenant</h1><p>Le token reste uniquement dans cette page et n’est pas enregistré.</p><input id="token" type="password" placeholder="ADMIN_TOKEN"><button id="run">Générer la météo</button><button class="secondary" id="shadow">Comparer Legacy / V24</button><button class="secondary" id="metrics">Analyser Shadow V24</button><button class="secondary" id="readinessBtn">Évaluer readiness V24</button><button class="secondary" id="engineBtn">Contrôler le moteur</button><a class="ig" href="/instagram">Créer le visuel Instagram</a><a class="ig" href="/instagram24">Contrôler le Studio V24</a><pre id="out">Prêt.</pre>

<section class="shadow"><h2>Shadow V24</h2><div class="muted">Comparaison diagnostic uniquement. La production reste sur le moteur Legacy 6 scènes.</div><div id="shadowStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="comparison"></div><div id="candidates"></div></section>

<section class="metrics"><h2>Calibration V24</h2><div class="muted">Statistiques calculées à partir de l’historique Shadow des 14 derniers jours.</div><div id="metricsStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="metricsView"></div></section>

<section class="readiness10"><h2>Readiness V24</h2><div class="muted">Sas de validation technique sur 30 jours. Il ne bascule jamais automatiquement la production.</div><div id="readinessStatus" class="muted" style="margin-top:12px">Non évalué.</div><div id="readinessView"></div></section>

<section class="engine11"><h2>Moteur météo</h2><div class="muted">Plan de contrôle Bloc 11.1. La production est techniquement verrouillée sur Legacy.</div><div id="engineStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="engineView"></div></section>

</div><script>
const token=()=>document.getElementById('token').value;
const out=document.getElementById('out');
const statusEl=document.getElementById('shadowStatus');
const comparison=document.getElementById('comparison');
const candidates=document.getElementById('candidates');
const metricsStatus=document.getElementById('metricsStatus');
const metricsView=document.getElementById('metricsView');
const readinessStatus=document.getElementById('readinessStatus');
const readinessView=document.getElementById('readinessView');
const engineStatusEl=document.getElementById('engineStatus');
const engineView=document.getElementById('engineView');
function e(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pct(v){return v===null||v===undefined?'—':Math.round(Number(v)*100)+' %'}
function num(v,d=1){return v===null||v===undefined?'—':Number(v).toFixed(d).replace(/\.0$/,'')}
function metric(label,value,sub){return '<div class="metric-card"><div class="metric-title">'+e(label)+'</div><div class="metric-value">'+e(value)+'</div><div class="metric-sub">'+e(sub||'')+'</div></div>'}
function readinessClass(rate,good,caution,inverse=false){
  if(rate===null||rate===undefined)return 'caution';
  const v=Number(rate);
  if(inverse){if(v<=good)return 'good';if(v<=caution)return 'caution';return 'bad'}
  if(v>=good)return 'good';if(v>=caution)return 'caution';return 'bad'
}
async function fetchJson(url,options){
  const r=await fetch(url,options);
  const text=await r.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(parseError){
    throw new Error('Réponse invalide ('+r.status+') : '+text.slice(0,220));
  }
  if(!r.ok){
    throw new Error((data&&data.error)?data.error:('HTTP '+r.status));
  }
  return data;
}
async function loadShadow(){
  statusEl.textContent='Chargement…';comparison.innerHTML='';candidates.innerHTML='';
  try{
    const d=await fetchJson('/api/shadow?city=tarnos',{headers:{Authorization:'Bearer '+token()}});
    if(d.error){
      statusEl.innerHTML='<span class="error">V24 erreur : '+e(d.error)+'</span>';
    }else if(!d.v24){
      statusEl.innerHTML='<span class="warn">Aucune décision V24 disponible sur cette génération.</span>';
    }else{
      statusEl.innerHTML='<span class="ok">Shadow actif — production : '+e(d.productionClassifier)+'</span> · '+e(d.forecastDate)+' · '+e(d.generatedAt);
    }
    const legacy=d.legacy||{};
    const v24=d.v24||{};
    comparison.innerHTML='<div class="comparison"><div class="card"><div class="label">Officiel actuel</div><div class="scene">'+e(legacy.scene||'—')+'</div><div class="meta">Score '+e(legacy.score??'—')+' · '+e(legacy.version||'legacy')+'</div></div><div class="card"><div class="label">V24 shadow</div><div class="scene">'+e(v24.sceneId?String(v24.sceneId).padStart(2,'0')+' '+v24.sceneLabel:'—')+'</div><div class="meta">Score '+e(v24.score??'—')+' · confiance '+e(v24.confidence||'—')+'</div><div class="meta">Runner-up : '+e(v24.runnerUp?String(v24.runnerUp.sceneId).padStart(2,'0')+' · '+v24.runnerUp.score:'—')+'</div></div></div>';
    if(Array.isArray(d.topCandidates)&&d.topCandidates.length){
      candidates.innerHTML='<h3 style="margin:20px 0 8px;font-size:15px">Top candidats V24</h3><div class="card">'+d.topCandidates.map(c=>'<div class="candidate"><span>'+e(String(c.sceneId).padStart(2,'0'))+' '+e(c.sceneKey)+'</span><strong>'+e(c.score)+'</strong></div>').join('')+'</div>';
    }
  }catch(err){
    statusEl.innerHTML='<span class="error">'+e(err)+'</span>';
  }
}
async function loadMetrics(){
  metricsStatus.textContent='Analyse…';metricsView.innerHTML='';
  try{
    const d=await fetchJson('/api/shadow/metrics?city=tarnos&days=14',{headers:{Authorization:'Bearer '+token()}});
    const sample=d.sample||{}, st=d.stability||{}, sc=d.scoring||{}, rel=d.reliability||{};
    metricsStatus.innerHTML='<span class="ok">Analyse chargée</span> · '+e(sample.generations??0)+' générations · '+e(sample.forecastDays??0)+' jours';

    const stabilityClass=readinessClass(st.finalStabilityRate,.85,.70,false);
    const lowClass=readinessClass(sc.lowConfidenceRate,.20,.40,true);
    const relClass=readinessClass(rel.appliedRate,.20,.40,true);
    const gapClass=readinessClass(sc.averageScoreGap,10,7,false);

    metricsView.innerHTML=
      '<div class="metric-grid">'+
        metric('Générations',sample.generations??0,(sample.forecastDays??0)+' jour(s) observé(s)')+
        metric('Stabilité finale',pct(st.finalStabilityRate),'Raw : '+pct(st.rawStabilityRate))+
        metric('Gain stabilité',st.stabilizationGainPoints===null?'—':(Number(st.stabilizationGainPoints)>=0?'+':'')+num(st.stabilizationGainPoints,1)+' pts','Après Reliability')+
        metric('Écart moyen',num(sc.averageScoreGap,1)+' pts','Gagnant vs runner-up')+
        metric('Confiance LOW',pct(sc.lowConfidenceRate),'MEDIUM '+pct(sc.mediumConfidenceRate)+' · HIGH '+pct(sc.highConfidenceRate))+
        metric('Garde-fou',pct(rel.appliedRate),'Raw → final : '+pct(rel.rawFinalOverrideRate))+
      '</div>'+
      '<div class="readiness"><strong>Lecture rapide</strong>'+
        '<div class="'+stabilityClass+'">Stabilité : '+pct(st.finalStabilityRate)+'</div>'+
        '<div class="'+gapClass+'">Séparation des scores : '+num(sc.averageScoreGap,1)+' pts</div>'+
        '<div class="'+lowClass+'">Décisions LOW : '+pct(sc.lowConfidenceRate)+'</div>'+
        '<div class="'+relClass+'">Interventions Reliability : '+pct(rel.appliedRate)+'</div>'+
        '<div class="muted" style="margin-top:8px">Ces couleurs sont des repères de calibration, pas une autorisation automatique de basculer V24 en production.</div>'+
      '</div>'+
      '<div class="metric-section"><h3>Stabilité temporelle</h3><div class="card">'+
        '<div class="bar-row"><span>Changements Raw</span><strong>'+e(st.rawSceneChanges??0)+'</strong></div>'+
        '<div class="bar-row"><span>Changements stabilisés</span><strong>'+e(st.finalSceneChanges??0)+'</strong></div>'+
        '<div class="bar-row"><span>Plus longue séquence stable</span><strong>'+e(st.longestFinalStableRunGenerations??0)+' gén.</strong></div>'+
        '<div class="bar-row"><span>Changements moyens / jour</span><strong>'+e(num(st.averageFinalSwitchesPerDay,1))+'</strong></div>'+
      '</div></div>'+
      '<div class="metric-section"><h3>Scoring</h3><div class="card">'+
        '<div class="bar-row"><span>Score moyen gagnant</span><strong>'+e(num(sc.averageWinnerScore,1))+'</strong></div>'+
        '<div class="bar-row"><span>Gap médian</span><strong>'+e(num(sc.medianScoreGap,1))+' pts</strong></div>'+
        '<div class="bar-row"><span>Gap minimum</span><strong>'+e(num(sc.minimumScoreGap,1))+' pts</strong></div>'+
        '<div class="bar-row"><span>Décisions serrées (&lt; 7 pts)</span><strong>'+e(pct(sc.closeDecisionRate))+'</strong></div>'+
      '</div></div>'+
      '<div class="metric-section"><h3>Reliability</h3><div class="card">'+
        '<div class="bar-row"><span>Interventions</span><strong>'+e(rel.appliedCount??0)+'</strong></div>'+
        '<div class="bar-row"><span>Fallback</span><strong>'+e(pct(rel.fallbackUsedRate))+'</strong></div>'+
        '<div class="bar-row"><span>Hystérésis</span><strong>'+e(pct(rel.hysteresisAppliedRate))+'</strong></div>'+
        (Array.isArray(rel.reasons)&&rel.reasons.length?rel.reasons.map(x=>'<div class="bar-row"><span>'+e(x.reason)+'</span><strong>'+e(x.count)+'</strong></div>').join(''):'<div class="muted">Aucune raison Reliability enregistrée.</div>')+
      '</div></div>';
  }catch(err){
    metricsStatus.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
  }
}

async function loadReadiness(){
  readinessStatus.textContent='Évaluation…';readinessView.innerHTML='';
  try{
    const d=await fetchJson('/api/shadow/readiness?city=tarnos&days=30',{headers:{Authorization:'Bearer '+token()}});
    const cls=d.status==='READY_CANDIDATE'?'good':(d.status==='OBSERVATION'?'caution':'bad');
    const label=d.status==='READY_CANDIDATE'?'READY CANDIDATE':(d.status==='OBSERVATION'?'OBSERVATION':'NOT READY');
    readinessStatus.innerHTML='<span class="'+cls+'">'+e(label)+'</span> · sas '+e(d.version||'10');
    const criteria=Array.isArray(d.criteria)?d.criteria:[];
    const blockers=Array.isArray(d.blockers)?d.blockers:[];
    const warnings=Array.isArray(d.warnings)?d.warnings:[];
    const families=Array.isArray(d.familyHealth)?d.familyHealth:[];
    readinessView.innerHTML=
      '<div class="ready-status"><div class="big '+cls+'">'+e(label)+'</div><div class="muted" style="margin-top:6px">'+e(d.summary||'')+'</div></div>'+
      '<div class="metric-section"><h3>Critères du sas</h3><div class="card">'+
        criteria.map(c=>'<div class="criterion"><span>'+e(c.label)+'<div class="muted">'+e(c.reason)+' · objectif '+e(c.target)+'</div></span><strong class="'+(c.passed?'good':'bad')+'">'+(c.passed?'OK':'NON')+'</strong></div>').join('')+
      '</div></div>'+
      (blockers.length?'<div class="metric-section"><h3>Bloquants</h3><div class="card">'+blockers.map(x=>'<div class="bar-row"><span class="bad">'+e(x)+'</span></div>').join('')+'</div></div>':'')+
      (warnings.length?'<div class="metric-section"><h3>À surveiller</h3><div class="card">'+warnings.map(x=>'<div class="bar-row"><span class="caution">'+e(x)+'</span></div>').join('')+'</div></div>':'')+
      '<div class="metric-section"><h3>Familles observées</h3><div class="card">'+
        (families.length?families.map(f=>{
          const fc=f.status==='HEALTHY'?'good':(f.status==='WATCH'?'caution':(f.status==='PROBLEM'?'bad':''));
          return '<div class="bar-row"><span><strong>'+e(f.family)+'</strong><div class="muted">'+e(f.generations)+' gén. · LOW '+pct(f.lowConfidenceRate)+' · correction '+pct(f.overrideRate)+'</div></span><strong class="'+fc+'">'+e(f.status)+'</strong></div>'
        }).join(''):'<div class="muted">Pas encore assez de données.</div>')+
      '</div></div>';
  }catch(err){
    readinessStatus.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
  }
}


function renderEngine(d){
  const c=d.control||{}, r=d.resolution||{};
  const effective=r.effectiveProduction||'LEGACY';
  const requested=r.requested||'LEGACY';
  const preview=!!r.previewEnabled;
  const effectiveClass=effective==='LEGACY'?'good':'caution';

  engineStatusEl.innerHTML='<span class="'+effectiveClass+'">Production : '+e(effective)+'</span> · demandé : '+e(requested);

  engineView.innerHTML=
    '<div class="ready-status">'+
      '<div class="metric-title">MOTEUR OFFICIEL EFFECTIF</div>'+
      '<div class="engine-mode">'+e(effective)+'</div>'+
      '<div class="muted">Preview V24 : '+(preview?'ACTIVE':'INACTIVE')+' · readiness '+e(r.readiness||'—')+'</div>'+
      '<div class="muted">Raison : '+e(r.reason||'—')+'</div>'+
    '</div>'+
    '<div class="metric-section"><div class="card">'+
      '<div class="bar-row"><span>Mode demandé</span><strong>'+e(requested)+'</strong></div>'+
      '<div class="bar-row"><span>V24 approuvé</span><strong>'+(r.v24Approved?'OUI':'NON')+'</strong></div>'+
      '<div class="bar-row"><span>Activation production</span><strong class="bad">VERROUILLÉE</strong></div>'+
      '<div class="bar-row"><span>Dernier rollback</span><strong>'+e(c.rollbackAt||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Raison rollback</span><strong>'+e(c.rollbackReason||'—')+'</strong></div>'+
    '</div></div>'+
    '<div class="engine-actions">'+
      '<button class="secondary" id="enablePreview">Activer Preview V24</button>'+
      '<button class="danger" id="rollbackLegacy">Revenir à Legacy</button>'+
    '</div>'+
    '<button class="locked" id="requestProd" style="margin-top:10px">Tester demande V24 production (verrouillée)</button><button class="secondary" id="showPayload" style="margin-top:10px">Voir le futur payload V24</button>'+
    (preview?'<div class="engine-actions"><a class="ig" href="/preview24">Dashboard V24 prépublication</a><a class="ig" href="/instagram24-preview">Studio Instagram prépublication</a></div>':'<div class="muted" style="margin-top:10px">Active Preview V24 pour ouvrir les surfaces de prépublication.</div>')+
    '<div id="payloadView" style="margin-top:12px"></div>';

  document.getElementById('enablePreview').onclick=async()=>{
    try{
      const x=await fetchJson('/api/admin/engine/preview?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+token()}});
      renderEngine(x);
    }catch(err){engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>'}
  };

  document.getElementById('rollbackLegacy').onclick=async()=>{
    try{
      const x=await fetchJson('/api/admin/engine/rollback?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},
        body:JSON.stringify({reason:'manual_mobile_admin'})
      });
      renderEngine(x);
    }catch(err){engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>'}
  };

  document.getElementById('requestProd').onclick=async()=>{
    try{
      await fetchJson('/api/admin/engine/request-v24?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+token()}});
    }catch(err){
      // 423 is expected in Bloc 11.1. Reload status to prove production stayed Legacy.
      try{
        const x=await fetchJson('/api/admin/engine?city=tarnos',{headers:{Authorization:'Bearer '+token()}});
        renderEngine(x);
        engineStatusEl.innerHTML='<span class="caution">Demande V24 refusée comme prévu — production toujours LEGACY.</span>';
      }catch(err2){
        engineStatusEl.innerHTML='<span class="error">'+e(err2&&err2.message?err2.message:String(err2))+'</span>';
      }
    }
  };
  document.getElementById('showPayload').onclick=async()=>{
    const target=document.getElementById('payloadView');
    target.innerHTML='<div class="muted">Construction du preview…</div>';
    try{
      const x=await fetchJson('/api/admin/engine/preview-payload?city=tarnos',{headers:{Authorization:'Bearer '+token()}});
      const p=x.payload||{}, s=p.scene||{}, ed=p.editorial||{}, t=p.temperatures||{}, dg=p.diagnostics||{};
      target.innerHTML=
        '<div class="card"><div class="label">FUTUR PRODUIT V24 — NON PUBLIABLE</div>'+
        '<div class="scene">'+e(String(s.id||'').padStart(2,'0'))+' '+e(s.label||'—')+'</div>'+
        '<div class="meta">'+e(s.family||'—')+' · score '+e(s.score??'—')+' · '+e(s.confidence||'—')+'</div>'+
        '<div class="meta">Master : '+e(s.masterFileName||'—')+'</div>'+
        '<div class="bar-row"><span>Températures</span><strong>'+e(t.minC??'—')+' → '+e(t.maxC??'—')+' °C</strong></div>'+
        '<div class="bar-row"><span>Editorial source</span><strong class="good">'+e(ed.source||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Verdict V24</span><strong>'+e(ed.mainVerdict||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Résumé V24</span><strong>'+e(Array.isArray(ed.summaryLines)?ed.summaryLines.join(' '):'—')+'</strong></div>'+
        '<div class="bar-row"><span>Raw scene</span><strong>'+e(dg.scene24RawId??'—')+'</strong></div>'+
        '<div class="bar-row"><span>Reliability</span><strong>'+e(dg.reliabilityApplied===null?'—':(dg.reliabilityApplied?'OUI':'NON'))+'</strong></div>'+
        '<div class="bar-row"><span>Publishable</span><strong class="bad">NON</strong></div>'+
        '<div class="bar-row"><span>forecast.scene officiel</span><strong>'+e(p.legacyCompatibility?.forecastScene||'—')+'</strong></div></div>';
    }catch(err){
      target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
    }
  };
}

async function loadEngine(){
  engineStatusEl.textContent='Chargement…';engineView.innerHTML='';
  try{
    const d=await fetchJson('/api/admin/engine?city=tarnos',{headers:{Authorization:'Bearer '+token()}});
    renderEngine(d);
  }catch(err){
    engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
  }
}

document.getElementById('shadow').onclick=loadShadow;
document.getElementById('metrics').onclick=loadMetrics;
document.getElementById('readinessBtn').onclick=loadReadiness;
document.getElementById('engineBtn').onclick=loadEngine;
document.getElementById('run').onclick=async()=>{
  out.textContent='Génération…';
  try{
    const r=await fetch('/api/run?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+token()}});
    out.textContent=JSON.stringify(await r.json(),null,2);
    if(r.ok){await loadShadow();await loadMetrics();await loadReadiness();await loadEngine()}
  }catch(e2){out.textContent=String(e2)}
};
</script></body></html>`;}