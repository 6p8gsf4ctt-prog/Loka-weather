function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const PERSISTENCE_STYLE = `<style>
.editor-persistence{margin-top:10px;padding:14px;border-radius:18px;background:#f7f6f2;border:1px solid #ece8dc}.editor-persistence-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.editor-persistence-title{font-size:12px;font-weight:760;letter-spacing:.08em}.editor-persistence-state{font-size:10px;line-height:1.35;color:#74716a;text-align:right}.editor-persistence-state.saved{color:#24653a}.editor-persistence-state.error{color:#9c2f2f}.editor-auth{display:none;margin-top:11px}.editor-auth.visible{display:block}.editor-auth label{display:block;font-size:10px;font-weight:720;letter-spacing:.07em;color:#625f58;text-transform:uppercase;margin-bottom:6px}.editor-auth input{display:block;width:100%;border:1px solid #dedbd3;border-radius:12px;background:#fff;color:#171715;padding:11px 12px;font:500 15px/1.2 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;outline:none}.editor-auth input:focus{border-color:#b18a2f;box-shadow:0 0 0 3px rgba(253,181,21,.12)}.editor-save{width:100%;margin-top:11px;background:#12264A;color:#fff}.editor-save:disabled{opacity:.55;cursor:wait}.editor-persistence-help{font-size:10px;line-height:1.45;color:#8d8983;margin-top:8px}.editor-forget{display:none;width:100%;margin-top:6px;background:transparent;color:#74716a;padding:8px;font-size:11px}.editor-forget.visible{display:block}@media(max-width:420px){.editor-persistence-top{display:block}.editor-persistence-state{text-align:left;margin-top:5px}}
</style>`;

export function enhanceInstagramWithEditorialPersistence(html: string, citySlug: string): string {
  const data = safeJson({ citySlug });
  if (!html.includes("</head>") || !html.includes("</body>")) {
    throw new Error("instagram_editorial_persistence_invalid_html");
  }

  const script = `<script>
(function(){
const PERSIST=${data};
const STORAGE_KEY='loka_admin_token_v2';
const API='/api/admin/instagram/editorial-feedback?city='+encodeURIComponent(PERSIST.citySlug);
const studio=document.getElementById('editorialStudio');
if(!studio)return;

const panel=document.createElement('div');
panel.className='editor-persistence';
panel.innerHTML='<div class="editor-persistence-top"><div class="editor-persistence-title">MÉMOIRE ÉDITORIALE</div><div class="editor-persistence-state" id="editorPersistenceState">Non enregistré</div></div><div class="editor-auth" id="editorPersistenceAuth"><label for="editorPersistenceToken">Mot de passe administrateur</label><input id="editorPersistenceToken" type="password" autocomplete="current-password" placeholder="ADMIN_TOKEN"></div><button class="editor-save" id="saveEditorialFeedback" type="button">Enregistrer pour l’apprentissage</button><button class="editor-forget" id="forgetEditorialToken" type="button">Oublier le mot de passe enregistré sur cet appareil</button><div class="editor-persistence-help">LOKA! conserve la version officielle et ta version validée du commentaire météo, de la légende commune et des hashtags. La scène V24 et la prévision officielle ne sont jamais modifiées.</div>';
const warning=studio.querySelector('.editor-warning');
if(warning){warning.textContent='Les retouches peuvent être enregistrées dans la mémoire éditoriale LOKA!. « Rétablir l’officiel » remet les champs communs d’origine. Les anciens sous-titres et interactions restent conservés uniquement pour compatibilité historique.';warning.insertAdjacentElement('beforebegin',panel);}else{studio.appendChild(panel);}

const state=document.getElementById('editorPersistenceState');
const auth=document.getElementById('editorPersistenceAuth');
const tokenInput=document.getElementById('editorPersistenceToken');
const saveButton=document.getElementById('saveEditorialFeedback');
const forgetButton=document.getElementById('forgetEditorialToken');
const status=document.getElementById('editorStatus');

function storedToken(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch{return'';}}
function setStoredToken(value){try{if(value)localStorage.setItem(STORAGE_KEY,value);else localStorage.removeItem(STORAGE_KEY);}catch{}}
function refreshAuth(){const saved=storedToken();auth.classList.toggle('visible',!saved);forgetButton.classList.toggle('visible',!!saved);}
function setState(message,kind=''){state.textContent=message;state.className='editor-persistence-state'+(kind?' '+kind:'');}
function clean(value){return String(value??'').replace(/\\r\\n?/g,'\\n').normalize('NFC').trim();}
function field(id){return clean(document.getElementById(id)?.value);}
function officialLegend(){return[clean(m.social?.paragraph1),clean(m.social?.paragraph2)].filter(Boolean).join('\\n\\n');}
function buildCaption(legend){const blocks=[];if(clean(legend))blocks.push(clean(legend));let signature='';if(m.social.signature)signature+=m.social.signature;if(m.social.handle)signature+=(signature?'\\n':'')+m.social.handle;if(signature)blocks.push(signature);return blocks.join('\\n\\n');}
function legacySubtitle(format){const bridge=window.__LOKA_EDITORIAL_LEGACY_SUBTITLE;if(bridge&&typeof bridge.get==='function')return clean(bridge.get(format));const visual=format==='feed'?m.feedVisual:m.storyVisual;return clean(visual?.subtitle??m.visual?.subtitle??'');}
function setLegacySubtitle(format,value){const bridge=window.__LOKA_EDITORIAL_LEGACY_SUBTITLE;if(bridge&&typeof bridge.set==='function')bridge.set(format,value);}
function currentDrafts(){const primary=field('sharedPrimary'),secondary=field('sharedSecondary'),legend=field('sharedLegend'),hashtags=field('sharedHashtags'),official=officialLegend();const unchangedLegend=legend===official;const paragraph1=unchangedLegend?clean(m.social.paragraph1):legend;const paragraph2=unchangedLegend?clean(m.social.paragraph2):'';const format=m.engagement?.format==='POLL'?'POLL':'QUESTION';const question=clean(m.engagement?.question||'');const optionA=clean(m.engagement?.options?.[0]||'');const optionB=clean(m.engagement?.options?.[1]||'');return{story:{subtitle:legacySubtitle('story'),primaryLine:primary,secondaryLine:secondary,hashtags,engagementFormat:format,engagementQuestion:question,engagementOptionA:optionA,engagementOptionB:optionB},feed:{subtitle:legacySubtitle('feed'),primaryLine:primary,secondaryLine:secondary,paragraph1,paragraph2,caption:buildCaption(legend),hashtags}};}
function feedbackLegend(feed){if(!feed)return officialLegend();return[clean(feed.paragraph1),clean(feed.paragraph2)].filter(Boolean).join('\\n\\n');}
function applyFeedback(feedback){if(!feedback)return false;const story=feedback.storyEdited,feed=feedback.feedEdited,visual=feed||story;if(story)setLegacySubtitle('story',story.subtitle??m.visual?.subtitle??'');if(feed)setLegacySubtitle('feed',feed.subtitle??m.visual?.subtitle??'');if(visual){document.getElementById('sharedPrimary').value=visual.primaryLine||'';document.getElementById('sharedSecondary').value=visual.secondaryLine||'';}document.getElementById('sharedLegend').value=feedbackLegend(feed);document.getElementById('sharedHashtags').value=feed?.hashtags??story?.hashtags??m.social.hashtags??'';document.getElementById('applyEditorial')?.click();window.__LOKA_EDITORIAL_DRAFT=window.__LOKA_EDITORIAL_DRAFT||{};window.__LOKA_EDITORIAL_DRAFT.persisted=true;return !!(story||feed);}
async function request(method,token,body){const options={method,headers:{authorization:'Bearer '+token}};if(body!==undefined){options.headers['content-type']='application/json';options.body=JSON.stringify(body);}const response=await fetch(API,options);let data={};try{data=await response.json();}catch{}if(response.status===401){setStoredToken('');refreshAuth();throw new Error('unauthorized');}if(!response.ok||!data.ok)throw new Error(String(data.error||('HTTP '+response.status)));return data;}
async function loadSaved(){const token=storedToken();if(!token){refreshAuth();setState('Mémoire non chargée');return;}setState('Chargement…');try{const data=await request('GET',token);if(data.feedback&&applyFeedback(data.feedback)){setState('Retouche enregistrée chargée','saved');if(status)status.textContent='Retouche enregistrée chargée depuis LOKA!.';}else{setState('Aucune retouche enregistrée');}}catch(error){if(String(error).includes('unauthorized')){setState('Mot de passe à saisir','error');return;}setState('Chargement impossible','error');if(status)status.textContent='Mémoire éditoriale : '+String(error);}}
async function save(){const token=storedToken()||clean(tokenInput.value);if(!token){auth.classList.add('visible');setState('Mot de passe requis','error');if(status)status.textContent='Saisis le mot de passe administrateur pour enregistrer.';tokenInput.focus();return;}saveButton.disabled=true;saveButton.textContent='Enregistrement…';setState('Enregistrement…');try{document.getElementById('applyEditorial')?.click();const data=await request('POST',token,currentDrafts());setStoredToken(token);tokenInput.value='';refreshAuth();if(data.feedback){setState('Enregistré pour l’apprentissage','saved');if(status)status.textContent='Modifications enregistrées dans la mémoire éditoriale LOKA!.';window.__LOKA_EDITORIAL_DRAFT=window.__LOKA_EDITORIAL_DRAFT||{};window.__LOKA_EDITORIAL_DRAFT.persisted=true;}else{setState('Version officielle · aucune retouche');if(status)status.textContent='Version officielle rétablie : aucune correction n’est conservée.';window.__LOKA_EDITORIAL_DRAFT=window.__LOKA_EDITORIAL_DRAFT||{};window.__LOKA_EDITORIAL_DRAFT.persisted=false;}}catch(error){if(String(error).includes('unauthorized')){auth.classList.add('visible');setState('Mot de passe incorrect','error');if(status)status.textContent='Mot de passe incorrect. Saisis-le à nouveau.';tokenInput.focus();}else{setState('Enregistrement impossible','error');if(status)status.textContent='Enregistrement impossible : '+String(error);}}finally{saveButton.disabled=false;saveButton.textContent='Enregistrer pour l’apprentissage';}}

saveButton.onclick=()=>save();
forgetButton.onclick=()=>{setStoredToken('');tokenInput.value='';refreshAuth();setState('Mot de passe oublié sur cet appareil');};
document.getElementById('resetEditorial')?.addEventListener('click',()=>{setState('Officiel rétabli localement · à enregistrer');window.__LOKA_EDITORIAL_DRAFT=window.__LOKA_EDITORIAL_DRAFT||{};window.__LOKA_EDITORIAL_DRAFT.persisted=false;});
refreshAuth();
window.__LOKA_EDITORIAL_PERSISTENCE={version:'1.3',api:API,storageKey:STORAGE_KEY,legacySubtitle:'PRESERVED_HIDDEN',legacyEngagement:'PRESERVED_HIDDEN',sharedLegend:true};
setTimeout(()=>loadSaved(),80);
})();
</script>`;

  return html
    .replace("</head>", `${PERSISTENCE_STYLE}</head>`)
    .replace("</body>", `${script}</body>`);
}
