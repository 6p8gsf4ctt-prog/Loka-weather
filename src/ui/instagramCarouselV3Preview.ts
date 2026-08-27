import type { CityConfig, ContextualData, KeyMoment, KeyTakeaway, OfficialPublicPayloadV24 } from "../types";
import { scene24DisplayTitle } from "../engine/scenes24/displayTitles";
import { hourlyConditionToPictogram, weatherPictogramDataUrl } from "./pictogramLibrary";
import { solarPresentation } from "./solarTimes";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function hourLabel(hour: number | null): string {
  return hour === null ? "" : `${String(hour).padStart(2, "0")}h`;
}

function rangeLabel(start: number | null, end: number | null): string {
  if (start === null && end === null) return "";
  if (start !== null && end !== null && start !== end) return `${hourLabel(start)} → ${hourLabel(end)}`;
  return hourLabel(start ?? end);
}

function takeawayText(signal: KeyTakeaway): string {
  const range = rangeLabel(signal.startHour, signal.endHour);
  switch (signal.type) {
    case "THUNDER": return range ? `Risque orageux surtout ${range}.` : "Risque orageux à surveiller aujourd’hui.";
    case "RAIN_START": return signal.uncertain && range ? `La pluie devrait arriver entre ${range.replace(" → ", " et ")}.` : range ? `Pluie probable à partir de ${hourLabel(signal.startHour)}.` : "Pluie probable en cours de journée.";
    case "RAIN_END": return range ? `Amélioration attendue autour de ${hourLabel(signal.endHour ?? signal.startHour)}.` : "La pluie devrait progressivement cesser.";
    case "WIND": return range ? `Vent le plus sensible ${range}.` : "Vent notable au cours de la journée.";
    case "FOG": return range ? `Brume ou brouillard surtout ${range}.` : "Brume ou brouillard à prendre en compte.";
    case "HEAT_PEAK": return range ? `Chaleur maximale ${range}.` : "Chaleur maximale dans l’après-midi.";
    case "COOL": return "Une journée fraîche pour la saison.";
    case "CHANGE": return range ? `Le changement principal se joue ${range}.` : "Une évolution nette est attendue aujourd’hui.";
    case "IMPROVEMENT": return range ? `Amélioration progressive ${range}.` : "Une amélioration est attendue au fil de la journée.";
    case "DRY_WINDOW": return range ? `Fenêtre sèche ${range}.` : "Une fenêtre sèche se dégage aujourd’hui.";
    case "BEST_PERIOD": return range ? `Meilleur créneau ${range}.` : "Un créneau plus favorable se dégage aujourd’hui.";
    case "TEMPERATURE_PEAK": return range ? `Maximum thermique autour de ${hourLabel(signal.startHour ?? signal.endHour)}.` : "Le maximum thermique marquera l’après-midi.";
    case "STABILITY": return "Aucun changement météo notable attendu aujourd’hui.";
  }
}

function momentLabel(signal: KeyMoment): string {
  switch (signal.type) {
    case "CHANGE": return "LE CHANGEMENT";
    case "RAIN_START": return "LA PLUIE";
    case "RAIN_END": return "L’AMÉLIORATION";
    case "HOTTEST": return "LE PLUS CHAUD";
    case "BEST_WINDOW": return "LE MEILLEUR CRÉNEAU";
    case "DRY_WINDOW": return "LA FENÊTRE SÈCHE";
    case "WIND_PEAK": return "LE VENT";
    case "FOG_END": return "LA VISIBILITÉ";
    case "IMPROVEMENT": return "L’AMÉLIORATION";
    case "THUNDER": return "À SURVEILLER";
  }
}

function momentText(signal: KeyMoment): string {
  const range = rangeLabel(signal.startHour, signal.endHour);
  if (range) return range;
  if (signal.hour !== null) return hourLabel(signal.hour);
  return "Aujourd’hui";
}

function contextText(data: ContextualData | null): string | null {
  if (!data) return null;
  switch (data.type) {
    case "WIND_GUST": return data.value === null ? null : `Rafales ${Math.round(data.value)} ${data.unit ?? "km/h"}`;
    case "RAIN_TOTAL": return data.value === null ? null : `Pluie ${Number(data.value.toFixed(1))} ${data.unit ?? "mm"}`;
    case "DRY_WINDOW": return data.endHour === undefined || data.endHour === null ? null : `Fenêtre sèche jusqu’à ${hourLabel(data.endHour)}`;
    case "FOG_DURATION": return data.value === null ? null : `Brouillard ${Math.round(data.value)} ${data.unit ?? "h"}`;
    case "TEMPERATURE_MAX": return data.value === null ? null : `Maximum ${Math.round(data.value)}°`;
    case "TEMPERATURE_RANGE": return data.value === null ? null : `Amplitude ${Math.round(data.value)}°`;
  }
}

function confidenceLabel(level: NonNullable<OfficialPublicPayloadV24["analysis"]>["weatherConfidence"]["level"]): string {
  if (level === "STABLE") return "PRÉVISION STABLE";
  if (level === "SOME_UNCERTAINTY") return "QUELQUES INCERTITUDES";
  return "SCÉNARIO À SURVEILLER";
}

function confidenceDetail(payload: OfficialPublicPayloadV24): string {
  const confidence = payload.analysis!.weatherConfidence;
  const p = confidence.period;
  switch (confidence.mainUncertainty) {
    case "RAIN_PRESENCE": return "La présence de pluie reste encore incertaine.";
    case "RAIN_START": return p ? `L’arrivée de la pluie peut varier entre ${hourLabel(p.startHour)} et ${hourLabel(p.endHour)}.` : "L’horaire de la pluie peut encore évoluer.";
    case "RAIN_END": return p ? `La fin de la pluie peut varier entre ${hourLabel(p.startHour)} et ${hourLabel(p.endHour)}.` : "La fin de l’épisode reste à préciser.";
    case "RAIN_INTENSITY": return "L’intensité des précipitations reste variable selon les modèles.";
    case "THUNDER_PRESENCE": return "Le risque orageux diverge encore selon les modèles.";
    case "FOG_PRESENCE": return "La présence de brouillard reste incertaine.";
    case "FOG_END": return p ? `La dissipation peut varier entre ${hourLabel(p.startHour)} et ${hourLabel(p.endHour)}.` : "La dissipation du brouillard reste à préciser.";
    case "WIND_INTENSITY": return "L’intensité des rafales reste variable selon les modèles.";
    case "WIND_PEAK": return p ? `Le pic de vent se situe entre ${hourLabel(p.startHour)} et ${hourLabel(p.endHour)}.` : "L’horaire du pic de vent reste mobile.";
    case "TEMPERATURE_MAX": return "Le maximum de température varie encore légèrement selon les modèles.";
    case "CLOUD_EVOLUTION": return "L’évolution de la couverture nuageuse reste moins certaine.";
    case "NONE": return confidence.level === "STABLE" ? "Les principaux modèles convergent sur le scénario de la journée." : "Le scénario général reste à préciser.";
  }
}

function daySummaryText(payload: OfficialPublicPayloadV24): string {
  const analysis = payload.analysis!;
  const { dominantPhenomenon, evolution } = analysis.classification;
  const takeaway = analysis.editorialSignals.keyTakeaway.type;

  switch (dominantPhenomenon) {
    case "THUNDER":
      return "La journée devient plus instable au fil des heures, avec un risque orageux à surveiller.";
    case "RAIN":
      if (takeaway === "RAIN_START") return "La journée commence encore sèche, puis le temps se dégrade avant l’arrivée de la pluie dans l’après-midi.";
      if (takeaway === "RAIN_END") return "La pluie marque le début de journée avant une amélioration progressive au fil des heures.";
      if (evolution === "INTERMITTENT") return "Les périodes pluvieuses et les accalmies devraient alterner au fil de la journée.";
      return "Un temps humide devrait dominer une grande partie de la journée, sous un ciel durablement chargé.";
    case "SHOWERS":
      return "Averses et accalmies devraient alterner, avec des conditions qui pourront changer assez rapidement.";
    case "FOG":
      return evolution === "IMPROVING"
        ? "Brume ou brouillard en début de journée, puis la visibilité devrait progressivement s’améliorer."
        : "Brume ou brouillard devraient rester l’un des éléments marquants de la journée.";
    case "WIND":
      return "Le vent donnera le ton à la journée, avec une période plus exposée au fil de l’après-midi.";
    case "HEAT":
      return "Une journée lumineuse et chaude, avec une chaleur qui s’accentuera nettement dans l’après-midi.";
    case "COLD":
      return "Une journée fraîche, avec des températures qui resteront contenues même au meilleur de l’après-midi.";
    case "SKY_DEGRADATION":
      return "La journée commence plus lumineuse, puis les nuages gagneront progressivement du terrain.";
    case "SKY_IMPROVEMENT":
      return "Le ciel débute plus fermé, puis les éclaircies devraient progressivement gagner du terrain.";
    case "CLOUD":
      return evolution === "VARIABLE"
        ? "Une journée changeante, alternant passages plus lumineux et périodes plus couvertes."
        : "Le ciel restera majoritairement couvert, avec peu d’évolution significative au fil de la journée.";
    case "SUN":
      return "Une journée largement lumineuse et régulière, sans changement météo notable.";
    case "MIXED":
      return "Éclaircies et passages nuageux se partageront la journée, sans scénario durablement dominant.";
  }
}

function daylightLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")} de lumière`;
}

export function renderInstagramCarouselV3Preview(payload: OfficialPublicPayloadV24, city: CityConfig, options: { embedded?: boolean } = {}): string {
  if (!payload.analysis) {
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LOKA — Carrousel V3 indisponible</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;background:#ecebe7;color:#171715;padding:24px}.box{max-width:560px;margin:auto;background:#fff;padding:24px;border-radius:24px}a{color:#171715}</style></head><body><div class="box"><strong>Carrousel V3 indisponible</strong><p>Cette génération ne contient pas encore d’analyse V3. Le Studio V2 reste inchangé.</p><a href="/instagram">Retour au Studio Instagram</a></div></body></html>`;
  }

  const embedded = options.embedded === true;
  const solar = solarPresentation(city, payload.date);
  const analysis = payload.analysis;
  const timeline = analysis.timeline.points.map((point) => ({
    ...point,
    pictogramUrl: weatherPictogramDataUrl(hourlyConditionToPictogram(point.condition))
  }));
  const context = contextText(analysis.editorialSignals.contextualData);
  const model = {
    city: payload.city,
    date: payload.date,
    timezone: city.timezone,
    masterUrl: payload.scene.masterUrl,
    logoUrl: "/masters24/brand/loka-logo-v2.png",
    title: scene24DisplayTitle(payload.scene.id),
    temperatures: payload.temperatures,
    timeline,
    keyTakeaway: takeawayText(analysis.editorialSignals.keyTakeaway),
    keyMoment: {
      label: momentLabel(analysis.editorialSignals.keyMoment),
      text: momentText(analysis.editorialSignals.keyMoment)
    },
    context,
    confidence: {
      label: confidenceLabel(analysis.weatherConfidence.level),
      detail: confidenceDetail(payload)
    },
    editorial: {
      paragraph1: daySummaryText(payload),
      paragraph2: ""
    },
    solar: {
      sunrise: solar.sunrise,
      noon: solar.solarNoon,
      sunset: solar.sunset,
      daylight: daylightLabel(solar.daylightMinutes)
    }
  };

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>LOKA — Carrousel V3 Preview</title><style>
:root{--ink:#17212b;--muted:#73716c;--paper:#ecebe7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:${embedded ? "0" : "max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))"}}.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:16px}.badge{display:inline-block;background:#fff1cc;color:#76530a;font-size:10px;font-weight:800;letter-spacing:.08em;padding:6px 9px;border-radius:999px}.toolbar h1{font-size:23px;margin:12px 0 6px}.muted{font-size:12px;color:var(--muted);line-height:1.5}.actions,.export-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}a,button{border:0;border-radius:14px;padding:13px 10px;text-decoration:none;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.secondary{background:#f1f1ee;color:#171715}.primary{background:#171715;color:#fff}.visual{margin-bottom:18px}.head{display:flex;justify-content:space-between;align-items:end;padding:0 4px 8px}.title{font-size:13px;font-weight:800;letter-spacing:.08em}.size{font-size:11px;color:var(--muted)}.canvas-wrap{border-radius:26px;overflow:hidden;background:#d8d8d4;box-shadow:0 18px 70px rgba(0,0,0,.14)}canvas{display:block;width:100%;height:auto}.note{font-size:11px;line-height:1.45;color:#85817b;padding:9px 6px 0}.embedded-badge{background:#fff;border-radius:18px;padding:12px 14px;margin-bottom:14px;font-size:11px;line-height:1.45;color:var(--muted)}@media(max-width:420px){.actions,.export-actions{grid-template-columns:1fr}}</style></head><body><div class="wrap">${embedded ? `<div class="embedded-badge"><strong>V3 PARALLÈLE · NON OFFICIEL</strong><br>Comparaison uniquement. La publication V2 reste la référence de production.</div>` : `<div class="toolbar"><span class="badge">V3 PREVIEW · NON PUBLIÉ</span><h1>Carrousel LOKA — Page 1 + Page 2</h1><div class="muted">Aperçu isolé alimenté par <code>analysis V3</code>. Le Studio, les Stories et la publication V2 actuels ne sont pas modifiés.</div><div class="actions"><a class="secondary" href="/instagram">Studio V2 actuel</a><a class="secondary" href="/admin">Admin</a></div></div>`}
<div class="visual"><div class="head"><div class="title">PAGE 1 · MÉTÉO UTILE</div><div class="size">1080 × 1350 · 4:5</div></div><div class="canvas-wrap"><canvas id="page1" width="1080" height="1350"></canvas></div><div class="export-actions"><button class="primary" id="exportPage1">Exporter Page 1</button><button class="secondary" id="openPreview">Ouvrir le preview V3</button></div></div>
<div class="visual"><div class="head"><div class="title">PAGE 2 · COMPRENDRE LA JOURNÉE</div><div class="size">1080 × 1350 · 4:5</div></div><div class="canvas-wrap"><canvas id="page2" width="1080" height="1350"></canvas></div><div class="export-actions"><button class="primary" id="exportPage2">Exporter Page 2</button><button class="secondary" id="exportBoth">Exporter les 2 pages</button></div><div class="note">Ces exports V3 sont manuels et n’alimentent aucune publication automatique.</div></div></div><script>
const m=${safeJson(model)};const p1=document.getElementById('page1'),p2=document.getElementById('page2'),c1=p1.getContext('2d'),c2=p2.getContext('2d');const INK='#17212b',GOLD='#d0a23c',WHITE='rgba(255,255,255,.82)',FONT='"Helvetica Neue",Arial,sans-serif';
function load(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}function font(ctx,size,weight=500){ctx.font=String(weight)+' '+String(size)+'px '+FONT}function text(ctx,value,x,y,size,weight=500,color=INK,align='left'){ctx.save();font(ctx,size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(value??''),x,y);ctx.restore()}function lineCount(ctx,value,maxWidth,size,weight=500){ctx.save();font(ctx,size,weight);const words=String(value??'').split(/\s+/).filter(Boolean);let line='',count=words.length?1:0;for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){count++;line=word}else line=next}ctx.restore();return count}function wrap(ctx,value,x,y,maxWidth,lineHeight,size,weight=500,color=INK,maxLines=2,align='left'){ctx.save();font(ctx,size,weight);ctx.fillStyle=color;ctx.textAlign=align;const words=String(value??'').split(/\\s+/).filter(Boolean);let line='',yy=y,count=0;for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){ctx.fillText(line,x,yy);count++;if(count>=maxLines){ctx.restore();return}line=word;yy+=lineHeight}else line=next}if(line&&count<maxLines)ctx.fillText(line,x,yy);ctx.restore()}function fitWrap(ctx,value,x,y,maxWidth,maxLines,startSize,minSize,lineRatio,weight=500,color=INK,align='left'){let size=startSize;while(size>minSize&&lineCount(ctx,value,maxWidth,size,weight)>maxLines)size-=2;const lineHeight=Math.round(size*lineRatio);wrap(ctx,value,x,y,maxWidth,lineHeight,size,weight,color,maxLines,align);return {size,lineHeight,lines:lineCount(ctx,value,maxWidth,size,weight)}}function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}function card(ctx,x,y,w,h,alpha=.82){ctx.save();ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.shadowColor='rgba(0,0,0,.10)';ctx.shadowBlur=24;rr(ctx,x,y,w,h,28);ctx.fill();ctx.restore()}function cover(ctx,bg){ctx.clearRect(0,0,1080,1350);ctx.drawImage(bg,0,0,1080,1350);const g=ctx.createLinearGradient(0,0,0,1350);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.55,'rgba(255,255,255,.05)');g.addColorStop(1,'rgba(255,255,255,.16)');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350)}function dateLabel(){try{return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:m.timezone}).format(new Date(m.date+'T12:00:00')).toLocaleUpperCase('fr-FR')}catch{return m.date}}function header(ctx,logo){ctx.drawImage(logo,60,52,150,50);text(ctx,String(m.city).toUpperCase(),540,88,24,700,INK,'center');text(ctx,dateLabel(),1020,88,20,600,INK,'right')}function signature(ctx){text(ctx,'Ici, aujourd’hui.',540,1300,20,500,INK,'center');ctx.save();ctx.strokeStyle=GOLD;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(515,1320);ctx.lineTo(565,1320);ctx.stroke();ctx.restore()}function drawTimeline(ctx,icons){const pts=m.timeline,n=pts.length,left=70,right=1010,yHour=490,yIcon=575,yTemp=680;const span=right-left;pts.forEach((pt,i)=>{const x=n===1?540:left+span*(i/(n-1));const key=pt.importance==='KEY';text(ctx,String(pt.hour).padStart(2,'0')+'h',x,yHour,key?24:21,key?800:650,INK,'center');const im=icons[i];const size=key?92:82;ctx.drawImage(im,x-size/2,yIcon-size/2,size,size);text(ctx,Math.round(pt.temperatureC)+'°',x,yTemp,key?34:30,key?800:650,INK,'center');if(key){ctx.save();ctx.fillStyle=GOLD;ctx.beginPath();ctx.arc(x,716,4.5,0,Math.PI*2);ctx.fill();ctx.restore()}})}function render1(bg,logo,icons){cover(c1,bg);header(c1,logo);text(c1,m.title.toUpperCase(),60,230,64,820,INK);text(c1,Math.round(m.temperatures.minC)+'° — '+Math.round(m.temperatures.maxC)+'°',60,315,50,690,INK);text(c1,'LE RYTHME DE LA JOURNÉE',60,420,16,800,'rgba(23,33,43,.72)');drawTimeline(c1,icons);card(c1,60,770,960,220,.83);text(c1,'À RETENIR',96,825,16,850,GOLD);fitWrap(c1,m.keyTakeaway,96,885,870,2,30,26,1.4,620,INK);let y=1040;if(m.context){text(c1,'AUJOURD’HUI',60,y,14,850,'rgba(23,33,43,.62)');text(c1,m.context,60,y+48,28,700,INK);y+=98}text(c1,m.confidence.label,60,y+28,17,850,INK);signature(c1)}function render2(bg,logo){cover(c2,bg);header(c2,logo);text(c2,'LA JOURNÉE',60,225,17,850,GOLD);fitWrap(c2,m.editorial.paragraph1,60,300,920,3,40,32,1.35,650,INK);card(c2,60,560,960,220,.83);text(c2,m.keyMoment.label,96,620,16,850,GOLD);text(c2,m.keyMoment.text,96,700,44,780,INK);card(c2,60,820,960,260,.72);text(c2,'LUMIÈRE',96,875,16,850,GOLD);const cols=[['LEVER',m.solar.sunrise],['MIDI SOLAIRE',m.solar.noon],['COUCHER',m.solar.sunset]];cols.forEach((it,i)=>{const x=120+i*300;text(c2,it[0],x,935,14,780,'rgba(23,33,43,.62)');text(c2,it[1]||'—',x,985,28,700,INK)});text(c2,m.solar.daylight,96,1045,20,650,INK);text(c2,m.confidence.label,60,1155,17,850,INK);if(m.confidence.label!=='PRÉVISION STABLE')fitWrap(c2,m.confidence.detail,60,1195,900,2,18,16,1.55,520,INK);signature(c2)}function canvasFile(canvas,suffix){return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob?new File([blob],'loka-'+String(m.date||'meteo')+'-'+suffix+'.png',{type:'image/png'}):null),'image/png'))}function downloadFile(file){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}async function exportCanvas(canvas,suffix){const file=await canvasFile(canvas,suffix);if(!file)return;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:'LOKA! V3'});return}catch(error){if(error&&error.name==='AbortError')return}}downloadFile(file)}document.getElementById('exportPage1').onclick=()=>exportCanvas(p1,'carrousel-page-1');document.getElementById('exportPage2').onclick=()=>exportCanvas(p2,'carrousel-page-2');document.getElementById('exportBoth').onclick=async()=>{const f1=await canvasFile(p1,'carrousel-page-1'),f2=await canvasFile(p2,'carrousel-page-2');if(!f1||!f2)return;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f1,f2]}))){try{await navigator.share({files:[f1,f2],title:'LOKA! V3'});return}catch(error){if(error&&error.name==='AbortError')return}}downloadFile(f1);setTimeout(()=>downloadFile(f2),220)};document.getElementById('openPreview').onclick=()=>{if(window.top!==window.self)window.open('/instagram-v3-preview','_blank','noopener');else location.href='/instagram-v3-preview'};async function draw(){const bg=await load(m.masterUrl),logo=await load(m.logoUrl),icons=await Promise.all(m.timeline.map(x=>load(x.pictogramUrl)));render1(bg,logo,icons);render2(bg,logo)}draw().catch(e=>{console.error(e);text(c1,'Erreur de rendu V3',540,675,30,700,INK,'center');text(c2,'Erreur de rendu V3',540,675,30,700,INK,'center')});
</script></body></html>`;
}
