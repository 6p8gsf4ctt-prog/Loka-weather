import type { LokaForecast } from "../types";
import { BACKGROUND_SOURCES } from "./backgrounds";

/**
 * LOKA V0.6.6 — scénarios de contrôle dédiés pour les 6 masters + AUTO réel.
 *
 * La météo continue de venir exclusivement du moteur LOKA. Cette couche ne
 * classe pas la journée : elle sélectionne l'univers visuel correspondant à
 * forecast.scene, charge le fond maître associé puis compose les données
 * variables sur une géométrie fixe 1080 × 1350.
 *
 * Les fonds maîtres sont embarqués dans le Worker pour que le rendu soit
 * autonome et reproductible, sans dépendance à un service d'image externe.
 */
export function renderInstagramGenerator(
  forecast: LokaForecast | null,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const initial = JSON.stringify(forecast ?? null).replace(/</g, "\\u003c");
  const config = JSON.stringify({ latitude, longitude, timezone }).replace(/</g, "\\u003c");
  const backgrounds = JSON.stringify(BACKGROUND_SOURCES).replace(/</g, "\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LOKA! — Studio Instagram V0.6.6</title>
<style>
:root{color-scheme:light;--ink:#15202a;--paper:#efefec}
*{box-sizing:border-box}
body{margin:0;background:#ecebe7;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;padding:max(16px,env(safe-area-inset-top)) 12px max(24px,env(safe-area-inset-bottom))}
.wrap{width:min(100%,580px);margin:auto}
.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px;box-shadow:0 12px 36px rgba(0,0,0,.07)}
.toolbar h1{font-size:22px;margin:0 0 6px}.toolbar p{font-size:13px;color:#6f7478;margin:0 0 14px;line-height:1.45}
.preview{margin:0 0 12px}.preview label{display:block;font-size:12px;font-weight:650;margin:0 0 6px;color:#555}.preview select{width:100%;border:1px solid #deded9;background:#f8f8f5;border-radius:12px;padding:12px 13px;font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;color:#171715}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{appearance:none;border:0;border-radius:14px;padding:14px 12px;font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;text-align:center}
button.primary{background:#171715;color:#fff}button.secondary{background:#f1f1ee;color:#171715}
.canvas-wrap{background:#ddd;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.15)}
canvas{display:block;width:100%;height:auto}
.note{font-size:12px;color:#6f7478;line-height:1.5;padding:12px 4px 0}
</style>
</head>
<body>
<div class="wrap">
  <div class="toolbar">
    <h1>Studio Instagram LOKA! — V0.6.6</h1>
    <p>Le fond maître est fixe par scène. Seules les données météo, les pictogrammes et les textes du jour changent.</p>
    <div class="preview">
      <label for="previewScene">Prévisualiser un master</label>
      <select id="previewScene">
        <option value="AUTO">AUTO — scène LOKA du jour</option>
        <option value="SOLEIL">SOLEIL</option>
        <option value="NUAGES">COUVERT</option>
        <option value="PLUIE">PLUIE</option>
        <option value="ORAGES">ORAGEUX</option>
        <option value="VENT FORT">VENT FORT</option>
        <option value="INSTABLE">INSTABLE</option>
      </select>
    </div>
    <div class="actions">
      <button class="secondary" id="refresh">Actualiser</button>
      <button class="primary" id="download">Télécharger le PNG</button>
    </div>
  </div>
  <div class="canvas-wrap"><canvas id="post" width="1080" height="1350"></canvas></div>
  <div class="note">AUTO = météo réelle du jour. Les autres choix servent uniquement à contrôler les masters avant validation.</div>
</div>
<script>
const initialForecast=${initial};
const cityConfig=${config};
const backgroundSources=${backgrounds};
let forecast=initialForecast;
let previewScene="AUTO";
const backgroundCache={};
const canvas=document.getElementById('post');
const ctx=canvas.getContext('2d');

const masterScenarios={
  "SOLEIL":{subtitle:"Journée ensoleillée et lumineuse.",temps:[19,21,25,28,27,23],conditions:["soleil","soleil","soleil","soleil","soleil","soleil"],summary:["Températures comprises entre 19 et 28 degrés.","Ciel dégagé toute la journée. Grand beau temps.","Aucun événement notable."]},
  "NUAGES":{subtitle:"Journée grise et humide, amélioration possible en soirée.",temps:[18,20,23,24,19,17],conditions:["couvert","couvert","couvert","couvert","pluie","pluie"],summary:["Températures comprises entre 17 et 24 degrés.","Ciel très nuageux, pluies intermittentes possibles.","Amélioration possible en soirée, temps plus sec et lumineux."]},
  "PLUIE":{subtitle:"Journée pluvieuse, fraîche et humide.",temps:[14,15,16,16,15,14],conditions:["pluie","pluie","pluie","pluie","pluie","pluie"],summary:["Températures comprises entre 14 et 16 degrés.","Pluie continue toute la journée. Ciel gris et très humide.","Pluie plus marquée de 11 h à 17 h. Cumuls de 10 à 20 mm attendus."]},
  "ORAGES":{subtitle:"Journée instable, averses et orages possibles.",temps:[17,18,20,21,19,17],conditions:["peu nuageux","peu nuageux","pluie","orage","pluie","orage"],summary:["Températures comprises entre 17 et 21 degrés.","Ciel très nuageux, averses possibles à plusieurs moments.","Orages possibles l’après-midi et en soirée. Risque de fortes pluies localement."]},
  "VENT FORT":{subtitle:"Journée changeante, vent fort de l’après-midi.",temps:[14,16,18,19,17,15],conditions:["peu nuageux","peu nuageux","couvert","vent fort","vent fort","couvert"],summary:["Températures comprises entre 14 et 19 degrés.","Ciel variable le matin, plus nuageux l’après-midi.","Vent fort de 14 h à 19 h, rafales jusqu’à 70 km/h. Quelques averses possibles en fin de journée."]},
  "INSTABLE":{subtitle:"Journée agréable avant une dégradation en soirée.",temps:[20,22,27,28,24,21],conditions:["peu nuageux","peu nuageux","couvert","couvert","pluie","orage"],summary:["Températures comprises entre 20 et 28 degrés.","Soleil le matin, ciel de plus en plus couvert l’après-midi.","Pluie dès 17 h, orages possibles en soirée à partir de 20 h."]}
};
function previewForecastFor(scene,base){
  if(scene==="AUTO"||!masterScenarios[scene])return base;
  const m=masterScenarios[scene],hours=[7,9,12,15,18,21];
  const copy=Object.assign({},base);
  copy.scene=scene;copy.subtitle=m.subtitle;copy.mainVerdict=m.subtitle;copy.tempMinC=Math.min.apply(null,m.temps);copy.tempMaxC=Math.max.apply(null,m.temps);copy.summaryLines=m.summary.slice();copy.notableEvent=m.summary[2];
  copy.hourly=hours.map(function(hour,i){return {hour:hour,temperatureC:m.temps[i],condition:m.conditions[i],precipitationMm:(m.conditions[i]==="pluie"||m.conditions[i]==="orage")?1:0};});
  return copy;
}

const themes={
  "SOLEIL":{ink:"#17212b",sub:"#26333c",curve:"#e6a000",accent:"#f0a000",panel:"rgba(255,246,231,.91)",panelInk:"#17212b",panelRule:"rgba(34,43,50,.18)",overlay:"rgba(255,248,231,.03)",title:"SOLEIL"},
  "NUAGES":{ink:"#17212b",sub:"#26333c",curve:"#ffffff",accent:"#38baf0",panel:"rgba(84,96,110,.70)",panelInk:"#ffffff",panelRule:"rgba(255,255,255,.30)",overlay:"rgba(235,241,246,.14)",title:"COUVERT"},
  "PLUIE":{ink:"#ffffff",sub:"#f2f5f7",curve:"#ffffff",accent:"#25b8ef",panel:"rgba(41,66,89,.82)",panelInk:"#ffffff",panelRule:"rgba(255,255,255,.30)",overlay:"rgba(37,55,75,.12)",title:"PLUIE"},
  "ORAGES":{ink:"#ffffff",sub:"#f5f3f7",curve:"#ffffff",accent:"#b65cf0",panel:"rgba(27,24,38,.84)",panelInk:"#ffffff",panelRule:"rgba(255,255,255,.26)",overlay:"rgba(17,15,28,.17)",title:"ORAGEUX"},
  "VENT FORT":{ink:"#ffffff",sub:"#f2f6f8",curve:"#f7fbff",accent:"#30c4f0",panel:"rgba(35,76,104,.78)",panelInk:"#ffffff",panelRule:"rgba(255,255,255,.30)",overlay:"rgba(32,80,112,.08)",title:"VENT FORT"},
  "INSTABLE":{ink:"#ffffff",sub:"#f4f3f1",curve:"#ffffff",accent:"#f0a000",panel:"rgba(55,56,60,.78)",panelInk:"#ffffff",panelRule:"rgba(255,255,255,.28)",overlay:"rgba(20,24,31,.10)",title:"INSTABLE"}
};

function setFont(size,weight){ctx.font=String(weight)+" "+String(size)+'px -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif';}
function text(txt,x,y,size,weight,color,align){ctx.save();setFont(size,weight);ctx.fillStyle=color;ctx.textAlign=align||"left";ctx.textBaseline="alphabetic";ctx.fillText(String(txt),x,y);ctx.restore();}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function wrapText(txt,x,y,maxWidth,lineHeight,size,weight,color,align,maxLines){ctx.save();setFont(size,weight);ctx.fillStyle=color;ctx.textAlign=align||"left";ctx.textBaseline="alphabetic";const words=String(txt||"").split(/\\s+/);let line="",yy=y,count=0;for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,yy);count++;if(maxLines&&count>=maxLines){ctx.restore();return yy;}line=word;yy+=lineHeight;}else line=test;}if(line&&(!maxLines||count<maxLines))ctx.fillText(line,x,yy);ctx.restore();return yy;}
function loadImage(src){return new Promise(function(resolve,reject){const im=new Image();im.onload=function(){resolve(im)};im.onerror=reject;im.src=src;});}
function coverImage(im,x,y,w,h){const s=Math.max(w/im.width,h/im.height),dw=im.width*s,dh=im.height*s;ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}

function conditionToIcon(condition){
  const c=String(condition||"").trim().toLocaleLowerCase("fr-FR");
  if(c==="soleil"||c==="ensoleillé"||c==="ensoleille")return "sun";
  if(c==="peu nuageux"||c==="éclaircies"||c==="eclaircies"||c==="variable")return "partly";
  if(c==="pluie"||c==="averse"||c==="averses")return "rain";
  if(c==="orage"||c==="orages"||c==="orageux")return "storm";
  if(c==="vent"||c==="venteux"||c==="vent fort")return "wind";
  if(c==="nuageux"||c==="couvert"||c==="très nuageux"||c==="tres nuageux")return "cloud";
  return "cloud";
}
function sceneIcon(scene){if(scene==="SOLEIL")return "sun";if(scene==="NUAGES")return "cloud";if(scene==="PLUIE")return "rain";if(scene==="ORAGES")return "storm";if(scene==="VENT FORT")return "wind";return "partly";}

function lineIcon(type,x,y,size,color,accent){
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle="transparent";ctx.lineWidth=Math.max(3,size*.052);ctx.lineCap="round";ctx.lineJoin="round";
  function cloud(cx,cy,s){ctx.beginPath();ctx.moveTo(cx-s*.38,cy+s*.14);ctx.bezierCurveTo(cx-s*.46,cy-s*.05,cx-s*.25,cy-s*.22,cx-s*.08,cy-s*.13);ctx.bezierCurveTo(cx,cy-s*.37,cx+.27*s,cy-s*.35,cx+.32*s,cy-s*.14);ctx.bezierCurveTo(cx+.48*s,cy-s*.10,cx+.53*s,cy+s*.16,cx+.34*s,cy+s*.18);ctx.lineTo(cx-s*.28,cy+s*.18);ctx.stroke();}
  function sun(cx,cy,s,col){ctx.strokeStyle=col||color;ctx.beginPath();ctx.arc(cx,cy,s*.23,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*s*.34,cy+Math.sin(a)*s*.34);ctx.lineTo(cx+Math.cos(a)*s*.48,cy+Math.sin(a)*s*.48);ctx.stroke();}}
  if(type==="sun"){sun(x,y,size,accent||color);} 
  else if(type==="cloud"){cloud(x,y,size);} 
  else if(type==="partly"){sun(x-size*.16,y-size*.14,size*.66,accent||"#f0a000");ctx.strokeStyle=color;cloud(x+size*.09,y+size*.06,size*.82);} 
  else if(type==="rain"){cloud(x,y-size*.08,size);ctx.strokeStyle="#25b8ef";for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*size*.18,y+size*.20);ctx.lineTo(x+i*size*.18-size*.05,y+size*.39);ctx.stroke();}} 
  else if(type==="storm"){cloud(x,y-size*.10,size);ctx.strokeStyle="#25b8ef";for(let i=-1;i<=1;i+=2){ctx.beginPath();ctx.moveTo(x+i*size*.20,y+size*.20);ctx.lineTo(x+i*size*.20-size*.04,y+size*.37);ctx.stroke();}ctx.strokeStyle="#ffd21c";ctx.beginPath();ctx.moveTo(x+size*.02,y+size*.13);ctx.lineTo(x-size*.08,y+size*.34);ctx.lineTo(x+size*.05,y+size*.31);ctx.lineTo(x-size*.03,y+size*.52);ctx.stroke();} 
  else if(type==="wind"){ctx.strokeStyle="#36c2ed";for(let i=-1;i<=1;i++){const yy=y+i*size*.18;ctx.beginPath();ctx.moveTo(x-size*.42,yy);ctx.bezierCurveTo(x-size*.12,yy,x+size*.05,yy-size*.12,x+size*.32,yy);ctx.stroke();}}
  ctx.restore();
}

function formatDate(date){const d=new Date(date+"T12:00:00");return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric",timeZone:cityConfig.timezone}).format(d).replace(".","").toLocaleUpperCase("fr-FR");}
function solarTimes(date,lat,lon){
  const rad=Math.PI/180,deg=180/Math.PI,d=new Date(date+"T12:00:00Z"),start=new Date(Date.UTC(d.getUTCFullYear(),0,0)),N=Math.floor((d-start)/86400000);
  function event(isRise,zenith){const lngHour=lon/15,t=N+(((isRise?6:18)-lngHour)/24),M=(0.9856*t)-3.289;let L=M+(1.916*Math.sin(M*rad))+(0.020*Math.sin(2*M*rad))+282.634;L=(L+360)%360;let RA=deg*Math.atan(0.91764*Math.tan(L*rad));RA=(RA+360)%360;const Lq=Math.floor(L/90)*90,RAq=Math.floor(RA/90)*90;RA=(RA+(Lq-RAq))/15;const sinDec=.39782*Math.sin(L*rad),cosDec=Math.cos(Math.asin(sinDec)),cosH=(Math.cos(zenith*rad)-(sinDec*Math.sin(lat*rad)))/(cosDec*Math.cos(lat*rad));if(cosH>1||cosH<-1)return "--:--";let H=isRise?360-deg*Math.acos(cosH):deg*Math.acos(cosH);H/=15;const T=H+RA-(.06571*t)-6.622;let UT=(T-lngHour+24)%24;const hh=Math.floor(UT),mm=Math.round((UT-hh)*60),utc=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),hh,mm));return new Intl.DateTimeFormat("fr-FR",{timeZone:cityConfig.timezone,hour:"2-digit",minute:"2-digit"}).format(utc);}
  return {dawn:event(true,96),sunrise:event(true,90.833),sunset:event(false,90.833),dusk:event(false,96)};
}
function hourLabel(h){return String(Math.round(h))+" h";}
function preciseSummaryLines(f){
  const hours=(f.hourly||[]).slice().sort(function(a,b){return a.hour-b.hour;});
  const tempLine="Températures comprises entre "+String(f.tempMinC)+" et "+String(f.tempMaxC)+" degrés.";
  const out=[tempLine];
  if(hours.length<2){
    const supplied=(f.summaryLines||[]).filter(function(line){return line&&String(line).toLowerCase().indexOf("températures comprises")<0;});
    return out.concat(supplied).slice(0,3);
  }
  function sunny(c){const x=String(c||"").toLowerCase();return x==="soleil"||x==="peu nuageux";}
  function cloudy(c){const x=String(c||"").toLowerCase();return x==="nuageux"||x==="couvert"||x==="variable";}
  function wet(h){const x=String(h.condition||"").toLowerCase();return Number(h.precipitationMm||0)>=.2||x==="pluie"||x==="averse"||x==="averses"||x==="orage"||x==="orages";}
  function addUnique(line){
    if(!line)return;
    const key=String(line).trim().toLocaleLowerCase("fr-FR").replace(/[°.]/g,"").replace(/degrés/g,"degres");
    for(const existing of out){
      const ek=String(existing).trim().toLocaleLowerCase("fr-FR").replace(/[°.]/g,"").replace(/degrés/g,"degres");
      if(ek===key)return;
      if(key.indexOf("températures comprises")===0&&ek.indexOf("températures comprises")===0)return;
    }
    out.push(String(line));
  }
  const s=hours.filter(function(h){return sunny(h.condition)}),c=hours.filter(function(h){return cloudy(h.condition)}),w=hours.filter(wet);
  if(f.scene==="SOLEIL"){
    if(s.length===hours.length)addUnique("Ciel dégagé toute la journée.");
    else if(s.length)addUnique("Soleil surtout présent entre "+hourLabel(s[0].hour)+" et "+hourLabel(s[s.length-1].hour)+".");
  }else if(f.scene==="NUAGES"){
    if(c.length)addUnique("Ciel très nuageux de "+hourLabel(c[0].hour)+" à "+hourLabel(c[c.length-1].hour)+".");
  }else if(f.scene==="PLUIE"){
    if(w.length)addUnique("Pluie entre "+hourLabel(w[0].hour)+" et "+hourLabel(w[w.length-1].hour)+".");
  }else if(f.scene==="ORAGES"){
    if(w.length)addUnique("Averses ou orages entre "+hourLabel(w[0].hour)+" et "+hourLabel(w[w.length-1].hour)+".");
  }else if(f.scene==="VENT FORT"){
    addUnique((f.summaryLines&&f.summaryLines[1])?f.summaryLines[1]:"Ciel changeant au cours de la journée.");
  }else{
    if(s.length)addUnique("Soleil surtout présent entre "+hourLabel(s[0].hour)+" et "+hourLabel(s[s.length-1].hour)+".");
    const firstLateCloud=hours.find(function(h){return h.hour>=15&&cloudy(h.condition)});
    if(firstLateCloud)addUnique("Ciel plus nuageux à partir de "+hourLabel(firstLateCloud.hour)+".");
    else if(c.length)addUnique("Ciel plus nuageux au fil de la journée.");
  }
  const supplied=(f.summaryLines||[]).concat(f.notableEvent?[f.notableEvent]:[]);
  for(const line of supplied){
    if(out.length>=3)break;
    if(!line)continue;
    if(String(line).toLowerCase().indexOf("températures comprises")>=0)continue;
    addUnique(line);
  }
  return out.slice(0,3);
}
function summaryIcon(line,index,scene){
  if(index===0)return "thermo";
  const l=String(line||"").toLowerCase();
  if(l.includes("orage"))return "storm";
  if(l.includes("pluie")||l.includes("averse"))return "rain";
  if(l.includes("vent")||l.includes("rafale"))return "wind";
  if(l.includes("soleil")||l.includes("éclaircie")||l.includes("dégagé"))return "partly";
  return sceneIcon(scene);
}
function thermometer(x,y,size,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(3,size*.055);ctx.lineCap="round";ctx.beginPath();ctx.arc(x,y+size*.28,size*.18,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-size*.08,y+size*.20);ctx.lineTo(x-size*.08,y-size*.30);ctx.arc(x,y-size*.30,size*.08,Math.PI,0);ctx.lineTo(x+size*.08,y+size*.20);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-size*.12);ctx.lineTo(x,y+size*.25);ctx.stroke();ctx.restore();}
function panelIcon(type,x,y,size,color,accent){if(type==="thermo")thermometer(x,y,size,color);else lineIcon(type,x,y,size,color,accent);}
function drawTempCurve(hours,theme){
  const xs=[145,310,470,630,790,950],temps=hours.map(function(h){return Number(h.temperatureC)});const min=Math.min.apply(null,temps),max=Math.max.apply(null,temps),span=Math.max(1,max-min);
  const ys=temps.map(function(t){return 550-((t-min)/span)*30;});
  ctx.save();ctx.strokeStyle=theme.curve;ctx.lineWidth=2;ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(95,ys[0]+4);for(let i=0;i<xs.length;i++){const nx=i<xs.length-1?(xs[i]+xs[i+1])/2:1010;ctx.quadraticCurveTo(xs[i],ys[i],nx,(ys[i]+(ys[i+1]||ys[i]))/2);}ctx.stroke();ctx.globalAlpha=1;
  for(let i=0;i<xs.length;i++){ctx.fillStyle=(i>=4&&theme.title!=="SOLEIL")?(i===5?"#a757ef":"#34b9eb"):theme.ink;ctx.beginPath();ctx.arc(xs[i],ys[i],7,0,Math.PI*2);ctx.fill();}
  ctx.restore();return {xs,ys};
}
function drawSolarCurve(solar,theme){
  const x1=145,x2=310,x3=755,x4=945,base=920,peak=850;ctx.save();ctx.lineWidth=3;ctx.lineCap="round";
  const grad=ctx.createLinearGradient(x2,0,x4,0);grad.addColorStop(0,"#f1b700");grad.addColorStop(.48,"#ffffff");grad.addColorStop(.72,"#56c7ef");grad.addColorStop(1,"#ad58ef");ctx.strokeStyle=grad;ctx.beginPath();ctx.moveTo(105,base);ctx.lineTo(x1,base);ctx.moveTo(x2,base);ctx.bezierCurveTo(425,830,610,820,x3,base);ctx.moveTo(870,base);ctx.lineTo(x4,base);ctx.stroke();
  const items=[[x1,solar.dawn,"AUBE","#ffffff"],[x2,solar.sunrise,"LEVER","#f0b300"],[x3,solar.sunset,"COUCHER","#66c8ef"],[x4,solar.dusk,"CRÉPUSCULE","#ad58ef"]];
  for(const it of items){const x=it[0],tm=it[1],lab=it[2],col=it[3];text(tm,x,808,24,450,theme.ink,"center");text(lab,x,852,22,500,theme.ink,"center");ctx.fillStyle=col;ctx.strokeStyle="#ffffff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,base,10,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-28,base);ctx.lineTo(x+28,base);ctx.stroke();ctx.beginPath();ctx.moveTo(x,base-18);ctx.lineTo(x,base-28);ctx.stroke();}
  ctx.restore();
}
async function draw(){
  const f=forecast;if(!f){ctx.fillStyle="#eee";ctx.fillRect(0,0,1080,1350);text("Aucune prévision enregistrée",540,675,34,600,"#333","center");return;}
  const realScene=f.scene||"INSTABLE";
  const scene=previewScene==="AUTO"?realScene:previewScene;
  const displayForecast=previewForecastFor(previewScene,f);
  const theme=themes[scene]||themes["INSTABLE"],src=backgroundSources[scene]||backgroundSources["INSTABLE"];
  const isInstable=scene==="INSTABLE";
  const usesValidatedGeometry=true;
  if(!backgroundCache[scene])backgroundCache[scene]=await loadImage(src);const bg=backgroundCache[scene];
  ctx.clearRect(0,0,1080,1350);coverImage(bg,0,0,1080,1350);ctx.fillStyle=theme.overlay;ctx.fillRect(0,0,1080,1350);
  // légère protection de lisibilité uniquement, sans masquer le fond maître
  const topShade=ctx.createLinearGradient(0,0,0,660);topShade.addColorStop(0,scene==="SOLEIL"||scene==="NUAGES"?"rgba(255,255,255,.08)":"rgba(0,0,0,.12)");topShade.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=topShade;ctx.fillRect(0,0,1080,660);

  text("LOKA!",45,80,52,350,theme.ink,"left");text(String(displayForecast.city||"Tarnos").toLocaleUpperCase("fr-FR"),540,72,25,500,theme.ink,"center");text(formatDate(displayForecast.date),1030,72,23,450,theme.ink,"right");
  text(theme.title,540,usesValidatedGeometry?208:205,usesValidatedGeometry?84:78,760,theme.ink,"center");wrapText(displayForecast.subtitle||displayForecast.mainVerdict,540,usesValidatedGeometry?288:282,860,40,usesValidatedGeometry?34:31,430,theme.sub,"center",2);

  const hours=(displayForecast.hourly||[]).slice(0,6);while(hours.length<6)hours.push({hour:[7,9,12,15,18,21][hours.length],temperatureC:0,condition:"nuageux",precipitationMm:0});
  const xs=[145,310,470,630,790,950];
  for(let i=0;i<6;i++){text(String(hours[i].hour).padStart(2,"0")+"h",xs[i],382,usesValidatedGeometry?32:29,470,theme.ink,"center");lineIcon(conditionToIcon(hours[i].condition),xs[i],476,usesValidatedGeometry?118:106,theme.ink,theme.accent);}
  const curve=drawTempCurve(hours,theme);
  for(let i=0;i<6;i++)text(String(hours[i].temperatureC)+"°",xs[i],usesValidatedGeometry?640:632,usesValidatedGeometry?58:52,650,theme.ink,"center");

  const solar=solarTimes(displayForecast.date,cityConfig.latitude,cityConfig.longitude);drawSolarCurve(solar,theme);

  const panelX=62,panelY=usesValidatedGeometry?948:965,panelW=956,panelH=usesValidatedGeometry?350:326;ctx.save();ctx.fillStyle=theme.panel;ctx.shadowColor="rgba(0,0,0,.10)";ctx.shadowBlur=18;roundRect(panelX,panelY,panelW,panelH,30);ctx.fill();ctx.restore();
  const lines=previewScene==="AUTO"?preciseSummaryLines(displayForecast):masterScenarios[scene].summary.slice();while(lines.length<3)lines.push("");
  for(let i=0;i<3;i++){
    const cy=panelY+(usesValidatedGeometry?76:70)+i*(usesValidatedGeometry?110:103);if(i>0){ctx.strokeStyle=theme.panelRule;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(panelX+36,cy-52);ctx.lineTo(panelX+panelW-36,cy-52);ctx.stroke();}
    ctx.strokeStyle=theme.panelRule;ctx.beginPath();ctx.moveTo(panelX+182,cy-40);ctx.lineTo(panelX+182,cy+38);ctx.stroke();
    const icon=summaryIcon(lines[i],i,scene);panelIcon(icon,panelX+98,cy-3,usesValidatedGeometry?84:76,theme.panelInk,theme.accent);
    if(lines[i])wrapText(lines[i],panelX+225,cy+7,panelW-270,usesValidatedGeometry?39:36,usesValidatedGeometry?30:27,430,theme.panelInk,"left",2);
  }
  text("Ici, aujourd’hui.",540,1330,23,380,theme.ink,"center");
}

document.getElementById('previewScene').addEventListener('change',async function(e){
  previewScene=e.target.value||"AUTO";
  await draw();
});
document.getElementById('refresh').addEventListener('click',async function(){try{const r=await fetch('/api/latest?city=tarnos',{cache:'no-store'});forecast=await r.json();await draw();}catch(e){console.error(e);}});
document.getElementById('download').addEventListener('click',function(){const a=document.createElement('a');a.download='loka-'+(forecast&&forecast.date?forecast.date:'meteo')+'.png';a.href=canvas.toDataURL('image/png');a.click();});
draw();
</script>
</body>
</html>`;
}
