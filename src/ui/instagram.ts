import type { LokaForecast } from "../types";

/**
 * LOKA V0.5.1 — générateur manuel Instagram.
 *
 * Important : le script navigateur inclus ci-dessous n'utilise PAS de
 * template literals JavaScript (`...`) afin d'éviter de casser la template
 * string TypeScript qui encapsule toute la page HTML.
 */
export function renderInstagramGenerator(
  forecast: LokaForecast | null,
  latitude: number,
  longitude: number,
  timezone: string
): string {
  const initial = JSON.stringify(forecast ?? null).replace(/</g, "\\u003c");
  const config = JSON.stringify({ latitude, longitude, timezone }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>LOKA! — Visuel Instagram</title>
<style>
:root{color-scheme:light;--ink:#1d2731;--paper:#f2f0eb}
*{box-sizing:border-box}
body{margin:0;background:#ecebe7;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif;padding:max(16px,env(safe-area-inset-top)) 12px max(22px,env(safe-area-inset-bottom))}
.wrap{width:min(100%,560px);margin:auto}
.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px;box-shadow:0 12px 36px rgba(0,0,0,.06)}
.toolbar h1{font-size:22px;margin:0 0 6px}.toolbar p{font-size:13px;color:#777;margin:0 0 14px;line-height:1.45}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{appearance:none;border:0;border-radius:14px;padding:14px 12px;font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif;text-align:center}
button.primary{background:#171715;color:#fff}button.secondary{background:#f1f1ee;color:#171715}
.canvas-wrap{background:#ddd;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}
canvas{display:block;width:100%;height:auto}
.note{font-size:12px;color:#777;line-height:1.5;padding:12px 4px 0}
</style>
</head>
<body>
<div class="wrap">
  <div class="toolbar">
    <h1>Visuel Instagram LOKA!</h1>
    <p>Format 1080 × 1350. Le bouton génère un PNG à partir de la dernière prévision enregistrée.</p>
    <div class="actions">
      <button class="secondary" id="refresh">Actualiser</button>
      <button class="primary" id="download">Télécharger le PNG</button>
    </div>
  </div>
  <div class="canvas-wrap"><canvas id="post" width="1080" height="1350"></canvas></div>
  <div class="note">Publication manuelle : vérifie le visuel, télécharge le PNG, puis publie-le toi-même sur Instagram.</div>
</div>

<script>
const initialForecast=${initial};
const cityConfig=${config};
let forecast=initialForecast;

const canvas=document.getElementById('post');
const ctx=canvas.getContext('2d');

const palettes={
  "SOLEIL":{top:"#f6e6c6",mid:"#f1d4a2",bottom:"#ead8bb",ink:"#1d2731",accent:"#d59c21",light:true},
  "NUAGES":{top:"#d9dde0",mid:"#c5ccd0",bottom:"#d5d8d8",ink:"#1d2731",accent:"#5f6b76",light:true},
  "PLUIE":{top:"#8095a8",mid:"#506c83",bottom:"#506a7e",ink:"#f7f8f8",accent:"#48b8ec",light:false},
  "ORAGES":{top:"#273142",mid:"#151c2b",bottom:"#222a42",ink:"#f8f8fa",accent:"#a176e8",light:false},
  "VENT FORT":{top:"#b7d7e6",mid:"#8bbbd3",bottom:"#a9cbd8",ink:"#182735",accent:"#167ab5",light:true},
  "INSTABLE":{top:"#e7b678",mid:"#8b8291",bottom:"#474d68",ink:"#fffaf3",accent:"#d49a26",light:false}
};

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function fillGradient(scene){
  const p=palettes[scene]||palettes["INSTABLE"];
  const g=ctx.createLinearGradient(0,0,0,1350);
  g.addColorStop(0,p.top);
  g.addColorStop(.62,p.mid);
  g.addColorStop(1,p.bottom);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,1080,1350);

  ctx.save();
  if(scene==="SOLEIL"){
    const rg=ctx.createRadialGradient(155,620,20,155,620,360);
    rg.addColorStop(0,"rgba(255,244,189,.9)");
    rg.addColorStop(1,"rgba(255,240,180,0)");
    ctx.fillStyle=rg;
    ctx.fillRect(0,250,650,650);
  }
  if(scene==="NUAGES"){
    for(let i=0;i<8;i++){
      ctx.fillStyle="rgba(255,255,255,"+(0.05+i*.006)+")";
      ctx.beginPath();
      ctx.ellipse(170+i*125,320+(i%2)*55,220,72,0,0,Math.PI*2);
      ctx.fill();
    }
  }
  if(scene==="PLUIE"){
    ctx.strokeStyle="rgba(220,238,249,.13)";
    ctx.lineWidth=2;
    for(let x=-100;x<1180;x+=34){
      ctx.beginPath();
      ctx.moveTo(x,50);
      ctx.lineTo(x-115,540);
      ctx.stroke();
    }
  }
  if(scene==="ORAGES"){
    const rg=ctx.createRadialGradient(820,210,0,820,210,380);
    rg.addColorStop(0,"rgba(170,140,235,.28)");
    rg.addColorStop(1,"rgba(80,60,140,0)");
    ctx.fillStyle=rg;
    ctx.fillRect(420,0,660,620);
  }
  if(scene==="VENT FORT"){
    ctx.strokeStyle="rgba(255,255,255,.22)";
    ctx.lineWidth=2;
    for(let y=180;y<620;y+=66){
      ctx.beginPath();
      ctx.moveTo(610,y);
      ctx.bezierCurveTo(760,y-30,900,y+20,1060,y-10);
      ctx.stroke();
    }
  }
  if(scene==="INSTABLE"){
    const g2=ctx.createLinearGradient(0,0,1080,0);
    g2.addColorStop(0,"rgba(255,199,108,.32)");
    g2.addColorStop(.52,"rgba(255,199,108,.03)");
    g2.addColorStop(1,"rgba(24,30,55,.35)");
    ctx.fillStyle=g2;
    ctx.fillRect(0,0,1080,900);
  }
  ctx.restore();

  const hg=ctx.createLinearGradient(0,640,0,900);
  hg.addColorStop(0,"rgba(35,55,66,.08)");
  hg.addColorStop(1,"rgba(21,38,51,.24)");
  ctx.fillStyle=hg;
  ctx.fillRect(0,640,1080,260);

  ctx.fillStyle="rgba(255,255,255,.035)";
  ctx.beginPath();
  ctx.moveTo(0,735);
  ctx.quadraticCurveTo(300,690,540,730);
  ctx.quadraticCurveTo(820,770,1080,715);
  ctx.lineTo(1080,900);
  ctx.lineTo(0,900);
  ctx.closePath();
  ctx.fill();
}

function lineIcon(type,x,y,size,color){
  ctx.save();
  ctx.strokeStyle=color;
  ctx.fillStyle="transparent";
  ctx.lineWidth=Math.max(3,size*.055);
  ctx.lineCap="round";
  ctx.lineJoin="round";

  if(type==="sun"){
    ctx.beginPath();
    ctx.arc(x,y,size*.23,0,Math.PI*2);
    ctx.stroke();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      ctx.beginPath();
      ctx.moveTo(x+Math.cos(a)*size*.34,y+Math.sin(a)*size*.34);
      ctx.lineTo(x+Math.cos(a)*size*.48,y+Math.sin(a)*size*.48);
      ctx.stroke();
    }
  } else if(type==="cloud"){
    ctx.beginPath();
    ctx.moveTo(x-size*.38,y+size*.14);
    ctx.bezierCurveTo(x-size*.46,y-size*.05,x-size*.25,y-size*.22,x-size*.08,y-size*.13);
    ctx.bezierCurveTo(x,y-size*.37,x+.27*size,y-size*.35,x+.32*size,y-size*.14);
    ctx.bezierCurveTo(x+.48*size,y-size*.10,x+.53*size,y+size*.16,x+.34*size,y+size*.18);
    ctx.lineTo(x-size*.28,y+size*.18);
    ctx.stroke();
  } else if(type==="rain"){
    lineIcon("cloud",x,y-size*.08,size,color);
    for(let i=-1;i<=1;i++){
      ctx.beginPath();
      ctx.moveTo(x+i*size*.18,y+size*.20);
      ctx.lineTo(x+i*size*.18-size*.05,y+size*.38);
      ctx.stroke();
    }
  } else if(type==="storm"){
    lineIcon("cloud",x,y-size*.10,size,color);
    ctx.beginPath();
    ctx.moveTo(x+size*.02,y+size*.15);
    ctx.lineTo(x-size*.08,y+size*.34);
    ctx.lineTo(x+size*.04,y+size*.31);
    ctx.lineTo(x-size*.03,y+size*.50);
    ctx.stroke();
  } else if(type==="wind"){
    for(let i=-1;i<=1;i++){
      const yy=y+i*size*.18;
      ctx.beginPath();
      ctx.moveTo(x-size*.42,yy);
      ctx.bezierCurveTo(x-size*.12,yy,x+size*.05,yy-size*.12,x+size*.32,yy);
      ctx.stroke();
    }
  } else if(type==="partly"){
    lineIcon("sun",x-size*.15,y-size*.12,size*.72,color);
    lineIcon("cloud",x+size*.08,y+size*.06,size*.83,color);
  } else {
    lineIcon("cloud",x,y,size,color);
  }
  ctx.restore();
}

function conditionToIcon(condition){
  if(condition==="soleil")return "sun";
  if(condition==="peu nuageux"||condition==="variable")return "partly";
  if(condition==="pluie"||condition==="averse")return "rain";
  if(condition==="orage")return "storm";
  return "cloud";
}

function sceneIcon(scene){
  if(scene==="SOLEIL")return "sun";
  if(scene==="NUAGES")return "cloud";
  if(scene==="PLUIE")return "rain";
  if(scene==="ORAGES")return "storm";
  if(scene==="VENT FORT")return "wind";
  return "partly";
}

function solarTimes(date, lat, lon){
  const rad=Math.PI/180, deg=180/Math.PI;
  const d=new Date(date+"T12:00:00Z");
  const start=new Date(Date.UTC(d.getUTCFullYear(),0,0));
  const N=Math.floor((d-start)/86400000);

  function event(isRise, zenith){
    const lngHour=lon/15;
    const t=N+(((isRise?6:18)-lngHour)/24);
    const M=(0.9856*t)-3.289;
    let L=M+(1.916*Math.sin(M*rad))+(0.020*Math.sin(2*M*rad))+282.634;
    L=(L+360)%360;
    let RA=deg*Math.atan(0.91764*Math.tan(L*rad));
    RA=(RA+360)%360;
    const Lq=Math.floor(L/90)*90;
    const RAq=Math.floor(RA/90)*90;
    RA=(RA+(Lq-RAq))/15;
    const sinDec=0.39782*Math.sin(L*rad);
    const cosDec=Math.cos(Math.asin(sinDec));
    const cosH=(Math.cos(zenith*rad)-(sinDec*Math.sin(lat*rad)))/(cosDec*Math.cos(lat*rad));
    if(cosH>1||cosH<-1)return null;
    let H=isRise?360-deg*Math.acos(cosH):deg*Math.acos(cosH);
    H/=15;
    const T=H+RA-(0.06571*t)-6.622;
    let UT=T-lngHour;
    UT=(UT+24)%24;
    const hh=Math.floor(UT);
    const mm=Math.round((UT-hh)*60);
    const utc=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),hh,mm));
    return new Intl.DateTimeFormat("fr-FR",{
      timeZone:cityConfig.timezone,
      hour:"2-digit",
      minute:"2-digit"
    }).format(utc);
  }

  return {
    dawn:event(true,96),
    sunrise:event(true,90.833),
    sunset:event(false,90.833),
    dusk:event(false,96)
  };
}

function setFont(size,weight){
  ctx.font=String(weight)+" "+String(size)+'px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';
}

function text(txt,x,y,size,weight,color,align){
  ctx.save();
  setFont(size,weight);
  ctx.fillStyle=color;
  ctx.textAlign=align||"left";
  ctx.textBaseline="alphabetic";
  ctx.fillText(String(txt),x,y);
  ctx.restore();
}

function wrapText(txt,x,y,maxWidth,lineHeight,size,weight,color,align){
  ctx.save();
  setFont(size,weight);
  ctx.fillStyle=color;
  ctx.textAlign=align||"left";
  const words=String(txt).split(/\\s+/);
  let line="";
  let yy=y;

  for(const word of words){
    const test=line?line+" "+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){
      ctx.fillText(line,x,yy);
      line=word;
      yy+=lineHeight;
    } else {
      line=test;
    }
  }

  if(line)ctx.fillText(line,x,yy);
  ctx.restore();
  return yy;
}

function draw(){
  const f=forecast;

  if(!f){
    ctx.fillStyle="#f3f1ed";
    ctx.fillRect(0,0,1080,1350);
    text("LOKA!",70,110,52,500,"#222");
    text("Aucune prévision",540,650,50,500,"#555","center");
    return;
  }

  const scene=f.scene||"INSTABLE";
  const p=palettes[scene]||palettes["INSTABLE"];
  fillGradient(scene);
  const ink=p.ink;

  text("LOKA!",60,82,42,430,ink);
  text(String(f.city||"Tarnos").toUpperCase(),540,76,23,600,ink,"center");

  const dd=new Intl.DateTimeFormat("fr-FR",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  }).format(new Date(f.date+"T12:00:00"));

  text(dd.toUpperCase(),1010,76,20,500,ink,"right");

  text(scene,540,168,46,700,ink,"center");
  text(f.subtitle||f.mainVerdict||"",540,214,23,480,ink,"center");

  const xs=[145,300,455,610,765,920];
  const defaultHours=[7,9,12,15,18,21];
  const hours=f.hourly||[];

  for(let i=0;i<6;i++){
    const h=hours[i]||{
      hour:defaultHours[i],
      temperatureC:"",
      condition:"nuageux"
    };

    text(String(h.hour).padStart(2,"0")+"h",xs[i],295,21,500,ink,"center");
    lineIcon(conditionToIcon(h.condition),xs[i],365,74,p.accent);
    text(String(h.temperatureC)+"°",xs[i],465,35,550,ink,"center");
  }

  ctx.strokeStyle=p.light?"rgba(30,40,50,.45)":"rgba(255,255,255,.55)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(75,430);

  for(let i=0;i<xs.length;i++){
    const yy=427-(i===3?6:0)+(i>3?(i-3)*3:0);
    ctx.lineTo(xs[i],yy);
  }

  ctx.lineTo(1005,435);
  ctx.stroke();

  for(let i=0;i<xs.length;i++){
    const yy=427-(i===3?6:0)+(i>3?(i-3)*3:0);
    ctx.fillStyle=ink;
    ctx.beginPath();
    ctx.arc(xs[i],yy,4.5,0,Math.PI*2);
    ctx.fill();
  }

  const solar=solarTimes(f.date,cityConfig.latitude,cityConfig.longitude);
  const labels=[
    [solar.dawn||"--:--","AUBE",145],
    [solar.sunrise||"--:--","LEVER",300],
    [solar.sunset||"--:--","COUCHER",765],
    [solar.dusk||"--:--","CRÉPUSCULE",920]
  ];

  const sy=675;
  ctx.strokeStyle=p.light?"rgba(255,255,255,.80)":"rgba(255,255,255,.70)";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(120,sy);
  ctx.bezierCurveTo(330,600,705,600,950,sy);
  ctx.stroke();

  for(const entry of labels){
    const tm=entry[0], lab=entry[1], x=entry[2];
    ctx.fillStyle=p.accent;
    ctx.beginPath();
    ctx.arc(x,sy,5,0,Math.PI*2);
    ctx.fill();
    text(tm,x,615,18,600,ink,"center");
    text(lab,x,642,15,650,ink,"center");
  }

  const fade=ctx.createLinearGradient(0,720,0,850);
  fade.addColorStop(0,"rgba(255,255,255,0)");
  fade.addColorStop(1,p.light?"rgba(255,255,255,.38)":"rgba(17,24,39,.34)");
  ctx.fillStyle=fade;
  ctx.fillRect(0,700,1080,170);

  ctx.fillStyle=p.light?"rgba(255,255,255,.38)":"rgba(17,24,39,.34)";
  ctx.fillRect(0,850,1080,500);

  // Règle validée : un seul pictogramme dans la zone basse.
  lineIcon(sceneIcon(scene),122,995,118,p.accent);

  const lines=(f.summaryLines&&f.summaryLines.length
    ? f.summaryLines
    : [f.rainVerdict]).filter(Boolean);

  let yy=930;
  for(let i=0;i<Math.min(lines.length,3);i++){
    yy=wrapText(
      lines[i],
      235,
      yy,
      760,
      48,
      30,
      i===0?560:470,
      ink,
      "left"
    )+62;
  }

  text(
    "Ici, aujourd’hui.",
    540,
    1285,
    22,
    400,
    p.light?"rgba(29,39,49,.44)":"rgba(255,255,255,.48)",
    "center"
  );
}

async function reload(){
  const r=await fetch("/api/latest?city=tarnos",{cache:"no-store"});
  forecast=await r.json();
  draw();
}

document.getElementById("refresh").onclick=reload;

document.getElementById("download").onclick=function(){
  canvas.toBlob(function(blob){
    if(!blob)return;

    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="loka-"+(forecast&&forecast.citySlug?forecast.citySlug:"tarnos")+"-"+(forecast&&forecast.date?forecast.date:"meteo")+".png";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(function(){
      URL.revokeObjectURL(url);
    },1500);
  },"image/png");
};

draw();
</script>
</body>
</html>`;
}
