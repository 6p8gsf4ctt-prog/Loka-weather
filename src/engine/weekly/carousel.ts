import type { WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference } from "./editorial";
import { PICTOGRAM_LIBRARY_VERSION, PICTOGRAM_STYLE, visualIconToPictogram, weatherPictogramDataUrl } from "../../ui/pictogramLibrary";
import { LOKA_BRAND_VERSION, LOKA_CANVAS_FONT, LOKA_LOGO_DATA_URL, LOKA_SLOGAN_WEEKLY } from "../../ui/lokaBrand";

export const WEEKLY_CAROUSEL_VERSION = "0.1.0" as const;
export const WEEKLY_CAROUSEL_MAX_EVENT_SLIDES = 4 as const;
export const WEEKLY_CAROUSEL_WIDTH = 1080 as const;
export const WEEKLY_CAROUSEL_HEIGHT = 1350 as const;
export const WEEKLY_STORY_WIDTH = 1080 as const;
export const WEEKLY_STORY_HEIGHT = 1920 as const;
/**
 * Dedicated master for the weekly overview only. Event slides retain the
 * actual V24 master selected from the representative daily decision.
 */
export const WEEKLY_OVERVIEW_MASTER_URL = "/masters24/SEMAINE_CONTRASTEE.png" as const;

export type WeeklyCarouselSlideKind = "OVERVIEW" | "EVENT";

export interface WeeklyCarouselSlide {
  index: number;
  kind: WeeklyCarouselSlideKind;
  eventId: string | null;
  dateLabel: string;
  backgroundUrl: string;
  title: string;
  body: string;
  scene: WeeklySceneReference;
  activities: WeeklyEditorialEvent["activities"];
}

export interface WeeklyStoryRelay {
  kind: "RELAY";
  source: "CAROUSEL";
  title: string;
  body: string;
  cta: string;
  backgroundUrl: string;
  scene: WeeklySceneReference;
}

export interface WeeklyCarouselPlan {
  version: typeof WEEKLY_CAROUSEL_VERSION;
  citySlug: string;
  startDate: string;
  endDate: string;
  /** Header copy produced from the Monday-Sunday range, not from a slide. */
  headerDateLabel: string;
  signature: WeeklyEditorial["signature"];
  width: typeof WEEKLY_CAROUSEL_WIDTH;
  height: typeof WEEKLY_CAROUSEL_HEIGHT;
  slides: WeeklyCarouselSlide[];
  story: {
    width: typeof WEEKLY_STORY_WIDTH;
    height: typeof WEEKLY_STORY_HEIGHT;
    relay: WeeklyStoryRelay;
  };
}

function overviewSlide(editorial: WeeklyEditorial): WeeklyCarouselSlide {
  return {
    index: 0,
    kind: "OVERVIEW",
    eventId: null,
    dateLabel: dateRangeLabel(editorial.startDate, editorial.endDate),
    backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
    title: editorial.overview.title,
    body: editorial.overview.body,
    scene: editorial.overview.scene,
    activities: []
  };
}

function eventSlide(event: WeeklyEditorialEvent, index: number): WeeklyCarouselSlide {
  return {
    index,
    kind: "EVENT",
    eventId: event.id,
    dateLabel: eventDateLabel(event),
    backgroundUrl: event.scene.masterUrl,
    title: event.title,
    body: event.body,
    scene: event.scene,
    activities: event.activities
  };
}

/**
 * Build the publication structure without rendering, storing or publishing it.
 * The first slide is always the overview; every retained event gets exactly one
 * dedicated slide. A calm week therefore contains one slide only.
 */
export function buildWeeklyCarouselPlan(editorial: WeeklyEditorial): WeeklyCarouselPlan {
  const slides = [overviewSlide(editorial), ...editorial.events.map((event, index) => eventSlide(event, index + 1))];
  return {
    version: WEEKLY_CAROUSEL_VERSION,
    citySlug: editorial.citySlug,
    startDate: editorial.startDate,
    endDate: editorial.endDate,
    headerDateLabel: weeklyHeaderDateLabel(editorial.startDate, editorial.endDate),
    signature: editorial.signature,
    width: WEEKLY_CAROUSEL_WIDTH,
    height: WEEKLY_CAROUSEL_HEIGHT,
    slides,
    story: {
      width: WEEKLY_STORY_WIDTH,
      height: WEEKLY_STORY_HEIGHT,
      relay: {
        kind: "RELAY",
        source: "CAROUSEL",
        title: "La semaine à " + (editorial.citySlug === "tarnos" ? "Tarnos" : editorial.citySlug),
        body: editorial.status === "CALM"
          ? "La synthèse de la semaine est disponible dans la publication."
          : "Les temps forts météo de la semaine sont disponibles dans le carrousel.",
        cta: "Voir la publication",
        backgroundUrl: WEEKLY_OVERVIEW_MASTER_URL,
        scene: editorial.overview.scene
      }
    }
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function dateRangeLabel(startDate: string, endDate: string): string {
  const format = (date: string): string => new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(date + "T12:00:00Z"));
  return startDate === endDate ? format(startDate) : "du " + format(startDate) + " au " + format(endDate);
}

/**
 * The daily renderer owns the header treatment. The weekly layer supplies
 * only the range-specific value that it has to draw there.
 *
 * Example: LUNDI 7 AU DIMANCHE 13 SEPTEMBRE
 */
function weeklyHeaderDateLabel(startDate: string, endDate: string): string {
  const partsFor = (date: string): { weekday: string; day: string; month: string } => {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long"
    }).formatToParts(new Date(date + "T12:00:00Z"));
    const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
    return { weekday: value("weekday"), day: value("day"), month: value("month") };
  };
  const start = partsFor(startDate);
  const end = partsFor(endDate);
  const label = start.month === end.month
    ? `${start.weekday} ${start.day} au ${end.weekday} ${end.day} ${end.month}`
    : `${start.weekday} ${start.day} ${start.month} au ${end.weekday} ${end.day} ${end.month}`;
  return label.toUpperCase();
}

function activityStatusClass(status: WeeklyEditorialEvent["activities"][number]["status"]): string {
  if (status === "FAVORABLE") return "favorable";
  if (status === "UNFAVORABLE") return "unfavorable";
  return "mixed";
}

function eventDateLabel(event: WeeklyEditorialEvent): string {
  return dateRangeLabel(event.startDate, event.endDate);
}

function renderSlideCard(slide: WeeklyCarouselSlide, position: number, total: number): string {
  const label = slide.kind === "OVERVIEW"
    ? "Slide " + position + " : vue d’ensemble"
    : "Slide " + position + " : " + slide.title;
  const activities = slide.activities.map((activity) => '<span class="activity ' + activityStatusClass(activity.status) + '">' + escapeHtml(activity.text) + "</span>").join("");
  return '<article class="slide-card" data-slide-index="' + (position - 1) + '"' + (slide.eventId ? ' data-event-id="' + escapeHtml(slide.eventId) + '"' : '') + '><div class="slide-head"><span>' +
    escapeHtml(position === 1 ? "VUE D’ENSEMBLE" : "TEMPS FORT " + (position - 1)) + "</span><span>" + position + "/" + total +
    '</span></div><div class="canvas-wrap"><canvas class="carousel-canvas" width="' + WEEKLY_CAROUSEL_WIDTH + '" height="' + WEEKLY_CAROUSEL_HEIGHT +
    '" aria-label="' + escapeHtml(label) + '"></canvas></div>' + (activities ? '<div class="activity-list">' + activities + "</div>" : "") +
    '<button class="secondary download-slide" type="button">Télécharger cette slide</button></article>';
}

function sceneForBrowser(scene: WeeklySceneReference): WeeklySceneReference & { pictogramUrl: string } {
  return {
    ...scene,
    pictogramUrl: weatherPictogramDataUrl(visualIconToPictogram(scene.visualIcon))
  };
}

function browserModel(plan: WeeklyCarouselPlan): unknown {
  return {
    ...plan,
    brand: {
      version: LOKA_BRAND_VERSION,
      logoUrl: LOKA_LOGO_DATA_URL,
      canvasFont: LOKA_CANVAS_FONT,
      slogan: LOKA_SLOGAN_WEEKLY,
      pictogramLibraryVersion: PICTOGRAM_LIBRARY_VERSION,
      ink: PICTOGRAM_STYLE.ink,
      gold: PICTOGRAM_STYLE.gold
    },
    slides: plan.slides.map((slide) => ({ ...slide, scene: sceneForBrowser(slide.scene) })),
    story: {
      ...plan.story,
      relay: { ...plan.story.relay, scene: sceneForBrowser(plan.story.relay.scene) }
    }
  };
}

/**
 * Render an isolated preview/export surface. It is used by the protected
 * preview route and remains independent from the daily renderer, routes and
 * production activation flag.
 */
export function renderWeeklyCarousel(editorial: WeeklyEditorial): string {
  const plan = buildWeeklyCarouselPlan(editorial);
  const model = browserModel(plan);
  const range = plan.headerDateLabel;
  const cards = plan.slides.map((slide, index) => renderSlideCard(slide, index + 1, plan.slides.length)).join("\n");
  const storyLabel = "Relais Story : " + plan.story.relay.title;
  const shell =
'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(plan.story.relay.title) + ' · LOKA</title>' +
'<style>:root{--ink:#12264a;--gold:#fdb515;--paper:#f3f1eb;--muted:#6f716f;--dark:#171715}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:24px 18px 48px}.toolbar{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:27px;font-weight:850;letter-spacing:.06em}.badge{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.toolbar h1{font-size:28px;line-height:1.05;margin:20px 0 6px}.muted{font-size:13px;color:var(--muted)}.carousel{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}.slide-card,.story-card{background:#fff;border-radius:24px;padding:14px;box-shadow:0 14px 46px rgba(18,38,74,.1)}.slide-head{display:flex;justify-content:space-between;gap:8px;padding:3px 4px 11px;font-size:11px;font-weight:780;letter-spacing:.09em;color:var(--muted)}.canvas-wrap{overflow:hidden;border-radius:18px;background:#d6d4cf}.canvas-wrap canvas{display:block;width:100%;height:auto}.activity-list{display:flex;flex-direction:column;gap:7px;margin:12px 2px 0}.activity{border-radius:11px;padding:8px 10px;font-size:12px;line-height:1.35}.activity.favorable{background:#edf7ef;color:#21613b}.activity.mixed{background:#faf3e3;color:#7a5b16}.activity.unfavorable{background:#f9e9e7;color:#8c302b}.secondary{width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px 10px;background:#f0f0ed;color:var(--dark);font:650 12px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.story-card{max-width:420px;margin:28px auto 0}.story-head{padding:3px 4px 11px;font-size:11px;font-weight:780;letter-spacing:.09em;color:var(--muted)}.note{text-align:center;color:var(--muted);font-size:11px;line-height:1.5;margin:22px auto 0;max-width:760px}</style></head><body><main class="wrap"><section class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">La semaine à Tarnos · V24 · aperçu</div></div><h1>' + escapeHtml(plan.story.relay.title) + '</h1><div class="muted">' + escapeHtml(range) + ' · ' + String(plan.slides.length) + ' slide' + (plan.slides.length > 1 ? 's' : '') + '</div></section><section class="carousel" aria-label="Carrousel hebdomadaire">' + cards + '</section><section class="story-card"><div class="story-head">STORY · RELAIS DE LA PUBLICATION</div><div class="canvas-wrap"><canvas id="story-relay" width="' + String(WEEKLY_STORY_WIDTH) + '" height="' + String(WEEKLY_STORY_HEIGHT) + '" aria-label="' + escapeHtml(storyLabel) + '"></canvas></div><button class="secondary" id="download-story" type="button">Télécharger le relais Story</button></section><p class="note">Le rendu utilise le logo LOKA!, les box translucides, les pictogrammes redessinés et les fonds des 24 scènes. La Story reste un relais du carrousel ; elle ne constitue pas un bulletin autonome.</p></main><script>';

  const script = [
    "const model=" + safeJson(model) + ";",
    "const plan=model;",
    "const slideCanvases=[...document.querySelectorAll('.carousel-canvas')];",
    "const storyCanvas=document.getElementById('story-relay');",
    "let ctx=null;",
    "const ink=model.brand.ink;",
    "const gold=model.brand.gold;",
    "const fontFamily=model.brand.canvasFont;",
    "function load(src,label){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('weekly_image_load_failed:'+label));image.src=src;});}",
    "function normalizeText(value){return String(value??'').normalize('NFC').replace(/\\s+/g,' ').trim();}",
    "function font(size,weight){ctx.font=String(weight)+' '+String(size)+'px '+fontFamily;if('fontKerning' in ctx)ctx.fontKerning='normal';}",
    "function drawFullTextLine(label,x,y,color,align){ctx.fillStyle=color;ctx.strokeStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.lineJoin='round';ctx.miterLimit=2;ctx.lineWidth=.44;ctx.strokeText(label,x,y);ctx.fillText(label,x,y);}",
    "function text(value,x,y,size,weight,color,align='left'){const label=normalizeText(value);ctx.save();font(size,weight);drawFullTextLine(label,x,y,color,align);ctx.restore();}",
    "function trackedText(value,x,y,size,weight,color,tracking,align='center'){const chars=normalizeText(value).split('');ctx.save();font(size,weight);const widths=chars.map(ch=>ctx.measureText(ch).width);const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking;let cursor=align==='center'?x-total/2:align==='right'?x-total:x;ctx.fillStyle=color;ctx.textBaseline='alphabetic';for(let i=0;i<chars.length;i++){ctx.fillText(chars[i],cursor,y);cursor+=widths[i]+tracking;}ctx.restore();}",
    "function measure(value,size,weight){ctx.save();font(size,weight);const width=ctx.measureText(normalizeText(value)).width;ctx.restore();return width;}",
    "function fittedSize(value,maxWidth,maxSize,minSize,weight){const label=normalizeText(value);ctx.save();let size=maxSize;while(size>minSize){font(size,weight);if(ctx.measureText(label).width<=maxWidth)break;size-=1;}ctx.restore();return Math.max(minSize,size);}",
    "function wrap(value,x,y,maxWidth,lineHeight,size,weight,color,align='left',maxLines=3){ctx.save();font(size,weight);const words=normalizeText(value).split(/\\s+/).filter(Boolean);let line='',yy=y,count=0;for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){drawFullTextLine(line,x,yy,color,align);count++;if(count>=maxLines){ctx.restore();return;}line=word;yy+=lineHeight;}else line=next;}if(line&&count<maxLines)drawFullTextLine(line,x,yy,color,align);ctx.restore();}",
    "function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}",
    "function box(x,y,w,h){ctx.save();rr(x,y,w,h,36);const gradient=ctx.createLinearGradient(x,y,x,y+h);gradient.addColorStop(0,'rgba(255,255,255,0.19)');gradient.addColorStop(.48,'rgba(255,255,255,0.145)');gradient.addColorStop(1,'rgba(255,255,255,0.105)');ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.88)';ctx.lineWidth=1.45;ctx.stroke();ctx.save();rr(x+2,y+2,w-4,(h-4)*.43,34);ctx.clip();const sheen=ctx.createLinearGradient(x,y,x,y+h*.48);sheen.addColorStop(0,'rgba(255,255,255,0.20)');sheen.addColorStop(1,'rgba(255,255,255,0.02)');ctx.fillStyle=sheen;ctx.fillRect(x+2,y+2,w-4,h*.48);ctx.restore();ctx.restore();}",
    "function cover(image,width,height){const iw=Math.max(1,image.naturalWidth||image.width||width),ih=Math.max(1,image.naturalHeight||image.height||height),scale=Math.max(width/iw,height/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(image,(width-dw)/2,(height-dh)/2,dw,dh);}",
    "function overlay(width,height){const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'rgba(255,255,255,.04)');gradient.addColorStop(.54,'rgba(255,255,255,.06)');gradient.addColorStop(1,'rgba(7,21,48,.38)');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);}",
    "function drawLokaLogo(logo,x,centerY,maxWidth,maxHeight){const iw=Math.max(1,logo.naturalWidth||logo.width||maxWidth),ih=Math.max(1,logo.naturalHeight||logo.height||maxHeight),scale=Math.min(maxWidth/iw,maxHeight/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(logo,x,centerY-dh/2,dw,dh);}",
    "function drawImageCentered(image,cx,cy,w,h){const iw=Math.max(1,image.naturalWidth||image.width||w),ih=Math.max(1,image.naturalHeight||image.height||h),scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(image,cx-dw/2,cy-dh/2,dw,dh);}",
    "function drawHeader(logo,label,width){drawLokaLogo(logo,50,80,174,58);trackedText(String(plan.citySlug==='tarnos'?'TARNOS':plan.citySlug).toUpperCase(),540,94,22,680,ink,8,'center');text(String(label||'').toUpperCase(),width-50,94,18,540,ink,'right');}",
    "function drawStoryHeader(logo,label){drawLokaLogo(logo,50,144,190,64);trackedText(String(plan.citySlug==='tarnos'?'TARNOS':plan.citySlug).toUpperCase(),540,158,25,680,ink,8,'center');text(String(label||'').toUpperCase(),1030,158,20,540,ink,'right');}",
    "function sceneBadge(icon,scene,x,y,w,h){box(x,y,w,h);drawImageCentered(icon,x+82,y+h/2+8,116,90);text('SCÈNE V24 DU JOUR',x+160,y+43,14,700,ink,'left');text(scene.displayTitle,x+160,y+83,19,780,ink,'left');}",
    "function drawSignature(y,color){const signatureColor=color||ink;text(model.signature||model.brand.slogan,540,y,20,500,signatureColor,'center');ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(514,y+24);ctx.lineTo(566,y+24);ctx.stroke();ctx.restore();}",
    "function drawOverview(canvas,slide,background,logo){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawHeader(logo,plan.headerDateLabel,width);box(50,160,980,150);box(50,336,980,700);box(50,1060,980,190);drawSignature(1304);}",
    "function activityStyle(status){if(status==='FAVORABLE')return{fill:'rgba(221,243,225,.86)',color:'#21613b'};if(status==='UNFAVORABLE')return{fill:'rgba(249,226,223,.86)',color:'#8c302b'};return{fill:'rgba(250,239,211,.86)',color:'#7a5b16'};}",
    "function drawActivityRows(activities,startY){const rows=activities.slice(0,3);if(!rows.length)return;const rowHeight=rows.length===3?62:rows.length===2?72:88;rows.forEach((activity,index)=>{const y=startY+index*rowHeight,style=activityStyle(activity.status);ctx.save();rr(101,y,820,rowHeight-10,18);ctx.fillStyle=style.fill;ctx.fill();ctx.restore();const size=fittedSize(activity.text,770,17,12,620);text(activity.text,124,y+27,size,620,style.color,'left');});}",
    "function drawEvent(canvas,slide,background,logo,icon){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawHeader(logo,plan.headerDateLabel,width);text('TEMPS FORT MÉTÉO',58,174,22,780,ink,'left');sceneBadge(icon,slide.scene,58,205,964,160);box(58,395,964,790);const titleSize=fittedSize(slide.title,820,58,36,820);wrap(slide.title,101,500,820,58,titleSize,820,ink,'left',2);text(slide.dateLabel,101,585,19,540,ink,'left');wrap(slide.body,101,648,820,34,26,540,ink,'left',3);if(slide.activities.length){text('POUR VOS ACTIVITÉS',101,780,18,780,ink,'left');drawActivityRows(slide.activities,812);}drawSignature(1294);}",
    "function drawStory(canvas,relay,background,logo,icon){ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(background,width,height);overlay(width,height);drawStoryHeader(logo,plan.headerDateLabel);text('RELAIS DE LA PUBLICATION',58,225,24,780,ink,'left');box(58,470,964,820);drawImageCentered(icon,540,602,150,116);const titleSize=fittedSize(relay.title,820,58,36,820);wrap(relay.title,101,770,820,58,titleSize,820,ink,'left',2);wrap(relay.body,101,890,820,38,28,540,ink,'left',2);ctx.save();rr(101,1050,430,72,36);ctx.fillStyle=gold;ctx.fill();ctx.restore();text(relay.cta,316,1096,24,800,'#ffffff','center');text('Faites défiler le carrousel',540,1778,22,600,'#ffffff','center');drawSignature(1830,'#ffffff');}",
    "function drawSlide(canvas,slide){const base=[load(slide.backgroundUrl,'background_'+slide.index),load(model.brand.logoUrl,'logo')];if(slide.kind==='OVERVIEW')return Promise.all(base).then(function(images){drawOverview(canvas,slide,images[0],images[1]);});return Promise.all([...base,load(slide.scene.pictogramUrl,'pictogram_'+slide.scene.id)]).then(function(images){drawEvent(canvas,slide,images[0],images[1],images[2]);});}",
    "function drawRelay(){const relay=plan.story.relay;return Promise.all([load(relay.backgroundUrl,'story_background'),load(model.brand.logoUrl,'story_logo'),load(relay.scene.pictogramUrl,'story_pictogram_'+relay.scene.id)]).then(function(images){drawStory(storyCanvas,relay,images[0],images[1],images[2]);});}",
    "function download(canvas,name){canvas.toBlob(function(blob){if(!blob)return;const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(function(){URL.revokeObjectURL(link.href);},1000);},'image/png');}",
    "Promise.all(plan.slides.map(function(slide,index){return drawSlide(slideCanvases[index],slide);})).catch(function(error){console.error(error);});",
    "drawRelay().catch(function(error){console.error(error);});",
    "document.querySelectorAll('.download-slide').forEach(function(button,index){button.addEventListener('click',function(){download(slideCanvases[index],'loka-semaine-'+String(index+1).padStart(2,'0')+'.png');});});",
    "document.getElementById('download-story').addEventListener('click',function(){download(storyCanvas,'loka-semaine-story-relais.png');});"
  ].join("\n");

  return shell + script + "</script></body></html>";
}
