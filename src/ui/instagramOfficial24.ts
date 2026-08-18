import type { CityConfig, OfficialPublicPayloadV24 } from "../types";
import { solarPresentation } from "./solarTimes";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderInstagramOfficial24(payload: OfficialPublicPayloadV24, city: CityConfig): string {
  if (payload.editorial.scene.id !== payload.scene.id || payload.editorial.scene.title !== payload.scene.label) {
    throw new Error("instagram_editorial_scene_mismatch");
  }
  const model = {
    city: payload.city,
    date: payload.date,
    masterUrl: payload.scene.masterUrl,
    scene: payload.editorial.scene,
    visual: payload.editorial.visual,
    social: payload.editorial.social,
    temps: payload.temperatures,
    hourly: payload.hourly,
    solar: solarPresentation(city, payload.date)
  };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! Instagram V2</title><style>
*{box-sizing:border-box}body{margin:0;background:#071b3b;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:16px}.wrap{width:min(100%,760px);margin:auto}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.brand{font-weight:900;font-size:24px;color:#fdb515}.tabs{display:flex;gap:8px}.tabs button,.actions button{border:0;border-radius:12px;padding:11px 14px;font-weight:750;background:rgba(255,255,255,.11);color:#fff}.tabs button.active{background:#fdb515;color:#071b3b}.stage{background:#02112a;border-radius:20px;padding:10px;display:flex;justify-content:center;overflow:hidden}.stage canvas{display:block;max-width:100%;height:auto;border-radius:14px}.actions{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}.actions button.primary{background:#fdb515;color:#071b3b}.caption{width:100%;min-height:230px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;color:#fff;padding:15px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;resize:vertical}.meta{font-size:11px;color:#aebbd0;margin:8px 0 14px}
</style></head><body><main class="wrap"><header class="top"><div class="brand">LOKA!</div><div class="tabs"><button id="storyBtn" class="active">Story / Reel</button><button id="feedBtn">Publication</button></div></header><section class="stage"><canvas id="canvas" width="1080" height="1920"></canvas></section><div class="actions"><button id="saveBtn" class="primary">Enregistrer le PNG</button><button id="copyBtn">Copier la légende</button></div><div class="meta" id="status">Renderer V2 · aucune réinterprétation météo</div><textarea class="caption" id="caption" readonly></textarea><script>
const MODEL=${safeJson(model)};
const canvas=document.getElementById('canvas'); const ctx=canvas.getContext('2d');
const storyBtn=document.getElementById('storyBtn'); const feedBtn=document.getElementById('feedBtn');
const caption=document.getElementById('caption'); const status=document.getElementById('status');
caption.value=MODEL.social.caption+'\\n\\n'+MODEL.social.hashtags;
let format='STORY'; let master=null;
const LAYOUTS={
 STORY:{w:1080,h:1920,box:{x:44,y:224,w:992,h:250},inner:28,iconW:160,gap:24,textW:568,tempW:160,titleNom:60,titleMin:34,subNom:26,subMin:20,tempNom:44,tempMin:34,hours:{x:44,y:510,w:992,h:150},comments:{x:44,y:690,w:992,h:176},solar:{x:44,y:892,w:992,h:112},footerY:1810},
 FEED:{w:1080,h:1440,box:{x:50,y:160,w:980,h:240},inner:28,iconW:150,gap:24,textW:576,tempW:150,titleNom:54,titleMin:32,subNom:22,subMin:18,tempNom:40,tempMin:32,hours:{x:50,y:435,w:980,h:140},comments:{x:50,y:604,w:980,h:168},solar:{x:50,y:800,w:980,h:108},footerY:1345}
};
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function glass(rect){rr(rect.x,rect.y,rect.w,rect.h,28);ctx.fillStyle='rgba(7,27,59,.78)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=1.5;ctx.stroke();}
function coverImage(img,w,h){const s=Math.max(w/img.width,h/img.height);const dw=img.width*s,dh=img.height*s;ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);}
function wrapWords(text,maxWidth){const words=String(text).split(/\\s+/);const lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word;}}if(line)lines.push(line);return lines;}
function fit(text,maxWidth,maxLines,nominal,min,weight){for(let size=nominal;size>=min;size--){ctx.font=weight+' '+size+'px Arial, sans-serif';const lines=wrapWords(text,maxWidth);if(lines.length<=maxLines&&lines.every(l=>ctx.measureText(l).width<=maxWidth))return{size,lines};}ctx.font=weight+' '+min+'px Arial, sans-serif';return{size:min,lines:wrapWords(text,maxWidth).slice(0,maxLines)};}
function lineHeight(size,mult=1.08){return Math.round(size*mult);}
function sun(x,y,s){ctx.save();ctx.strokeStyle='#FDB515';ctx.fillStyle='#FDB515';ctx.lineWidth=Math.max(4,s*.055);ctx.beginPath();ctx.arc(x,y,s*.28,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*s*.39,y+Math.sin(a)*s*.39);ctx.lineTo(x+Math.cos(a)*s*.56,y+Math.sin(a)*s*.56);ctx.stroke();}ctx.restore();}
function cloud(x,y,s){ctx.save();ctx.fillStyle='#F3F6FA';ctx.beginPath();ctx.arc(x-s*.18,y,s*.22,Math.PI,0);ctx.arc(x+s*.06,y-s*.1,s*.29,Math.PI,0);ctx.arc(x+s*.3,y,s*.2,Math.PI,0);ctx.lineTo(x+s*.5,y+s*.18);ctx.lineTo(x-s*.42,y+s*.18);ctx.closePath();ctx.fill();ctx.restore();}
function wind(x,y,s){ctx.save();ctx.strokeStyle='#FDB515';ctx.lineWidth=Math.max(4,s*.045);ctx.lineCap='round';[-.18,0,.18].forEach((dy,i)=>{ctx.beginPath();ctx.moveTo(x-s*.48,y+s*dy);ctx.bezierCurveTo(x-s*.1,y+s*(dy-.12),x+s*.08,y+s*(dy+.12),x+s*(.42-i*.07),y+s*dy);ctx.stroke();});ctx.restore();}
function rain(x,y,s){cloud(x,y-s*.12,s*.85);ctx.save();ctx.strokeStyle='#9CD7FF';ctx.lineWidth=Math.max(3,s*.04);[-.22,0,.22].forEach(dx=>{ctx.beginPath();ctx.moveTo(x+s*dx,y+s*.18);ctx.lineTo(x+s*(dx-.05),y+s*.43);ctx.stroke();});ctx.restore();}
function fog(x,y,s){cloud(x,y-s*.14,s*.75);ctx.save();ctx.strokeStyle='#D9E3EF';ctx.lineWidth=Math.max(3,s*.035);[-.18,.05,.28].forEach(dy=>{ctx.beginPath();ctx.moveTo(x-s*.42,y+s*dy);ctx.lineTo(x+s*.42,y+s*dy);ctx.stroke();});ctx.restore();}
function thunder(x,y,s){cloud(x,y-s*.16,s*.85);ctx.save();ctx.fillStyle='#FDB515';ctx.beginPath();ctx.moveTo(x+s*.02,y+s*.1);ctx.lineTo(x-s*.13,y+s*.4);ctx.lineTo(x+s*.02,y+s*.37);ctx.lineTo(x-s*.03,y+s*.62);ctx.lineTo(x+s*.22,y+s*.28);ctx.lineTo(x+s*.07,y+s*.3);ctx.closePath();ctx.fill();ctx.restore();}
function drawSceneIcon(kind,x,y,s){if(kind==='sun')return sun(x,y,s);if(kind==='cloud')return cloud(x,y,s);if(kind==='fog')return fog(x,y,s);if(kind==='wind')return wind(x,y,s);if(kind==='rain'||kind==='shower')return rain(x,y,s);if(kind==='thunder')return thunder(x,y,s);if(kind==='rain-wind'){rain(x-s*.1,y,s*.78);return wind(x+s*.12,y+s*.25,s*.65);}if(kind==='cloud-wind'){cloud(x-s*.08,y-s*.08,s*.72);return wind(x+s*.12,y+s*.28,s*.62);}if(kind==='sun-wind'){sun(x-s*.17,y-s*.14,s*.7);return wind(x+s*.13,y+s*.24,s*.66);}if(kind==='veil'){sun(x-s*.12,y-s*.08,s*.72);ctx.save();ctx.globalAlpha=.82;cloud(x+s*.15,y+s*.18,s*.62);ctx.restore();return;}sun(x-s*.2,y-s*.15,s*.64);cloud(x+s*.14,y+s*.14,s*.68);}
function drawMainWeatherBlock(content,L){const b=L.box;glass(b);const left=b.x+L.inner;const iconCenter=left+L.iconW/2;const textX=left+L.iconW+L.gap;const textCenter=textX+L.textW/2;const tempX=textX+L.textW+L.gap;const tempCenter=tempX+L.tempW/2;drawSceneIcon(content.icon,iconCenter,b.y+b.h/2,format==='STORY'?124:116);
 const title=fit(content.title,L.textW,2,L.titleNom,L.titleMin,'800');const sub=fit(content.subtitle,L.textW,2,L.subNom,L.subMin,'500');const th=lineHeight(title.size,1.02)*title.lines.length;const sh=lineHeight(sub.size,1.16)*sub.lines.length;const gap=Math.max(10,Math.round(sub.size*.45));const total=th+gap+sh;let y=b.y+(b.h-total)/2;
 ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#fff';ctx.font='800 '+title.size+'px Arial, sans-serif';for(const line of title.lines){ctx.fillText(line,textCenter,y);y+=lineHeight(title.size,1.02);}y+=gap;ctx.fillStyle='#DCE6F3';ctx.font='500 '+sub.size+'px Arial, sans-serif';for(const line of sub.lines){ctx.fillText(line,textCenter,y);y+=lineHeight(sub.size,1.16);}const tempText=content.min+'° — '+content.max+'°';const temp=fit(tempText,L.tempW,1,L.tempNom,L.tempMin,'700');ctx.fillStyle='#fff';ctx.font='700 '+temp.size+'px Arial, sans-serif';ctx.textBaseline='middle';ctx.fillText(tempText,tempCenter,b.y+b.h/2);
 const maxTitle=Math.max(...title.lines.map(l=>ctx.measureText(l).width),0);ctx.font='500 '+sub.size+'px Arial, sans-serif';const maxSub=Math.max(...sub.lines.map(l=>ctx.measureText(l).width),0);ctx.font='700 '+temp.size+'px Arial, sans-serif';const tempWidth=ctx.measureText(tempText).width;const overflow=maxTitle>L.textW+.5||maxSub>L.textW+.5||tempWidth>L.tempW+.5||title.lines.length>2||sub.lines.length>2;return{titleLines:title.lines.length,subtitleLines:sub.lines.length,titleSize:title.size,subtitleSize:sub.size,tempSize:temp.size,centerX:textCenter,overflow,collision:false};}
function hourlyGlyph(c){if(c==='orage')return'ϟ';if(c==='pluie'||c==='averse')return'☂';if(c==='brouillard')return'≡';if(c==='vent')return'≋';if(c==='soleil')return'☀';if(c==='couvert')return'●';return'◐';}
function drawHours(rect){glass(rect);const cell=rect.w/MODEL.hourly.length;MODEL.hourly.forEach((h,i)=>{const x=rect.x+cell*(i+.5);ctx.textAlign='center';ctx.fillStyle='#C9D5E6';ctx.font='500 17px Arial';ctx.fillText(h.hour+'h',x,rect.y+28);ctx.fillStyle='#FDB515';ctx.font='28px Arial';ctx.fillText(hourlyGlyph(h.condition),x,rect.y+67);ctx.fillStyle='#fff';ctx.font='700 22px Arial';ctx.fillText(h.temperatureC+'°',x,rect.y+108);});}
function fitOne(text,maxWidth,nom=27,min=20){return fit(text,maxWidth,2,nom,min,'600');}
function drawComments(rect){glass(rect);const lines=[MODEL.visual.primaryLine,MODEL.visual.secondaryLine];let y=rect.y+34;ctx.textAlign='left';for(let i=0;i<2;i++){const r=fitOne(lines[i],rect.w-72,format==='STORY'?28:25,19);ctx.fillStyle=i===0?'#fff':'#DCE6F3';ctx.font='600 '+r.size+'px Arial';for(const line of r.lines){ctx.fillText(line,rect.x+36,y);y+=lineHeight(r.size,1.15);}if(i===0)y+=20;}}
function drawSolar(rect){glass(rect);ctx.textAlign='left';ctx.fillStyle='#FDB515';ctx.font='700 18px Arial';ctx.fillText('SOLEIL',rect.x+32,rect.y+31);ctx.fillStyle='#fff';ctx.font='600 23px Arial';ctx.fillText('Lever '+MODEL.solar.sunrise+'   ·   Coucher '+MODEL.solar.sunset,rect.x+32,rect.y+65);ctx.textAlign='right';ctx.fillStyle='#DCE6F3';ctx.font='500 18px Arial';const d=MODEL.solar.daylightDeltaMinutes;ctx.fillText((d>=0?'+':'')+d+' min / veille',rect.x+rect.w-32,rect.y+65);}
function drawHeader(L){ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='900 34px Arial';ctx.fillText('LOKA!',50,62);ctx.fillStyle='#FDB515';ctx.font='700 15px Arial';ctx.fillText(MODEL.city.toUpperCase(),50,94);ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='600 17px Arial';const d=new Date(MODEL.date+'T12:00:00');ctx.fillText(new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d),L.w-50,74);}
function drawFooter(L){ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='italic 28px Georgia';ctx.fillText('Ici, aujourd’hui.',L.w/2,L.footerY);ctx.font='600 18px Arial';ctx.fillStyle='#FDB515';ctx.fillText(MODEL.social.handle,L.w/2,L.footerY+38);}
function draw(){const L=LAYOUTS[format];canvas.width=L.w;canvas.height=L.h;ctx.clearRect(0,0,L.w,L.h);ctx.fillStyle='#071B3B';ctx.fillRect(0,0,L.w,L.h);if(master)coverImage(master,L.w,L.h);ctx.fillStyle='rgba(7,27,59,.16)';ctx.fillRect(0,0,L.w,L.h);drawHeader(L);const audit=drawMainWeatherBlock({icon:MODEL.scene.visualIcon,title:MODEL.scene.title,subtitle:MODEL.visual.subtitle,min:MODEL.temps.minC,max:MODEL.temps.maxC},L);drawHours(L.hours);drawComments(L.comments);drawSolar(L.solar);drawFooter(L);window.__LOKA_MAIN_BLOCK_AUDIT={format,...audit};window.__LOKA_EDITORIAL_AUDIT={sceneId:MODEL.scene.id,title:MODEL.scene.title,rendererReclassified:false};window.__LOKA_RENDER_STATUS={ok:true,format,masterLoaded:!!master};status.textContent='Renderer V2 · '+format+' · scène '+String(MODEL.scene.id).padStart(2,'0')+' · aucune réinterprétation météo';}
function setFormat(next){format=next;storyBtn.classList.toggle('active',next==='STORY');feedBtn.classList.toggle('active',next==='FEED');draw();}
storyBtn.onclick=()=>setFormat('STORY');feedBtn.onclick=()=>setFormat('FEED');
document.getElementById('copyBtn').onclick=async()=>{await navigator.clipboard.writeText(caption.value);status.textContent='Légende copiée';};
document.getElementById('saveBtn').onclick=()=>{canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='LOKA_'+MODEL.date+'_'+format+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);},'image/png');};
const img=new Image();img.onload=()=>{master=img;draw();};img.onerror=()=>{master=null;draw();status.textContent='Master graphique indisponible — scène V24 conservée';};img.src=MODEL.masterUrl;draw();
</script></main></body></html>`;
}
