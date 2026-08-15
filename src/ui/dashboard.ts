import type { LokaForecast } from "../types";
function esc(value: unknown): string { return String(value ?? "").replace(/[&<>'\"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c] as string)); }
function weatherGlyph(condition:string):string{if(condition==="soleil")return"☀︎";if(condition==="peu nuageux")return"◒";if(condition==="couvert")return"●";if(condition==="nuageux")return"◐";if(condition==="pluie"||condition==="averse")return"☂︎";if(condition==="orage")return"ϟ";return"◑";}
function formatForecastDate(date:string):string{try{return new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${date}T12:00:00+02:00`));}catch{return date}}
function formatGeneratedAt(value:string):string{try{return new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}catch{return""}}
export function renderDashboard(forecast:LokaForecast|null):string{const content=forecast?`<main class="shell"><header class="topbar"><div class="brand">LOKA!</div><div class="update">mis à jour à ${esc(formatGeneratedAt(forecast.generatedAt))}</div></header><section class="intro"><div class="city">${esc(forecast.city.toUpperCase())}</div><div class="date">${esc(formatForecastDate(forecast.date))}</div></section><section class="hero"><div class="temperature">${forecast.tempMaxC}<sup>°</sup></div><div class="minimum">minimum ${forecast.tempMinC}°</div><h1>${esc(forecast.mainVerdict)}</h1></section><section class="hours">${forecast.hourly.map(h=>`<div class="hour"><span class="hour-time">${h.hour}h</span><span class="icon">${weatherGlyph(h.condition)}</span><strong>${h.temperatureC}°</strong></div>`).join("")}</section><section class="decision"><div class="decision-label">Aujourd’hui</div><div class="decision-text">${esc(forecast.rainVerdict)}</div></section><a class="ig-link" href="/instagram">Créer le visuel Instagram</a>${forecast.notableEvent?`<section class="notable"><span class="notable-dot"></span><span>${esc(forecast.notableEvent)}</span></section>`:""}<footer>Ici, aujourd’hui.</footer></main>`:`<main class="shell empty"><div class="brand">LOKA!</div><h1>Aucune prévision enregistrée.</h1></main>`;return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Tarnos</title><style>:root{--ink:#22272d;--secondary:#7b8085;--paper:#f3f1ed;--surface:rgba(255,255,255,.78);--line:rgba(56,62,68,.08);--accent:#d6a84a}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 76% 8%,rgba(255,229,174,.32),transparent 26rem),radial-gradient(circle at 4% 92%,rgba(197,214,229,.34),transparent 30rem),var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:20px 14px 28px}.shell{width:min(100%,580px);min-height:calc(100vh - 48px);margin:0 auto;padding:24px 18px 28px;display:flex;flex-direction:column}.topbar{display:flex;justify-content:space-between}.brand{font-size:12px;font-weight:620;letter-spacing:.16em;color:#77736e}.update{color:#a3a09b;font-size:11px}.intro{text-align:center;padding-top:46px}.city{font-size:17px;font-weight:560;letter-spacing:.24em}.date{margin-top:8px;color:var(--secondary);font-size:13px}.hero{text-align:center;padding:28px 0 38px}.temperature{font-size:clamp(96px,31vw,156px);line-height:.82;font-weight:300;letter-spacing:-.075em}.temperature sup{font-size:.33em}.minimum{margin-top:20px;color:#999691;font-size:12px}h1{font-size:clamp(23px,6.2vw,32px);line-height:1.16;font-weight:470;margin:22px auto 0;max-width:430px}.hours{background:var(--surface);border-radius:34px;padding:22px 11px 21px;display:grid;grid-template-columns:repeat(6,1fr)}.hour{text-align:center;display:grid;gap:10px}.hour-time{color:#8e9296;font-size:11px}.icon{font-size:24px;color:var(--accent)}.hour strong{font-size:17px;font-weight:430}.decision{margin-top:18px;background:rgba(255,255,255,.46);border-radius:27px;padding:22px 24px;text-align:center}.decision-label{color:#a19e99;text-transform:uppercase;letter-spacing:.16em;font-size:9px}.decision-text{margin-top:7px;font-size:20px}.ig-link{display:block;margin-top:14px;padding:15px 18px;text-align:center;background:#171715;color:#fff;text-decoration:none;border-radius:18px;font-size:14px;font-weight:650}.notable{margin-top:12px;border-radius:23px;padding:17px 20px;background:rgba(234,225,207,.72);text-align:center}footer{margin-top:auto;padding-top:34px;text-align:center;color:#aaa6a0;font-family:Georgia,serif;font-size:17px;font-style:italic}</style></head><body>${content}</body></html>`;}

export function renderAdminTech():string{return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA Admin</title><style>
*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f2;color:#171715;margin:0;padding:24px}.box{max-width:720px;margin:auto;background:#fff;border-radius:28px;padding:28px}input,button,a{width:100%;padding:16px;border-radius:14px;font-size:16px}input{border:1px solid #ddd;margin:18px 0 12px}button{border:0;background:#171715;color:#fff;font-weight:650;cursor:pointer}.secondary{margin-top:10px;background:#ecece8;color:#171715}.ig{display:block;box-sizing:border-box;margin-top:12px;text-align:center;text-decoration:none;background:#ecece8;color:#171715;font-weight:650}pre{white-space:pre-wrap;background:#f5f5f2;padding:14px;border-radius:14px;min-height:80px;overflow:auto}.shadow,.metrics,.readiness10,.engine11{margin-top:28px;padding-top:24px;border-top:1px solid #ecece8}.shadow h2,.metrics h2,.readiness10 h2,.engine11 h2{font-size:22px;margin:0 0 6px}.muted{font-size:13px;color:#777;line-height:1.45}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.card{background:#f5f5f2;border-radius:18px;padding:16px}.card .label{font-size:10px;letter-spacing:.12em;color:#8a8a84;text-transform:uppercase}.card .scene{font-size:18px;font-weight:700;margin-top:7px}.card .meta{font-size:13px;color:#666;margin-top:5px}.candidate{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e5e5e1;padding:9px 0;font-size:13px}.candidate:first-child{border-top:0}.ok{color:#26764a}.warn{color:#a16516}.error{color:#a12828}
.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.metric-card{background:#f5f5f2;border-radius:18px;padding:15px}.metric-title{font-size:10px;letter-spacing:.1em;color:#898984;text-transform:uppercase}.metric-value{font-size:25px;font-weight:720;margin-top:7px}.metric-sub{font-size:12px;color:#6f6f6a;margin-top:4px;line-height:1.35}.metric-section{margin-top:16px}.metric-section h3{font-size:14px;margin:0 0 8px}.bar-row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:8px 0;border-top:1px solid #e4e4df;font-size:13px}.bar-row:first-child{border-top:0}.readiness{margin-top:14px;border-radius:18px;padding:15px;background:#f5f5f2}.readiness strong{display:block;margin-bottom:5px}.good{color:#26764a}.caution{color:#a16516}.bad{color:#a12828}.ready-status{border-radius:20px;padding:18px;margin-top:14px;background:#f5f5f2}.ready-status .big{font-size:25px;font-weight:760}.criterion{display:grid;grid-template-columns:1fr auto;gap:12px;padding:10px 0;border-top:1px solid #e3e3de;font-size:13px}.criterion:first-child{border-top:0}.family-pill{display:inline-block;padding:5px 8px;border-radius:999px;background:#ecece8;margin:3px 4px 3px 0;font-size:11px}.engine-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.danger{background:#6f2020;color:#fff}.locked{background:#f3e7e7;color:#8e2d2d}.engine-mode{font-size:27px;font-weight:760;margin-top:7px}
@media(max-width:560px){body{padding:14px}.box{padding:20px;border-radius:22px}.comparison,.metric-grid{grid-template-columns:1fr}}
</style></head><body><div class="box"><strong>LOKA!</strong><h1>Lancer Tarnos maintenant</h1><p>Le token reste uniquement dans cette page et n’est pas enregistré.</p><input id="token" type="password" placeholder="ADMIN_TOKEN"><button id="run">Générer la météo</button><button class="secondary" id="shadow">Comparer Legacy / V24</button><button class="secondary" id="metrics">Analyser Shadow V24</button><button class="secondary" id="readinessBtn">Évaluer readiness V24</button><button class="secondary" id="engineBtn">Contrôler le moteur</button><a class="ig" href="/instagram">Créer le visuel Instagram</a><a class="ig" href="/instagram24">Contrôler le Studio V24</a><pre id="out">Prêt.</pre>

<section class="shadow"><h2>Shadow V24</h2><div class="muted">Comparaison diagnostic uniquement. La production reste sur le moteur Legacy 6 scènes.</div><div id="shadowStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="comparison"></div><div id="candidates"></div></section>

<section class="metrics"><h2>Calibration V24</h2><div class="muted">Statistiques calculées à partir de l’historique Shadow des 14 derniers jours.</div><div id="metricsStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="metricsView"></div></section>

<section class="readiness10"><h2>Readiness V24</h2><div class="muted">Sas de validation technique sur 30 jours. Il ne bascule jamais automatiquement la production.</div><div id="readinessStatus" class="muted" style="margin-top:12px">Non évalué.</div><div id="readinessView"></div></section>

<section class="engine11"><h2>Moteur météo</h2><div class="muted">Bloc 12.16. Handover final : certifie que l’architecture, les verrous, le rollback et le process GO LIVE sont complets sans activer V24.</div><div id="engineStatus" class="muted" style="margin-top:12px">Non chargé.</div><div id="engineView"></div></section>

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
  const c=d.control||{}, r=d.resolution||{}, pipe=d.pipeline||{}, pr=pipe.latestResolution||{}, pg=pipe.latestActivationGuard||{};
  const resolverEffective=r.effectiveProduction||'LEGACY';
  const effective=pipe.actualEffectiveProduction||pr.effectiveProduction||'LEGACY';
  const requested=r.requested||'LEGACY';
  const preview=!!r.previewEnabled;
  const pipelineConnected=pipe.connected===true;
  const effectiveClass=effective==='V24'?'good':'caution';

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
      '<div class="bar-row"><span>Cutover public</span><strong class="'+(resolverEffective==='V24'?'good':'caution')+'">'+(resolverEffective==='V24'?'ARMÉ · GARDE-FOU REQUIS':'NON ARMÉ')+'</strong></div>'+
      '<div class="bar-row"><span>Sélecteur dans le pipeline</span><strong class="'+(pipelineConnected?'good':'caution')+'">'+(pipelineConnected?'CONNECTÉ':'EN ATTENTE D’UNE GÉNÉRATION')+'</strong></div>'+
      '<div class="bar-row"><span>Dernière génération publique</span><strong>'+e(pr.effectiveProduction||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Raison pipeline</span><strong>'+e(pr.reason||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Garde-fou génération</span><strong class="'+(pg.status==='PASS'?'good':(pg.status==='BLOCKED'?'bad':'caution'))+'">'+e(pg.status||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Prêt pour cutover</span><strong class="'+(pg.activationReadyForCutover?'good':'caution')+'">'+(pg.activationReadyForCutover?'OUI':'NON')+'</strong></div>'+
      '<div class="bar-row"><span>Fallback génération</span><strong>'+(pg.fallbackRequired?'LEGACY':'—')+'</strong></div>'+
      '<div class="bar-row"><span>Dernier rollback</span><strong>'+e(c.rollbackAt||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Raison rollback</span><strong>'+e(c.rollbackReason||'—')+'</strong></div>'+
    '</div></div>'+
    '<div class="engine-actions">'+
      '<button class="secondary" id="enablePreview">Activer Preview V24</button>'+
      '<button class="danger" id="rollbackLegacy">Revenir à Legacy</button>'+
    '</div>'+
    '<button class="secondary" id="showPayload" style="margin-top:10px">Voir le futur payload V24</button><button class="secondary" id="checkActivation" style="margin-top:10px">Tester les garde-fous V24</button><button class="secondary" id="testFallbacks" style="margin-top:10px">Tester les fallbacks 12.5</button><button class="secondary" id="checkCoherence" style="margin-top:10px">Contrôler cohérence 12.6</button><button class="locked" id="validateRC" style="margin-top:10px">Valider Release Candidate 12.7</button><button class="danger" id="runFaultLab" style="margin-top:10px">Tester pannes 12.8</button><button class="secondary" id="auditScenes24" style="margin-top:10px">Auditer 24 scènes 12.9</button><button class="danger" id="rollbackDrill" style="margin-top:10px">Tester rollback réel 12.10</button><button class="locked" id="finalAudit" style="margin-top:10px">Audit final RC 12.11</button><button class="locked" id="mobileRehearsal" style="margin-top:10px">Répétition générale 12.12</button><button class="danger" id="goLive13" style="margin-top:10px">GO LIVE V24 · 12.13</button><button class="secondary" id="supervisor14" style="margin-top:10px">Supervision production 12.14</button><button class="locked" id="certWindow15" style="margin-top:10px">Fenêtre certification 12.15</button><button class="secondary" id="handover16" style="margin-top:10px">Certification finale système 12.16</button>'+
    '<div class="metric-section"><h3>GO LIVE V24 — contrôle final</h3><div id="goLiveView" class="card"><div class="muted">Chargement…</div></div></div>'+
    '<div class="metric-section"><h3>Supervision production — Bloc 12.14</h3><div id="supervisorView" class="card"><div class="muted">Chargement…</div></div></div>'+
    '<div class="metric-section"><h3>Fenêtre de certification — Bloc 12.15</h3><div id="certWindowView" class="card"><div class="muted">Chargement…</div></div></div>'+
    '<div class="metric-section"><h3>Certification finale système — Bloc 12.16</h3><div id="handoverView" class="card"><div class="muted">Chargement…</div></div></div>'+
    '<div class="metric-section"><h3>Autorisation V24 historique</h3><div id="approvalView" class="card"><div class="muted">Chargement…</div></div></div>'+
    (preview?'<div class="engine-actions"><a class="ig" href="/preview24">Dashboard V24 prépublication</a><a class="ig" href="/instagram24-preview">Studio Instagram prépublication</a></div>':'<div class="muted" style="margin-top:10px">Active Preview V24 pour ouvrir les surfaces de prépublication.</div>')+
    '<div id="payloadView" style="margin-top:12px"></div>';

  document.getElementById('enablePreview').onclick=async()=>{
    try{
      const x=await fetchJson('/api/admin/engine/preview?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+token()}});
      await loadEngine();
    }catch(err){engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>'}
  };

  document.getElementById('rollbackLegacy').onclick=async()=>{
    try{
      const x=await fetchJson('/api/admin/engine/rollback?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},
        body:JSON.stringify({reason:'manual_mobile_admin'})
      });
      await loadEngine();
    }catch(err){engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>'}
  };

  function surfaceObservation(surface,response){
    return {
      surface,
      status:response.status,
      version:response.headers.get('x-loka-publication-version'),
      generatedAt:response.headers.get('x-loka-generated-at'),
      engine:response.headers.get('x-loka-engine'),
      scene:response.headers.get('x-loka-scene'),
      fingerprint:response.headers.get('x-loka-publication-fingerprint')
    };
  }

  function rehearsalObservation(surface,response){
    return {
      surface,
      status:response.status,
      publicationVersion:response.headers.get('x-loka-publication-version'),
      generatedAt:response.headers.get('x-loka-generated-at'),
      engine:response.headers.get('x-loka-engine'),
      scene:response.headers.get('x-loka-scene'),
      fingerprint:response.headers.get('x-loka-publication-fingerprint'),
      previewVersion:response.headers.get('x-loka-preview-version'),
      previewGeneratedAt:response.headers.get('x-loka-preview-generated-at'),
      previewScene:response.headers.get('x-loka-preview-scene'),
      previewMode:response.headers.get('x-loka-preview-mode')
    };
  }

  async function fetchRehearsalObservation(surface,url){
    try{
      const response=await fetch(url,{
        method:'GET',
        cache:'no-store',
        headers:{'Cache-Control':'no-cache'}
      });
      return rehearsalObservation(surface,response);
    }catch(error){
      return {
        surface,
        status:0,
        publicationVersion:null,
        generatedAt:null,
        engine:null,
        scene:null,
        fingerprint:null,
        previewVersion:null,
        previewGeneratedAt:null,
        previewScene:null,
        previewMode:null
      };
    }
  }

  document.getElementById('mobileRehearsal').onclick=async()=>{
    const btn=document.getElementById('mobileRehearsal');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    let prepared=false;
    let completed=false;
    let handedToUser=false;

    try{
      const info=await fetchJson('/api/admin/mobile-rehearsal?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });

      const phrase=String(info.confirmationPhrase||'');
      const entered=window.prompt(
        'Répétition générale 12.12. Preview V24 sera activé temporairement, sans approbation et sans publication officielle. Tape exactement : '+phrase
      );

      if(entered===null){
        out.innerHTML='<div class="muted">Répétition annulée. Aucune modification.</div>';
        return;
      }

      const prepResponse=await fetch('/api/admin/mobile-rehearsal/prepare?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token(),
          'Content-Type':'application/json'
        },
        body:JSON.stringify({confirmationPhrase:entered}),
        cache:'no-store'
      });

      const prepText=await prepResponse.text();
      let prep=null;
      try{
        prep=prepText?JSON.parse(prepText):null;
      }catch{
        throw new Error('Réponse préparation invalide : '+prepText.slice(0,220));
      }

      if(!prepResponse.ok||!prep?.prepared){
        throw new Error(prep?.error||('HTTP '+prepResponse.status));
      }

      prepared=true;

      const p=prep.prepared;
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.12 · RÉPÉTITION GÉNÉRALE</div>'+
        '<div class="scene caution">PREVIEW V24 ACTIF · NON PUBLIÉ</div>'+
        '<div class="bar-row"><span>Production officielle</span><strong class="good">LEGACY</strong></div>'+
        '<div class="bar-row"><span>V24 approuvé</span><strong class="good">NON</strong></div>'+
        '<div class="bar-row"><span>Scène V24 répétition</span><strong>'+e(p.preview?.sceneKey||'—')+'</strong></div>'+
        '<div class="muted" style="margin:12px 0">Ouvre les deux surfaces ci-dessous et vérifie-les visuellement sur ton téléphone. Reviens ensuite sur cet onglet pour terminer.</div>'+
        '<a class="secondary" style="display:block;text-align:center;text-decoration:none;padding:18px;border-radius:20px;margin-top:10px" href="/preview24?_rehearsal='+Date.now()+'" target="_blank" rel="noopener">Ouvrir Dashboard V24</a>'+
        '<a class="secondary" style="display:block;text-align:center;text-decoration:none;padding:18px;border-radius:20px;margin-top:10px" href="/instagram24-preview?_rehearsal='+Date.now()+'" target="_blank" rel="noopener">Ouvrir Studio Instagram V24</a>'+
        '<button class="locked" id="finishRehearsal" style="margin-top:14px">J’ai vérifié · Terminer et rollback</button>'+
        '<button class="secondary" id="cancelRehearsal" style="margin-top:10px">Annuler · Revenir Legacy</button>'+
        '<div class="muted" style="margin-top:10px">Ne ferme pas cet onglet avant le rollback. Si cela arrive, le Preview reste non publié et le bouton Admin « Revenir à Legacy » reste disponible.</div>'+
        '</div>';

      document.getElementById('cancelRehearsal').onclick=async()=>{
        const cancel=document.getElementById('cancelRehearsal');
        cancel.disabled=true;
        try{
          const response=await fetch('/api/admin/mobile-rehearsal/cleanup?city=tarnos',{
            method:'POST',
            headers:{Authorization:'Bearer '+token()},
            cache:'no-store'
          });
          const text=await response.text();
          let data=null;
          try{data=text?JSON.parse(text):null}catch{}
          if(!response.ok||!data?.ok){
            throw new Error(data?.error||('HTTP '+response.status));
          }
          prepared=false;
          completed=true;
          handedToUser=false;
          out.innerHTML='<div class="card"><div class="scene good">LEGACY RÉTABLI</div><div class="muted">Répétition annulée sans publication V24.</div></div>';
        }catch(err){
          out.innerHTML='<div class="card"><div class="scene bad">ROLLBACK À VÉRIFIER</div><div class="error">'+e(err&&err.message?err.message:String(err))+'</div><div class="muted">Utilise immédiatement « Revenir à Legacy » dans le panneau moteur.</div></div>';
        }finally{
          btn.disabled=false;
        }
      };

      document.getElementById('finishRehearsal').onclick=async()=>{
        const finish=document.getElementById('finishRehearsal');
        finish.disabled=true;

        try{
          out.innerHTML=
            '<div class="card"><div class="label">BLOC 12.12 · CONTRÔLE AUTOMATIQUE</div>'+
            '<div class="muted">Lecture des 4 surfaces officielles + 2 surfaces Preview, puis rollback global…</div></div>';

          const stamp=Date.now();
          const reqs=[
            ['api_latest','/api/latest?city=tarnos&_r='+stamp],
            ['api_decision','/api/decision?city=tarnos&_r='+stamp],
            ['dashboard','/?_r='+stamp],
            ['instagram','/instagram?_r='+stamp],
            ['preview_dashboard','/preview24?_r='+stamp],
            ['preview_instagram','/instagram24-preview?_r='+stamp]
          ];

          const observations=[];
          for(const [surface,url] of reqs){
            observations.push(
              await fetchRehearsalObservation(surface,url)
            );
          }

          const response=await fetch('/api/admin/mobile-rehearsal/complete?city=tarnos',{
            method:'POST',
            headers:{
              Authorization:'Bearer '+token(),
              'Content-Type':'application/json'
            },
            body:JSON.stringify({observations}),
            cache:'no-store'
          });

          const text=await response.text();
          let x=null;
          try{
            x=text?JSON.parse(text):null;
          }catch{
            throw new Error('Réponse répétition invalide ('+response.status+') : '+text.slice(0,220));
          }

          if(!x?.report){
            throw new Error(x?.error||('HTTP '+response.status));
          }

          prepared=false;
          completed=true;
          handedToUser=false;

          const r=x.report||{};
          const checks=Array.isArray(r.checks)?r.checks:[];
          const cls=r.status==='REHEARSAL_PASS'?'good':'bad';

          out.innerHTML=
            '<div class="card"><div class="label">BLOC 12.12 · RÉPÉTITION GÉNÉRALE</div>'+
            '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
            '<div class="bar-row"><span>Production finale</span><strong class="'+(r.after?.publicEngine==='LEGACY'?'good':'bad')+'">'+e(r.after?.publicEngine||'—')+'</strong></div>'+
            '<div class="bar-row"><span>requested final</span><strong class="'+(r.after?.requestedMode==='LEGACY'?'good':'bad')+'">'+e(r.after?.requestedMode||'—')+'</strong></div>'+
            '<div class="bar-row"><span>V24 approuvé final</span><strong class="'+(!r.after?.v24Approved?'good':'bad')+'">'+(r.after?.v24Approved?'OUI':'NON')+'</strong></div>'+
            '<div class="bar-row"><span>Dashboard Preview</span><strong class="'+(r.summary?.previewDashboardVerified?'good':'bad')+'">'+(r.summary?.previewDashboardVerified?'PASS':'FAIL')+'</strong></div>'+
            '<div class="bar-row"><span>Studio Instagram Preview</span><strong class="'+(r.summary?.previewInstagramVerified?'good':'bad')+'">'+(r.summary?.previewInstagramVerified?'PASS':'FAIL')+'</strong></div>'+
            '<div class="bar-row"><span>4 surfaces officielles</span><strong class="'+(r.summary?.publicSurfacesVerified?'good':'bad')+'">'+(r.summary?.publicSurfacesVerified?'PASS':'FAIL')+'</strong></div>'+
            '<div class="bar-row"><span>Identité publique</span><strong class="'+(r.summary?.publicIdentityUnchanged?'good':'bad')+'">'+(r.summary?.publicIdentityUnchanged?'INCHANGÉE':'MODIFIÉE')+'</strong></div>'+
            '<div class="bar-row"><span>Rollback global</span><strong class="'+(r.summary?.rollbackVerified?'good':'bad')+'">'+(r.summary?.rollbackVerified?'PASS':'FAIL')+'</strong></div>'+
            '<div class="bar-row"><span>GO LIVE Instagram</span><strong class="caution">NON · BLOC 12.13</strong></div>'+
            checks.map(c=>
              '<div class="bar-row"><span>'+e(c.id)+'<div class="muted">'+e(c.detail||'')+'</div></span><strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':'bad'))+'">'+e(c.status)+'</strong></div>'
            ).join('')+
            '<div class="muted" style="margin-top:12px">La répétition a utilisé V24_PREVIEW réel puis le rollback global officiel. Aucun forecast ni aucune approbation V24 n’ont été créés.</div>'+
            '</div>';
        }catch(err){
          // Si la finalisation échoue alors que Preview est encore actif,
          // tenter immédiatement le rollback global.
          try{
            await fetch('/api/admin/mobile-rehearsal/cleanup?city=tarnos',{
              method:'POST',
              headers:{Authorization:'Bearer '+token()},
              cache:'no-store'
            });
          }catch{}

          prepared=false;
          handedToUser=false;

          out.innerHTML=
            '<div class="card"><div class="label">BLOC 12.12 · RÉPÉTITION GÉNÉRALE</div>'+
            '<div class="scene bad">RÉPÉTITION NON VALIDÉE</div>'+
            '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
            '<div class="muted">Un rollback de sécurité a été tenté. Vérifie ensuite le moteur : requested LEGACY, V24 approuvé NON.</div></div>';
        }finally{
          btn.disabled=false;
        }
      };

      // À partir d'ici l'utilisateur doit ouvrir les deux surfaces Preview,
      // revenir sur cet onglet, puis choisir Terminer ou Annuler.
      // L'outer handler ne doit donc surtout pas déclencher le cleanup maintenant.
      handedToUser=true;

    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.12 · RÉPÉTITION GÉNÉRALE</div>'+
        '<div class="scene bad">RÉPÉTITION NON VALIDÉE</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Un rollback de sécurité va être tenté si Preview avait été activé.</div></div>';
    }finally{
      if(prepared&&!completed&&!handedToUser){
        try{
          await fetch('/api/admin/mobile-rehearsal/cleanup?city=tarnos',{
            method:'POST',
            headers:{Authorization:'Bearer '+token()},
            cache:'no-store'
          });
          prepared=false;
        }catch{
          // Manual rollback remains available in Admin.
        }
      }
      // Si handedToUser=true, le bouton principal reste désactivé jusqu'à
      // Terminer/Annuler pour éviter deux répétitions simultanées.
      if(!handedToUser){
        btn.disabled=false;
      }
    }
  };

  document.getElementById('finalAudit').onclick=async()=>{
    const btn=document.getElementById('finalAudit');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    out.innerHTML=
      '<div class="card"><div class="label">BLOC 12.11 · AUDIT FINAL RC</div>'+
      '<div class="muted">Étape 1/2 · rafraîchissement réel de la cohérence des 4 surfaces…</div></div>';

    try{
      const coherence=await runBrowserCoherenceForRC();

      if(coherence.status!=='PASS'){
        throw new Error(
          'surface_coherence_'+String(coherence.status||'FAIL')
        );
      }

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.11 · AUDIT FINAL RC</div>'+
        '<div class="muted">Étape 2/2 · recoupement serveur de toutes les preuves 12.5 → 12.10…</div></div>';

      const finalResponse=await fetch('/api/admin/final-release-audit/run?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token()
        },
        cache:'no-store'
      });

      const finalText=await finalResponse.text();
      let x=null;
      try{
        x=finalText?JSON.parse(finalText):null;
      }catch(parseError){
        throw new Error(
          'Réponse audit invalide ('+finalResponse.status+') : '+finalText.slice(0,220)
        );
      }

      if(!x||!x.report){
        throw new Error(
          (x&&x.error)
            ?x.error
            :('HTTP '+finalResponse.status)
        );
      }

      const r=x.report||{};
      const checks=Array.isArray(r.checks)?r.checks:[];
      const cls=
        r.status==='FINAL_RC_PASS'
          ?'good'
          :(r.status==='FINAL_RC_PENDING'
            ?'caution'
            :'bad');

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.11 · AUDIT FINAL RELEASE CANDIDATE</div>'+
        '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
        '<div class="bar-row"><span>HTTP audit</span><strong>'+e(finalResponse.status)+'</strong></div>'+
        '<div class="bar-row"><span>Génération</span><strong>'+e(r.generatedAt||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Moteur public</span><strong>'+e(r.effectiveEngine||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Scène</span><strong>'+e(r.sceneKey||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Readiness météo</span><strong>'+e(r.summary?.readiness||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Prêt pour répétition 12.12</span><strong class="'+(r.summary?.rehearsalEligible?'good':'bad')+'">'+(r.summary?.rehearsalEligible?'OUI':'NON')+'</strong></div>'+
        '<div class="bar-row"><span>GO LIVE Instagram</span><strong class="caution">NON · BLOC 12.13</strong></div>'+
        checks.map(c=>
          '<div class="bar-row"><span>'+e(c.label)+
          '<div class="muted">'+e(c.detail||'')+'</div></span>'+
          '<strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':(c.status==='PENDING'?'caution':'bad')))+'">'+e(c.status)+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:12px">L’audit 12.11 ne change ni forecast, ni engine_control, ni autorisation V24. Une preuve append-only est enregistrée.</div>'+
        '</div>';

      // Ne pas re-rendre engineView ici : cela effacerait payloadView.
    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.11 · AUDIT FINAL RC</div>'+
        '<div class="scene bad">AUDIT NON VALIDÉ</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Aucune activation V24 et aucune publication Instagram n’ont été déclenchées.</div></div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('rollbackDrill').onclick=async()=>{
    const btn=document.getElementById('rollbackDrill');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    try{
      const prep=await fetchJson('/api/admin/rollback-drill?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });

      const phrase=String(prep.confirmationPhrase||'');
      const entered=window.prompt(
        'Test RÉEL du rollback global.\\n\\nLe test modifiera temporairement engine_control, mais ne générera aucune météo et n’accordera jamais V24.\\n\\nTape exactement :\\n'+phrase
      );

      if(entered===null){
        out.innerHTML='<div class="muted">Test rollback annulé. Aucune modification.</div>';
        return;
      }

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.10 · ROLLBACK RÉEL</div>'+
        '<div class="muted">Drill en cours. État final obligatoire : LEGACY / V24 approuvé NON.</div></div>';

      const x=await fetchJson('/api/admin/rollback-drill/run?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token(),
          'Content-Type':'application/json'
        },
        body:JSON.stringify({confirmationPhrase:entered})
      });

      const r=x.report||{},steps=Array.isArray(r.steps)?r.steps:[];
      const cls=r.status==='PASS'?'good':(r.status==='REFUSED'?'caution':'bad');

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.10 · DRILL ROLLBACK</div>'+
        '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
        '<div class="bar-row"><span>Avant</span><strong>'+e(r.before?.control?.requestedMode||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Après</span><strong class="'+((r.after?.control?.requestedMode==='LEGACY'&&!r.after?.control?.v24Approved)?'good':'bad')+'">'+e(r.after?.control?.requestedMode||'—')+'</strong></div>'+
        '<div class="bar-row"><span>V24 approuvé final</span><strong class="'+(!r.after?.control?.v24Approved?'good':'bad')+'">'+(r.after?.control?.v24Approved?'OUI':'NON')+'</strong></div>'+
        '<div class="bar-row"><span>Forecast régénéré</span><strong class="'+(r.summary?.forecastGenerationUnchanged?'good':'bad')+'">'+(r.summary?.forecastGenerationUnchanged?'NON':'OUI')+'</strong></div>'+
        '<div class="bar-row"><span>Identité publique</span><strong class="'+(r.summary?.publicIdentityUnchanged?'good':'bad')+'">'+(r.summary?.publicIdentityUnchanged?'INCHANGÉE':'MODIFIÉE')+'</strong></div>'+
        '<div class="bar-row"><span>Cleanup secours</span><strong class="'+(r.summary?.emergencyCleanupUsed?'caution':'good')+'">'+(r.summary?.emergencyCleanupUsed?'UTILISÉ':'NON')+'</strong></div>'+
        steps.map(s=>
          '<div class="bar-row"><span>'+e(s.id)+'<div class="muted">'+e(s.detail||'')+'</div></span><strong class="'+(s.status==='PASS'?'good':(s.status==='INFO'?'caution':'bad'))+'">'+e(s.status)+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:12px">Ce test a réellement écrit engine_control, puis utilisé le rollback global officiel. Aucun forecast et aucune approbation V24 n’ont été créés.</div>'+
        '</div>';

      // Le rapport contient déjà l'état final LEGACY vérifié.
    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.10 · ROLLBACK RÉEL</div>'+
        '<div class="scene bad">TEST NON VALIDÉ</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Vérifie immédiatement l’état moteur avec le bouton « Contrôler le moteur » : Production LEGACY, requested LEGACY, V24 approuvé NON.</div></div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('auditScenes24').onclick=async()=>{
    const btn=document.getElementById('auditScenes24');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    out.innerHTML=
      '<div class="card"><div class="label">BLOC 12.9 · AUDIT 24 SCÈNES</div>'+
      '<div class="muted">Contrôle du registre, des 24 masters physiques et de la chaîne éditoriale complète…</div></div>';

    try{
      const x=await fetchJson('/api/admin/scenes24/audit/run?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()}
      });

      const r=x.report||{},items=Array.isArray(r.scenes)?r.scenes:[],reg=Array.isArray(r.registryChecks)?r.registryChecks:[];
      const cls=r.status==='PASS'?'good':(r.status==='PENDING'?'caution':'bad');

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.9 · CATALOGUE V24</div>'+
        '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
        '<div class="bar-row"><span>Scènes registre</span><strong>'+e(r.summary?.registryCount??'—')+'/24</strong></div>'+
        '<div class="bar-row"><span>Scènes contrôlées</span><strong>'+e(r.summary?.sceneCount??'—')+'/24</strong></div>'+
        '<div class="bar-row"><span>Masters disponibles</span><strong class="'+((r.summary?.mastersAvailable===24)?'good':'bad')+'">'+e(r.summary?.mastersAvailable??0)+'/24</strong></div>'+
        '<div class="bar-row"><span>Éditoriaux valides</span><strong class="'+((r.summary?.editorialsValid===24)?'good':'bad')+'">'+e(r.summary?.editorialsValid??0)+'/24</strong></div>'+
        '<div class="bar-row"><span>PASS</span><strong class="good">'+e(r.summary?.passed??0)+'</strong></div>'+
        '<div class="bar-row"><span>FAIL</span><strong class="bad">'+e(r.summary?.failed??0)+'</strong></div>'+
        '<div class="bar-row"><span>PENDING</span><strong class="caution">'+e(r.summary?.pending??0)+'</strong></div>'+
        '<div class="metric-title" style="margin-top:14px">REGISTRE</div>'+
        reg.map(t=>
          '<div class="bar-row"><span>'+e(t.id)+'<div class="muted">'+e(t.detail||'')+'</div></span><strong class="'+(t.status==='PASS'?'good':'bad')+'">'+e(t.status)+'</strong></div>'
        ).join('')+
        '<div class="metric-title" style="margin-top:14px">24 SCÈNES</div>'+
        items.map(t=>
          '<div class="bar-row"><span>'+String(t.id).padStart(2,'0')+' · '+e(t.label)+
          '<div class="muted">'+e(t.family)+' · '+e(t.masterFileName)+'<br>'+
          e(t.editorial?.subtitle||'—')+
          ((t.errors||[]).length?'<br>Erreurs : '+e((t.errors||[]).join(', ')):'')+
          '</div></span><strong class="'+(t.status==='PASS'?'good':(t.status==='PENDING'?'caution':'bad'))+'">'+e(t.status)+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:12px">Aucune scène de production n’a été forcée. Le test construit les 24 payloads sur des clones et vérifie les vrais fichiers via ASSETS.</div>'+
        '</div>';

      // Conserver le rapport 12.9 visible.
    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.9 · AUDIT 24 SCÈNES</div>'+
        '<div class="scene bad">AUDIT NON VALIDÉ</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Aucun forecast officiel ni contrôle moteur n’a été modifié.</div></div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('runFaultLab').onclick=async()=>{
    const btn=document.getElementById('runFaultLab');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    out.innerHTML=
      '<div class="card"><div class="label">BLOC 12.8 · LABORATOIRE DE PANNE</div>'+
      '<div class="muted">Injection contrôlée en mémoire. Aucun forecast ni engine_control ne sera modifié.</div></div>';

    try{
      const x=await fetchJson('/api/admin/fault-lab/run?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()}
      });

      const r=x.report||{},items=Array.isArray(r.scenarios)?r.scenarios:[];
      const cls=r.status==='PASS'?'good':(r.status==='PENDING'?'caution':'bad');

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.8 · TESTS DE PANNE</div>'+
        '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
        '<div class="bar-row"><span>Scénarios</span><strong>'+e(r.summary?.total??'—')+'</strong></div>'+
        '<div class="bar-row"><span>PASS</span><strong class="good">'+e(r.summary?.passed??0)+'</strong></div>'+
        '<div class="bar-row"><span>FAIL</span><strong class="bad">'+e(r.summary?.failed??0)+'</strong></div>'+
        '<div class="bar-row"><span>PENDING</span><strong class="caution">'+e(r.summary?.pending??0)+'</strong></div>'+
        items.map(t=>
          '<div class="bar-row"><span>'+e(t.label)+
          '<div class="muted">Attendu : '+e(t.expected)+'<br>Observé : '+e(t.observed)+'<br>'+e(t.safety||'')+'</div></span>'+
          '<strong class="'+(t.status==='PASS'?'good':(t.status==='PENDING'?'caution':'bad'))+'">'+e(t.status)+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:12px">Seule une ligne append-only de fault_injection_audit a été écrite. La météo officielle n’a pas été modifiée.</div>'+
        '</div>';

      // Conserver le rapport 12.8 visible.
    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.8 · TESTS DE PANNE</div>'+
        '<div class="scene bad">TEST NON VALIDÉ</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Aucune injection n’a été appliquée au forecast officiel.</div></div>';
    }finally{
      btn.disabled=false;
    }
  };

  async function runBrowserCoherenceForRC(){
    const pre=await fetchJson('/api/admin/publication/coherence?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });

    if(!pre.identity){
      throw new Error('publication_identity_unavailable');
    }

    const reqs=[
      ['api_latest','/api/latest?city=tarnos&_rc='+Date.now()],
      ['api_decision','/api/decision?city=tarnos&_rc='+Date.now()],
      ['dashboard','/?_rc='+Date.now()],
      ['instagram','/instagram?_rc='+Date.now()]
    ];

    const observations=[];

    for(const [surface,url] of reqs){
      const response=await fetch(url,{
        method:'GET',
        cache:'no-store',
        headers:{'Cache-Control':'no-cache'}
      });
      observations.push(surfaceObservation(surface,response));
    }

    return fetchJson('/api/admin/publication/coherence/record?city=tarnos',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+token(),
        'Content-Type':'application/json'
      },
      body:JSON.stringify({observations})
    });
  }

  document.getElementById('validateRC').onclick=async()=>{
    const btn=document.getElementById('validateRC');
    const out=document.getElementById('payloadView');
    btn.disabled=true;

    out.innerHTML=
      '<div class="card"><div class="label">RELEASE CANDIDATE 12.7</div>'+
      '<div class="muted">Étape 1/3 · self-test fallbacks…</div></div>';

    try{
      const fallback=await fetchJson('/api/admin/engine/fallback-self-test?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });

      if(fallback.report?.status!=='PASS'){
        throw new Error('fallback_self_test_'+String(fallback.report?.status||'FAIL'));
      }

      out.innerHTML=
        '<div class="card"><div class="label">RELEASE CANDIDATE 12.7</div>'+
        '<div class="muted">Étape 2/3 · lecture réelle des 4 surfaces publiques…</div></div>';

      const coherence=await runBrowserCoherenceForRC();

      if(coherence.status!=='PASS'){
        throw new Error('surface_coherence_'+String(coherence.status||'FAIL'));
      }

      out.innerHTML=
        '<div class="card"><div class="label">RELEASE CANDIDATE 12.7</div>'+
        '<div class="muted">Étape 3/3 · validation serveur et audit immuable…</div></div>';

      const x=await fetchJson('/api/admin/release-candidate/validate?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()}
      });

      const r=x.report||{},checks=Array.isArray(r.checks)?r.checks:[];
      const cls=r.technicalStatus==='RC_TECHNICAL_READY'?'good':(r.technicalStatus==='RC_PENDING'?'caution':'bad');

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.7 · RELEASE CANDIDATE</div>'+
        '<div class="scene '+cls+'">'+e(r.technicalStatus||'—')+'</div>'+
        '<div class="bar-row"><span>Éligibilité activation</span><strong>'+e(r.activationEligibility||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Moteur public</span><strong>'+e(r.effectiveEngine||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Génération</span><strong>'+e(r.generatedAt||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Instagram GO LIVE</span><strong class="caution">NON · BLOC 12.13</strong></div>'+
        checks.map(c=>
          '<div class="bar-row"><span>'+e(c.label)+
          '<div class="muted">'+e(c.detail||'')+'</div></span>'+
          '<strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':'bad'))+'">'+e(c.status)+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:10px">La validation 12.7 n’a modifié ni moteur, ni forecast, ni autorisation. Seul l’audit Release Candidate a été ajouté.</div>'+
        '</div>';

      // Conserver le rapport 12.7 visible : payloadView est dans engineView.
    }catch(err){
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.7 · RELEASE CANDIDATE</div>'+
        '<div class="scene bad">RC NON VALIDÉE</div>'+
        '<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>'+
        '<div class="muted">Aucune activation V24 ni publication Instagram n’a été déclenchée.</div></div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('checkCoherence').onclick=async()=>{
    const btn=document.getElementById('checkCoherence');
    const out=document.getElementById('payloadView');
    btn.disabled=true;
    out.innerHTML='<div class="muted">Contrôle réel des 4 surfaces publiques…</div>';

    try{
      const pre=await fetchJson('/api/admin/publication/coherence?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });

      if(!pre.identity){
        throw new Error('publication_identity_unavailable');
      }

      const reqs=[
        ['api_latest','/api/latest?city=tarnos'],
        ['api_decision','/api/decision?city=tarnos'],
        ['dashboard','/?_loka_coherence='+Date.now()],
        ['instagram','/instagram?_loka_coherence='+Date.now()]
      ];

      const observations=[];
      for(const [surface,url] of reqs){
        const response=await fetch(url,{
          method:'GET',
          cache:'no-store',
          headers:{'Cache-Control':'no-cache'}
        });
        observations.push(surfaceObservation(surface,response));
      }

      const recorded=await fetchJson('/api/admin/publication/coherence/record?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token(),
          'Content-Type':'application/json'
        },
        body:JSON.stringify({observations})
      });

      const checks=Array.isArray(recorded.checks)?recorded.checks:[];
      const cls=recorded.status==='PASS'?'good':'bad';

      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.6 · COHÉRENCE PUBLIQUE</div>'+
        '<div class="scene '+cls+'">'+e(recorded.status||'—')+'</div>'+
        '<div class="bar-row"><span>Génération</span><strong>'+e(recorded.expected?.generatedAt||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Moteur</span><strong>'+e(recorded.expected?.engine||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Scène</span><strong>'+e(recorded.expected?.scene||'—')+'</strong></div>'+
        '<div class="bar-row"><span>Fingerprint</span><strong>'+e((recorded.expected?.fingerprint||'').slice(0,12))+'…</strong></div>'+
        checks.map(c=>
          '<div class="bar-row"><span>'+e(c.surface)+
          '<div class="muted">'+e((c.reasons||[]).join(', ')||'Même génération, moteur, scène et fingerprint.')+'</div></span>'+
          '<strong class="'+(c.passed?'good':'bad')+'">'+(c.passed?'PASS':'FAIL')+'</strong></div>'
        ).join('')+
        '<div class="muted" style="margin-top:10px">Le contrôle vient de lire réellement /api/latest, /api/decision, / et /instagram depuis ce téléphone, puis d’archiver le résultat.</div>'+
        '</div>';
    }catch(err){
      out.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('testFallbacks').onclick=async()=>{
    const btn=document.getElementById('testFallbacks');
    btn.disabled=true;
    const out=document.getElementById('payloadView');
    out.innerHTML='<div class="muted">Test des fallbacks… aucune donnée de production ne sera modifiée.</div>';
    try{
      const x=await fetchJson('/api/admin/engine/fallback-self-test?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });
      const r=x.report||{},tests=Array.isArray(r.tests)?r.tests:[],audit=Array.isArray(x.recentFallbackAudit)?x.recentFallbackAudit:[];
      const cls=r.status==='PASS'?'good':(r.status==='PENDING'?'caution':'bad');
      out.innerHTML=
        '<div class="card"><div class="label">BLOC 12.5 · FALLBACK SELF-TEST</div>'+
        '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+
        '<div class="muted">Test lecture seule : aucune mutation de production.</div>'+
        tests.map(t=>
          '<div class="bar-row"><span>'+e(t.id)+'<div class="muted">'+e(t.detail||'')+'</div></span><strong class="'+(t.status==='PASS'?'good':(t.status==='PENDING'?'caution':'bad'))+'">'+e(t.status)+'</strong></div>'
        ).join('')+
        (audit.length?'<div class="metric-title" style="margin-top:14px">AUDIT FALLBACK RÉCENT</div>'+
          audit.slice(0,6).map(a=>
            '<div class="bar-row"><span>'+e(a.stage)+'<div class="muted">'+e(a.reason)+'</div></span><strong>'+e(a.finalEngine||'—')+'</strong></div>'
          ).join(''):'')+
        '</div>';
    }catch(err){
      out.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
    }finally{
      btn.disabled=false;
    }
  };

  document.getElementById('checkActivation').onclick=async()=>{
    const btn=document.getElementById('checkActivation');
    btn.disabled=true;
    try{
      const x=await fetchJson('/api/admin/engine/activation-check?city=tarnos',{
        headers:{Authorization:'Bearer '+token()}
      });
      const g=x.guard||{},checks=Array.isArray(g.checks)?g.checks:[];
      const cls=g.status==='PASS'?'good':(g.status==='BLOCKED'?'bad':'caution');
      const rows=checks.map(c=>
        '<div class="bar-row"><span>'+e(c.label)+'<div class="muted">'+e(c.reason||'')+'</div></span><strong class="'+(c.passed?'good':'bad')+'">'+(c.passed?'OK':'NON')+'</strong></div>'
      ).join('');
      document.getElementById('payloadView').innerHTML=
        '<div class="card"><div class="label">GARDE-FOUS ACTIVATION V24</div>'+
        '<div class="scene '+cls+'">'+e(g.status||'—')+'</div>'+
        '<div class="meta">Raison : '+e(g.reason||'—')+'</div>'+
        '<div class="bar-row"><span>Fallback si blocage</span><strong>LEGACY</strong></div>'+
        '<div class="bar-row"><span>Cutover public</span><strong class="bad">V24 SI PASS · LEGACY SINON</strong></div>'+
        rows+
        '</div>';
    }catch(err){
      document.getElementById('payloadView').innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
    }finally{
      btn.disabled=false;
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


function renderApproval(data){
  const target=document.getElementById('approvalView');
  if(!target)return;

  const readiness=data.readiness||{};
  const control=data.control||{};
  const audit=Array.isArray(data.recentAudit)?data.recentAudit:[];

  let html=
    '<div class="bar-row"><span>Readiness</span><strong>'+e(readiness.status||'—')+'</strong></div>'+
    '<div class="bar-row"><span>V24 approuvé</span><strong>'+(control.v24Approved?'OUI':'NON')+'</strong></div>'+
    '<div class="bar-row"><span>Workflow historique</span><strong class="caution">VERROUILLÉ</strong></div>'+
    '<div class="muted" style="margin-top:10px">Depuis le Bloc 12.13, cette ancienne double confirmation ne peut plus activer V24. Toute activation officielle passe exclusivement par « GO LIVE V24 · 12.13 ».</div>';

  if(audit.length){
    html+='<div style="margin-top:16px"><div class="metric-title">AUDIT HISTORIQUE</div>'+
      audit.slice(0,6).map(x=>
        '<div class="bar-row"><span>'+e(x.eventType)+'<div class="muted">'+e(x.reason||'—')+'</div></span><strong>'+e((x.readinessStatus||'—'))+'</strong></div>'
      ).join('')+
      '</div>';
  }

  target.innerHTML=html;
}


function renderGoLive13(data){
  const target=document.getElementById('goLiveView');
  if(!target)return;

  const g=data.eligibility||{};
  const current=g.current||{};
  const finalRc=g.finalRelease||{};
  const rehearsal=g.rehearsal||{};
  const candidate=g.candidate||{};
  const guard=g.guard||{};
  const checks=Array.isArray(g.checks)?g.checks:[];
  const blockers=Array.isArray(g.blockers)?g.blockers:[];
  const pending=data.pendingChallenge||null;

  const cls=g.status==='ELIGIBLE'
    ?'good'
    :(g.status==='ALREADY_ACTIVE'?'good':'bad');

  let html=
    '<div class="scene '+cls+'">'+e(g.status||'—')+'</div>'+
    '<div class="bar-row"><span>Readiness requis</span><strong>READY_CANDIDATE</strong></div>'+
    '<div class="bar-row"><span>Readiness actuel</span><strong class="'+(g.readinessStatus==='READY_CANDIDATE'?'good':'bad')+'">'+e(g.readinessStatus||'—')+'</strong></div>'+
    '<div class="bar-row"><span>Production actuelle</span><strong>'+e(current.publicEngine||'—')+'</strong></div>'+
    '<div class="bar-row"><span>FINAL_RC courant</span><strong class="'+(finalRc.currentGeneration?'good':'bad')+'">'+(finalRc.currentGeneration?'PASS #'+e(finalRc.id):'NON')+'</strong></div>'+
    '<div class="bar-row"><span>REHEARSAL courant</span><strong class="'+(rehearsal.currentGeneration?'good':'bad')+'">'+(rehearsal.currentGeneration?'PASS #'+e(rehearsal.id):'NON')+'</strong></div>'+
    '<div class="bar-row"><span>Backup Legacy</span><strong class="'+(g.legacyBackupAvailable?'good':'bad')+'">'+(g.legacyBackupAvailable?'PASS':'FAIL')+'</strong></div>'+
    '<div class="bar-row"><span>Fenêtre certification 12.15</span><strong class="'+(g.certificationWindow?.currentGeneration?'good':'bad')+'">'+(g.certificationWindow?.currentGeneration?'ACTIVE':'REQUIS')+'</strong></div>'+
    '<div class="bar-row"><span>Garde-fou génération</span><strong class="'+(guard.status==='PASS'?'good':'bad')+'">'+e(guard.status||'—')+'</strong></div>'+
    '<div class="bar-row"><span>Candidat V24</span><strong>'+e(candidate.sceneKey||'—')+' · '+e(candidate.confidence||'—')+'</strong></div>';

  if(blockers.length){
    html+='<div style="margin-top:12px"><div class="metric-title">BLOQUANTS GO LIVE</div>'+
      blockers.map(x=>'<div class="muted" style="margin-top:6px">• '+e(x)+'</div>').join('')+
      '</div>';
  }

  if(pending){
    html+='<div class="readiness" style="margin-top:14px">'+
      '<strong>CONFIRMATION FINALE 2 / 2</strong>'+
      '<div class="muted">Challenge valable jusqu’à '+e(pending.expiresAt)+'. Toute nouvelle génération ou modification des preuves annule cette confirmation.</div>'+
      '<div style="font-weight:760;margin:10px 0">'+e(pending.confirmationPhrase)+'</div>'+
      '<input id="goLivePhrase" autocomplete="off" autocapitalize="characters" placeholder="'+e(pending.confirmationPhrase)+'">'+
      '<button id="confirmGoLive13" class="danger">ACTIVER V24 OFFICIEL MAINTENANT</button>'+
      '<div class="muted" style="margin-top:9px">Cette action arme V24 puis lance immédiatement une nouvelle génération météo. Si son garde-fou ne passe pas, LOKA revient automatiquement en Legacy.</div>'+
      '</div>';
  }else if(g.status==='ELIGIBLE'){
    html+='<button id="prepareGoLive13" class="danger" style="margin-top:14px">Préparer GO LIVE · confirmation 1 / 2</button>'+
      '<div class="muted" style="margin-top:8px">Aucune activation à cette étape. Un snapshot final immuable de 10 minutes sera créé.</div>';
  }else if(g.status==='ALREADY_ACTIVE'){
    html+='<div class="readiness" style="margin-top:14px"><strong class="good">V24 EST OFFICIEL</strong><div class="muted">Le bouton global « Revenir à Legacy » reste disponible et restaure désormais aussi le produit public Legacy courant.</div></div>';
  }else{
    html+='<div class="muted" style="margin-top:12px">Activation impossible. Aucun état moteur ne sera modifié tant que tous les contrôles ne sont pas PASS.</div>';
  }

  html+='<div style="margin-top:14px"><div class="metric-title">CONTRÔLES 12.13</div>'+
    checks.map(c=>
      '<div class="bar-row"><span>'+e(c.id)+'<div class="muted">'+e(c.detail||'')+'</div></span><strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':'bad'))+'">'+e(c.status)+'</strong></div>'
    ).join('')+
    '</div>';

  target.innerHTML=html;

  const prepare=document.getElementById('prepareGoLive13');
  if(prepare)prepare.onclick=async()=>{
    prepare.disabled=true;
    try{
      const response=await fetch('/api/admin/go-live/prepare?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()},
        cache:'no-store'
      });
      const text=await response.text();
      let x=null;
      try{x=text?JSON.parse(text):null}catch{}
      if(!response.ok||!x?.ok){
        throw new Error(x?.error||('HTTP '+response.status));
      }
      await loadGoLive13();
    }catch(err){
      engineStatusEl.innerHTML='<span class="error">GO LIVE refusé : '+e(err&&err.message?err.message:String(err))+'</span>';
      await loadGoLive13();
    }
  };

  const confirm=document.getElementById('confirmGoLive13');
  if(confirm)confirm.onclick=async()=>{
    const phrase=document.getElementById('goLivePhrase')?.value||'';

    if(phrase.trim()!==String(pending.confirmationPhrase||'')){
      engineStatusEl.innerHTML='<span class="error">Phrase finale incorrecte.</span>';
      return;
    }

    const browserConfirm=window.confirm(
      'CONFIRMATION FINALE : cette action peut rendre V24 officielle immédiatement et basculer le Dashboard + le Studio Instagram officiel. Continuer ?'
    );
    if(!browserConfirm)return;

    confirm.disabled=true;
    engineStatusEl.innerHTML='<span class="caution">GO LIVE 12.13 en cours · nouvelle génération + contrôles de sécurité…</span>';

    try{
      const response=await fetch('/api/admin/go-live/confirm?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token(),
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          challengeId:pending.challengeId,
          confirmationPhrase:phrase
        }),
        cache:'no-store'
      });

      const text=await response.text();
      let x=null;
      try{x=text?JSON.parse(text):null}catch{
        throw new Error('Réponse GO LIVE invalide ('+response.status+') : '+text.slice(0,220));
      }

      const payload=document.getElementById('payloadView');

      if(x?.status==='GO_LIVE_ACTIVE'&&x?.ok){
        const id=x.publicIdentity||{};
        payload.innerHTML=
          '<div class="card"><div class="label">BLOC 12.13 · GO LIVE</div>'+
          '<div class="scene good">GO_LIVE_ACTIVE</div>'+
          '<div class="bar-row"><span>Moteur public</span><strong class="good">'+e(id.engine||'V24')+'</strong></div>'+
          '<div class="bar-row"><span>Scène officielle</span><strong>'+e(id.scene||'—')+'</strong></div>'+
          '<div class="bar-row"><span>Génération</span><strong>'+e(id.generatedAt||'—')+'</strong></div>'+
          '<div class="bar-row"><span>Dashboard officiel</span><strong class="good">V24</strong></div>'+
          '<div class="bar-row"><span>Studio Instagram officiel</span><strong class="good">V24</strong></div>'+
          '<div class="muted" style="margin-top:12px">V24 est maintenant le produit officiel. Le rollback global reste disponible à tout instant.</div></div>';
        engineStatusEl.innerHTML='<span class="good">V24 OFFICIELLE · GO LIVE 12.13 VALIDÉ</span>';
      }else{
        const rb=x?.rollback||{};
        payload.innerHTML=
          '<div class="card"><div class="label">BLOC 12.13 · GO LIVE</div>'+
          '<div class="scene bad">'+e(x?.status||'GO_LIVE_ABORTED')+'</div>'+
          '<div class="error">'+e(x?.error||('HTTP '+response.status))+'</div>'+
          '<div class="bar-row"><span>Rollback control</span><strong class="'+(rb.authoritativeRollbackVerified?'good':'bad')+'">'+(rb.authoritativeRollbackVerified?'PASS':'À VÉRIFIER')+'</strong></div>'+
          '<div class="bar-row"><span>Restore public Legacy</span><strong class="'+(rb.publicRestoreVerified?'good':'bad')+'">'+(rb.publicRestoreVerified?'PASS':'À VÉRIFIER')+'</strong></div>'+
          '<div class="muted" style="margin-top:10px">Une activation non vérifiée n’est jamais considérée GO LIVE.</div></div>';
        engineStatusEl.innerHTML='<span class="caution">GO LIVE non validé · vérifie l’état Legacy.</span>';
      }

      await loadGoLive13();
    }catch(err){
      engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
      await loadGoLive13();
    }finally{
      confirm.disabled=false;
    }
  };
}

async function loadGoLive13(){
  const target=document.getElementById('goLiveView');
  if(!target)return;

  target.innerHTML='<div class="muted">Contrôle GO LIVE 12.13…</div>';

  try{
    const data=await fetchJson('/api/admin/go-live?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });
    renderGoLive13(data);
  }catch(err){
    target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
  }
}


function renderSupervisor14(data){
  const target=document.getElementById('supervisorView');
  if(!target)return;

  const r=data.report||{};
  const checks=Array.isArray(r.checks)?r.checks:[];
  const recent=Array.isArray(data.recent)?data.recent:[];

  const cls=(r.status==='GO_LIVE_ELIGIBLE'||r.status==='V24_LIVE_HEALTHY'||r.status==='V24_LIVE_STABLE')
    ?'good'
    :(r.status==='WAITING_READINESS'||r.status==='RECERTIFICATION_REQUIRED'||r.status==='V24_LIVE_WATCH')
      ?'caution'
      :'bad';

  let html=
    '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+ 
    '<div class="bar-row"><span>Phase</span><strong>'+e(r.phase||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Génération</span><strong>'+e(r.generatedAt||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Moteur public</span><strong>'+e(r.publicEngine||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Readiness</span><strong class="'+(r.readinessStatus==='READY_CANDIDATE'?'good':'caution')+'">'+e(r.readinessStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>FINAL_RC courant</span><strong class="'+(r.finalRcCurrent?'good':'caution')+'">'+(r.finalRcCurrent?'OUI':'NON')+'</strong></div>'+ 
    '<div class="bar-row"><span>REHEARSAL courant</span><strong class="'+(r.rehearsalCurrent?'good':'caution')+'">'+(r.rehearsalCurrent?'OUI':'NON')+'</strong></div>'+ 
    '<div class="bar-row"><span>GO LIVE éligible</span><strong class="'+(r.goLiveEligible?'good':'caution')+'">'+(r.goLiveEligible?'OUI':'NON')+'</strong></div>'+ 
    '<div class="bar-row"><span>Garde-fou</span><strong>'+e(r.guardStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Fallback courant</span><strong class="'+(!r.fallbackDetected?'good':'caution')+'">'+(r.fallbackDetected?'OUI':'NON')+'</strong></div>'+ 
    '<div class="bar-row"><span>Stabilité V24</span><strong>'+e(r.consecutiveV24Generations||0)+' / 6</strong></div>'+ 
    '<div class="readiness" style="margin-top:14px"><strong>RECOMMANDATION</strong><div class="muted" style="margin-top:6px">'+e(r.recommendation||'—')+'</div></div>'+ 
    '<div style="margin-top:14px"><div class="metric-title">CONTRÔLES</div>'+ 
    checks.map(c=>'<div class="bar-row"><span>'+e(c.id)+'<div class="muted">'+e(c.detail||'')+'</div></span><strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':'bad'))+'">'+e(c.status)+'</strong></div>').join('')+ 
    '</div>';

  if(recent.length){
    html+='<div style="margin-top:16px"><div class="metric-title">12 DERNIERS SNAPSHOTS</div>'+ 
      recent.slice(0,12).map(x=>'<div class="bar-row"><span>'+e(x.generatedAt)+'<div class="muted">'+e(x.phase)+' · '+e(x.publicEngine||'—')+'</div></span><strong class="'+((x.status==='V24_LIVE_STABLE'||x.status==='V24_LIVE_HEALTHY'||x.status==='GO_LIVE_ELIGIBLE')?'good':((x.status==='WAITING_READINESS'||x.status==='RECERTIFICATION_REQUIRED'||x.status==='V24_LIVE_WATCH')?'caution':'bad'))+'">'+e(x.status)+'</strong></div>').join('')+ 
      '</div>';
  }

  html+='<div class="muted" style="margin-top:12px">Le Bloc 12.14 n’active jamais V24 et ne déclenche jamais de rollback global automatique. Il conserve volontairement la séparation entre fallback d’une génération et rollback opérateur.</div>';

  target.innerHTML=html;
}

async function loadSupervisor14(record=false){
  const target=document.getElementById('supervisorView');
  if(!target)return;
  target.innerHTML='<div class="muted">Supervision 12.14…</div>';

  try{
    if(record){
      await fetchJson('/api/admin/production-supervisor/snapshot?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()}
      });
    }

    const data=await fetchJson('/api/admin/production-supervisor?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });
    renderSupervisor14(data);
  }catch(err){
    target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
  }
}


function renderCertWindow15(data){
  const target=document.getElementById('certWindowView');
  if(!target)return;

  const current=data.current||{};
  const active=data.active||null;
  const recent=Array.isArray(data.recentAudit)?data.recentAudit:[];

  const currentReady=
    current&&
    !current.error&&
    current.readiness==='READY_CANDIDATE';

  const cls=data.status==='ACTIVE'
    ?'good'
    :(data.status==='STALE'?'bad':'caution');

  let html=
    '<div class="scene '+cls+'">'+e(data.status||'—')+'</div>'+
    '<div class="bar-row"><span>Readiness requis</span><strong>READY_CANDIDATE</strong></div>'+
    '<div class="bar-row"><span>Readiness actuel</span><strong class="'+(currentReady?'good':'caution')+'">'+e(current.readiness||'—')+'</strong></div>'+
    '<div class="bar-row"><span>Génération courante</span><strong>'+e(current.generatedAt||'—')+'</strong></div>'+
    '<div class="bar-row"><span>Moteur public</span><strong>'+e(current.publicEngine||'—')+'</strong></div>'+
    '<div class="bar-row"><span>Génération manuelle</span><strong class="'+(active?'caution':'good')+'">'+(active?'BLOQUÉE':'AUTORISÉE')+'</strong></div>'+
    '<div class="bar-row"><span>Génération cron</span><strong class="'+(active?'caution':'good')+'">'+(active?'BLOQUÉE':'AUTORISÉE')+'</strong></div>'+
    '<div class="bar-row"><span>Cutover GO LIVE 12.13</span><strong class="good">'+(active?'AUTORISÉ':'—')+'</strong></div>';

  if(active){
    html+=
      '<div class="readiness" style="margin-top:14px">'+
      '<strong>GÉNÉRATION CERTIFIÉE</strong>'+
      '<div class="bar-row"><span>Window ID</span><strong>'+e(active.windowId||'—')+'</strong></div>'+
      '<div class="bar-row"><span>generatedAt</span><strong>'+e(active.generatedAt||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Scène</span><strong>'+e(active.scene||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Expire</span><strong>'+e(active.expiresAt||'—')+'</strong></div>'+
      '<div class="bar-row"><span>Correspond encore au public</span><strong class="'+(active.current?'good':'bad')+'">'+(active.current?'OUI':'NON')+'</strong></div>'+
      '<div class="muted" style="margin-top:8px">Pendant cette fenêtre, ne génère pas de nouvelle météo. Exécute 12.8 → 12.9 → 12.10 → 12.11 → 12.12 → 12.13 avant expiration.</div>'+
      '<button id="cancelCertWindow15" class="secondary" style="margin-top:12px">Annuler le gel</button>'+
      '</div>';
  }else if(currentReady&&current.publicEngine==='LEGACY'){
    html+=
      '<div class="readiness" style="margin-top:14px">'+
      '<strong>PRÊT À OUVRIR LA FENÊTRE</strong>'+
      '<div class="muted">Durée maximale : '+e(data.ttlMinutes||45)+' minutes. Le forecast public reste inchangé pendant la recertification.</div>'+
      '<button id="openCertWindow15" class="locked" style="margin-top:12px">Ouvrir fenêtre certification</button>'+
      '</div>';
  }else{
    html+=
      '<div class="muted" style="margin-top:12px">Ne pas ouvrir maintenant. La fenêtre devient disponible uniquement lorsque READY_CANDIDATE est atteint et que la production reste Legacy.</div>';
  }

  if(recent.length){
    html+='<div style="margin-top:16px"><div class="metric-title">AUDIT 12.15 RÉCENT</div>'+
      recent.slice(0,8).map(x=>
        '<div class="bar-row"><span>'+e(x.eventType)+'<div class="muted">'+e(x.reason||'—')+(x.source?' · '+e(x.source):'')+'</div></span><strong>'+e(x.generatedAt||'—')+'</strong></div>'
      ).join('')+
      '</div>';
  }

  html+='<div class="muted" style="margin-top:12px">Sécurité asymétrique : si le mécanisme 12.15 est lui-même indisponible, la météo Legacy continue à se générer. En revanche le GO LIVE échoue fermé sans fenêtre ACTIVE.</div>';

  target.innerHTML=html;

  const open=document.getElementById('openCertWindow15');
  if(open)open.onclick=async()=>{
    const phrase=String(data.confirmationPhrase||'');
    const entered=window.prompt(
      'Cette action bloque temporairement les générations manuelles et cron afin de protéger la recertification finale. Tape exactement : '+phrase
    );

    if(entered===null)return;

    open.disabled=true;
    try{
      const response=await fetch('/api/admin/certification-window/open?city=tarnos',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+token(),
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          confirmationPhrase:entered
        }),
        cache:'no-store'
      });

      const text=await response.text();
      let x=null;
      try{x=text?JSON.parse(text):null}catch{}
      if(!response.ok||!x?.ok){
        throw new Error(x?.error||('HTTP '+response.status));
      }

      engineStatusEl.innerHTML='<span class="good">Fenêtre 12.15 ACTIVE · génération protégée.</span>';
      await loadCertWindow15();
      await loadGoLive13();
      await loadSupervisor14();
    }catch(err){
      engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
      await loadCertWindow15();
    }finally{
      open.disabled=false;
    }
  };

  const cancel=document.getElementById('cancelCertWindow15');
  if(cancel)cancel.onclick=async()=>{
    cancel.disabled=true;
    try{
      const response=await fetch('/api/admin/certification-window/cancel?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()},
        cache:'no-store'
      });
      const text=await response.text();
      let x=null;
      try{x=text?JSON.parse(text):null}catch{}
      if(!response.ok||!x?.ok){
        throw new Error(x?.error||('HTTP '+response.status));
      }
      engineStatusEl.innerHTML='<span class="good">Fenêtre 12.15 annulée · générations normales réautorisées.</span>';
      await loadCertWindow15();
      await loadGoLive13();
      await loadSupervisor14();
    }catch(err){
      engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
    }finally{
      cancel.disabled=false;
    }
  };
}

async function loadCertWindow15(){
  const target=document.getElementById('certWindowView');
  if(!target)return;

  target.innerHTML='<div class="muted">Contrôle fenêtre 12.15…</div>';

  try{
    const data=await fetchJson('/api/admin/certification-window?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });
    renderCertWindow15(data);
  }catch(err){
    target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
  }
}


function renderHandover16(data){
  const target=document.getElementById('handoverView');
  if(!target)return;

  const r=data.report||{};
  const checks=Array.isArray(r.checks)?r.checks:[];
  const recent=Array.isArray(data.recent)?data.recent:[];

  const goodStatuses=[
    'SYSTEM_READY_WAITING_READINESS',
    'SYSTEM_READY_FOR_CERTIFICATION',
    'SYSTEM_READY_FOR_GO_LIVE',
    'SYSTEM_READY_V24_LIVE'
  ];

  const cls=goodStatuses.includes(r.status)
    ?'good'
    :(r.status==='SYSTEM_LIVE_WATCH'?'caution':'bad');

  let html=
    '<div class="scene '+cls+'">'+e(r.status||'—')+'</div>'+ 
    '<div class="bar-row"><span>Release système</span><strong>12.16.0</strong></div>'+ 
    '<div class="bar-row"><span>Architecture finalisée</span><strong class="'+(r.architectureComplete?'good':'bad')+'">'+(r.architectureComplete?'OUI':'NON')+'</strong></div>'+ 
    '<div class="bar-row"><span>Chaîne technique complète</span><strong class="'+(r.technicalChainComplete?'good':'bad')+'">'+(r.technicalChainComplete?'PASS':'FAIL')+'</strong></div>'+ 
    '<div class="bar-row"><span>Schéma D1 complet</span><strong class="'+(r.schemaComplete?'good':'bad')+'">'+(r.schemaComplete?'PASS':'FAIL')+'</strong></div>'+ 
    '<div class="bar-row"><span>Moteur public</span><strong>'+e(r.publicEngine||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Readiness</span><strong>'+e(r.readinessStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Supervision 12.14</span><strong>'+e(r.supervisorStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Fenêtre 12.15</span><strong>'+e(r.certificationWindowStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>GO LIVE 12.13</span><strong>'+e(r.goLiveStatus||'—')+'</strong></div>'+ 
    '<div class="bar-row"><span>Backup Legacy</span><strong class="'+(r.legacyBackupAvailable?'good':'bad')+'">'+(r.legacyBackupAvailable?'PASS':'FAIL')+'</strong></div>'+ 
    '<div class="readiness" style="margin-top:14px"><strong>ÉTAT FINAL / RUNBOOK</strong><div class="muted" style="margin-top:7px">'+e(r.recommendation||'—')+'</div></div>'+ 
    '<div style="margin-top:16px"><div class="metric-title">CONTRÔLES FINAUX</div>'+ 
    checks.map(c=>'<div class="bar-row"><span>'+e(c.id)+'<div class="muted">'+e(c.detail||'')+'</div></span><strong class="'+(c.status==='PASS'?'good':(c.status==='INFO'?'caution':'bad'))+'">'+e(c.status)+'</strong></div>').join('')+ 
    '</div>'+ 
    '<button id="recordHandover16" class="secondary" style="margin-top:14px">Enregistrer certification 12.16</button>'+ 
    '<div class="muted" style="margin-top:10px">Cette certification est purement observationnelle : elle ne génère pas de météo, n’active pas V24 et ne déclenche aucun rollback.</div>';

  if(recent.length){
    html+='<div style="margin-top:16px"><div class="metric-title">CERTIFICATIONS RÉCENTES</div>'+ 
      recent.slice(0,8).map(x=>'<div class="bar-row"><span>#'+e(x.id)+' · '+e(x.evaluatedAt)+'<div class="muted">'+e(x.publicEngine||'—')+' · '+e(x.readinessStatus||'—')+'</div></span><strong class="'+(goodStatuses.includes(x.status)?'good':(x.status==='SYSTEM_LIVE_WATCH'?'caution':'bad'))+'">'+e(x.status)+'</strong></div>').join('')+ 
      '</div>';
  }

  target.innerHTML=html;

  const record=document.getElementById('recordHandover16');
  if(record)record.onclick=async()=>{
    record.disabled=true;
    try{
      const response=await fetch('/api/admin/final-handover/certify?city=tarnos',{
        method:'POST',
        headers:{Authorization:'Bearer '+token()},
        cache:'no-store'
      });

      const text=await response.text();
      let x=null;
      try{x=text?JSON.parse(text):null}catch{}

      if(!x?.recorded){
        throw new Error(x?.error||('HTTP '+response.status));
      }

      engineStatusEl.innerHTML='<span class="'+(x.report?.technicalChainComplete?'good':'error')+'">Certification 12.16 enregistrée · '+e(x.report?.status||'—')+'</span>';
      await loadHandover16();
    }catch(err){
      engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
    }finally{
      record.disabled=false;
    }
  };
}

async function loadHandover16(){
  const target=document.getElementById('handoverView');
  if(!target)return;

  target.innerHTML='<div class="muted">Certification système 12.16…</div>';

  try{
    const data=await fetchJson('/api/admin/final-handover?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });
    renderHandover16(data);
  }catch(err){
    target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
  }
}


async function loadApproval(){
  const target=document.getElementById('approvalView');
  if(!target)return;

  target.innerHTML='<div class="muted">Chargement de l’autorisation…</div>';

  try{
    const data=await fetchJson('/api/admin/engine/approval?city=tarnos',{
      headers:{Authorization:'Bearer '+token()}
    });
    renderApproval(data);
  }catch(err){
    target.innerHTML='<div class="error">'+e(err&&err.message?err.message:String(err))+'</div>';
  }
}


async function loadEngine(){
  engineStatusEl.textContent='Chargement…';engineView.innerHTML='';
  try{
    const d=await fetchJson('/api/admin/engine?city=tarnos',{headers:{Authorization:'Bearer '+token()}});
    renderEngine(d);
    await loadApproval();
    await loadGoLive13();
    await loadSupervisor14();
    await loadCertWindow15();
    await loadHandover16();
  }catch(err){
    engineStatusEl.innerHTML='<span class="error">'+e(err&&err.message?err.message:String(err))+'</span>';
  }
}

document.getElementById('shadow').onclick=loadShadow;
document.getElementById('metrics').onclick=loadMetrics;
document.getElementById('readinessBtn').onclick=loadReadiness;
document.getElementById('engineBtn').onclick=loadEngine;
document.addEventListener('click',event=>{const t=event.target;if(t&&t.id==='goLive13'){loadGoLive13();document.getElementById('goLiveView')?.scrollIntoView({behavior:'smooth',block:'start'});}});
document.addEventListener('click',event=>{const t=event.target;if(t&&t.id==='supervisor14'){loadSupervisor14(true);document.getElementById('supervisorView')?.scrollIntoView({behavior:'smooth',block:'start'});}});
document.addEventListener('click',event=>{const t=event.target;if(t&&t.id==='certWindow15'){loadCertWindow15();document.getElementById('certWindowView')?.scrollIntoView({behavior:'smooth',block:'start'});}});
document.addEventListener('click',event=>{const t=event.target;if(t&&t.id==='handover16'){loadHandover16();document.getElementById('handoverView')?.scrollIntoView({behavior:'smooth',block:'start'});}});
document.getElementById('run').onclick=async()=>{
  out.textContent='Génération…';
  try{
    const r=await fetch('/api/run?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+token()}});
    out.textContent=JSON.stringify(await r.json(),null,2);
    if(r.ok){await loadShadow();await loadMetrics();await loadReadiness();await loadEngine()}
  }catch(e2){out.textContent=String(e2)}
};
</script></body></html>`;}

export function renderAdmin(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LOKA! — Publication</title>
<style>
:root{--ink:#171715;--muted:#777772;--paper:#f3f1ed;--card:#fff;--soft:#ecece8;--ok:#24633b;--bad:#9b2f2f}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(circle at 80% 8%,rgba(255,225,166,.33),transparent 26rem),radial-gradient(circle at 0 100%,rgba(198,214,229,.30),transparent 30rem),var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(18px,env(safe-area-inset-top)) 14px max(28px,env(safe-area-inset-bottom))}
.app{width:min(100%,560px);margin:auto}
.top{display:flex;align-items:center;justify-content:space-between;padding:8px 4px 24px}
.brand{font-size:13px;font-weight:750;letter-spacing:.18em}
.tech{font-size:12px;color:#8b8882;text-decoration:none}
.card{background:rgba(255,255,255,.88);backdrop-filter:blur(16px);border-radius:30px;padding:24px;box-shadow:0 18px 70px rgba(45,42,35,.08)}
.eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#96918a}
h1{font-size:31px;line-height:1.08;margin:9px 0 8px;font-weight:700;letter-spacing:-.035em}
.status{font-size:14px;color:var(--muted);line-height:1.5;min-height:42px}
.meta{margin:18px 0 4px;padding:16px 18px;background:#f6f5f1;border-radius:20px}
.meta-row{display:flex;justify-content:space-between;gap:14px;padding:6px 0;font-size:13px}
.meta-row span{color:#8c8983}.meta-row strong{text-align:right}
label{display:block;margin-top:22px;font-size:11px;color:#85827d;font-weight:650}
input{width:100%;margin-top:7px;padding:15px 16px;border:1px solid #dedbd5;border-radius:16px;background:#fff;font-size:16px;outline:none}
.actions{display:grid;gap:10px;margin-top:14px}
button,a.action{width:100%;display:block;border:0;border-radius:17px;padding:16px 17px;text-align:center;text-decoration:none;font-size:15px;font-weight:700;cursor:pointer}
.primary{background:#171715;color:#fff}
.secondary{background:var(--soft);color:var(--ink)}
.ghost{background:transparent;color:#68655f;border:1px solid #dedbd5!important}
button:disabled{opacity:.55}
.result{margin-top:14px;font-size:13px;line-height:1.45;color:var(--muted)}
.ok{color:var(--ok)}.bad{color:var(--bad)}
.footer{text-align:center;padding:22px 12px 4px;color:#aaa59e;font-family:Georgia,serif;font-style:italic;font-size:16px}
</style>
</head>
<body>
<div class="app">
  <div class="top">
    <div class="brand">LOKA!</div>
    <a class="tech" href="/admin-tech">Outils techniques</a>
  </div>

  <section class="card">
    <div class="eyebrow">Tarnos · publication quotidienne</div>
    <h1>Météo & visuel Instagram</h1>
    <div class="status" id="status">Chargement de la dernière météo…</div>

    <div class="meta" id="meta" style="display:none">
      <div class="meta-row"><span>Dernière mise à jour</span><strong id="updated">—</strong></div>
      <div class="meta-row"><span>Prévision</span><strong id="forecastLabel">—</strong></div>
    </div>

    <label for="token">ADMIN_TOKEN</label>
    <input id="token" type="password" autocomplete="current-password" placeholder="Token administrateur">

    <div class="actions">
      <button class="primary" id="run">Générer la météo</button>
      <a class="action secondary" href="/instagram">Créer le visuel Instagram</a>
      <a class="action ghost" href="/">Voir la météo publique</a>
    </div>

    <div class="result" id="result"></div>
  </section>

  <div class="footer">Ici, aujourd’hui.</div>
</div>

<script>
const statusEl=document.getElementById('status');
const resultEl=document.getElementById('result');
const meta=document.getElementById('meta');
const updated=document.getElementById('updated');
const forecastLabel=document.getElementById('forecastLabel');
const token=()=>document.getElementById('token').value.trim();

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function time(v){try{return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return '—'}}
function label(f){return f?.mainVerdict||f?.subtitle||f?.scene||'Météo disponible'}

async function loadLatest(){
  try{
    const r=await fetch('/api/latest?city=tarnos&_='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const f=await r.json();
    if(!f){
      statusEl.textContent='Aucune météo enregistrée pour le moment.';
      meta.style.display='none';
      return;
    }
    statusEl.textContent='La météo officielle est prête pour publication.';
    updated.textContent=time(f.generatedAt);
    forecastLabel.textContent=label(f);
    meta.style.display='block';
  }catch{
    statusEl.textContent='Impossible de lire la dernière météo.';
    meta.style.display='none';
  }
}

document.getElementById('run').onclick=async()=>{
  const btn=document.getElementById('run');
  const t=token();
  if(!t){
    resultEl.innerHTML='<span class="bad">Entre ton ADMIN_TOKEN.</span>';
    return;
  }
  btn.disabled=true;
  resultEl.textContent='Génération en cours…';
  try{
    const r=await fetch('/api/run?city=tarnos',{
      method:'POST',
      headers:{Authorization:'Bearer '+t},
      cache:'no-store'
    });
    const text=await r.text();
    let data=null;
    try{data=text?JSON.parse(text):null}catch{}
    if(!r.ok){
      throw new Error(data?.error||('HTTP '+r.status));
    }
    resultEl.innerHTML='<span class="ok">Météo mise à jour. Le visuel Instagram est prêt.</span>';
    await loadLatest();
  }catch(err){
    const m=err&&err.message?err.message:String(err);
    if(m.startsWith('certification_window_generation_blocked:')){
      resultEl.innerHTML='<span class="bad">Génération momentanément gelée par la certification finale.</span>';
    }else if(m==='unauthorized'){
      resultEl.innerHTML='<span class="bad">ADMIN_TOKEN incorrect.</span>';
    }else{
      resultEl.innerHTML='<span class="bad">'+esc(m)+'</span>';
    }
  }finally{
    btn.disabled=false;
  }
};

loadLatest();
</script>
</body>
</html>`;
}
