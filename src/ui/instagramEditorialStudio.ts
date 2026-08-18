const EDITOR_STYLE = `<style>
.editor-card{background:#fff;border-radius:24px;padding:18px;margin:4px 0 18px;box-shadow:0 10px 34px rgba(0,0,0,.05)}.editor-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.editor-title{font-size:14px;font-weight:760;letter-spacing:.08em}.editor-badge{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8a6100;background:#fff6d8;padding:6px 8px;border-radius:999px;white-space:nowrap}.editor-help{font-size:11px;line-height:1.45;color:var(--muted);margin:5px 0 14px}.editor-sync{display:flex;align-items:flex-start;gap:9px;background:#f7f6f2;border-radius:14px;padding:11px 12px;margin-bottom:14px;font-size:12px;line-height:1.35}.editor-sync input{margin-top:2px}.editor-format{border:1px solid #eceae4;border-radius:18px;padding:14px;margin-top:11px}.editor-format-title{font-size:12px;font-weight:760;letter-spacing:.09em;margin-bottom:10px}.editor-field{display:block;margin-top:10px}.editor-field span{display:block;font-size:10px;font-weight:720;letter-spacing:.07em;color:#625f58;margin:0 0 6px;text-transform:uppercase}.editor-field input,.editor-field textarea{display:block;width:100%;border:1px solid #dedbd3;border-radius:12px;background:#fbfaf7;color:#171715;padding:11px 12px;font:500 14px/1.45 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;resize:vertical;outline:none}.editor-field input:focus,.editor-field textarea:focus{border-color:#b18a2f;box-shadow:0 0 0 3px rgba(253,181,21,.12)}.editor-note{font-size:10px;line-height:1.4;color:#8d8983;margin-top:6px}.editor-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.editor-actions button{width:100%;margin:0}.editor-status{min-height:20px;padding-top:9px;text-align:center;font-size:11px;color:#24653a}.editor-warning{font-size:10px;line-height:1.45;color:#8a6100;background:#fff8e2;border-radius:12px;padding:9px 10px;margin-top:12px}@media(max-width:420px){.editor-top{display:block}.editor-badge{display:inline-block;margin-top:7px}.editor-actions{grid-template-columns:1fr}}
</style>`;

const EDITOR_MARKUP = `<div class="editor-card" id="editorialStudio"><div class="editor-top"><div><div class="editor-title">ÉDITION DES TEXTES</div><div class="editor-help">Le titre de scène, les pictogrammes, les températures, les horaires météo et les informations solaires restent verrouillés.</div></div><div class="editor-badge">Editorial Studio · V1</div></div><label class="editor-sync"><input id="editorSyncVisual" type="checkbox" checked><span>Synchroniser les textes visuels Story ↔ Publication. Les hashtags et le texte de légende restent indépendants.</span></label><div class="editor-format"><div class="editor-format-title">STORY</div><label class="editor-field"><span>Sous-titre</span><textarea id="storySubtitle" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Commentaire principal</span><textarea id="storyPrimary" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Commentaire secondaire</span><textarea id="storySecondary" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Hashtags Story</span><textarea id="storyHashtags" rows="3" maxlength="3000"></textarea></label><div class="editor-note">Les hashtags Story sont préparés pour la publication mais ne sont pas dessinés dans le visuel.</div><button class="secondary" id="copyStoryHashtags" type="button" style="width:100%;margin-top:9px">Copier les hashtags Story</button></div><div class="editor-format"><div class="editor-format-title">PUBLICATION</div><label class="editor-field"><span>Sous-titre</span><textarea id="feedSubtitle" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Commentaire principal</span><textarea id="feedPrimary" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Commentaire secondaire</span><textarea id="feedSecondary" rows="2" maxlength="500"></textarea></label><label class="editor-field"><span>Paragraphe 1</span><textarea id="feedParagraph1" rows="4" maxlength="8000"></textarea></label><label class="editor-field"><span>Paragraphe 2</span><textarea id="feedParagraph2" rows="4" maxlength="8000"></textarea></label><label class="editor-field"><span>Hashtags Publication</span><textarea id="feedHashtags" rows="3" maxlength="3000"></textarea></label></div><div class="editor-actions"><button class="primary" id="applyEditorial" type="button">Appliquer aux visuels</button><button class="secondary" id="resetEditorial" type="button">Rétablir l’officiel</button></div><div class="editor-warning">Étape 3 : les modifications sont temporaires et disparaissent au rechargement de la page. L’enregistrement dans D1 sera ajouté à l’étape 4.</div><div class="editor-status" id="editorStatus" aria-live="polite"></div></div>`;

const EDITOR_SCRIPT = `<script>
(function(){
const officialVisual={...m.visual};const officialSocial={...m.social};
m.storyVisual={...officialVisual};m.feedVisual={...officialVisual};m.storySocial={...officialSocial};m.feedSocial={...officialSocial};
const byId=id=>document.getElementById(id);const value=id=>String(byId(id)?.value??'').replace(/\\r\\n?/g,'\\n').normalize('NFC').trim();
function buildCaption(social){const blocks=[];if(social.paragraph1)blocks.push(social.paragraph1);if(social.paragraph2)blocks.push(social.paragraph2);let signature='';if(social.signature)signature+=social.signature;if(social.handle)signature+=(signature?'\\n':'')+social.handle;if(signature)blocks.push(signature);return blocks.join('\\n\\n');}
function writeOfficial(){byId('storySubtitle').value=officialVisual.subtitle||'';byId('storyPrimary').value=officialVisual.primaryLine||'';byId('storySecondary').value=officialVisual.secondaryLine||'';byId('storyHashtags').value=officialSocial.hashtags||'';byId('feedSubtitle').value=officialVisual.subtitle||'';byId('feedPrimary').value=officialVisual.primaryLine||'';byId('feedSecondary').value=officialVisual.secondaryLine||'';byId('feedParagraph1').value=officialSocial.paragraph1||'';byId('feedParagraph2').value=officialSocial.paragraph2||'';byId('feedHashtags').value=officialSocial.hashtags||'';}
function syncFrom(source){if(!byId('editorSyncVisual').checked)return;const isStory=source.startsWith('story');const map=isStory?[['storySubtitle','feedSubtitle'],['storyPrimary','feedPrimary'],['storySecondary','feedSecondary']]:[['feedSubtitle','storySubtitle'],['feedPrimary','storyPrimary'],['feedSecondary','storySecondary']];for(const pair of map)byId(pair[1]).value=byId(pair[0]).value;}
let assetsPromise=null;function assets(){if(!assetsPromise){assetsPromise=(async()=>{const slots=pickHourlySlots(m.hourly);const bg=await load(m.masterUrl);const mainIcon=await load(m.scene.pictogramUrl);const hourIcons=await Promise.all(slots.map(item=>load(item.pictogramUrl)));const solarIcons={dawn:await load(m.solarPictograms.dawn),sunrise:await load(m.solarPictograms.sunrise),noon:await load(m.solarPictograms.noon),sunset:await load(m.solarPictograms.sunset),dusk:await load(m.solarPictograms.dusk)};return{slots,bg,mainIcon,hourIcons,solarIcons};})();}return assetsPromise;}
function updateCopyArea(){const caption=buildCaption(m.feedSocial);m.feedSocial.caption=caption;byId('captionText').textContent=caption;byId('hashtagsText').textContent=m.feedSocial.hashtags||'';const help=document.querySelector('.caption-help');if(help)help.textContent='Version actuellement préparée dans Editorial Studio.';byId('copyCaption').onclick=()=>copyText(caption,'Légende');byId('copyHashtags').onclick=()=>copyText(m.feedSocial.hashtags||'','Hashtags');byId('copyAll').onclick=()=>copyText(caption+'\\n\\n'+(m.feedSocial.hashtags||''),'Légende + hashtags');}
async function applyDrafts(showStatus=true){m.storyVisual={subtitle:value('storySubtitle'),primaryLine:value('storyPrimary'),secondaryLine:value('storySecondary')};m.feedVisual={subtitle:value('feedSubtitle'),primaryLine:value('feedPrimary'),secondaryLine:value('feedSecondary')};m.storySocial={...officialSocial,hashtags:value('storyHashtags')};m.feedSocial={...officialSocial,paragraph1:value('feedParagraph1'),paragraph2:value('feedParagraph2'),hashtags:value('feedHashtags')};m.feedSocial.caption=buildCaption(m.feedSocial);const a=await assets();renderStory(a.bg,a.mainIcon,a.slots,a.hourIcons,a.solarIcons);renderFeed(a.bg,a.mainIcon,a.slots,a.hourIcons,a.solarIcons);updateCopyArea();window.__LOKA_EDITORIAL_DRAFT={story:{visual:{...m.storyVisual},hashtags:m.storySocial.hashtags},feed:{visual:{...m.feedVisual},paragraph1:m.feedSocial.paragraph1,paragraph2:m.feedSocial.paragraph2,caption:m.feedSocial.caption,hashtags:m.feedSocial.hashtags},persisted:false};if(showStatus){byId('editorStatus').textContent='Visuels actualisés.';setTimeout(()=>{if(byId('editorStatus').textContent==='Visuels actualisés.')byId('editorStatus').textContent='';},1800);}}
let timer=null;function schedule(source){syncFrom(source);clearTimeout(timer);timer=setTimeout(()=>applyDrafts(false).catch(error=>{byId('editorStatus').textContent='Erreur de rendu : '+String(error);}),220);}
['storySubtitle','storyPrimary','storySecondary','feedSubtitle','feedPrimary','feedSecondary','storyHashtags','feedParagraph1','feedParagraph2','feedHashtags'].forEach(id=>{byId(id).addEventListener('input',()=>schedule(id));});
byId('applyEditorial').onclick=()=>applyDrafts(true).catch(error=>{byId('editorStatus').textContent='Erreur de rendu : '+String(error);});
byId('resetEditorial').onclick=()=>{writeOfficial();m.storyVisual={...officialVisual};m.feedVisual={...officialVisual};m.storySocial={...officialSocial};m.feedSocial={...officialSocial};applyDrafts(false).then(()=>{byId('editorStatus').textContent='Version officielle rétablie.';setTimeout(()=>{if(byId('editorStatus').textContent==='Version officielle rétablie.')byId('editorStatus').textContent='';},1800);}).catch(error=>{byId('editorStatus').textContent='Erreur de rendu : '+String(error);});};
byId('copyStoryHashtags').onclick=()=>copyText(value('storyHashtags'),'Hashtags Story');
writeOfficial();updateCopyArea();window.__LOKA_EDITORIAL_STUDIO={version:'1.0',persistence:'NONE',officialVisual:{...officialVisual},officialSocial:{...officialSocial}};
})();
</script>`;

function replaceRequired(source: string, before: string, after: string, label: string): string {
  if (!source.includes(before)) throw new Error(`instagram_editorial_studio_marker_missing_${label}`);
  return source.replace(before, after);
}

export function enhanceInstagramWithEditorialStudio(html: string): string {
  let result = html;

  result = replaceRequired(
    result,
    "function drawStoryGeneral(mainIcon){const x=44,y=224,w=992,h=250;box(x,y,w,h);drawImageCentered(mainIcon,171,322,170,138);drawTitleBlock(m.scene.title,290,330,294,480,66,31,800,INK);drawSubtitleBlock(m.visual.subtitle,290,418,407,480,27,20,rgba(INK,.99));",
    "function drawStoryGeneral(mainIcon){const visual=m.storyVisual||m.visual;const x=44,y=224,w=992,h=250;box(x,y,w,h);drawImageCentered(mainIcon,171,322,170,138);drawTitleBlock(m.scene.title,290,330,294,480,66,31,800,INK);drawSubtitleBlock(visual.subtitle,290,418,407,480,27,20,rgba(INK,.99));",
    "story_general"
  );

  result = replaceRequired(
    result,
    "function drawFeedGeneral(mainIcon){const x=50,y=160,w=980,h=240;box(x,y,w,h);drawImageCentered(mainIcon,170,270,158,128);drawTitleBlock(m.scene.title,290,286,252,480,60,28,800,INK);drawSubtitleBlock(m.visual.subtitle,290,350,339,480,23,18,rgba(INK,.99));",
    "function drawFeedGeneral(mainIcon){const visual=m.feedVisual||m.visual;const x=50,y=160,w=980,h=240;box(x,y,w,h);drawImageCentered(mainIcon,170,270,158,128);drawTitleBlock(m.scene.title,290,286,252,480,60,28,800,INK);drawSubtitleBlock(visual.subtitle,290,350,339,480,23,18,rgba(INK,.99));",
    "feed_general"
  );

  result = replaceRequired(
    result,
    "function drawStoryComments(){const x=44,y=1263,w=992,h=172;box(x,y,w,h);const main=normalizeText(m.visual.primaryLine),secondary=normalizeText(m.visual.secondaryLine);",
    "function drawStoryComments(){const visual=m.storyVisual||m.visual;const x=44,y=1263,w=992,h=172;box(x,y,w,h);const main=normalizeText(visual.primaryLine),secondary=normalizeText(visual.secondaryLine);",
    "story_comments"
  );

  result = replaceRequired(
    result,
    "function drawFeedComments(){const x=50,y=955,w=980,h=120;box(x,y,w,h);const main=normalizeText(m.visual.primaryLine),secondary=normalizeText(m.visual.secondaryLine);",
    "function drawFeedComments(){const visual=m.feedVisual||m.visual;const x=50,y=955,w=980,h=120;box(x,y,w,h);const main=normalizeText(visual.primaryLine),secondary=normalizeText(visual.secondaryLine);",
    "feed_comments"
  );

  result = replaceRequired(result, "</head>", `${EDITOR_STYLE}</head>`, "head");
  result = replaceRequired(result, '<div class="caption-card">', `${EDITOR_MARKUP}<div class="caption-card">`, "caption_card");
  result = replaceRequired(result, "</body>", `${EDITOR_SCRIPT}</body>`, "body");

  return result;
}
