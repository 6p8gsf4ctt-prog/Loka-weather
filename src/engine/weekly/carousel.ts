import type { WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference } from "./editorial";

export const WEEKLY_CAROUSEL_VERSION = "0.1.0" as const;
export const WEEKLY_CAROUSEL_WIDTH = 1080 as const;
export const WEEKLY_CAROUSEL_HEIGHT = 1350 as const;
export const WEEKLY_STORY_WIDTH = 1080 as const;
export const WEEKLY_STORY_HEIGHT = 1920 as const;

export type WeeklyCarouselSlideKind = "OVERVIEW" | "EVENT";

export interface WeeklyCarouselSlide {
  index: number;
  kind: WeeklyCarouselSlideKind;
  eventId: string | null;
  dateLabel: string;
  title: string;
  body: string;
  scene: WeeklySceneReference;
  activities: WeeklyEditorialEvent["activities"];
}

export interface WeeklyStoryRelay {
  kind: "RELAY";
  title: string;
  body: string;
  cta: string;
  scene: WeeklySceneReference;
}

export interface WeeklyCarouselPlan {
  version: typeof WEEKLY_CAROUSEL_VERSION;
  citySlug: string;
  startDate: string;
  endDate: string;
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
    signature: editorial.signature,
    width: WEEKLY_CAROUSEL_WIDTH,
    height: WEEKLY_CAROUSEL_HEIGHT,
    slides,
    story: {
      width: WEEKLY_STORY_WIDTH,
      height: WEEKLY_STORY_HEIGHT,
      relay: {
        kind: "RELAY",
        title: `La semaine à ${editorial.citySlug === "tarnos" ? "Tarnos" : editorial.citySlug}`,
        body: "Le carrousel météo de la semaine est disponible.",
        cta: "Voir la publication",
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
  }).format(new Date(`${date}T12:00:00Z`));
  return startDate === endDate ? format(startDate) : `du ${format(startDate)} au ${format(endDate)}`;
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
    ? `Slide ${position} : vue d’ensemble`
    : `Slide ${position} : ${slide.title}`;
  const activities = slide.activities.map((activity) => `<span class="activity ${activityStatusClass(activity.status)}">${escapeHtml(activity.text)}</span>`).join("");
  return `<article class="slide-card" data-slide-index="${position - 1}">
  <div class="slide-head"><span>${escapeHtml(position === 1 ? "VUE D’ENSEMBLE" : `TEMPS FORT ${position - 1}`)}</span><span>${position}/${total}</span></div>
  <div class="canvas-wrap"><canvas class="carousel-canvas" width="${WEEKLY_CAROUSEL_WIDTH}" height="${WEEKLY_CAROUSEL_HEIGHT}" aria-label="${escapeHtml(label)}"></canvas></div>
  ${activities ? `<div class="activity-list">${activities}</div>` : ""}
  <button class="secondary download-slide" type="button">Télécharger cette slide</button>
</article>`;
}

/**
 * Render an isolated preview/export surface. It is intentionally not wired to
 * a route or cron yet; step 11 will decide how this output is exposed.
 */
export function renderWeeklyCarousel(editorial: WeeklyEditorial): string {
  const plan = buildWeeklyCarouselPlan(editorial);
  const range = dateRangeLabel(plan.startDate, plan.endDate);
  const cards = plan.slides.map((slide, index) => renderSlideCard(slide, index + 1, plan.slides.length)).join("\n");
  const storyLabel = `Relais Story : ${plan.story.relay.title}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(plan.story.relay.title)} · LOKA</title>
<style>
:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f;--dark:#171715}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:24px 18px 48px}.toolbar{background:#fff;border-radius:24px;padding:20px 22px;margin-bottom:22px;box-shadow:0 12px 40px rgba(18,38,74,.08)}.topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:27px;font-weight:850;letter-spacing:.06em}.badge{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.toolbar h1{font-size:28px;line-height:1.05;margin:20px 0 6px}.muted{font-size:13px;color:var(--muted)}.carousel{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}.slide-card,.story-card{background:#fff;border-radius:24px;padding:14px;box-shadow:0 14px 46px rgba(18,38,74,.1)}.slide-head{display:flex;justify-content:space-between;gap:8px;padding:3px 4px 11px;font-size:11px;font-weight:780;letter-spacing:.09em;color:var(--muted)}.canvas-wrap{overflow:hidden;border-radius:18px;background:#d6d4cf}.canvas-wrap canvas{display:block;width:100%;height:auto}.activity-list{display:flex;flex-direction:column;gap:7px;margin:12px 2px 0}.activity{border-radius:11px;padding:8px 10px;font-size:12px;line-height:1.35}.activity.favorable{background:#edf7ef;color:#21613b}.activity.mixed{background:#faf3e3;color:#7a5b16}.activity.unfavorable{background:#f9e9e7;color:#8c302b}.secondary{width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px 10px;background:#f0f0ed;color:var(--dark);font:650 12px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}.story-card{max-width:420px;margin:28px auto 0}.story-head{padding:3px 4px 11px;font-size:11px;font-weight:780;letter-spacing:.09em;color:var(--muted)}.note{text-align:center;color:var(--muted);font-size:11px;line-height:1.5;margin:22px auto 0;max-width:760px}
</style></head><body><main class="wrap"><section class="toolbar"><div class="topline"><div class="brand">LOKA!</div><div class="badge">La semaine à Tarnos · V24</div></div><h1>${escapeHtml(plan.story.relay.title)}</h1><div class="muted">${escapeHtml(range)} · ${plan.slides.length} slide${plan.slides.length > 1 ? "s" : ""}</div></section><section class="carousel" aria-label="Carrousel hebdomadaire">${cards}</section><section class="story-card"><div class="story-head">STORY · RELAIS DE LA PUBLICATION</div><div class="canvas-wrap"><canvas id="story-relay" width="${WEEKLY_STORY_WIDTH}" height="${WEEKLY_STORY_HEIGHT}" aria-label="${escapeHtml(storyLabel)}"></canvas></div><button class="secondary" id="download-story" type="button">Télécharger le relais Story</button></section><p class="note">La Story relaie le carrousel ; elle ne constitue pas un bulletin météo autonome. Les fonds sont ceux des 24 scènes LOKA et les textes proviennent du moteur hebdomadaire.</p></main><script>
const plan=${safeJson(plan)};
const slideCanvases=[...document.querySelectorAll('.carousel-canvas')];
const storyCanvas=document.getElementById('story-relay');
const ink='#12264a';
const gold='#c9a45a';
const emojiFont='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const fontFamily='-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';
function load(src,label){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('weekly_image_load_failed:'+label));image.src=src;});}
function cover(ctx,image,width,height){const iw=Math.max(1,image.naturalWidth||image.width||width),ih=Math.max(1,image.naturalHeight||image.height||height),scale=Math.max(width/iw,height/ih),dw=iw*scale,dh=ih*scale;ctx.drawImage(image,(width-dw)/2,(height-dh)/2,dw,dh);}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function text(ctx,value,x,y,size,weight,color,align='left'){ctx.save();ctx.font=String(weight)+' '+String(size)+'px '+fontFamily;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(value??''),x,y);ctx.restore();}
function wrap(ctx,value,x,y,maxWidth,lineHeight,size,weight,color,maxLines=3){ctx.save();ctx.font=String(weight)+' '+String(size)+'px '+fontFamily;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';const words=String(value??'').split(/\s+/).filter(Boolean);const lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;if(lines.length===maxLines)break;}else line=next;}if(line&&lines.length<maxLines)lines.push(line);lines.forEach((item,index)=>ctx.fillText(item,x,y+index*lineHeight));ctx.restore();}
function overlay(ctx,width,height){const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'rgba(255,255,255,.10)');gradient.addColorStop(.43,'rgba(255,255,255,.14)');gradient.addColorStop(1,'rgba(7,21,48,.66)');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);}
function logo(ctx,x,y,scale=1){text(ctx,'LOKA!',x,y,42*scale,850,'#fff','left');ctx.fillStyle=gold;ctx.fillRect(x,y+12*scale,94*scale,3*scale);}
function panel(ctx,x,y,w,h){ctx.save();rounded(ctx,x,y,w,h,34);ctx.fillStyle='rgba(255,255,255,.88)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.98)';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
function headline(ctx,value,x,y,maxWidth){let size=58;ctx.save();while(size>34){ctx.font='850 '+size+'px '+fontFamily;if(ctx.measureText(String(value)).width<=maxWidth)break;size-=2;}ctx.restore();wrap(ctx,value,x,y,maxWidth,Math.round(size*1.02),size,850,ink,2);}
function activityStyle(status){if(status==='FAVORABLE')return{fill:'rgba(221,243,225,.96)',color:'#21613b'};if(status==='UNFAVORABLE')return{fill:'rgba(249,226,223,.96)',color:'#8c302b'};return{fill:'rgba(250,239,211,.96)',color:'#7a5b16'};}
function activityLines(ctx,activities){activities.slice(0,3).forEach((activity,index)=>{const y=1142+index*42,style=activityStyle(activity.status);ctx.save();rounded(ctx,101,y,820,31,15);ctx.fillStyle=style.fill;ctx.fill();ctx.restore();text(ctx,activity.text,118,y+21,16,620,style.color,'left');});}
function drawSlide(canvas,slide){return load(slide.scene.masterUrl,'scene_'+slide.scene.id).then(image=>{const ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(ctx,image,width,height);overlay(ctx,width,height);logo(ctx,58,92);text(ctx,slide.kind==='OVERVIEW'?'LA SEMAINE À TARNOS':'TEMPS FORT MÉTÉO',58,178,22,780,'#fff','left');text(ctx,(slide.index+1)+' / '+plan.slides.length,1022,178,22,650,'#fff','right');panel(ctx,58,715,964,595);text(ctx,slide.scene.emoji,101,797,60,500,ink,'left');text(ctx,slide.scene.displayTitle,180,789,18,780,ink,'left');text(ctx,slide.dateLabel,101,842,19,600,ink,'left');headline(ctx,slide.title,101,932,840);wrap(ctx,slide.body,101,1038,820,32,24,540,ink,3);if(slide.activities.length)activityLines(ctx,slide.activities);text(ctx,plan.signature,540,1280,20,520,ink,'center');});}
function drawStory(canvas,relay){return load(relay.scene.masterUrl,'story_scene_'+relay.scene.id).then(image=>{const ctx=canvas.getContext('2d');const width=canvas.width,height=canvas.height;ctx.clearRect(0,0,width,height);cover(ctx,image,width,height);overlay(ctx,width,height);logo(ctx,58,126,1.25);text(ctx,'RELAIS DE LA PUBLICATION',58,225,24,780,'#fff','left');panel(ctx,58,760,964,520);text(ctx,relay.scene.emoji,104,846,64,500,ink,'left');text(ctx,relay.scene.displayTitle,190,840,19,780,ink,'left');headline(ctx,relay.title,101,950,840);wrap(ctx,relay.body,101,1075,820,38,27,540,ink,2);ctx.save();rounded(ctx,101,1165,430,70,35);ctx.fillStyle=gold;ctx.fill();ctx.restore();text(ctx,relay.cta,316,1210,24,800,'#fff','center');text(ctx,'Faites défiler le carrousel',540,1785,22,600,'#fff','center');});}
function download(canvas,name){canvas.toBlob(blob=>{if(!blob)return;const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);},'image/png');}
Promise.all(plan.slides.map((slide,index)=>drawSlide(slideCanvases[index],slide))).catch(error=>console.error(error));
drawStory(storyCanvas,plan.story.relay).catch(error=>console.error(error));
document.querySelectorAll('.download-slide').forEach((button,index)=>button.addEventListener('click',()=>download(slideCanvases[index],'loka-semaine-'+String(index+1).padStart(2,'0')+'.png')));
document.getElementById('download-story').addEventListener('click',()=>download(storyCanvas,'loka-semaine-story-relais.png'));
</script></body></html>`;
}
