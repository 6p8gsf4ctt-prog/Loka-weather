import type { DailyInsightCandidate, DailyInsightSlideFormat, DailyInsightTheme } from "../engine/dailyInsight/previewEngine";
import type { OfficialPublicPayloadV24 } from "../types";
import { LOKA_GRAPHIC_SYSTEM } from "./lokaGraphicSystem";
import { LOKA_LOGO_DATA_URL } from "./lokaBrand";
import { solarPictogramDataUrl, temperaturePictogramDataUrl, weatherPictogramDataUrl } from "./pictogramLibrary";

export const DAILY_INSIGHT_STORY_VERSION = "1.0.0" as const;

export interface DailyInsightStoryModel {
  version: typeof DAILY_INSIGHT_STORY_VERSION;
  canvasId: string;
  label: string;
  city: string;
  date: string;
  timezone: string;
  masterUrl: string;
  logoUrl: string;
  pictogramUrl: string;
  detectorId: string;
  theme: DailyInsightTheme;
  format: DailyInsightSlideFormat;
  valueLabel: string;
  line1: string;
  line2: string;
  evidence: Array<{ label: string; value: string }>;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function pictogram(theme: DailyInsightTheme): string {
  if (theme === "TEMP_RARE" || theme === "TEMP_SHIFT" || theme === "SEQUENCE") return temperaturePictogramDataUrl("thermometer");
  if (theme === "WET_WEATHER") return weatherPictogramDataUrl("rain");
  if (theme === "WIND") return weatherPictogramDataUrl("wind");
  if (theme === "VISIBILITY") return weatherPictogramDataUrl("fog");
  return solarPictogramDataUrl("sunrise");
}

export function buildDailyInsightStoryModel(
  payload: OfficialPublicPayloadV24,
  candidate: DailyInsightCandidate,
  canvasId = "dailyInsightStory",
  label = "Signal réel"
): DailyInsightStoryModel {
  return {
    version: DAILY_INSIGHT_STORY_VERSION,
    canvasId,
    label,
    city: payload.city,
    date: payload.date,
    timezone: "Europe/Paris",
    masterUrl: payload.scene.masterUrl,
    logoUrl: LOKA_LOGO_DATA_URL,
    pictogramUrl: pictogram(candidate.theme),
    detectorId: candidate.detectorId,
    theme: candidate.theme,
    format: candidate.format,
    valueLabel: candidate.valueLabel,
    line1: candidate.line1,
    line2: candidate.line2,
    evidence: candidate.evidence.map((item) => ({ label: item.label, value: item.value }))
  };
}

function mockCandidate(args: {
  detectorId: string; theme: DailyInsightTheme; format: DailyInsightSlideFormat;
  valueLabel: string; line1: string; line2: string; evidence: Array<{ label: string; value: string }>;
}): DailyInsightCandidate {
  return {
    id: `scenario:${args.detectorId}`, detectorId: args.detectorId as DailyInsightCandidate["detectorId"],
    theme: args.theme, priority: "P0", format: args.format, claimStatus: "EXPECTED_HIGH",
    valueLabel: args.valueLabel, line1: args.line1, line2: args.line2,
    evidence: args.evidence.map((item) => ({ ...item, kind: "LOCAL_ARCHIVE" })),
    score: { rarity: 23, magnitude: 18, utility: 18, localSpecificity: 15, clarity: 9, confidence: 10, penalties: [], total: 93 },
    eligible: true, rejectionReason: null
  };
}

export function dailyInsightStoryScenarios(payload: OfficialPublicPayloadV24): DailyInsightStoryModel[] {
  const scenarios: Array<[string, DailyInsightCandidate]> = [
    ["Forte chaleur", mockCandidate({ detectorId: "T02", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "6 mois", line1: "L’après-midi la plus chaude depuis six mois pourrait se profiler.", line2: "Dernière valeur comparable le 18 mars.", evidence: [{ label: "Valeur prévue", value: "34 °C" }, { label: "Dernière occurrence", value: "18 mars" }] })],
    ["Fraîcheur inhabituelle", mockCandidate({ detectorId: "T01", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "4 mois", line1: "Le matin le plus frais depuis mai pourrait nous attendre.", line2: "Une minimale de 8 °C est actuellement prévue.", evidence: [{ label: "Valeur prévue", value: "8 °C" }, { label: "Dernière occurrence", value: "12 mai" }] })],
    ["Chute thermique", mockCandidate({ detectorId: "T08", theme: "TEMP_SHIFT", format: "F2_EVOLUTION_RAPIDE", valueLabel: "−10 °C", line1: "Grosse chute des températures ce soir.", line2: "10 °C de moins en seulement 3 heures.", evidence: [{ label: "Fenêtre", value: "20 h → 23 h" }, { label: "Départ", value: "27 °C" }, { label: "Arrivée", value: "17 °C" }] })],
    ["Retour de la pluie", mockCandidate({ detectorId: "R02", theme: "WET_WEATHER", format: "F3_SEQUENCE", valueLabel: "18 jours", line1: "La pluie pourrait faire son retour après 18 jours presque secs.", line2: "Environ 8 mm sont attendus aujourd’hui.", evidence: [{ label: "Séquence sèche", value: "18 jours" }, { label: "Cumul prévu", value: "8 mm" }] })],
    ["Vent remarquable", mockCandidate({ detectorId: "V03", theme: "WIND", format: "F5_PHENOMENE_LOCAL", valueLabel: "82 km/h", line1: "Les plus fortes rafales depuis plusieurs semaines sont attendues.", line2: "Le pic est prévu en milieu d’après-midi.", evidence: [{ label: "Pic prévu", value: "82 km/h" }, { label: "Moment", value: "15 h" }] })],
    ["Repère calendaire", mockCandidate({ detectorId: "C01", theme: "CALENDAR", format: "F4_REPERE_SAISONNIER", valueLabel: "+1 h", line1: "Cette nuit, nous passons à l’heure d’hiver.", line2: "À 3 h, il sera de nouveau 2 h.", evidence: [{ label: "Fuseau", value: "Europe/Paris" }, { label: "Changement", value: "03 h → 02 h" }] })]
  ];
  return scenarios.map(([label, candidate], index) => buildDailyInsightStoryModel(payload, candidate, `dailyInsightScenario${index}`, label));
}

export function dailyInsightCanvasCard(model: DailyInsightStoryModel): string {
  return `<article class="story-card"><div class="story-head"><div><b>${model.label}</b><span>${model.detectorId} · ${model.format}</span></div><small>1080 × 1920</small></div><div class="story-canvas"><canvas id="${model.canvasId}" width="1080" height="1920"></canvas></div><button type="button" data-export="${model.canvasId}">Enregistrer cette STORY</button></article>`;
}

/** Shared deterministic Canvas renderer for the real preview and scenario gallery. */
export function dailyInsightStoryRuntime(models: DailyInsightStoryModel[]): string {
  return `<script>(()=>{const models=${safeJson(models)},GS=${safeJson(LOKA_GRAPHIC_SYSTEM)};const INK=GS.palette.ink,GOLD=GS.palette.gold,FONT=GS.fontFamily;
  const norm=v=>String(v??'').normalize('NFC').replace(/\\s+/g,' ').trim();
  const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
  const rr=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
  const cover=(c,image,w,h)=>{const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,s=Math.max(w/iw,h/ih),dw=iw*s,dh=ih*s;c.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh);};
  const box=(c,x,y,w,h)=>{const b=GS.glassBox;c.save();rr(c,x,y,w,h,b.radius);const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,b.fillTop);g.addColorStop(b.sheenRatio,b.fillMiddle);g.addColorStop(1,b.fillBottom);c.fillStyle=g;c.fill();c.strokeStyle=b.borderColor;c.lineWidth=b.borderWidth;c.stroke();c.restore();};
  const font=(c,size,weight)=>{c.font=weight+' '+size+'px '+FONT;c.textBaseline='alphabetic';};
  const text=(c,value,x,y,size,weight,color=INK,align='left')=>{c.save();font(c,size,weight);c.textAlign=align;c.fillStyle=color;c.strokeStyle=color;c.lineWidth=GS.text.strokeWidth;c.lineJoin='round';c.strokeText(norm(value),x,y);c.fillText(norm(value),x,y);c.restore();};
  const measure=(c,value,size,weight)=>{c.save();font(c,size,weight);const width=c.measureText(norm(value)).width;c.restore();return width;};
  const fitSize=(c,value,width,max,min,weight)=>{let size=max;while(size>min&&measure(c,value,size,weight)>width)size--;return size;};
  const lines=(c,value,width,maxLines,maxSize,minSize,weight)=>{for(let size=maxSize;size>=minSize;size--){font(c,size,weight);const words=norm(value).split(' '),out=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>width){out.push(line);line=word;}else line=next;}if(line)out.push(line);if(out.length<=maxLines)return{size,out};}return{size:minSize,out:[norm(value)]};};
  const wrapCenter=(c,value,y,width,maxLines,maxSize,minSize,weight)=>{const f=lines(c,value,width,maxLines,maxSize,minSize,weight),lh=Math.round(f.size*1.12);f.out.forEach((line,i)=>text(c,line,540,y+i*lh,f.size,weight,INK,'center'));return y+(f.out.length-1)*lh;};
  const tracked=(c,value,x,y,size,weight,tracking)=>{const chars=norm(value).split('');font(c,size,weight);const widths=chars.map(ch=>c.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)+(chars.length-1)*tracking;let cursor=x-total/2;c.fillStyle=INK;for(let i=0;i<chars.length;i++){c.fillText(chars[i],cursor,y);cursor+=widths[i]+tracking;}};
  const imageCentered=(c,image,cx,cy,w,h)=>{const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,s=Math.min(w/iw,h/ih),dw=iw*s,dh=ih*s;c.drawImage(image,cx-dw/2,cy-dh/2,dw,dh);};
  const accent=(c,x,y,w=58)=>{c.save();c.strokeStyle=GOLD;c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.stroke();c.restore();};
  const dateLabel=m=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:m.timezone}).format(new Date(m.date+'T12:00:00Z')).toUpperCase();
  const header=(c,m,logo)=>{imageCentered(c,logo,148,144,205,69);tracked(c,m.city.toUpperCase(),540,158,28,760,8);text(c,dateLabel(m),1030,158,24,700,INK,'right');};
  const title=(c)=>{box(c,44,226,992,176);text(c,'À REMARQUER AUJOURD’HUI',92,324,46,820);accent(c,94,354,58);};
  const editorial=(c,m,y=1320,h=300)=>{box(c,44,y,992,h);const bottom=wrapCenter(c,m.line1,y+104,850,2,38,27,780);accent(c,511,bottom+34,58);wrapCenter(c,m.line2,bottom+88,850,2,25,19,650);};
  const source=(c,m)=>{const source=m.evidence.slice(0,2).map(e=>e.label+' : '+e.value).join(' · ');text(c,source,540,1670,18,620,'rgba(18,38,74,.76)','center');text(c,'Ici, aujourd’hui.',540,1810,25,680,INK,'center');accent(c,514,1834,52);};
  const rare=(c,m,icon)=>{box(c,44,438,992,830);imageCentered(c,icon,540,625,250,210);text(c,m.valueLabel,540,895,fitSize(c,m.valueLabel,820,112,68,820),820,INK,'center');text(c,'DEPUIS LA DERNIÈRE VALEUR COMPARABLE',540,972,23,760,INK,'center');wrapCenter(c,m.line1,1060,850,2,36,26,780);};
  const shift=(c,m,icon)=>{box(c,44,438,992,830);imageCentered(c,icon,540,575,190,170);text(c,m.valueLabel,540,780,fitSize(c,m.valueLabel,760,118,76,820),820,INK,'center');const win=m.evidence.find(e=>e.label==='Fenêtre')?.value||'',start=m.evidence.find(e=>e.label==='Départ')?.value||'',end=m.evidence.find(e=>e.label==='Arrivée')?.value||'';const parts=win.split('→');text(c,parts[0]||'DÉBUT',260,1010,30,760,INK,'center');text(c,start,260,1090,58,800,INK,'center');text(c,parts[1]||'FIN',820,1010,30,760,INK,'center');text(c,end,820,1090,58,800,INK,'center');c.save();c.strokeStyle=GOLD;c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(370,1044);c.lineTo(700,1044);c.stroke();c.beginPath();c.moveTo(700,1044);c.lineTo(672,1024);c.moveTo(700,1044);c.lineTo(672,1064);c.stroke();c.restore();};
  const sequence=(c,m,icon)=>{box(c,44,438,992,830);imageCentered(c,icon,540,590,210,180);text(c,m.valueLabel,540,835,fitSize(c,m.valueLabel,820,108,70,820),820,INK,'center');const raw=parseInt(m.valueLabel,10),count=Number.isFinite(raw)?Math.min(7,Math.max(3,raw)):5;const gap=108,start=540-(count-1)*gap/2;for(let i=0;i<count;i++){c.save();c.beginPath();c.arc(start+i*gap,1018,34,0,Math.PI*2);c.fillStyle=i===count-1?GOLD:'rgba(255,255,255,.25)';c.fill();c.strokeStyle=i===count-1?GOLD:'rgba(18,38,74,.35)';c.lineWidth=3;c.stroke();c.restore();text(c,String(i+1),start+i*gap,1027,24,760,INK,'center');}wrapCenter(c,m.line1,1150,850,2,34,24,780);};
  const useful=(c,m,icon)=>{box(c,44,438,992,830);imageCentered(c,icon,540,650,300,240);text(c,m.valueLabel,540,965,fitSize(c,m.valueLabel,850,116,70,820),820,INK,'center');wrapCenter(c,m.line1,1085,850,2,36,25,780);};
  async function render(m){const canvas=document.getElementById(m.canvasId);if(!canvas)return;const c=canvas.getContext('2d'),[bg,logo,icon]=await Promise.all([load(m.masterUrl),load(m.logoUrl),load(m.pictogramUrl)]);c.clearRect(0,0,1080,1920);cover(c,bg,1080,1920);header(c,m,logo);title(c);if(m.format==='F1_RARETE_LOCALE')rare(c,m,icon);else if(m.format==='F2_EVOLUTION_RAPIDE')shift(c,m,icon);else if(m.format==='F3_SEQUENCE')sequence(c,m,icon);else useful(c,m,icon);editorial(c,m);source(c,m);canvas.dataset.rendered='true';}
  async function exportCanvas(canvas){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)return;const file=new File([blob],'loka-daily-insight.png',{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'LOKA Daily Insight'});return;}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  Promise.all(models.map(render)).then(()=>{window.__LOKA_DAILY_INSIGHT_STORY_RENDERED=true;}).catch(error=>{window.__LOKA_DAILY_INSIGHT_STORY_ERROR=String(error);});document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>exportCanvas(document.getElementById(button.dataset.export))));})();</script>`;
}

export function renderDailyInsightScenarioGallery(payload: OfficialPublicPayloadV24): string {
  const models = dailyInsightStoryScenarios(payload);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · Scénarios Daily Insight</title><style>
  :root{--ink:#12264a;--gold:#fdb515;--paper:#eef2f7;--line:#d8e0eb}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}main{width:min(1220px,calc(100% - 28px));margin:34px auto 70px}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:28px}h1{margin:0;font-size:32px}header p{margin:7px 0 0;color:#64748b}.back{color:var(--ink);font-weight:750}.stories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.story-card{min-width:0}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block;font-size:18px}.story-head span,.story-head small{display:block;color:#64748b;font-size:12px}.story-canvas{border-radius:24px;overflow:hidden;box-shadow:0 18px 55px #17376720;background:#cad4e1}.story-canvas canvas{display:block;width:100%;height:auto}.story-card button{width:100%;margin-top:10px;border:0;border-radius:14px;padding:14px;background:var(--ink);color:white;font-weight:750;cursor:pointer}.no-signal{margin-top:26px;border:1px solid var(--line);border-radius:22px;background:white;padding:24px}.no-signal b{display:block;font-size:22px}.no-signal p{color:#64748b;margin-bottom:0}@media(max-width:760px){header{display:block}.back{display:inline-block;margin-top:12px}.stories{grid-template-columns:1fr}}
  </style></head><body><main><header><div><h1>Scénarios graphiques Daily Insight</h1><p>Quatre structures LOKA · six cas de contrôle · aucune publication automatique</p></div><a class="back" href="/daily-insight-preview?city=${encodeURIComponent(payload.citySlug)}">Retour à l’audit réel</a></header><section class="stories">${models.map(dailyInsightCanvasCard).join("")}</section><section class="no-signal"><b>Absence de signal pertinent</b><p>Aucune STORY n’est générée. Le moteur conserve explicitement le résultat NO_DAILY_INSIGHT.</p></section></main>${dailyInsightStoryRuntime(models)}</body></html>`;
}

export function renderDailyInsightStoryPage(
  payload: OfficialPublicPayloadV24,
  candidate: DailyInsightCandidate,
  rollout: { engineDurationMs: number; cpuBudgetMs: number }
): string {
  const model = buildDailyInsightStoryModel(payload, candidate, "dailyInsightPublicStory", "STORY comparative Daily");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · STORY Daily Insight</title><style>
  :root{--ink:#12264a;--gold:#fdb515;--paper:#eef2f7;--muted:#64748b}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}main{width:min(570px,calc(100% - 24px));margin:24px auto 60px}.status{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:14px}.status b{display:block;font-size:20px}.status span,.status small{display:block;color:var(--muted);font-size:12px}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block;font-size:18px}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:24px;overflow:hidden;box-shadow:0 18px 55px #17376720;background:#cad4e1}.story-canvas canvas{display:block;width:100%;height:auto}.story-card button{width:100%;margin-top:10px;border:0;border-radius:14px;padding:15px;background:var(--ink);color:white;font-weight:800;cursor:pointer}.safety{margin-top:12px;padding:14px 16px;background:white;border-radius:16px;color:var(--muted);font-size:12px;line-height:1.5}
  </style></head><body><main><header class="status"><div><b>LOKA · Daily Insight</b><span>${model.city} · ${model.date}</span></div><small>ACTIVE · ${rollout.engineDurationMs.toFixed(2)} ms / ${rollout.cpuBudgetMs} ms</small></header>${dailyInsightCanvasCard(model)}<div class="safety">Export manuel uniquement. L’arrêt d’urgence reste prioritaire sur l’activation et aucun visuel n’est produit en l’absence de signal pertinent.</div></main>${dailyInsightStoryRuntime([model])}</body></html>`;
}

export function renderDailyInsightStorySilence(args: { city: string; date: string; reason: string }): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · Daily Insight</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef2f7;color:#12264a;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:24px}main{max-width:560px;background:white;border-radius:24px;padding:30px;box-shadow:0 18px 55px #17376718}h1{margin:0 0 10px;font-size:26px}p{color:#64748b;line-height:1.55}code{font-size:12px}</style></head><body><main><h1>Aucune STORY comparative aujourd’hui.</h1><p>${args.city} · ${args.date}. Le moteur conserve le silence éditorial : aucune information insuffisamment forte ne sera fabriquée.</p><code>${args.reason.replace(/[<>&]/g, "")}</code></main></body></html>`;
}
