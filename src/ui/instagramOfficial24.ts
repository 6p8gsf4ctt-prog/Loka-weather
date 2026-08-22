import type { CityConfig, OfficialPublicPayloadV24, HourlyCondition } from "../types";
import { buildEngagementEditorial } from "../engine/editorial24/engagement";
import { scene24DisplayTitle } from "../engine/scenes24/displayTitles";
import {
  PICTOGRAM_LIBRARY_VERSION,
  PICTOGRAM_STYLE,
  hourlyConditionToPictogram,
  solarPictogramDataUrl,
  visualIconToPictogram,
  weatherPictogramDataUrl
} from "./pictogramLibrary";
import { solarPresentation } from "./solarTimes";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderInstagramOfficial24(payload: OfficialPublicPayloadV24, city: CityConfig): string {
  if (
    payload.editorial.scene.id !== payload.scene.id ||
    payload.editorial.scene.title !== payload.scene.label ||
    payload.editorial.scene.visualIcon !== payload.scene.visualIcon
  ) {
    throw new Error("instagram_editorial_scene_mismatch");
  }

  const hourly = payload.hourly as Array<{
    hour: number;
    temperatureC: number;
    condition: HourlyCondition;
    precipitationMm: number;
  }>;
  const engagement = payload.editorial.engagement
    ?? buildEngagementEditorial(payload.city, payload.date, payload.editorial.facts);

  const model = {
    city: payload.city,
    date: payload.date,
    timezone: city.timezone,
    masterUrl: payload.scene.masterUrl,
    scene: {
      id: payload.editorial.scene.id,
      title: scene24DisplayTitle(payload.scene.id),
      canonicalTitle: payload.editorial.scene.title,
      pictogramUrl: weatherPictogramDataUrl(visualIconToPictogram(payload.editorial.scene.visualIcon))
    },
    visual: payload.editorial.visual,
    social: payload.editorial.social,
    engagement,
    temps: payload.temperatures,
    hourly: hourly.map((item) => ({
      ...item,
      pictogramUrl: weatherPictogramDataUrl(hourlyConditionToPictogram(item.condition))
    })),
    solar: solarPresentation(city, payload.date),
    solarPictograms: {
      dawn: solarPictogramDataUrl("dawn"),
      sunrise: solarPictogramDataUrl("sunrise"),
      noon: solarPictogramDataUrl("noon"),
      sunset: solarPictogramDataUrl("sunset"),
      dusk: solarPictogramDataUrl("dusk")
    },
    brand: {
      logoUrl: "/brand/loka-logo-v2.png"
    },
    pictogramLibrary: {
      version: PICTOGRAM_LIBRARY_VERSION,
      ink: PICTOGRAM_STYLE.ink,
      gold: PICTOGRAM_STYLE.gold
    }
  };

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — Studio Instagram V2</title><style>
:root{--ink:#171715;--muted:#73716c;--paper:#ecebe7}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:max(14px,env(safe-area-inset-top)) 12px max(26px,env(safe-area-inset-bottom))}.wrap{width:min(100%,580px);margin:auto}.toolbar{background:#fff;border-radius:24px;padding:18px;margin-bottom:14px}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:12px;font-weight:760;letter-spacing:.16em}.badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8a6100;background:#fff6d8;padding:6px 8px;border-radius:999px}h1{font-size:23px;line-height:1.08;margin:14px 0 5px}.muted{font-size:12px;line-height:1.5;color:var(--muted)}.visual-card{margin:0 0 18px}.visual-head{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:0 4px 9px}.visual-title{font-size:14px;font-weight:760;letter-spacing:.08em}.visual-size{font-size:11px;color:var(--muted)}button{border:0;border-radius:14px;padding:14px 10px;text-align:center;font:650 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.primary{background:#171715;color:#fff;width:100%;margin-top:10px}.secondary{background:#f1f1ee;color:#171715}.canvas-wrap{background:#d8d8d4;border-radius:26px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.14)}canvas{display:block;width:100%;height:auto}.note{text-align:center;font-size:11px;color:#8d8983;line-height:1.45;padding:2px 12px 14px}.caption-card{background:#fff;border-radius:24px;padding:18px;margin:4px 0 18px}.caption-title{font-size:14px;font-weight:760;letter-spacing:.08em}.caption-help{font-size:11px;line-height:1.4;color:var(--muted);margin-top:4px}.copy-label{font-size:11px;font-weight:760;letter-spacing:.08em;color:#5f5d58;margin:16px 0 7px}.copy-box{margin:0;white-space:pre-wrap;word-break:break-word;background:#f4f3f0;border-radius:16px;padding:14px;font:500 14px/1.55 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#171715}.copy-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.copy-actions button{margin:0;width:100%}.copy-all{margin-top:10px}.copy-status{min-height:18px;padding-top:8px;text-align:center;font-size:11px;color:#24653a}@media(max-width:420px){.copy-actions{grid-template-columns:1fr}}
</style><!--LOKA_EDITORIAL_STYLE_MOUNT--></head><body><div class="wrap"><div class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">Pictogrammes Premium · V24</div></div><h1>Studio Instagram</h1><div class="muted" id="summary">${payload.city} · scène ${String(payload.scene.id).padStart(2,"0")}</div></div>
<div class="visual-card"><div class="visual-head"><div class="visual-title">STORY / REEL</div><div class="visual-size">1080 × 1920 · 9:16</div></div><div class="canvas-wrap"><canvas id="story" width="1080" height="1920"></canvas></div><button class="primary" id="shareStory">Partager / enregistrer la Story</button></div>
<div class="visual-card"><div class="visual-head"><div class="visual-title">STORY 2 · INTERACTION</div><div class="visual-size">1080 × 1920 · 9:16</div></div><div class="canvas-wrap"><canvas id="engagementStory" width="1080" height="1920"></canvas></div><button class="primary" id="shareEngagementStory">Partager / enregistrer le fond du sondage</button><div class="note">Fond de la scène du jour avec uniquement l’en-tête et la signature. Le sticker Instagram reste volontairement hors image.</div></div>
<div class="visual-card"><div class="visual-head"><div class="visual-title">PUBLICATION</div><div class="visual-size">1080 × 1440 · 3:4</div></div><div class="canvas-wrap"><canvas id="feed" width="1080" height="1440"></canvas></div><button class="primary" id="shareFeed">Partager / enregistrer la Publication</button></div>
<div class="note">Bibliothèque officielle LOKA! Premium · bleu marine, accent or et volume léger. La météo et les textes proviennent exclusivement du moteur V2.</div>
<!--LOKA_EDITORIAL_STUDIO_MOUNT-->
<div class="caption-card"><div class="caption-title">LÉGENDE INSTAGRAM</div><div class="caption-help">Texte officiel produit par Editorial Engine V2.</div><div class="copy-label">LÉGENDE</div><pre class="copy-box" id="captionText"></pre><div class="copy-actions"><button class="secondary" id="copyCaption">Copier la légende</button><button class="secondary" id="copyHashtags">Copier les hashtags</button></div><div class="copy-label">HASHTAGS</div><pre class="copy-box" id="hashtagsText"></pre><button class="primary copy-all" id="copyAll">Tout copier</button><div class="copy-status" id="copyStatus" aria-live="polite"></div></div></div><script>
const m=${safeJson(model)};
const storyCanvas=document.getElementById('story');const engagementStoryCanvas=document.getElementById('engagementStory');const feedCanvas=document.getElementById('feed');const storyCtx=storyCanvas.getContext('2d');const engagementStoryCtx=engagementStoryCanvas.getContext('2d');const feedCtx=feedCanvas.getContext('2d');let ctx=storyCtx;const INK=m.pictogramLibrary.ink;const GOLD=m.pictogramLibrary.gold;const CANVAS_FONT='"Helvetica Neue",Arial,sans-serif';const STORY_HEADER_SAFE={logoX:50,logoCenterY:144,logoWidth:190,logoHeight:64,cityBaseline:158,dateBaseline:158};const FEED_HEADER={logoX:50,logoCenterY:79,logoWidth:174,logoHeight:58,cityBaseline:94,dateBaseline:94};
function normalizeText(value){return String(value??'').normalize('NFC').replace(/\\s+/g,' ').trim();}
function load(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
function font(size,weight){ctx.font=String(weight)+' '+String(size)+'px '+CANVAS_FONT;if('fontKerning' in ctx)ctx.fontKerning='normal';}
function drawFullTextLine(label,x,y,color,align){ctx.fillStyle=color;ctx.strokeStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.lineJoin='round';ctx.miterLimit=2;ctx.lineWidth=.44;ctx.strokeText(label,x,y);ctx.fillText(label,x,y);}
function text(value,x,y,size,weight,color,align='left'){const label=normalizeText(value);ctx.save();font(size,weight);drawFullTextLine(label,x,y,color,align);ctx.restore();}
function trackedText(value,x,y,size,weight,color,tracking,align='center'){const chars=normalizeText(value).split('');ctx.save();font(size,weight);const widths=chars.map(ch=>ctx.measureText(ch).width);const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking;let cursor=align==='center'?x-total/2:align==='right'?x-total:x;ctx.fillStyle=color;ctx.textBaseline='alphabetic';for(let i=0;i<chars.length;i++){ctx.fillText(chars[i],cursor,y);cursor+=widths[i]+tracking;}ctx.restore();}
function fittedFontSize(value,maxWidth,maxSize,minSize,weight){const label=normalizeText(value);ctx.save();let size=maxSize;while(size>minSize){font(size,weight);if(ctx.measureText(label).width<=maxWidth)break;size-=1;}ctx.restore();return Math.max(minSize,size);}
function splitLines(value,maxWidth,maxLines,size,weight){const words=normalizeText(value).split(/\\s+/).filter(Boolean);ctx.save();font(size,weight);const lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;if(lines.length>=maxLines){ctx.restore();return null;}}else line=next;}if(line)lines.push(line);ctx.restore();return lines.length<=maxLines?lines:null;}
function fitLines(value,maxWidth,maxLines,maxSize,minSize,weight){for(let size=maxSize;size>=minSize;size--){const lines=splitLines(value,maxWidth,maxLines,size,weight);if(lines)return{size,lines};}return{size:minSize,lines:[normalizeText(value)]};}
function wrap(value,x,y,maxWidth,lineHeight,size,weight,color,align='left',maxLines=2){ctx.save();font(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';const words=normalizeText(value).split(/\\s+/).filter(Boolean);let line='',yy=y,count=0;for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){drawFullTextLine(line,x,yy,color,align);count++;if(count>=maxLines){ctx.restore();return;}line=word;yy+=lineHeight;}else line=next;}if(line&&count<maxLines)drawFullTextLine(line,x,yy,color,align);ctx.restore();}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function rgba(hex,a){const h=hex.replace('#','');const n=parseInt(h,16);return'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
function dateLabel(date){try{return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:m.timezone}).format(new Date(date+'T12:00:00')).toUpperCase();}catch{return String(date||'');}}
function drawCover(img,w,h){const iw=Math.max(1,img.naturalWidth||img.width||w);const ih=Math.max(1,img.naturalHeight||img.height||h);const scale=Math.max(w/iw,h/ih);const dw=iw*scale,dh=ih*scale;ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);}
function box(x,y,w,h){ctx.save();rr(x,y,w,h,36);const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'rgba(255,255,255,0.19)');g.addColorStop(.48,'rgba(255,255,255,0.145)');g.addColorStop(1,'rgba(255,255,255,0.105)');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.88)';ctx.lineWidth=1.45;ctx.stroke();ctx.save();rr(x+2,y+2,w-4,(h-4)*.43,34);ctx.clip();const sheen=ctx.createLinearGradient(x,y,x,y+h*.48);sheen.addColorStop(0,'rgba(255,255,255,0.20)');sheen.addColorStop(1,'rgba(255,255,255,0.02)');ctx.fillStyle=sheen;ctx.fillRect(x+2,y+2,w-4,h*.48);ctx.restore();ctx.restore();}
function separator(x1,y1,x2,y2){ctx.save();ctx.strokeStyle='rgba(18,38,74,0.13)';ctx.lineWidth=1.05;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
function drawImageCentered(img,cx,cy,w,h){const iw=Math.max(1,img.naturalWidth||img.width||w);const ih=Math.max(1,img.naturalHeight||img.height||h);const scale=Math.min(w/iw,h/ih);const dw=iw*scale,dh=ih*scale;ctx.drawImage(img,cx-dw/2,cy-dh/2,dw,dh);}
function pickHourlySlots(source){const wanted=[4,6,8,10,12,14,16,18,20,22];const pool=Array.isArray(source)?source:[];return wanted.map(hour=>pool.find(item=>Number(item.hour)===hour)||{hour,temperatureC:'—',condition:'nuageux',missing:true,pictogramUrl:m.hourly[0]?.pictogramUrl});}
function solarShiftLabel(value){if(value===null||value===undefined||value==='')return'';const delta=Number(value);if(!Number.isFinite(delta))return'';const rounded=Math.round(delta);if(rounded===0)return'0 min';return(rounded>0?'+':'−')+String(Math.abs(rounded))+' min';}
function drawLokaLogo(logo,x,centerY,maxWidth,maxHeight){if(!logo)return;const iw=Math.max(1,logo.naturalWidth||logo.width||maxWidth),ih=Math.max(1,logo.naturalHeight||logo.height||maxHeight),scale=Math.min(maxWidth/iw,maxHeight/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(logo,x,centerY-dh/2,dw,dh);}
function drawHeader(logo){drawLokaLogo(logo,STORY_HEADER_SAFE.logoX,STORY_HEADER_SAFE.logoCenterY,STORY_HEADER_SAFE.logoWidth,STORY_HEADER_SAFE.logoHeight);trackedText(String(m.city||'Tarnos').toUpperCase(),540,STORY_HEADER_SAFE.cityBaseline,25,680,INK,8,'center');text(dateLabel(m.date),1030,STORY_HEADER_SAFE.dateBaseline,22,540,INK,'right');}
function drawFeedHeader(logo){drawLokaLogo(logo,FEED_HEADER.logoX,FEED_HEADER.logoCenterY,FEED_HEADER.logoWidth,FEED_HEADER.logoHeight);trackedText(String(m.city||'Tarnos').toUpperCase(),540,FEED_HEADER.cityBaseline,22,680,INK,8,'center');text(dateLabel(m.date),1030,FEED_HEADER.dateBaseline,19,540,INK,'right');}
function drawTitleBlock(title,x,oneLineY,twoLineY,maxWidth,maxSize,minSize,weight,color){ctx.save();font(maxSize,weight);const fitsOne=ctx.measureText(normalizeText(title)).width<=maxWidth;ctx.restore();if(fitsOne){text(title,x,oneLineY,maxSize,weight,color);return{lines:1,size:maxSize,bottom:oneLineY};}const fit=fitLines(title,maxWidth,2,Math.min(maxSize,52),minSize,weight);const lineHeight=Math.round(fit.size*.98);fit.lines.forEach((line,i)=>text(line,x,twoLineY+i*lineHeight,fit.size,weight,color));return{lines:fit.lines.length,size:fit.size,bottom:twoLineY+(fit.lines.length-1)*lineHeight};}
function drawSubtitleBlock(value,x,oneLineY,twoLineY,maxWidth,maxSize,minSize,color){ctx.save();font(maxSize,550);const fitsOne=ctx.measureText(normalizeText(value)).width<=maxWidth;ctx.restore();if(fitsOne){text(value,x,oneLineY,maxSize,550,color);return;}const fit=fitLines(value,maxWidth,2,Math.min(maxSize,23),minSize,550);const lineHeight=Math.round(fit.size*1.16);fit.lines.forEach((line,i)=>text(line,x,twoLineY+i*lineHeight,fit.size,550,color));}
function measureWidth(value,size,weight){ctx.save();font(size,weight);const width=ctx.measureText(normalizeText(value)).width;ctx.restore();return width;}
function centeredTitleLayout(value,maxWidth,maxSize,minSize,weight){const label=normalizeText(value),size=fittedFontSize(label,maxWidth,maxSize,minSize,weight),width=measureWidth(label,size,weight);return{lines:[label],size,lineHeight:Math.round(size*.98),width};}
function drawCenteredGeneralGroup(mainIcon,x,y,w,h,iconW,iconH,iconGap,tempGap,titleMax,titleMin,tempSize){const centerX=x+w/2,centerY=y+h/2,innerW=w-92,tempLabel=String(m.temps.minC)+'° — '+String(m.temps.maxC)+'°',tempWidth=measureWidth(tempLabel,tempSize,650);const titleBudget=Math.max(280,innerW-iconW-iconGap-tempGap-tempWidth);const titleLayout=centeredTitleLayout(m.scene.title,titleBudget,titleMax,titleMin,800);const groupW=iconW+iconGap+titleLayout.width+tempGap+tempWidth,startX=centerX-groupW/2,titleX=startX+iconW+iconGap,tempX=titleX+titleLayout.width+tempGap;drawImageCentered(mainIcon,startX+iconW/2,centerY,iconW,iconH);const titleStep=(titleLayout.lines.length-1)*titleLayout.lineHeight,firstBaseline=centerY-titleStep/2+titleLayout.size*.34;titleLayout.lines.forEach((line,i)=>text(line,titleX,firstBaseline+i*titleLayout.lineHeight,titleLayout.size,800,INK));text(tempLabel,tempX,centerY+tempSize*.34,tempSize,650,INK);}
function drawStoryGeneral(mainIcon){const x=44,y=200,w=992,h=150;box(x,y,w,h);drawCenteredGeneralGroup(mainIcon,x,y,w,h,146,118,30,44,52,34,48);}
function drawFeedGeneral(mainIcon){const x=50,y=160,w=980,h=150;box(x,y,w,h);drawCenteredGeneralGroup(mainIcon,x,y,w,h,136,110,28,40,48,32,44);}
function drawStoryHours(slots,icons){const x=44,y=396,w=992,h=704;box(x,y,w,h);const colW=w/5;const rowTop=[424,770],rowBottom=[748,1074];separator(x+20,762,x+w-20,762);for(let row=0;row<2;row++){for(let i=1;i<5;i++){const sx=x+colW*i;separator(sx,rowTop[row]+18,sx,rowBottom[row]-18);}for(let c=0;c<5;c++){const idx=row*5+c,item=slots[idx];const cx=x+colW*(c+.5),base=rowTop[row];text(String(item.hour).padStart(2,'0')+'h',cx,base+52,26,600,INK,'center');if(!item.missing&&icons[idx])drawImageCentered(icons[idx],cx,base+141,126,102);text(String(item.temperatureC)+(item.missing?'':'°'),cx,base+242,43,700,INK,'center');}}}
function drawFeedHours(slots,icons){const x=50,y=336,w=980,h=500;box(x,y,w,h);const colW=w/5;const rowTop=[356,600],rowBottom=[576,820];separator(x+20,588,x+w-20,588);for(let row=0;row<2;row++){for(let i=1;i<5;i++){const sx=x+colW*i;separator(sx,rowTop[row]+10,sx,rowBottom[row]-10);}for(let c=0;c<5;c++){const idx=row*5+c,item=slots[idx];const cx=x+colW*(c+.5),base=rowTop[row];text(String(item.hour).padStart(2,'0')+'h',cx,base+32,22,600,INK,'center');if(!item.missing&&icons[idx])drawImageCentered(icons[idx],cx,base+95,100,82);text(String(item.temperatureC)+(item.missing?'':'°'),cx,base+186,36,700,INK,'center');}}}
function editorialAccent(x,y,width){ctx.save();ctx.strokeStyle=GOLD;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width,y);ctx.stroke();ctx.restore();}
function drawEditorialSummary(visual,x,y,w,h,primaryMax,primaryMin,secondaryMax,secondaryMin,accentWidth){const main=normalizeText(visual.primaryLine),secondary=normalizeText(visual.secondaryLine),left=x+68,maxWidth=w-136,primarySize=fittedFontSize(main,maxWidth,primaryMax,primaryMin,650),secondaryFit=secondary?fitLines(secondary,maxWidth,2,secondaryMax,secondaryMin,550):{size:secondaryMax,lines:[]},secondaryLineHeight=Math.round(secondaryFit.size*1.28),secondaryHeight=secondaryFit.lines.length?secondaryFit.size+(secondaryFit.lines.length-1)*secondaryLineHeight:0,groupHeight=primarySize+13+3+(secondaryFit.lines.length?17+secondaryHeight:0),top=y+(h-groupHeight)/2,primaryBaseline=top+primarySize,accentY=primaryBaseline+13;text(main,left,primaryBaseline,primarySize,650,INK,'left');editorialAccent(left,accentY,accentWidth);if(secondaryFit.lines.length){const firstSecondaryBaseline=accentY+17+secondaryFit.size;secondaryFit.lines.forEach((line,i)=>text(line,left,firstSecondaryBaseline+i*secondaryLineHeight,secondaryFit.size,550,rgba(INK,.99),'left'));}}
function drawStoryComments(){const visual=m.storyVisual||m.visual;const x=44,y=1139,w=992,h=272;box(x,y,w,h);drawEditorialSummary(visual,x,y,w,h,34,23,25,19,58);}
function drawFeedComments(){const visual=m.feedVisual||m.visual;const x=50,y=865,w=980,h=210;box(x,y,w,h);drawEditorialSummary(visual,x,y,w,h,29,20,21,17,52);}
function drawStorySolar(solarIcons){const x=44,y=1455,w=992,h=279;box(x,y,w,h);const colW=w/5;for(let i=1;i<5;i++)separator(x+colW*i,y+28,x+colW*i,y+h-28);const defs=[['AUBE','dawn',m.solar.dawn,null],['LEVER','sunrise',m.solar.sunrise,m.solar.sunriseDeltaMinutes],['MIDI SOLAIRE','noon',m.solar.solarNoon,null],['COUCHER','sunset',m.solar.sunset,m.solar.sunsetDeltaMinutes],['CRÉPUSCULE','dusk',m.solar.dusk,null]];defs.forEach((def,i)=>{const cx=x+colW*(i+.5);text(def[0],cx,1523,18,700,INK,'center');drawImageCentered(solarIcons[def[1]],cx,1610,106,80);text(def[2]||'—',cx,1692,33,600,INK,'center');const shift=solarShiftLabel(def[3]);if(shift)text(shift,cx,1724,19,600,rgba(INK,.88),'center');});}
function drawFeedSolar(solarIcons){const x=50,y=1100,w=980,h=205;box(x,y,w,h);const colW=w/5;for(let i=1;i<5;i++)separator(x+colW*i,y+18,x+colW*i,y+h-18);const defs=[['AUBE','dawn',m.solar.dawn,null],['LEVER','sunrise',m.solar.sunrise,m.solar.sunriseDeltaMinutes],['MIDI SOLAIRE','noon',m.solar.solarNoon,null],['COUCHER','sunset',m.solar.sunset,m.solar.sunsetDeltaMinutes],['CRÉPUSCULE','dusk',m.solar.dusk,null]];defs.forEach((def,i)=>{const cx=x+colW*(i+.5);text(def[0],cx,1138,15,700,INK,'center');drawImageCentered(solarIcons[def[1]],cx,1192,82,62);text(def[2]||'—',cx,1252,28,600,INK,'center');const shift=solarShiftLabel(def[3]);if(shift)text(shift,cx,1280,16,600,rgba(INK,.84),'center');});}
function drawStorySignature(){text('Ici, aujourd’hui.',540,1810,22,500,INK,'center');ctx.save();ctx.strokeStyle=GOLD;ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(514,1834);ctx.lineTo(566,1834);ctx.stroke();ctx.restore();}
function drawFeedSignature(){text('Ici, aujourd’hui.',540,1368,18,500,rgba(INK,.88),'center');ctx.save();ctx.strokeStyle=GOLD;ctx.lineWidth=1.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(518,1387);ctx.lineTo(562,1387);ctx.stroke();ctx.restore();}
function renderStory(bg,logo,mainIcon,slots,hourIcons,solarIcons){ctx=storyCtx;ctx.clearRect(0,0,1080,1920);drawCover(bg,1080,1920);drawHeader(logo);drawStoryGeneral(mainIcon);drawStoryHours(slots,hourIcons);drawStoryComments();drawStorySolar(solarIcons);drawStorySignature();}
function renderEngagementStory(bg,logo){ctx=engagementStoryCtx;ctx.clearRect(0,0,1080,1920);drawCover(bg,1080,1920);drawHeader(logo);drawStorySignature();ctx=storyCtx;}
function renderFeed(bg,logo,mainIcon,slots,hourIcons,solarIcons){ctx=feedCtx;ctx.clearRect(0,0,1080,1440);drawCover(bg,1080,1440);drawFeedHeader(logo);drawFeedGeneral(mainIcon);drawFeedHours(slots,hourIcons);drawFeedComments();drawFeedSolar(solarIcons);drawFeedSignature();ctx=storyCtx;}
async function draw(){window.__LOKA_RENDER_STATUS={started:true,storyRendered:false,engagementRendered:false,feedRendered:false,error:null};const slots=pickHourlySlots(m.hourly);const bg=await load(m.masterUrl);const logo=await load(m.brand.logoUrl);const mainIcon=await load(m.scene.pictogramUrl);const hourIcons=await Promise.all(slots.map(item=>load(item.pictogramUrl)));const solarIcons={dawn:await load(m.solarPictograms.dawn),sunrise:await load(m.solarPictograms.sunrise),noon:await load(m.solarPictograms.noon),sunset:await load(m.solarPictograms.sunset),dusk:await load(m.solarPictograms.dusk)};renderStory(bg,logo,mainIcon,slots,hourIcons,solarIcons);window.__LOKA_RENDER_STATUS.storyRendered=true;renderEngagementStory(bg,logo);window.__LOKA_RENDER_STATUS.engagementRendered=true;renderFeed(bg,logo,mainIcon,slots,hourIcons,solarIcons);window.__LOKA_RENDER_STATUS.feedRendered=true;window.__LOKA_RENDER_STATUS.rendered=true;window.__LOKA_EDITORIAL_AUDIT={sceneId:m.scene.id,title:m.scene.canonicalTitle,displayTitle:m.scene.title,rendererReclassified:false};window.__LOKA_BRAND_AUDIT={logoUrl:m.brand.logoUrl};window.__LOKA_PICTOGRAM_AUDIT={version:m.pictogramLibrary.version,ink:m.pictogramLibrary.ink,gold:m.pictogramLibrary.gold,mainSceneId:m.scene.id};}
function fallbackCopy(value){const area=document.createElement('textarea');area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();area.setSelectionRange(0,area.value.length);let ok=false;try{ok=document.execCommand('copy');}catch{}area.remove();return ok;}
async function copyText(value,label){let ok=false;try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(value);ok=true;}}catch{}if(!ok)ok=fallbackCopy(value);const status=document.getElementById('copyStatus');status.textContent=ok?label+' copié.':'Copie impossible : sélectionne le texte manuellement.';setTimeout(()=>{if(status.textContent.startsWith(label))status.textContent='';},1800);}
function canvasFile(targetCanvas,suffix){return new Promise(resolve=>targetCanvas.toBlob(blob=>resolve(blob?new File([blob],'loka-'+String(m.date||'meteo')+'-'+suffix+'.png',{type:'image/png'}):null),'image/png'));}
function fallbackDownload(file){const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function shareCanvas(targetCanvas,suffix){const file=await canvasFile(targetCanvas,suffix);if(!file)return;if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:'LOKA!'});return;}catch(error){if(error?.name==='AbortError')return;}}fallbackDownload(file);}
document.getElementById('shareStory').onclick=()=>shareCanvas(storyCanvas,'story');document.getElementById('shareEngagementStory').onclick=()=>shareCanvas(engagementStoryCanvas,'story-interaction');document.getElementById('shareFeed').onclick=()=>shareCanvas(feedCanvas,'post');document.getElementById('captionText').textContent=m.social.caption;document.getElementById('hashtagsText').textContent=m.social.hashtags;document.getElementById('copyCaption').onclick=()=>copyText(m.social.caption,'Légende');document.getElementById('copyHashtags').onclick=()=>copyText(m.social.hashtags,'Hashtags');document.getElementById('copyAll').onclick=()=>copyText(m.social.caption+'\\n\\n'+m.social.hashtags,'Légende + hashtags');
draw().catch(error=>{window.__LOKA_RENDER_STATUS={started:true,rendered:false,error:String(error)};document.getElementById('summary').textContent='Erreur de rendu : '+String(error);});
</script><!--LOKA_EDITORIAL_SCRIPT_MOUNT--></body></html>`;
}
