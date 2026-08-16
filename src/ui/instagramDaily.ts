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
}

const VISUALS: Record<LegacyScene, DailyVisualScene> = {
  SOLEIL: { title: "SOLEIL", masterUrl: "/masters24/01_GRAND_SOLEIL.png" },
  NUAGES: { title: "COUVERT", masterUrl: "/masters24/09_COUVERT.png" },
  PLUIE: { title: "PLUIE", masterUrl: "/masters24/12_PLUIE_SOUTENUE.png" },
  ORAGES: { title: "ORAGEUX", masterUrl: "/masters24/22_ORAGEUX.png" },
  "VENT FORT": { title: "VENT FORT", masterUrl: "/masters24/10_VENT_FORT.png" },
  INSTABLE: { title: "INSTABLE", masterUrl: "/masters24/19_INSTABLE.png" }
};

function visualFor(forecast: LokaForecast): DailyVisualScene {
  const key = typeof forecast.scene === "string" ? forecast.scene as LegacyScene : "NUAGES";
  return VISUALS[key] ?? VISUALS.NUAGES;
}

export function renderInstagramDaily(
  forecast: LokaForecast,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const visual = visualFor(forecast);
  const solar = calculateSolarTimes(forecast.date, latitude, longitude, timezone);
  const data = JSON.stringify({ forecast, timezone, visual, solar }).replace(/</g, "\u003c");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Studio Instagram</title><style>
:root{--ink:#171715;--muted:#73716c;--paper:#ecebe7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))}.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:12px;font-weight:760;letter-spacing:.16em}.badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6d6a65;background:#f1f0ec;padding:6px 8px;border-radius:999px}h1{font-size:23px;line-height:1.08;margin:14px 0 5px}.muted{font-size:12px;line-height:1.5;color:var(--muted)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}button,a{border:0;border-radius:14px;padding:14px 10px;text-decoration:none;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.primary{background:#171715;color:#fff}.secondary{background:#f1f1ee;color:#171715}.canvas-wrap{background:#d8d8d4;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}canvas{display:block;width:100%;height:auto}.note{text-align:center;font-size:11px;color:#8d8983;line-height:1.45;padding:12px 12px 0}@media(max-width:420px){.actions{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">Météo officielle</div></div><h1>Visuel Instagram</h1><div class="muted" id="summary">Tarnos · visuel du jour</div><div class="actions"><button class="primary" id="share">Partager / enregistrer</button><a class="secondary" href="/admin">Retour</a></div></div><div class="canvas-wrap"><canvas id="post" width="1080" height="1920"></canvas></div><div class="note">Le visuel utilise uniquement la météo officielle actuellement publiée par LOKA.</div></div><script>
const state=${data};const f=state.forecast;const cfg={timezone:state.timezone};const visual=state.visual;const solar=state.solar||{dawn:null,sunrise:null,solarNoon:null,sunset:null,dusk:null,daylightMinutes:null,daylightDeltaMinutes:null};const canvas=document.getElementById('post');const ctx=canvas.getContext('2d');const INK='#12264A';

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
  const words=String(value||'').split(/\s+/);
  let line='',yy=y,count=0;
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>maxWidth&&line){
      ctx.fillText(line,x,yy);
      count++;
      if(count>=maxLines){ctx.restore();return;}
      line=word;
      yy+=lineHeight;
    }else line=next;
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
function rgba(hex,a){
  const h=hex.replace('#','');
  const n=parseInt(h,16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function dateLabel(date){
  try{
    return new Intl.DateTimeFormat('fr-FR',{
      weekday:'long',day:'numeric',month:'long',timeZone:cfg.timezone
    }).format(new Date(date+'T12:00:00')).toUpperCase();
  }catch{return String(date||'');}
}
function box(x,y,w,h){
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.07)';
  rr(x,y,w,h,34);
  ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.62)';
  ctx.lineWidth=1.4;
  ctx.stroke();
  ctx.restore();
}
function separator(x1,y1,x2,y2){
  ctx.save();
  ctx.strokeStyle='rgba(18,38,74,0.14)';
  ctx.lineWidth=1.2;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
  ctx.restore();
}
function drawCloud(x,y,scale,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.lineWidth=2.6/scale;
  ctx.strokeStyle=color;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(-34,12);
  ctx.bezierCurveTo(-46,12,-52,3,-49,-8);
  ctx.bezierCurveTo(-46,-20,-35,-25,-24,-21);
  ctx.bezierCurveTo(-19,-37,-3,-45,14,-39);
  ctx.bezierCurveTo(25,-35,31,-26,33,-15);
  ctx.bezierCurveTo(46,-15,55,-6,55,6);
  ctx.bezierCurveTo(55,18,46,26,33,26);
  ctx.lineTo(-28,26);
  ctx.bezierCurveTo(-39,26,-47,20,-49,12);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
function drawSun(x,y,scale,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.strokeStyle=color;
  ctx.lineWidth=2.5/scale;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.arc(0,0,18,0,Math.PI*2);
  ctx.stroke();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*28,Math.sin(a)*28);
    ctx.lineTo(Math.cos(a)*38,Math.sin(a)*38);
    ctx.stroke();
  }
  ctx.restore();
}
function drawMoon(x,y,scale,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.strokeStyle=color;
  ctx.lineWidth=2.5/scale;
  ctx.beginPath();
  ctx.arc(0,0,18,-Math.PI/2,Math.PI/2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(9,-1,18,Math.PI/2,-Math.PI/2,true);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18,-10);ctx.lineTo(23,-10);
  ctx.moveTo(20,-13);ctx.lineTo(20,-7);
  ctx.moveTo(-16,-18);ctx.lineTo(-11,-18);
  ctx.moveTo(-13,-21);ctx.lineTo(-13,-15);
  ctx.stroke();
  ctx.restore();
}
function drawPartly(x,y,scale,color){
  drawSun(x-14*scale,y-12*scale,scale*0.72,color);
  drawCloud(x+6*scale,y+3*scale,scale*0.88,color);
}
function drawNightCloud(x,y,scale,color){
  drawMoon(x-13*scale,y-12*scale,scale*0.78,color);
  drawCloud(x+6*scale,y+4*scale,scale*0.86,color);
}
function drawRain(x,y,scale,color){
  drawCloud(x,y-6*scale,scale,color);
  ctx.save();
  ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.lineCap='round';
  [-18,0,18].forEach(dx=>{
    ctx.beginPath();
    ctx.moveTo(x+dx*scale,y+20*scale);
    ctx.lineTo(x+(dx-5)*scale,y+34*scale);
    ctx.stroke();
  });
  ctx.restore();
}
function drawThunder(x,y,scale,color){
  drawCloud(x,y-6*scale,scale,color);
  ctx.save();
  ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(x+3*scale,y+8*scale);
  ctx.lineTo(x-7*scale,y+27*scale);
  ctx.lineTo(x+2*scale,y+27*scale);
  ctx.lineTo(x-4*scale,y+42*scale);
  ctx.lineTo(x+14*scale,y+18*scale);
  ctx.lineTo(x+6*scale,y+18*scale);
  ctx.stroke();
  ctx.restore();
}
function drawWind(x,y,scale,color){
  ctx.save();
  ctx.strokeStyle=color;ctx.lineWidth=2.6;ctx.lineCap='round';
  [[-34,-10,24,-10,31,-15],[-42,4,35,4,42,10],[-25,18,18,18,25,14]].forEach(v=>{
    ctx.beginPath();
    ctx.moveTo(x+v[0]*scale,y+v[1]*scale);
    ctx.lineTo(x+v[2]*scale,y+v[3]*scale);
    ctx.quadraticCurveTo(x+v[4]*scale,y+v[5]*scale,x+(v[2]+5)*scale,y+(v[3]+1)*scale);
    ctx.stroke();
  });
  ctx.restore();
}
function drawFog(x,y,scale,color){
  drawCloud(x,y-12*scale,scale*0.82,color);
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.lineCap='round';
  [18,30].forEach(v=>{ctx.beginPath();ctx.moveTo(x-34*scale,y+v*scale);ctx.lineTo(x+34*scale,y+v*scale);ctx.stroke();});
  ctx.restore();
}
function conditionToIcon(condition,hour){
  const c=String(condition||'').toLowerCase();
  const night=Number(hour)>=21||Number(hour)<6;
  if(c.includes('orage')) return 'thunder';
  if(c.includes('pluie')||c.includes('averse')) return night?'rain':'rain';
  if(c.includes('vent')) return 'wind';
  if(c.includes('brouillard')||c.includes('brume')) return 'fog';
  if(c.includes('éclair')||c.includes('eclair')||c.includes('variable')) return night?'night-cloud':'partly';
  if(c.includes('nuit')||c.includes('lune')) return c.includes('nuage')?'night-cloud':'moon';
  if(c.includes('soleil')||c.includes('ensoleillé')||c.includes('ensoleille')) return night?'moon':'sun';
  if(c.includes('clair')) return night?'moon':'sun';
  return night?'night-cloud':'cloud';
}
function drawWeatherIcon(kind,x,y,scale,color){
  if(kind==='sun') return drawSun(x,y,scale,color);
  if(kind==='moon') return drawMoon(x,y,scale,color);
  if(kind==='partly') return drawPartly(x,y,scale,color);
  if(kind==='night-cloud') return drawNightCloud(x,y,scale,color);
  if(kind==='rain') return drawRain(x,y,scale,color);
  if(kind==='thunder') return drawThunder(x,y,scale,color);
  if(kind==='wind') return drawWind(x,y,scale,color);
  if(kind==='fog') return drawFog(x,y,scale,color);
  return drawCloud(x,y,scale,color);
}
function sceneIconKind(label){
  return conditionToIcon(label,12);
}
function drawSolarIcon(kind,x,y,scale,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  ctx.strokeStyle=color;
  ctx.lineWidth=2.5/scale;
  ctx.lineCap='round';
  const horizonY=16;
  ctx.beginPath();
  ctx.moveTo(-28,horizonY);
  ctx.lineTo(28,horizonY);
  ctx.stroke();
  let centerY=horizonY;
  let radius=14;
  if(kind==='noon') centerY=-2;
  if(kind==='sunrise') centerY=10;
  if(kind==='sunset') centerY=10;
  if(kind==='dawn') centerY=17;
  if(kind==='dusk') centerY=17;
  if(kind==='noon'){
    ctx.beginPath();ctx.arc(0,centerY,radius,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*22,centerY+Math.sin(a)*22);ctx.lineTo(Math.cos(a)*30,centerY+Math.sin(a)*30);ctx.stroke();
    }
  }else{
    ctx.beginPath();
    ctx.arc(0,centerY,radius,Math.PI,0);
    ctx.stroke();
    const raySet=(kind==='dawn'||kind==='dusk')?[-14,0,14]:[-18,-6,6,18];
    raySet.forEach(dx=>{
      ctx.beginPath();
      ctx.moveTo(dx,centerY-18);
      ctx.lineTo(dx,centerY-28);
      ctx.stroke();
    });
    if(kind==='sunrise'){
      ctx.beginPath();ctx.moveTo(0,centerY-40);ctx.lineTo(0,centerY-24);ctx.moveTo(0,centerY-40);ctx.lineTo(-5,centerY-34);ctx.moveTo(0,centerY-40);ctx.lineTo(5,centerY-34);ctx.stroke();
    }
    if(kind==='sunset'){
      ctx.beginPath();ctx.moveTo(0,centerY-24);ctx.lineTo(0,centerY-40);ctx.moveTo(0,centerY-24);ctx.lineTo(-5,centerY-30);ctx.moveTo(0,centerY-24);ctx.lineTo(5,centerY-30);ctx.stroke();
    }
  }
  ctx.restore();
}
function pickHourlySlots(source){
  const wanted=[4,6,8,10,12,14,16,18,20,22];
  const pool=Array.isArray(source)?source.slice():[];
  const used=new Set();
  return wanted.map(hour=>{
    let idx=pool.findIndex((item,i)=>!used.has(i)&&Number(item.hour)===hour);
    if(idx<0){
      let best=Infinity,bestIdx=-1;
      pool.forEach((item,i)=>{
        if(used.has(i)) return;
        const dist=Math.abs(Number(item.hour)-hour);
        if(dist<best){best=dist;bestIdx=i;}
      });
      idx=bestIdx;
    }
    if(idx>=0){
      used.add(idx);
      return {...pool[idx],hour};
    }
    const fallback=pool.length?pool[pool.length-1]:{temperatureC:'—',condition:'nuageux',precipitationMm:0};
    return {...fallback,hour};
  });
}
function commentLines(data){
  const lines=Array.isArray(data)?data.filter(v=>typeof v==='string'&&v.trim()):[];
  return [lines[0]||'',lines[1]||''];
}
function drawHeader(city,date,ink){
  text('LOKA!',54,92,54,420,ink);
  text(String(city||'Tarnos').toUpperCase(),540,88,22,650,ink,'center');
  text(dateLabel(date),1026,88,19,530,ink,'right');
}
function drawGeneralBox(opts){
  const x=54,y=188,w=972,h=194;
  box(x,y,w,h);
  drawWeatherIcon(sceneIconKind(opts.title),142,286,0.78,INK);
  text(opts.title,256,287,62,760,INK);
  wrap(opts.subtitle,256,338,430,30,22,450,INK,'left',2);
  text(String(opts.min)+'° — '+String(opts.max)+'°',884,305,49,560,INK,'right');
}
function drawHourlyBox(items){
  const x=54,y=435,w=972,h=683,pad=36;
  box(x,y,w,h);
  const innerX=x+pad,innerY=y+36,innerW=w-pad*2,innerH=h-72;
  const rowH=innerH/2;
  separator(x+20,y+h/2,x+w-20,y+h/2);
  const cols=5;
  const colW=innerW/cols;
  for(let row=0;row<2;row++){
    const rowY=innerY+row*rowH;
    for(let i=1;i<cols;i++) separator(innerX+colW*i,rowY+8,innerX+colW*i,rowY+rowH-8);
    for(let c=0;c<cols;c++){
      const item=items[row*5+c];
      if(!item) continue;
      const cx=innerX+colW*(c+0.5);
      const baseY=rowY;
      text(String(item.hour).padStart(2,'0')+'h',cx,baseY+38,24,560,INK,'center');
      drawWeatherIcon(conditionToIcon(item.condition,item.hour),cx,baseY+114,0.58,INK);
      text(String(item.temperatureC)+'°',cx,baseY+202,41,700,INK,'center');
    }
  }
}
function drawCommentBox(mainLine,secondaryLine){
  const x=54,y=1170,w=972,h=150;
  box(x,y,w,h);
  wrap(mainLine,540,1241,840,36,30,540,INK,'center',2);
  wrap(secondaryLine,540,1295,820,28,20,430,rgba(INK,0.95),'center',2);
}
function drawSolarBox(solar){
  const x=54,y=1368,w=972,h=228,pad=28;
  box(x,y,w,h);
  const cols=5; const colW=(w-pad*2)/cols;
  for(let i=1;i<cols;i++) separator(x+pad+colW*i,y+28,x+pad+colW*i,y+h-28);
  const defs=[
    ['AUBE','dawn',solar.dawn],
    ['LEVER','sunrise',solar.sunrise],
    ['MIDI SOLAIRE','noon',solar.solarNoon],
    ['COUCHER','sunset',solar.sunset],
    ['CRÉPUSCULE','dusk',solar.dusk]
  ];
  defs.forEach((def,i)=>{
    const cx=x+pad+colW*(i+0.5);
    text(def[0],cx,y+54,15,640,INK,'center');
    drawSolarIcon(def[1],cx,y+112,0.86,INK);
    text(def[2]||'—',cx,y+194,28,540,INK,'center');
  });
}
function drawSignature(){
  text('Ici, aujourd’hui.',540,1824,19,430,INK,'center');
  ctx.save();ctx.strokeStyle=rgba(INK,0.75);ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(513,1841);ctx.lineTo(567,1841);ctx.stroke();ctx.restore();
}

async function draw(){
  ctx.clearRect(0,0,1080,1920);
  const bg=await load(visual.masterUrl);
  ctx.drawImage(bg,0,0,1080,1920);
  drawHeader(f.city,f.date,INK);
  drawGeneralBox({title:visual.title,subtitle:f.mainVerdict||f.subtitle||'',min:f.tempMinC,max:f.tempMaxC});
  const slots=pickHourlySlots(f.hourly);
  drawHourlyBox(slots);
  const lines=commentLines(f.summaryLines);
  const mainLine=lines[0]||f.mainVerdict||'';
  const secondaryLine=lines[1]||f.rainVerdict||'';
  drawCommentBox(mainLine,secondaryLine);
  drawSolarBox(solar);
  drawSignature();
  document.getElementById('summary').textContent=String(f.city||'Tarnos')+' · '+visual.title+' · '+String(f.tempMinC)+'° — '+String(f.tempMaxC)+'°';
}
function pngFile(){
  const b=atob(canvas.toDataURL('image/png').split(',')[1]);
  const u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  return new File([u],'loka-'+String(f.date||'meteo')+'.png',{type:'image/png'});
}
function fallbackDownload(file){
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
document.getElementById('share').onclick=()=>{
  const file=pngFile();
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){navigator.share({files:[file],title:'LOKA!'}).catch(error=>{if(error?.name!=='AbortError')fallbackDownload(file);});return;}
  fallbackDownload(file);
};
draw();
</script></body></html>`;
}
