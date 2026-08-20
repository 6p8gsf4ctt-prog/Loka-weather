function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const EXPORT_STYLE = `<style>
.editor-export{width:100%;margin-top:8px;background:#f1f1ee;color:#12264A;border:1px solid #e3e0d8}.editor-export:disabled{opacity:.55;cursor:wait}.editor-export-help{font-size:10px;line-height:1.45;color:#8d8983;margin-top:7px}
</style>`;

export function enhanceInstagramWithEditorialExport(html: string, citySlug: string): string {
  const data = safeJson({ citySlug });
  if (!html.includes("</head>") || !html.includes("</body>")) {
    throw new Error("instagram_editorial_export_invalid_html");
  }

  const script = `<script>
(function(){
const EXPORT_DATA=${data};
const STORAGE_KEY='loka_admin_token_v2';
const panel=document.querySelector('.editor-persistence');
if(!panel)return;
const saveButton=document.getElementById('saveEditorialFeedback');
const button=document.createElement('button');
button.className='editor-export';
button.id='exportEditorialFeedback';
button.type='button';
button.textContent='Exporter l’historique pour ChatGPT';
const help=document.createElement('div');
help.className='editor-export-help';
help.textContent='Télécharge un JSON structuré OFFICIEL ↔ VALIDÉ avec le contexte météo, l’interaction Story 2 (question/sondage) et le statut ACTIVE / LEGACY_RETIRED de chaque différence éditoriale.';
if(saveButton){saveButton.insertAdjacentElement('afterend',button);button.insertAdjacentElement('afterend',help);}else{panel.appendChild(button);panel.appendChild(help);}

const status=document.getElementById('editorStatus');
const state=document.getElementById('editorPersistenceState');
const auth=document.getElementById('editorPersistenceAuth');
const tokenInput=document.getElementById('editorPersistenceToken');
function storedToken(){try{return localStorage.getItem(STORAGE_KEY)||'';}catch{return'';}}
function clearToken(){try{localStorage.removeItem(STORAGE_KEY);}catch{}}
function message(value){if(status)status.textContent=value;}
function stateMessage(value,kind=''){if(!state)return;state.textContent=value;state.className='editor-persistence-state'+(kind?' '+kind:'');}
function filenameFrom(response){const disposition=response.headers.get('content-disposition')||'';const match=/filename="?([^";]+)"?/i.exec(disposition);return match?match[1]:'loka-editorial-feedback-'+EXPORT_DATA.citySlug+'.json';}
button.onclick=async()=>{
  const token=storedToken()||String(tokenInput?.value||'').trim();
  if(!token){if(auth)auth.classList.add('visible');stateMessage('Mot de passe requis','error');message('Saisis le mot de passe administrateur pour exporter.');tokenInput?.focus();return;}
  button.disabled=true;button.textContent='Préparation de l’export…';message('Préparation de l’historique éditorial pour ChatGPT…');
  try{
    const response=await fetch('/api/admin/instagram/editorial-feedback/export?city='+encodeURIComponent(EXPORT_DATA.citySlug)+'&limit=500',{headers:{authorization:'Bearer '+token}});
    if(response.status===401){clearToken();if(auth)auth.classList.add('visible');stateMessage('Mot de passe incorrect','error');message('Mot de passe incorrect. Saisis-le à nouveau.');tokenInput?.focus();return;}
    if(!response.ok){let body={};try{body=await response.json();}catch{}throw new Error(String(body.error||('HTTP '+response.status)));}
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filenameFrom(response);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    let count='';try{const text=await blob.text();const parsed=JSON.parse(text);if(Number.isInteger(parsed.caseCount))count=' · '+parsed.caseCount+' cas';}catch{}
    stateMessage('Export ChatGPT prêt'+count,'saved');message('Export éditorial téléchargé. Tu peux envoyer ce fichier directement dans ChatGPT.');
  }catch(error){stateMessage('Export impossible','error');message('Export impossible : '+String(error));}
  finally{button.disabled=false;button.textContent='Exporter l’historique pour ChatGPT';}
};
window.__LOKA_EDITORIAL_EXPORT={version:'1.2',citySlug:EXPORT_DATA.citySlug};
})();
</script>`;

  return html
    .replace("</head>", `${EXPORT_STYLE}</head>`)
    .replace("</body>", `${script}</body>`);
}
