import type { LokaForecast } from "../types";
import { SCENE24_MASTERS } from "./backgrounds24";

export function renderInstagram24(
  forecast: LokaForecast | null,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const initial = JSON.stringify(forecast ?? null).replace(/</g, "\\u003c");
  const config = JSON.stringify({ latitude, longitude, timezone }).replace(/</g, "\\u003c");
  const masters = JSON.stringify(SCENE24_MASTERS).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LOKA! — Studio V24 Shadow</title>
<style>
:root{color-scheme:light;--ink:#17212b}
*{box-sizing:border-box}
body{margin:0;background:#ecebe7;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;padding:max(16px,env(safe-area-inset-top)) 12px max(24px,env(safe-area-inset-bottom))}
.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px;box-shadow:0 12px 36px rgba(0,0,0,.07)}
h1{font-size:22px;margin:0 0 6px}.status{font-size:13px;color:#6f7478;line-height:1.45;margin:0 0 14px}.badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#fff1cc;color:#76530a;font-size:11px;font-weight:700;margin-bottom:10px}
label{display:block;font-size:12px;font-weight:650;margin:0 0 6px;color:#555}select{width:100%;border:1px solid #deded9;background:#f8f8f5;border-radius:12px;padding:12px 13px;font:600 14px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;color:#171715}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}button,a.btn{appearance:none;border:0;border-radius:14px;padding:14px 12px;font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;text-align:center;text-decoration:none}
.primary{background:#171715;color:#fff}.secondary{background:#f1f1ee;color:#171715}.canvas-wrap{background:#ddd;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.15)}
canvas{display:block;width:100%;height:auto}.note{font-size:12px;color:#6f7478;line-height:1.5;padding:12px 4px 0}.debug{margin-top:12px;background:#fff;border-radius:18px;padding:14px;font-size:12px;line-height:1.5;color:#555}
</style>
</head>
<body><div class="wrap">
<div class="toolbar">
<div class="badge">SHADOW — NON PUBLIÉ</div>
<h1>Studio Instagram LOKA! — V24</h1>
<p class="status" id="status">Chargement de la décision V24…</p>
<label for="scene">Prévisualiser un master officiel</label>
<select id="scene"><option value="AUTO">AUTO V24 — scène shadow du jour</option></select>
<div class="actions"><button class="secondary" id="refresh">Actualiser</button><button class="primary" id="download">Partager / enregistrer</button></div>
<div class="actions"><a class="btn secondary" href="/instagram">Retour Studio Legacy</a><a class="btn secondary" href="/admin">Admin</a></div>
</div>
<div class="canvas-wrap"><canvas id="post" width="1080" height="1350"></canvas></div>
<div class="note">AUTO V24 lit uniquement <code>diagnostics.scene24.sceneId</code>. Cette page ne modifie jamais <code>forecast.scene</code> ni le Studio Legacy.</div>
<div class="debug" id="debug"></div>
</div>
<script>
const initialForecast=${initial};
const cityConfig=${config};
const masters=${masters};
const byId=Object.fromEntries(masters.map(m=>[m.id,m]));
let forecast=initialForecast,preview="AUTO";
const canvas=document.getElementById("post"),ctx=canvas.getContext("2d"),cache={};
const select=document.getElementById("scene"),status=document.getElementById("status"),debug=document.getElementById("debug");
masters.forEach(m=>{const o=document.createElement("option");o.value=String(m.id);o.textContent=String(m.id).padStart(2,"0")+" — "+m.label;select.appendChild(o);});

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function shadowDecision(){return forecast&&forecast.diagnostics&&forecast.diagnostics.scene24&&typeof forecast.diagnostics.scene24==="object"?forecast.diagnostics.scene24:null}
function autoId(){const d=shadowDecision();const n=Number(d&&d.sceneId);return Number.isInteger(n)&&n>=1&&n<=24?n:null}
function chosenId(){return preview==="AUTO"?autoId():Number(preview)}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
function setFont(size,weight){ctx.font=String(weight)+" "+String(size)+'px -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif'}
function text(txt,x,y,size,weight,color,align="left"){ctx.save();setFont(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="alphabetic";ctx.fillText(String(txt),x,y);ctx.restore()}
function wrap(txt,x,y,maxWidth,lineHeight,size,weight,color,align="left",maxLines=2){ctx.save();setFont(size,weight);ctx.fillStyle=color;ctx.textAlign=align;const words=String(txt||"").split(/\\s+/);let line="",yy=y,count=0;for(const word of words){const t=line?line+" "+word:word;if(ctx.measureText(t).width>maxWidth&&line){ctx.fillText(line,x,yy);count++;if(count>=maxLines){ctx.restore();return}line=word;yy+=lineHeight}else line=t}if(line&&count<maxLines)ctx.fillText(line,x,yy);ctx.restore()}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function formatDate(date){try{return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric",timeZone:cityConfig.timezone}).format(new Date(date+"T12:00:00")).replace(".","").toLocaleUpperCase("fr-FR")}catch{return date||""}}
function conditionIcon(c){c=String(c||"").toLowerCase();if(c.includes("orage"))return"ϟ";if(c.includes("pluie")||c.includes("averse"))return"☂";if(c.includes("soleil"))return"☀";if(c.includes("vent"))return"≋";return"☁"}
function contrastFor(id){return [10,12,13,20,22,24].includes(id)?"#fff":"#17212b"}
async function draw(){
 const id=chosenId(),master=id?byId[id]:null;
 if(!forecast){ctx.fillStyle="#eee";ctx.fillRect(0,0,1080,1350);text("Aucune prévision enregistrée",540,675,34,600,"#333","center");status.textContent="Aucune prévision.";return}
 if(!master){ctx.fillStyle="#eee";ctx.fillRect(0,0,1080,1350);text("Aucune décision V24 disponible",540,650,34,650,"#333","center");wrap("Lance une nouvelle génération depuis /admin après le Bloc 5.",540,710,850,42,28,430,"#666","center",2);status.textContent="V24 indisponible sur cette génération.";debug.innerHTML="scene24Error : "+esc(forecast?.diagnostics?.scene24Error||"aucune décision enregistrée");return}
 if(!cache[id])cache[id]=await loadImage(master.url);
 ctx.clearRect(0,0,1080,1350);ctx.drawImage(cache[id],0,0,1080,1350);
 const ink=contrastFor(id),panelInk="#17212b";
 const shade=ctx.createLinearGradient(0,0,0,430);shade.addColorStop(0,ink==="#fff"?"rgba(0,0,0,.26)":"rgba(255,255,255,.25)");shade.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=shade;ctx.fillRect(0,0,1080,460);
 text("LOKA!",45,80,52,350,ink);text(String(forecast.city||"Tarnos").toLocaleUpperCase("fr-FR"),540,72,25,500,ink,"center");text(formatDate(forecast.date),1030,72,23,450,ink,"right");
 text(master.label,540,205,72,760,ink,"center");wrap(forecast.subtitle||forecast.mainVerdict||"",540,285,860,40,32,430,ink,"center",2);
 const hours=(forecast.hourly||[]).slice(0,6),xs=[145,310,470,630,790,950];
 hours.forEach((h,i)=>{text(String(h.hour).padStart(2,"0")+"h",xs[i],390,30,470,ink,"center");text(conditionIcon(h.condition),xs[i],485,68,400,ink,"center");text(String(h.temperatureC)+"°",xs[i],610,54,650,ink,"center")});
 const lines=["Températures comprises entre "+forecast.tempMinC+" et "+forecast.tempMaxC+" degrés."].concat((forecast.summaryLines||[]).filter(x=>x&&!String(x).toLowerCase().includes("températures comprises"))).slice(0,3);
 ctx.save();ctx.fillStyle="rgba(255,255,255,.84)";ctx.shadowColor="rgba(0,0,0,.10)";ctx.shadowBlur=18;roundRect(62,950,956,330,30);ctx.fill();ctx.restore();
 lines.forEach((line,i)=>{const y=1025+i*100;if(i){ctx.strokeStyle="rgba(23,33,43,.14)";ctx.beginPath();ctx.moveTo(95,y-50);ctx.lineTo(985,y-50);ctx.stroke()}wrap(line,120,y+10,840,36,28,430,panelInk,"left",2)});
 text("Ici, aujourd’hui.",540,1330,23,380,ink,"center");
 const d=shadowDecision();
 status.textContent=(preview==="AUTO"?"AUTO V24 : ":"Prévisualisation : ")+String(id).padStart(2,"0")+" "+master.label;
 debug.innerHTML="<strong>Décision shadow</strong> — score "+esc(d?.score??"—")+" · confiance "+esc(d?.confidence??"—")+" · runner-up "+esc(d?.runnerUp?String(d.runnerUp.sceneId).padStart(2,"0")+" / "+d.runnerUp.score:"—")+"<br><strong>Master</strong> — "+esc(master.file)+" · SHA-256 "+esc(master.sha256);
}
select.addEventListener("change",async e=>{preview=e.target.value||"AUTO";await draw()});
document.getElementById("refresh").addEventListener("click",async()=>{try{const r=await fetch("/api/latest?city=tarnos",{cache:"no-store"});forecast=await r.json();await draw()}catch(e){status.textContent=String(e)}});
function pngFile(){const data=canvas.toDataURL("image/png"),parts=data.split(","),bin=atob(parts[1]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new File([bytes],"loka-v24-"+(forecast?.date||"meteo")+".png",{type:"image/png",lastModified:Date.now()})}
function fallback(file){const u=URL.createObjectURL(file),a=document.createElement("a");a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
document.getElementById("download").addEventListener("click",()=>{try{const file=pngFile();if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){navigator.share({files:[file],title:"LOKA! — V24 shadow"}).catch(e=>{if(e?.name!=="AbortError")fallback(file)});return}fallback(file)}catch(e){console.error(e)}});
draw();
</script></body></html>`;
}
