import type {
  LokaForecast
} from "../types";
import {
  calculateSolarTimes
} from "./solarTimes";

type LegacyScene =
  | "SOLEIL"
  | "NUAGES"
  | "PLUIE"
  | "ORAGES"
  | "VENT FORT"
  | "INSTABLE";

interface DailyVisualScene {
  title: string;
  masterUrl: string;
  dark: boolean;
}

const VISUALS: Record<LegacyScene, DailyVisualScene> = {
  SOLEIL: {
    title: "SOLEIL",
    masterUrl: "/masters24/01_GRAND_SOLEIL.png",
    dark: false
  },
  NUAGES: {
    title: "COUVERT",
    masterUrl: "/masters24/09_COUVERT.png",
    dark: false
  },
  PLUIE: {
    title: "PLUIE",
    masterUrl: "/masters24/12_PLUIE_SOUTENUE.png",
    dark: true
  },
  ORAGES: {
    title: "ORAGEUX",
    masterUrl: "/masters24/22_ORAGEUX.png",
    dark: true
  },
  "VENT FORT": {
    title: "VENT FORT",
    masterUrl: "/masters24/10_VENT_FORT.png",
    dark: true
  },
  INSTABLE: {
    title: "INSTABLE",
    masterUrl: "/masters24/19_INSTABLE.png",
    dark: true
  }
};

function visualFor(
  forecast: LokaForecast
): DailyVisualScene {
  const key =
    typeof forecast.scene === "string"
      ? forecast.scene as LegacyScene
      : "NUAGES";

  return VISUALS[key] ?? VISUALS.NUAGES;
}

export function renderInstagramDaily(
  forecast: LokaForecast,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const visual = visualFor(forecast);
  const solar = calculateSolarTimes(
    forecast.date,
    latitude,
    longitude,
    timezone
  );

  const data = JSON.stringify({
    forecast,
    timezone,
    visual,
    solar
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LOKA! — Studio Instagram</title>
<style>
:root{--ink:#171715;--muted:#73716c;--paper:#ecebe7}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))}
.wrap{width:min(100%,580px);margin:auto}
.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px}
.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{font-size:12px;font-weight:760;letter-spacing:.16em}
.badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6d6a65;background:#f1f0ec;padding:6px 8px;border-radius:999px}
h1{font-size:23px;line-height:1.08;margin:14px 0 5px;letter-spacing:-.02em}
.muted{font-size:12px;line-height:1.5;color:var(--muted)}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
button,a{border:0;border-radius:14px;padding:14px 10px;text-decoration:none;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}
.primary{background:#171715;color:#fff}
.secondary{background:#f1f1ee;color:#171715}
.canvas-wrap{background:#d8d8d4;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}
canvas{display:block;width:100%;height:auto}
.note{text-align:center;font-size:11px;color:#8d8983;line-height:1.45;padding:12px 12px 0}
@media(max-width:420px){.actions{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <div class="toolbar">
    <div class="topline">
      <div class="brand">LOKA!</div>
      <div class="badge">Météo officielle</div>
    </div>
    <h1>Visuel Instagram</h1>
    <div class="muted" id="summary">Tarnos · visuel du jour</div>
    <div class="actions">
      <button class="primary" id="share">Partager / enregistrer</button>
      <a class="secondary" href="/admin">Retour</a>
    </div>
  </div>

  <div class="canvas-wrap">
    <canvas id="post" width="1080" height="1350"></canvas>
  </div>

  <div class="note">Le visuel utilise uniquement la météo officielle actuellement publiée par LOKA.</div>
</div>

<script>
const state=${data};
const f=state.forecast;
const cfg={timezone:state.timezone};
const visual=state.visual;
const solar=state.solar||{dawn:null,sunrise:null,solarNoon:null,sunset:null,dusk:null,daylightMinutes:null,daylightDeltaMinutes:null};
const canvas=document.getElementById('post');
const ctx=canvas.getContext('2d');

function load(src){
  return new Promise((resolve,reject)=>{
    const i=new Image();
    i.onload=()=>resolve(i);
    i.onerror=reject;
    i.src=src;
  });
}
function font(size,weight){
  ctx.font=String(weight)+' '+String(size)+'px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';
}
function text(value,x,y,size,weight,color,align='left'){
  ctx.save();
  font(size,weight);
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='alphabetic';
  ctx.fillText(String(value??''),x,y);
  ctx.restore();
}
function wrap(value,x,y,maxWidth,lineHeight,size,weight,color,align='left',maxLines=2){
  ctx.save();
  font(size,weight);
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='alphabetic';
  const words=String(value||'').split(/\\s+/);
  let line='',yy=y,count=0;
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>maxWidth&&line){
      ctx.fillText(line,x,yy);
      count++;
      if(count>=maxLines){ctx.restore();return}
      line=word;
      yy+=lineHeight;
    }else{
      line=next;
    }
  }
  if(line&&count<maxLines)ctx.fillText(line,x,yy);
  ctx.restore();
}
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function dateLabel(date){
  try{
    return new Intl.DateTimeFormat('fr-FR',{
      weekday:'long',
      day:'numeric',
      month:'long',
      timeZone:cfg.timezone
    }).format(new Date(date+'T12:00:00')).toUpperCase();
  }catch{return String(date||'')}
}
function icon(condition){
  const c=String(condition||'').toLowerCase();
  if(c.includes('orage'))return 'ϟ';
  if(c.includes('pluie')||c.includes('averse'))return '☂';
  if(c.includes('soleil'))return '☀';
  if(c.includes('vent'))return '≋';
  if(c.includes('brouillard')||c.includes('brume'))return '≋';
  return '☁';
}
function solarEventIcon(x,y,kind,color){
  ctx.save();
  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.lineWidth=3;
  ctx.lineCap='round';
  ctx.lineJoin='round';

  const horizonY=y+16;
  const radius=14;
  const low=kind==='dawn'||kind==='dusk';
  const noon=kind==='noon';
  const sunY=noon?y-10:(low?horizonY+6:horizonY);

  // Horizon for dawn / sunrise / sunset / dusk.
  if(!noon){
    ctx.beginPath();
    ctx.moveTo(x-38,horizonY+15);
    ctx.lineTo(x+38,horizonY+15);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x,sunY,radius,0,Math.PI*2);
  ctx.fill();

  // Rays.
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const inner=radius+7;
    const outer=radius+14;
    ctx.beginPath();
    ctx.moveTo(
      x+Math.cos(a)*inner,
      sunY+Math.sin(a)*inner
    );
    ctx.lineTo(
      x+Math.cos(a)*outer,
      sunY+Math.sin(a)*outer
    );
    ctx.stroke();
  }

  // Direction arrow, matching the user's reference language.
  if(kind==='dawn'||kind==='sunrise'){
    ctx.beginPath();
    ctx.moveTo(x,sunY-42);
    ctx.lineTo(x,sunY-64);
    ctx.moveTo(x,sunY-64);
    ctx.lineTo(x-7,sunY-56);
    ctx.moveTo(x,sunY-64);
    ctx.lineTo(x+7,sunY-56);
    ctx.stroke();
  }else if(kind==='sunset'||kind==='dusk'){
    ctx.beginPath();
    ctx.moveTo(x,sunY-64);
    ctx.lineTo(x,sunY-42);
    ctx.moveTo(x,sunY-42);
    ctx.lineTo(x-7,sunY-50);
    ctx.moveTo(x,sunY-42);
    ctx.lineTo(x+7,sunY-50);
    ctx.stroke();
  }

  ctx.restore();
}

function solarTimeline(ink,dark){
  const events=[
    {key:'dawn',label:'AUBE',kind:'dawn'},
    {key:'sunrise',label:'LEVER',kind:'sunrise'},
    {key:'solarNoon',label:'AU PLUS HAUT',kind:'noon'},
    {key:'sunset',label:'COUCHER',kind:'sunset'},
    {key:'dusk',label:'CRÉPUSCULE',kind:'dusk'}
  ];

  if(!events.some(event=>solar[event.key]))return;

  const xs=[120,320,540,760,960];
  const timeY=655;
  const labelY=694;
  const iconY=758;

  // Discreet trajectory: horizon -> solar apex -> horizon.
  ctx.save();
  ctx.strokeStyle=dark
    ? 'rgba(255,255,255,.78)'
    : 'rgba(23,33,43,.58)';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(xs[1]+28,iconY+12);
  ctx.bezierCurveTo(
    430,iconY-88,
    650,iconY-88,
    xs[3]-28,iconY+12
  );
  ctx.stroke();
  ctx.restore();

  events.forEach((event,i)=>{
    const value=solar[event.key]||'—';
    text(value,xs[i],timeY,23,650,ink,'center');
    text(event.label,xs[i],labelY,event.kind==='noon'?14:16,650,ink,'center');
    solarEventIcon(
      xs[i],
      iconY,
      event.kind,
      ink
    );
  });

  if(Number.isFinite(solar.daylightDeltaMinutes)){
    const delta=Math.round(solar.daylightDeltaMinutes);
    const sign=delta>0?'+':delta<0?'−':'±';
    const value=Math.abs(delta);

    text(
      'JOUR '+sign+String(value)+' min',
      540,
      848,
      15,
      620,
      dark
        ? 'rgba(255,255,255,.78)'
        : 'rgba(23,33,43,.62)',
      'center'
    );
  }
}

function glassPanel(x,y,w,h,r,dark){
  const bleed=32;
  const sx=Math.max(0,x-bleed);
  const sy=Math.max(0,y-bleed);
  const sw=Math.min(canvas.width-sx,w+bleed*2);
  const sh=Math.min(canvas.height-sy,h+bleed*2);

  const sample=document.createElement('canvas');
  sample.width=sw;
  sample.height=sh;
  const sampleCtx=sample.getContext('2d');

  if(sampleCtx){
    sampleCtx.drawImage(
      canvas,
      sx,sy,sw,sh,
      0,0,sw,sh
    );
  }

  // Ombre très douce : le bloc paraît posé dans l'image sans devenir une
  // carte blanche indépendante.
  ctx.save();
  ctx.shadowColor='rgba(18,27,36,.18)';
  ctx.shadowBlur=28;
  ctx.shadowOffsetY=10;
  ctx.fillStyle='rgba(255,255,255,.10)';
  rr(x,y,w,h,r);
  ctx.fill();
  ctx.restore();

  // Le contenu déjà dessiné derrière la carte est réinjecté puis adouci.
  // Si Canvas filter n'est pas disponible, le reste du verre reste valide.
  if(sampleCtx){
    ctx.save();
    rr(x,y,w,h,r);
    ctx.clip();
    ctx.globalAlpha=.72;
    if('filter' in ctx){
      ctx.filter='blur(18px) saturate(116%)';
    }
    ctx.drawImage(sample,sx,sy);
    ctx.restore();
  }

  // Voile translucide : plus clair sur les scènes sombres pour conserver
  // une excellente lisibilité sans revenir à l'ancien panneau opaque.
  ctx.save();
  rr(x,y,w,h,r);
  ctx.clip();

  const veil=ctx.createLinearGradient(
    x,y,
    x,y+h
  );
  if(dark){
    veil.addColorStop(0,'rgba(255,255,255,.58)');
    veil.addColorStop(.52,'rgba(250,252,255,.46)');
    veil.addColorStop(1,'rgba(238,244,250,.40)');
  }else{
    veil.addColorStop(0,'rgba(255,255,255,.50)');
    veil.addColorStop(.52,'rgba(250,252,255,.36)');
    veil.addColorStop(1,'rgba(238,244,250,.30)');
  }
  ctx.fillStyle=veil;
  ctx.fillRect(x,y,w,h);

  // Reflet très léger dans la partie supérieure du verre.
  const shine=ctx.createLinearGradient(
    x,y,
    x,y+h*.42
  );
  shine.addColorStop(0,'rgba(255,255,255,.34)');
  shine.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=shine;
  ctx.fillRect(x,y,w,h*.46);
  ctx.restore();

  // Double liseré fin, lumineux mais discret.
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.82)';
  ctx.lineWidth=2.2;
  rr(x+.8,y+.8,w-1.6,h-1.6,r-1);
  ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,.34)';
  ctx.lineWidth=1;
  rr(x+5,y+5,w-10,h-10,Math.max(1,r-5));
  ctx.stroke();
  ctx.restore();
}

function summaryLines(){
  const src=Array.isArray(f.summaryLines)
    ? f.summaryLines.filter(x=>typeof x==='string'&&x.trim())
    : [];
  if(src.length)return src.slice(0,3);

  const lines=[];
  if(f.mainVerdict)lines.push(f.mainVerdict);
  if(f.rainVerdict&&f.rainVerdict!==f.mainVerdict)lines.push(f.rainVerdict);
  if(f.notableEvent)lines.push(f.notableEvent);
  return lines.slice(0,3);
}
async function background(){
  try{
    return await load(visual.masterUrl);
  }catch{
    return null;
  }
}
function fallbackBackground(){
  const g=ctx.createLinearGradient(0,0,1080,1350);
  g.addColorStop(0,visual.dark?'#34414d':'#dce5eb');
  g.addColorStop(1,visual.dark?'#11171d':'#f1e7d6');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,1080,1350);
}
async function draw(){
  ctx.clearRect(0,0,1080,1350);
  const bg=await background();
  if(bg)ctx.drawImage(bg,0,0,1080,1350);
  else fallbackBackground();

  const dark=visual.dark;
  const ink=dark?'#fff':'#17212b';

  const shade=ctx.createLinearGradient(0,0,0,560);
  shade.addColorStop(0,dark?'rgba(0,0,0,.34)':'rgba(255,255,255,.35)');
  shade.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=shade;
  ctx.fillRect(0,0,1080,560);

  text('LOKA!',45,78,50,350,ink);
  text(String(f.city||'Tarnos').toUpperCase(),540,72,24,560,ink,'center');
  text(dateLabel(f.date),1030,72,20,470,ink,'right');

  text(visual.title,540,205,66,760,ink,'center');
  wrap(f.mainVerdict||f.subtitle||'',540,276,850,38,30,470,ink,'center',2);

  const hourly=Array.isArray(f.hourly)?f.hourly.slice(0,9):[];
  const xs=hourly.map((_,i)=>
    hourly.length<=1
      ? 540
      : 92+i*(896/(hourly.length-1))
  );
  hourly.forEach((h,i)=>{
    text(String(h.hour).padStart(2,'0')+'h',xs[i],355,21,520,ink,'center');
    text(icon(h.condition),xs[i],430,46,400,ink,'center');
    text(String(h.temperatureC)+'°',xs[i],525,37,680,ink,'center');
  });

  solarTimeline(ink,dark);

  // Bloc éditorial 12.16.3 — Liquid Glass intégré au master.
  glassPanel(
    92,
    928,
    896,
    316,
    35,
    dark
  );

  const lines=summaryLines();
  if(!lines.length){
    lines.push(
      'Températures comprises entre '+String(f.tempMinC)+' et '+String(f.tempMaxC)+' degrés.'
    );
  }

  lines.slice(0,3).forEach((line,i)=>{
    ctx.save();
    ctx.shadowColor='rgba(255,255,255,.55)';
    ctx.shadowBlur=2;
    wrap(
      line,
      150,
      1008+i*88,
      780,
      34,
      27,
      470,
      '#17212b',
      'left',
      2
    );
    ctx.restore();
  });

  text('Ici, aujourd’hui.',540,1330,23,380,ink,'center');

  const sunText=
    solar.sunrise&&solar.sunset
      ? ' · ☀ '+solar.sunrise+' / '+(solar.solarNoon||'—')+' / '+solar.sunset
      : '';
  document.getElementById('summary').textContent=
    String(f.city||'Tarnos')+' · '+visual.title+' · '+String(f.tempMinC)+'° / '+String(f.tempMaxC)+'°'+sunText;
}

function pngFile(){
  const b=atob(canvas.toDataURL('image/png').split(',')[1]);
  const u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  return new File([u],'loka-'+String(f.date||'meteo')+'.png',{type:'image/png'});
}
function fallbackDownload(file){
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');
  a.href=url;
  a.download=file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
document.getElementById('share').onclick=()=>{
  const file=pngFile();
  if(
    navigator.share &&
    (!navigator.canShare || navigator.canShare({files:[file]}))
  ){
    navigator.share({
      files:[file],
      title:'LOKA!'
    }).catch((error)=>{
      if(error?.name!=='AbortError')fallbackDownload(file);
    });
    return;
  }
  fallbackDownload(file);
};

draw();
</script>
</body>
</html>`;
}
