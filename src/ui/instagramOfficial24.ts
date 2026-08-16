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
  const payload = JSON.stringify(p).replace(/</g, "\\u003c");
  const cfg = JSON.stringify({ timezone, solar }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Studio Instagram</title><style>
:root{--ink:#171715;--muted:#73716c;--paper:#ecebe7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))}.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:12px;font-weight:760;letter-spacing:.16em}.badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#24653a;background:#e8f3ea;padding:6px 8px;border-radius:999px}h1{font-size:23px;line-height:1.08;margin:14px 0 5px}.muted{font-size:12px;line-height:1.5;color:var(--muted)}.actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}button,a{border:0;border-radius:14px;padding:14px 10px;text-decoration:none;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.primary{background:#171715;color:#fff}.secondary{background:#f1f1ee;color:#171715}.canvas-wrap{background:#d8d8d4;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}canvas{display:block;width:100%;height:auto}.note{text-align:center;font-size:11px;color:#8d8983;line-height:1.45;padding:12px 12px 0}@media(max-width:420px){.actions{grid-template-columns:1fr}}
</style></head><body><div class="wrap"><div class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">Météo officielle · V24</div></div><h1>Visuel Instagram</h1><div class="muted" id="summary">Tarnos · visuel du jour</div><div class="actions"><button class="primary" id="share">Partager / enregistrer</button><a class="secondary" href="/admin">Retour</a></div></div><div class="canvas-wrap"><canvas id="post" width="1080" height="1920"></canvas></div><div class="note">Le visuel suit uniquement la météo officielle effectivement publiée par LOKA.</div></div><script>
const p=${payload};const cfg=${cfg};const solar=cfg.solar||{dawn:null,sunrise:null,solarNoon:null,sunset:null,dusk:null,daylightMinutes:null,daylightDeltaMinutes:null};const canvas=document.getElementById('post');const ctx=canvas.getContext('2d');const INK='#12264A';

function load(src){
  return new Promise((resolve,reject)=>{
    const i=new Image();
    i.onload=()=>resolve(i);
    i.onerror=reject;
    i.src=src;
  });
}
const CANVAS_FONT='"Helvetica Neue",Arial,sans-serif';

function normalizeText(value){
  return String(value??'')
    .normalize('NFC')
    .replace(/\\s+/g,' ')
    .trim();
}

function font(size,weight){
  ctx.font=String(weight)+' '+String(size)+'px '+CANVAS_FONT;
  if('fontKerning' in ctx){
    ctx.fontKerning='normal';
  }
}

function drawFullTextLine(label,x,y,color,align){
  ctx.fillStyle=color;
  ctx.strokeStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='alphabetic';
  ctx.lineJoin='round';
  ctx.miterLimit=2;

  // A very small same-colour stroke protects thin glyphs on iOS Canvas
  // exports without visually changing the typography.
  ctx.lineWidth=0.42;
  ctx.strokeText(label,x,y);
  ctx.fillText(label,x,y);
}

function text(value,x,y,size,weight,color,align='left'){
  const label=normalizeText(value);
  ctx.save();
  font(size,weight);
  drawFullTextLine(label,x,y,color,align);
  ctx.restore();
}
function fittedFontSize(value,maxWidth,maxSize,minSize,weight){
  const label=normalizeText(value);
  ctx.save();
  let size=maxSize;
  while(size>minSize){
    font(size,weight);
    if(ctx.measureText(label).width<=maxWidth) break;
    size-=1;
  }
  ctx.restore();
  return Math.max(minSize,size);
}
function fittedText(value,x,y,maxWidth,maxSize,minSize,weight,color,align='left'){
  const size=fittedFontSize(
    value,
    maxWidth,
    maxSize,
    minSize,
    weight
  );
  text(value,x,y,size,weight,color,align);
  return size;
}
function trackedText(value,x,y,size,weight,color,tracking,align='center'){
  const chars=normalizeText(value).split('');
  ctx.save();
  font(size,weight);
  const widths=chars.map(ch=>ctx.measureText(ch).width);
  const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking;
  let cursor=align==='center'?x-total/2:align==='right'?x-total:x;
  ctx.fillStyle=color;
  ctx.textBaseline='alphabetic';
  for(let i=0;i<chars.length;i++){
    ctx.fillText(chars[i],cursor,y);
    cursor+=widths[i]+tracking;
  }
  ctx.restore();
}

function assertTextIntegrity(){
  const regression=[
    'Journée douce et nuageuse.',
    'Nuages dominants · Éclaircies en soirée',
    'Risque de pluie présent sur certains créneaux.',
    'Aucun risque de pluie annoncé.'
  ];

  try{
    ctx.save();
    font(24,500);

    for(const source of regression){
      const expected=source.normalize('NFC');
      const normalized=normalizeText(source);

      if(normalized!==expected){
        console.warn(
          'LOKA text normalization mismatch',
          {source,normalized}
        );
        ctx.restore();
        return false;
      }

      const width=ctx.measureText(normalized).width;
      if(!Number.isFinite(width)||width<=0){
        console.warn(
          'LOKA text measurement unavailable',
          source
        );
        ctx.restore();
        return false;
      }
    }

    ctx.restore();
    return true;
  }catch(error){
    try{ctx.restore();}catch{}
    console.warn(
      'LOKA text integrity diagnostic failed',
      error
    );
    return false;
  }
}
function wrap(value,x,y,maxWidth,lineHeight,size,weight,color,align='left',maxLines=2){
  ctx.save();
  font(size,weight);
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='alphabetic';
  const words=normalizeText(value).split(/\\s+/).filter(Boolean);
  let line='',yy=y,count=0;
  for(const word of words){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width>maxWidth&&line){
      drawFullTextLine(line,x,yy,color,align);
      count++;
      if(count>=maxLines){ctx.restore();return;}
      line=word;
      yy+=lineHeight;
    }else line=next;
  }
  if(line&&count<maxLines)drawFullTextLine(line,x,yy,color,align);
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
function drawMaster(img){
  const cw=1080,ch=1920;
  const iw=Math.max(1,img.naturalWidth||img.width||cw);
  const ih=Math.max(1,img.naturalHeight||img.height||ch);
  const scale=Math.max(cw/iw,ch/ih);
  const dw=iw*scale;
  const dh=ih*scale;
  const dx=(cw-dw)/2;
  const dy=(ch-dh)/2;
  ctx.drawImage(img,dx,dy,dw,dh);
}

function box(x,y,w,h){
  ctx.save();

  rr(x,y,w,h,36);

  // Slightly stronger than 12.16.8, while the master remains clearly visible.
  const g=ctx.createLinearGradient(
    x,
    y,
    x,
    y+h
  );
  g.addColorStop(
    0,
    'rgba(255,255,255,0.15)'
  );
  g.addColorStop(
    0.48,
    'rgba(255,255,255,0.12)'
  );
  g.addColorStop(
    1,
    'rgba(255,255,255,0.095)'
  );

  ctx.fillStyle=g;
  ctx.fill();

  ctx.strokeStyle=
    'rgba(255,255,255,0.82)';
  ctx.lineWidth=1.45;
  ctx.stroke();

  // Very subtle internal highlight; no blur and no shadow.
  ctx.save();
  rr(
    x+2,
    y+2,
    w-4,
    (h-4)*0.43,
    34
  );
  ctx.clip();

  const sheen=
    ctx.createLinearGradient(
      x,
      y,
      x,
      y+h*0.48
    );

  sheen.addColorStop(
    0,
    'rgba(255,255,255,0.16)'
  );
  sheen.addColorStop(
    1,
    'rgba(255,255,255,0.018)'
  );

  ctx.fillStyle=sheen;
  ctx.fillRect(
    x+2,
    y+2,
    w-4,
    h*0.48
  );

  ctx.restore();
  ctx.restore();
}
function separator(x1,y1,x2,y2){
  ctx.save();
  ctx.strokeStyle='rgba(18,38,74,0.13)';
  ctx.lineWidth=1.05;
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
  ctx.lineWidth=2.55/scale;
  ctx.lineCap='round';
  ctx.lineJoin='round';

  // Single crescent silhouette: one continuous vector path, no stars.
  ctx.beginPath();
  ctx.moveTo(7,-22);
  ctx.bezierCurveTo(
    -7,-16,
    -13,-2,
    -8,12
  );
  ctx.bezierCurveTo(
    -3,27,
    14,30,
    25,18
  );
  ctx.bezierCurveTo(
    13,20,
    3,13,
    1,3
  );
  ctx.bezierCurveTo(
    -1,-7,
    1,-16,
    7,-22
  );
  ctx.stroke();
  ctx.restore();
}
function drawPartly(x,y,scale,color){
  drawSun(
    x-13*scale,
    y-12*scale,
    scale*0.66,
    color
  );
  drawCloud(
    x+7*scale,
    y+4*scale,
    scale*0.84,
    color
  );
}
function drawNightCloud(x,y,scale,color){
  // Moon sits clearly above-right behind the cloud, matching the LOKA family.
  drawMoon(
    x+22*scale,
    y-21*scale,
    scale*0.58,
    color
  );
  drawCloud(
    x-5*scale,
    y+7*scale,
    scale*0.80,
    color
  );
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
  const h=Number(hour);
  const earlyNight=h<6;
  const lateNight=h>=21;

  if(c.includes('orage')) return 'thunder';
  if(c.includes('pluie')||c.includes('averse')) return 'rain';
  if(c.includes('vent')) return 'wind';
  if(c.includes('brouillard')||c.includes('brume')) return 'fog';

  // Explicit night wording always wins.
  if(c.includes('nuit')||c.includes('lune')){
    return c.includes('nuage')?'night-cloud':'moon';
  }

  // "Peu nuageux" is a mixed sky, not a plain cloud.
  if(c.includes('peu nuageux')){
    return (earlyNight||lateNight)?'night-cloud':'partly';
  }

  if(
    c.includes('éclair')||
    c.includes('eclair')||
    c.includes('variable')
  ){
    return (earlyNight||lateNight)?'night-cloud':'partly';
  }

  // A genuinely clear 04h is nocturnal.
  if(
    c.includes('soleil')||
    c.includes('ensoleillé')||
    c.includes('ensoleille')||
    c.includes('clair')
  ){
    return (earlyNight||lateNight)?'moon':'sun';
  }

  // Approved reference: a fully cloudy 04h remains a simple cloud.
  // At 22h, cloudy conditions use the nocturnal cloud/moon family.
  return lateNight?'night-cloud':'cloud';
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
  ctx.lineWidth=2.45/scale;
  ctx.lineCap='round';
  ctx.lineJoin='round';

  const horizon=17;
  const horizonHalf=31;

  ctx.beginPath();
  ctx.moveTo(-horizonHalf,horizon);
  ctx.lineTo(horizonHalf,horizon);
  ctx.stroke();

  function ray(x1,y1,x2,y2){
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }

  if(kind==='noon'){
    const cy=-4;
    const r=14;

    ctx.beginPath();
    ctx.arc(0,cy,r,0,Math.PI*2);
    ctx.stroke();

    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      ray(
        Math.cos(a)*22,
        cy+Math.sin(a)*22,
        Math.cos(a)*31,
        cy+Math.sin(a)*31
      );
    }

    ctx.restore();
    return;
  }

  let cy=10;
  let radius=15;
  let rayHeight=10;
  let rayXs=[-20,-7,7,20];

  if(kind==='dawn'){
    // First light: tiny upper arc and three fine rays.
    cy=21;
    radius=12;
    rayHeight=8;
    rayXs=[-13,0,13];
  }else if(kind==='sunrise'){
    // Half-emerged above the horizon.
    cy=10;
    radius=15;
    rayHeight=11;
    rayXs=[-21,-8,8,21];
  }else if(kind==='sunset'){
    // Same optical size as sunrise, but calmer rays.
    cy=11;
    radius=15;
    rayHeight=8;
    rayXs=[-19,-6,6,19];
  }else if(kind==='dusk'){
    // Last light: lower/smaller arc, only two very discreet side rays.
    cy=23;
    radius=10;
    rayHeight=4;
    rayXs=[-11,11];
  }

  ctx.beginPath();
  ctx.arc(
    0,
    cy,
    radius,
    Math.PI,
    0
  );
  ctx.stroke();

  for(const dx of rayXs){
    const innerY=cy-radius-5;
    ray(
      dx,
      innerY,
      dx,
      innerY-rayHeight
    );
  }

  ctx.restore();
}
function pickHourlySlots(source){
  const wanted=[4,6,8,10,12,14,16,18,20,22];
  const pool=Array.isArray(source)?source:[];
  return wanted.map(hour=>{
    const exact=pool.find(item=>Number(item.hour)===hour);
    return exact
      ? {...exact,hour}
      : {hour,temperatureC:'—',condition:'',precipitationMm:0,missing:true};
  });
}
function commentLines(hourly,summary,mainVerdict,rainVerdict,notableEvent){
  const clean=(value)=>String(value||'').replace(/\\s+/g,' ').trim();
  const isTemp=(value)=>/temp[ée]rature|compris|entre\\s+\\d+|\\d+\\s*°/i.test(clean(value));
  const isSkyNarrative=(value)=>/ciel|soleil|nuage|couvert|éclair|eclair|variable/i.test(clean(value));
  const sentenceParts=(value)=>clean(value)
    .split(/(?<=[.!?])\\s+/)
    .map(clean)
    .filter(Boolean);

  const useful=(Array.isArray(summary)?summary:[])
    .map(clean)
    .filter(Boolean)
    .filter(line=>!isTemp(line));

  const items=(Array.isArray(hourly)?hourly:[]).filter(x=>!x.missing);
  const cloudy=items.filter(x=>/nuage|couvert/i.test(String(x.condition||''))).length;
  const rain=items.filter(x=>/pluie|averse|orage/i.test(String(x.condition||''))).length;
  const brightEvening=items.filter(x=>Number(x.hour)>=16&&/soleil|éclair|eclair|clair/i.test(String(x.condition||''))).length;
  const bright=items.filter(x=>/soleil|éclair|eclair|clair/i.test(String(x.condition||''))).length;
  const wetAmount=items.reduce((sum,x)=>sum+Math.max(0,Number(x.precipitationMm)||0),0);

  let primary='';
  if(cloudy>=5&&brightEvening>=1) primary='Nuages dominants · Éclaircies en soirée';
  else if(rain>=4) primary='Passages pluvieux dominants sur la journée';
  else if(cloudy>=6) primary='Nuages dominants sur la journée';
  else if(bright>=6) primary='Éclaircies dominantes au fil de la journée';
  else primary=useful[0]||clean(mainVerdict)||'Conditions météo stables sur la journée';

  // Prefer a genuinely useful operational message (wind/rain/fog/heat/etc.)
  // over another sentence that merely repeats the sky state.
  const expandedRain=sentenceParts(rainVerdict);
  const candidates=[
    clean(notableEvent),
    ...useful,
    ...expandedRain
  ]
    .filter(Boolean)
    .filter(line=>!isTemp(line))
    .filter(line=>line!==primary);

  const operational=candidates.find(line=>!isSkyNarrative(line));

  let secondary=operational||'';

  // Guaranteed second line for calm days, derived only from displayed
  // precipitation evidence. This avoids a blank official comment box.
  if(!secondary){
    if(rain>0||wetAmount>=0.2){
      secondary='Risque de pluie présent sur certains créneaux.';
    }else{
      secondary='Aucun risque de pluie annoncé.';
    }
  }

  return [primary,secondary];
}
function drawHeader(city,date,ink){
  text('LOKA!',50,124,62,400,ink);
  trackedText(String(city||'Tarnos').toUpperCase(),540,114,22,680,ink,8,'center');
  text(dateLabel(date),1030,114,19,540,ink,'right');
}
function drawGeneralBox(opts){
  const x=44,y=244,w=992,h=250;
  box(x,y,w,h);

  const titleSize=fittedFontSize(
    opts.title,
    455,
    66,
    30,
    800
  );

  const iconScale=
    titleSize<42
      ? 0.94
      : 1.18;

  drawWeatherIcon(
    sceneIconKind(opts.title),
    178,
    368,
    iconScale,
    INK
  );

  fittedText(
    opts.title,
    302,
    374,
    455,
    66,
    30,
    800,
    INK
  );

  const subtitle=
    normalizeText(opts.subtitle);

  const subtitleSize=
    fittedFontSize(
      subtitle,
      535,
      23,
      18,
      500
    );

  ctx.save();
  font(
    subtitleSize,
    500
  );
  const subtitleWidth=
    ctx.measureText(subtitle).width;
  ctx.restore();

  if(
    subtitleWidth<=535
  ){
    text(
      subtitle,
      302,
      423,
      subtitleSize,
      500,
      rgba(INK,0.97),
      'left'
    );
  }else{
    ctx.restore();
    wrap(
      subtitle,
      302,
      411,
      535,
      28,
      18,
      500,
      rgba(INK,0.97),
      'left',
      2
    );
  }

  text(
    String(opts.min)+
    '° — '+
    String(opts.max)+
    '°',
    976,
    407,
    49,
    600,
    INK,
    'right'
  );
}
function drawHourlyBox(items){
  const x=44,y=540,w=992,h=704;
  box(x,y,w,h);
  const colW=w/5;
  const rowTop=[568,914];
  const rowBottom=[892,1218];

  separator(x+20,906,x+w-20,906);
  for(let row=0;row<2;row++){
    for(let i=1;i<5;i++){
      const sx=x+colW*i;
      separator(sx,rowTop[row]+18,sx,rowBottom[row]-18);
    }
    for(let c=0;c<5;c++){
      const item=items[row*5+c];
      if(!item) continue;
      const cx=x+colW*(c+0.5);
      const base=rowTop[row];
      text(String(item.hour).padStart(2,'0')+'h',cx,base+52,24,600,INK,'center');
      if(!item.missing){
        drawWeatherIcon(conditionToIcon(item.condition,item.hour),cx,base+133,0.60,INK);
      }
      text(String(item.temperatureC)+(item.missing?'':'°'),cx,base+238,42,700,INK,'center');
    }
  }
}
function drawCommentBox(mainLine,secondaryLine){
  const x=44,y=1283,w=992,h=172;
  box(x,y,w,h);

  const main=normalizeText(mainLine);
  const secondary=normalizeText(secondaryLine);

  const mainSize=fittedFontSize(
    main,
    900,
    30,
    24,
    600
  );

  ctx.save();
  font(mainSize,600);
  const mainWidth=ctx.measureText(main).width;
  ctx.restore();

  if(
    mainWidth<=900
  ){
    text(
      main,
      540,
      1366,
      mainSize,
      600,
      INK,
      'center'
    );
  }else{
    wrap(
      main,
      540,
      1352,
      900,
      33,
      24,
      600,
      INK,
      'center',
      2
    );
  }

  if(secondary){
    const secondarySize=
      fittedFontSize(
        secondary,
        890,
        20,
        17,
        500
      );

    ctx.save();
    font(secondarySize,500);
    const secondaryWidth=ctx.measureText(secondary).width;
    ctx.restore();

    if(
      secondaryWidth<=890
    ){
      text(
        secondary,
        540,
        1418,
        secondarySize,
        500,
        rgba(INK,0.96),
        'center'
      );
    }else{
      wrap(
        secondary,
        540,
        1408,
        890,
        27,
        17,
        500,
        rgba(INK,0.96),
        'center',
        2
      );
    }
  }
}
function drawSolarBox(solar){
  const x=44,y=1499,w=992,h=279;
  box(x,y,w,h);
  const colW=w/5;
  for(let i=1;i<5;i++) separator(x+colW*i,y+28,x+colW*i,y+h-28);
  const defs=[
    ['AUBE','dawn',solar.dawn],
    ['LEVER','sunrise',solar.sunrise],
    ['MIDI SOLAIRE','noon',solar.solarNoon],
    ['COUCHER','sunset',solar.sunset],
    ['CRÉPUSCULE','dusk',solar.dusk]
  ];
  defs.forEach((def,i)=>{
    const cx=x+colW*(i+0.5);
    text(def[0],cx,1566,15,700,INK,'center');
    drawSolarIcon(def[1],cx,1656,0.86,INK);
    text(def[2]||'—',cx,1736,29,600,INK,'center');
  });
}
function drawSignature(){
  text('Ici, aujourd’hui.',540,1854,19,500,INK,'center');
  ctx.save();
  ctx.strokeStyle=rgba(INK,0.72);
  ctx.lineWidth=1.2;
  ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(514,1878);
  ctx.lineTo(566,1878);
  ctx.stroke();
  ctx.restore();
}

async function draw(){
  window.__LOKA_RENDER_STATUS={
    started:true,
    textIntegrity:assertTextIntegrity(),
    rendered:false,
    error:null
  };

  ctx.clearRect(0,0,1080,1920);
  const bg=await load(p.scene.masterUrl);
  drawMaster(bg);
  drawHeader(p.city,p.date,INK);
  drawGeneralBox({title:p.scene.label,subtitle:p.editorial?.mainVerdict||p.editorial?.subtitle||'',min:p.temperatures?.minC,max:p.temperatures?.maxC});
  const slots=pickHourlySlots(p.hourly);
  drawHourlyBox(slots);
  const lines=commentLines(slots,p.editorial?.summaryLines,p.editorial?.mainVerdict,p.editorial?.rainVerdict,p.editorial?.notableEvent);
  const mainLine=lines[0]||p.editorial?.mainVerdict||'';
  const secondaryLine=lines[1]||'';
  drawCommentBox(mainLine,secondaryLine);
  drawSolarBox(solar);
  drawSignature();
  window.__LOKA_RENDER_STATUS.rendered=true;

  document.getElementById('summary').textContent=String(p.city||'Tarnos')+' · '+String(p.scene.label||'')+' · '+String(p.temperatures?.minC??'—')+'° — '+String(p.temperatures?.maxC??'—')+'°';
}
function pngFile(){
  const b=atob(canvas.toDataURL('image/png').split(',')[1]);
  const u=new Uint8Array(b.length);
  for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  return new File([u],'loka-'+String(p.date||'meteo')+'.png',{type:'image/png'});
}
function fallbackDownload(file){
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
document.getElementById('share').onclick=()=>{
  const file=pngFile();
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){navigator.share({files:[file],title:'LOKA!'}).catch(error=>{if(error?.name!=='AbortError')fallbackDownload(file);});return;}
  fallbackDownload(file);
};
draw().catch((error)=>{
  console.error('LOKA Instagram render failed',error);
  window.__LOKA_RENDER_STATUS={
    ...(window.__LOKA_RENDER_STATUS||{}),
    rendered:false,
    error:String(error&&error.message?error.message:error)
  };
});
</script></body></html>`;
}
