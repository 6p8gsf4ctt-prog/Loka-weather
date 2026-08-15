import type {
  LokaForecast
} from "../types";

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
  timezone: string
): string {
  const visual = visualFor(forecast);
  const data = JSON.stringify({
    forecast,
    timezone,
    visual
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

  const hourly=Array.isArray(f.hourly)?f.hourly.slice(0,6):[];
  const xs=[145,310,470,630,790,950];
  hourly.forEach((h,i)=>{
    text(String(h.hour).padStart(2,'0')+'h',xs[i],390,28,470,ink,'center');
    text(icon(h.condition),xs[i],485,65,400,ink,'center');
    text(String(h.temperatureC)+'°',xs[i],610,52,650,ink,'center');
  });

  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.89)';
  rr(62,925,956,355,30);
  ctx.fill();
  ctx.restore();

  const lines=summaryLines();
  if(!lines.length){
    lines.push(
      'Températures comprises entre '+String(f.tempMinC)+' et '+String(f.tempMaxC)+' degrés.'
    );
  }

  lines.slice(0,3).forEach((line,i)=>{
    wrap(line,120,1015+i*98,840,36,28,430,'#17212b','left',2);
  });

  text('Ici, aujourd’hui.',540,1330,23,380,ink,'center');

  document.getElementById('summary').textContent=
    String(f.city||'Tarnos')+' · '+visual.title+' · '+String(f.tempMinC)+'° / '+String(f.tempMaxC)+'°';
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
