import type {
  V24OfficialPublicPayload
} from "../engine/publicProduct";
import {
  calculateSolarTimes
} from "./solarTimes";

export function renderInstagramOfficial24(
  p: V24OfficialPublicPayload,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const solar = calculateSolarTimes(p.date, latitude, longitude, timezone);
  const payload=JSON.stringify(p).replace(/</g,"\\u003c");
  const cfg=JSON.stringify({timezone,solar}).replace(/</g,"\\u003c");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Studio Instagram</title><style>
:root{--ink:#171715;--muted:#73716c;--paper:#ecebe7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))}.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:12px;font-weight:760;letter-spacing:.16em}.badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#24653a;background:#e8f3ea;padding:6px 8px;border-radius:999px}h1{font-size:23px;line-height:1.08;margin:14px 0 5px}.muted{font-size:12px;line-height:1.5;color:var(--muted)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}button,a{border:0;border-radius:14px;padding:14px 10px;text-decoration:none;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.primary{background:#171715;color:#fff}.secondary{background:#f1f1ee;color:#171715}.canvas-wrap{background:#d8d8d4;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}canvas{display:block;width:100%;height:auto}.note{text-align:center;font-size:11px;color:#8d8983;line-height:1.45;padding:12px 12px 0}@media(max-width:420px){.actions{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">Météo officielle · V24</div></div><h1>Visuel Instagram</h1><div class="muted" id="summary">Tarnos · visuel du jour</div><div class="actions"><button class="primary" id="share">Partager / enregistrer</button><a class="secondary" href="/admin">Retour</a></div></div><div class="canvas-wrap"><canvas id="post" width="1080" height="1350"></canvas></div><div class="note">Le visuel suit uniquement la météo officielle effectivement publiée par LOKA.</div></div><script>
const p=${payload};const cfg=${cfg};const solar=cfg.solar||{dawn:null,sunrise:null,solarNoon:null,sunset:null,dusk:null,daylightMinutes:null,daylightDeltaMinutes:null};const canvas=document.getElementById('post');const ctx=canvas.getContext('2d');

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
function dateLabel(date){
  try{
    return new Intl.DateTimeFormat('fr-FR',{
      weekday:'long',day:'numeric',month:'long',timeZone:cfg.timezone
    }).format(new Date(date+'T12:00:00')).toUpperCase();
  }catch{return String(date||'')}
}
function rgba(hex,alpha){
  const h=hex.replace('#','');
  const n=parseInt(h,16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+alpha+')';
}
function drawCloud(x,y,scale,color,fillAlpha=.18){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.lineWidth=3/scale;ctx.strokeStyle=color;ctx.fillStyle='rgba(255,255,255,'+fillAlpha+')';
  ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(-35,15);
  ctx.bezierCurveTo(-46,15,-51,6,-48,-5);
  ctx.bezierCurveTo(-45,-18,-34,-22,-23,-17);
  ctx.bezierCurveTo(-18,-35,-2,-43,14,-37);
  ctx.bezierCurveTo(26,-33,32,-24,33,-13);
  ctx.bezierCurveTo(46,-13,55,-4,54,8);
  ctx.bezierCurveTo(53,19,44,24,32,24);
  ctx.lineTo(-31,24);
  ctx.bezierCurveTo(-39,24,-44,21,-47,15);
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function drawSun(x,y,scale,color){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=color;
  ctx.fillStyle='rgba(255,255,255,.46)';ctx.lineWidth=3/scale;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;ctx.beginPath();
    ctx.moveTo(Math.cos(a)*28,Math.sin(a)*28);ctx.lineTo(Math.cos(a)*39,Math.sin(a)*39);ctx.stroke();
  }
  ctx.restore();
}
function drawRain(x,y,scale,color){
  drawCloud(x,y-8,scale,color,.16);
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineCap='round';
  [-22,0,22].forEach(dx=>{ctx.beginPath();ctx.moveTo(x+dx*scale,y+23*scale);ctx.lineTo(x+(dx-5)*scale,y+36*scale);ctx.stroke();});
  ctx.restore();
}
function drawThunder(x,y,scale,color){
  drawCloud(x,y-8,scale,color,.15);
  ctx.save();ctx.fillStyle=color;ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.beginPath();ctx.moveTo(5,20);ctx.lineTo(-8,39);ctx.lineTo(2,39);ctx.lineTo(-4,55);ctx.lineTo(18,31);ctx.lineTo(7,31);ctx.closePath();ctx.fill();ctx.restore();
}
function drawWind(x,y,scale,color){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';
  [[-42,-12,28,-12],[-48,2,40,2],[-32,16,18,16]].forEach((l,i)=>{
    ctx.beginPath();ctx.moveTo(x+l[0]*scale,y+l[1]*scale);ctx.lineTo(x+l[2]*scale,y+l[3]*scale);
    ctx.quadraticCurveTo(x+(l[2]+13)*scale,y+(l[3]+(i===1?8:-7))*scale,x+(l[2]+20)*scale,y+l[3]*scale);ctx.stroke();
  });ctx.restore();
}
function drawFog(x,y,scale,color){
  drawCloud(x,y-12,scale*.86,color,.12);
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineCap='round';
  [25,38].forEach(v=>{ctx.beginPath();ctx.moveTo(x-36*scale,y+v*scale);ctx.lineTo(x+36*scale,y+v*scale);ctx.stroke();});ctx.restore();
}
function drawPartlyCloudy(x,y,scale,color){
  drawSun(x-20*scale,y-14*scale,scale*.70,color);drawCloud(x+8*scale,y+3*scale,scale*.90,color,.16);
}
function iconKind(condition){
  const c=String(condition||'').toLowerCase();
  if(c.includes('orage'))return 'thunder';
  if(c.includes('pluie')||c.includes('averse'))return 'rain';
  if(c.includes('vent'))return 'wind';
  if(c.includes('brouillard')||c.includes('brume'))return 'fog';
  if(c.includes('soleil'))return 'sun';
  if(c.includes('variable')||c.includes('éclair')||c.includes('eclair'))return 'partly';
  return 'cloud';
}
function sceneIconKind(label){
  const c=String(label||'').toLowerCase();
  if(c.includes('orage'))return 'thunder';
  if(c.includes('pluie')||c.includes('averse'))return 'rain';
  if(c.includes('vent'))return 'wind';
  if(c.includes('brouillard')||c.includes('brume'))return 'fog';
  if(c.includes('soleil')&&!c.includes('nuage'))return 'sun';
  if(c.includes('éclair')||c.includes('eclair')||c.includes('variable')||c.includes('amélioration')||c.includes('amelioration')||c.includes('passage'))return 'partly';
  return 'cloud';
}
function drawWeatherIcon(kind,x,y,scale,color){
  if(kind==='sun')return drawSun(x,y,scale,color);
  if(kind==='rain')return drawRain(x,y,scale,color);
  if(kind==='thunder')return drawThunder(x,y,scale,color);
  if(kind==='wind')return drawWind(x,y,scale,color);
  if(kind==='fog')return drawFog(x,y,scale,color);
  if(kind==='partly')return drawPartlyCloudy(x,y,scale,color);
  return drawCloud(x,y,scale,color,.16);
}
function curveYs(items,baseY){
  if(!items.length)return [];
  const vals=items.map(h=>Number(h.temperatureC)||0);const min=Math.min(...vals);const max=Math.max(...vals);const span=Math.max(1,max-min);
  return vals.map(t=>baseY+14-((t-min)/span)*25);
}
function drawTemperatureCurve(items,xs,baseY,accent){
  const ys=curveYs(items,baseY);if(!ys.length)return ys;
  ctx.save();ctx.strokeStyle=rgba(accent,.34);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(xs[0],ys[0]);
  for(let i=1;i<xs.length;i++){const px=xs[i-1],py=ys[i-1],x=xs[i],y=ys[i],m=(px+x)/2;ctx.bezierCurveTo(m,py,m,y,x,y)}
  ctx.stroke();ctx.fillStyle=rgba(accent,.78);xs.forEach((x,i)=>{ctx.beginPath();ctx.arc(x,ys[i],6.7,0,Math.PI*2);ctx.fill()});ctx.restore();return ys;
}
function drawHourlyRow(items,xs,timeY,iconY,curveY,tempY,ink,accent){
  drawTemperatureCurve(items,xs,curveY,accent);
  items.forEach((h,i)=>{
    text(String(h.hour).padStart(2,'0')+'h',xs[i],timeY,21,600,ink,'center');
    drawWeatherIcon(iconKind(h.condition),xs[i],iconY,.45,accent);
    text(String(h.temperatureC)+'°',xs[i],tempY,38,720,ink,'center');
  });
}
function drawSolarEventIcon(x,y,kind,ink){
  ctx.save();ctx.strokeStyle=ink;ctx.fillStyle=(kind==='dawn'||kind==='noon')?'rgba(255,255,255,.72)':ink;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
  const horizon=y+18,sunY=kind==='noon'?y-6:horizon,r=13;
  if(kind!=='noon'){ctx.beginPath();ctx.moveTo(x-35,horizon+17);ctx.lineTo(x+35,horizon+17);ctx.stroke()}
  ctx.beginPath();ctx.arc(x,sunY,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r+7),sunY+Math.sin(a)*(r+7));ctx.lineTo(x+Math.cos(a)*(r+13),sunY+Math.sin(a)*(r+13));ctx.stroke()}
  if(kind==='dawn'||kind==='sunrise'){
    ctx.beginPath();ctx.moveTo(x,sunY-38);ctx.lineTo(x,sunY-60);ctx.moveTo(x,sunY-60);ctx.lineTo(x-6,sunY-52);ctx.moveTo(x,sunY-60);ctx.lineTo(x+6,sunY-52);ctx.stroke();
  }else if(kind==='sunset'||kind==='dusk'){
    ctx.beginPath();ctx.moveTo(x,sunY-60);ctx.lineTo(x,sunY-38);ctx.moveTo(x,sunY-38);ctx.lineTo(x-6,sunY-46);ctx.moveTo(x,sunY-38);ctx.lineTo(x+6,sunY-46);ctx.stroke();
  }ctx.restore();
}
function drawSolarTimeline(ink){
  const events=[{key:'dawn',label:'AUBE',kind:'dawn'},{key:'sunrise',label:'LEVER',kind:'sunrise'},{key:'solarNoon',label:'AU PLUS HAUT',kind:'noon'},{key:'sunset',label:'COUCHER',kind:'sunset'},{key:'dusk',label:'CRÉPUSCULE',kind:'dusk'}];
  const xs=[136,314,540,766,944],timeY=820,labelY=852,iconY=930;
  ctx.save();ctx.strokeStyle=rgba(ink,.60);ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(xs[1]+32,iconY+12);ctx.bezierCurveTo(432,iconY-78,648,iconY-78,xs[3]-32,iconY+12);ctx.stroke();ctx.restore();
  events.forEach((event,i)=>{text(solar[event.key]||'—',xs[i],timeY,22,650,ink,'center');text(event.label,xs[i],labelY,event.kind==='noon'?13:15,650,ink,'center');drawSolarEventIcon(xs[i],iconY,event.kind,ink)});
  if(Number.isFinite(solar.daylightDeltaMinutes)){
    const d=Math.round(solar.daylightDeltaMinutes),sign=d>0?'+':d<0?'−':'±';
    text('JOUR '+sign+String(Math.abs(d))+' min',540,1006,14,650,rgba(ink,.56),'center');
  }
}
function glassPanel(x,y,w,h,r,dark){
  const sample=document.createElement('canvas');sample.width=w;sample.height=h;const sc=sample.getContext('2d');if(sc)sc.drawImage(canvas,x,y,w,h,0,0,w,h);
  ctx.save();ctx.shadowColor='rgba(18,34,58,.10)';ctx.shadowBlur=24;ctx.shadowOffsetY=8;ctx.fillStyle='rgba(255,255,255,.08)';rr(x,y,w,h,r);ctx.fill();ctx.restore();
  if(sc){ctx.save();rr(x,y,w,h,r);ctx.clip();if('filter' in ctx)ctx.filter='blur(15px) saturate(112%)';ctx.globalAlpha=.66;ctx.drawImage(sample,x,y);ctx.restore()}
  ctx.save();rr(x,y,w,h,r);ctx.clip();const veil=ctx.createLinearGradient(x,y,x,y+h);veil.addColorStop(0,dark?'rgba(255,255,255,.52)':'rgba(255,255,255,.42)');veil.addColorStop(1,dark?'rgba(244,248,255,.35)':'rgba(244,248,255,.24)');ctx.fillStyle=veil;ctx.fillRect(x,y,w,h);ctx.restore();
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=1.6;rr(x+.8,y+.8,w-1.6,h-1.6,r-1);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=.8;rr(x+4,y+4,w-8,h-8,r-4);ctx.stroke();ctx.restore();
}
function drawInfoChip(x,y,kind,accent){
  ctx.save();ctx.fillStyle=rgba(accent,.12);ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();ctx.restore();
  if(kind==='temperature'){
    ctx.save();ctx.strokeStyle=accent;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y+10,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x,y-24);ctx.quadraticCurveTo(x,y-30,x+6,y-30);ctx.quadraticCurveTo(x+12,y-30,x+12,y-24);ctx.lineTo(x+12,y+2);ctx.stroke();ctx.restore();
  }else drawCloud(x,y,.39,accent,.04);
}

async function draw(){
  ctx.clearRect(0,0,1080,1350);const s=p.scene,bg=await load(s.masterUrl);ctx.drawImage(bg,0,0,1080,1350);
  const dark=[10,12,13,20,22,24].includes(s.id),ink=dark?'#ffffff':'#0a1830',accent=dark?'#d9e4ff':'#6d86bc';
  const top=ctx.createLinearGradient(0,0,0,370);top.addColorStop(0,dark?'rgba(0,0,0,.24)':'rgba(255,255,255,.24)');top.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=top;ctx.fillRect(0,0,1080,390);
  text('LOKA!',48,78,50,360,ink);text(String(p.city||'Tarnos').toUpperCase(),540,72,23,680,ink,'center');text(dateLabel(p.date),1032,72,18,600,ink,'right');
  drawWeatherIcon(sceneIconKind(s.label),342,193,.78,accent);text(s.label,420,218,60,780,ink);wrap(p.editorial?.mainVerdict||p.editorial?.subtitle||'',540,282,760,34,27,470,ink,'center',2);
  ctx.save();ctx.strokeStyle=rgba(accent,.55);ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(505,310);ctx.lineTo(575,310);ctx.stroke();ctx.restore();
  const hourly=Array.isArray(p.hourly)?p.hourly.slice(0,9):[],row1=hourly.slice(0,5),row2=hourly.slice(5,9);
  drawHourlyRow(row1,[150,338,540,728,916].slice(0,row1.length),394,445,487,548,ink,accent);drawHourlyRow(row2,[208,418,632,842].slice(0,row2.length),620,668,710,765,ink,accent);
  drawSolarTimeline(ink);glassPanel(104,1046,872,222,30,dark);
  const lines=Array.isArray(p.editorial?.summaryLines)?p.editorial.summaryLines.filter(x=>typeof x==='string'&&x.trim()).slice(0,2):[];
  const first=lines[0]||('Températures comprises entre '+String(p.temperatures?.minC??'—')+' et '+String(p.temperatures?.maxC??'—')+'°.');const second=lines[1]||(p.editorial?.rainVerdict||'');
  drawInfoChip(226,1114,'temperature',accent);drawInfoChip(226,1202,'cloud',accent);wrap(first,292,1124,620,32,25,500,'#0a1830','left',2);wrap(second,292,1212,620,32,25,500,'#0a1830','left',2);
  text('Ici, aujourd’hui.',540,1324,20,430,ink,'center');
  const sunText=solar.sunrise&&solar.sunset?' · ☀ '+solar.sunrise+' / '+(solar.solarNoon||'—')+' / '+solar.sunset:'';document.getElementById('summary').textContent=String(p.city||'Tarnos')+' · '+s.label+' · '+String(p.temperatures?.minC??'—')+'° / '+String(p.temperatures?.maxC??'—')+'°'+sunText;
}
function pngFile(){const b=atob(canvas.toDataURL('image/png').split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new File([u],'loka-'+String(p.date||'meteo')+'.png',{type:'image/png'})}
function fallbackDownload(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
document.getElementById('share').onclick=()=>{const file=pngFile();if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){navigator.share({files:[file],title:'LOKA!'}).catch(error=>{if(error?.name!=='AbortError')fallbackDownload(file)});return}fallbackDownload(file)};draw();
</script></body></html>`;
}
