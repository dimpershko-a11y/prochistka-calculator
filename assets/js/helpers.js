// DOM/формат-хелперы, виды уборки, экспорт/импорт данных, доступ по паролю.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' ₽';
const num=n=>Math.max(0, Number(n)||0);
const hours=n=>(Math.round((Number(n)||0)*10)/10).toFixed(1)+' ч';
function pluralRu(n, one, few, many){ const m10=n%10, m100=n%100; if(m10===1&&m100!==11) return one; if(m10>=2&&m10<=4&&(m100<12||m100>14)) return few; return many; }
const cleaningsWord=n=>pluralRu(n,'уборка','уборки','уборок');

function getCleaningTypes(){
  syncLegacyFromCleaningTypes(state);
  return state.cleaningTypes || {};
}
function getFirstCleanTypeKey(){
  return Object.keys(getCleaningTypes())[0] || 'general';
}
function getCleaningType(key){
  const types=getCleaningTypes();
  return types[key] || types[getFirstCleanTypeKey()] || null;
}
function getActiveCleaningType(){ return getCleaningType(state.form.cleanType); }
function getTypeClutter(typeKey=state.form.cleanType){
  const t=getCleaningType(typeKey);
  return (t && t.clutter) || state.clutter || {};
}
function getTypeDirtiness(typeKey=state.form.cleanType){
  const t=getCleaningType(typeKey);
  return (t && t.dirtiness) || state.dirtiness || {};
}
function getTypeIncluded(typeKey=state.form.cleanType){
  const t=getCleaningType(typeKey);
  return (t && t.included) || state.includedByType?.[typeKey] || '';
}
function setTypeIncluded(typeKey, text){
  const t=getCleaningType(typeKey);
  if(t) t.included=text;
  state.includedByType=state.includedByType||{};
  state.includedByType[typeKey]=text;
  syncLegacyFromCleaningTypes(state);
}
function getTypeWindowDescription(typeKey=state.form.cleanType){
  const t=getCleaningType(typeKey);
  return (t && (t.windowsDescription || t.windows)) || state.serviceDescriptions?.windows || '';
}
function setTypeWindowDescription(typeKey, text){
  const t=getCleaningType(typeKey);
  if(t) t.windowsDescription=text;
  state.serviceDescriptions=state.serviceDescriptions||{};
  if(!state.serviceDescriptions.windows) state.serviceDescriptions.windows=text;
}
function ensureFormCleanTypeAndCoefs(resetCoefs=false){
  const types=getCleaningTypes();
  if(!types[state.form.cleanType]) state.form.cleanType=getFirstCleanTypeKey();
  const cl=getTypeClutter(state.form.cleanType);
  const di=getTypeDirtiness(state.form.cleanType);
  if(resetCoefs || !cl[state.form.clutter]) state.form.clutter=Object.keys(cl)[0] || '';
  if(resetCoefs || !di[state.form.dirtiness]) state.form.dirtiness=Object.keys(di)[0] || '';
}
function uniqueCleanTypeKey(label){
  const base = String(label||'type').toLowerCase()
    .replace(/ё/g,'e').replace(/[а-я]/g, ch=>({а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya'}[ch]||''))
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'type';
  let key=base, i=2;
  const types=getCleaningTypes();
  while(types[key]) key=`${base}_${i++}`;
  return key;
}
function uniqueCoefKey(collection, prefix){
  const base=prefix || 'level';
  let key=`${base}_${Date.now().toString(36)}`;
  let i=2;
  while(collection[key]) key=`${base}_${Date.now().toString(36)}_${i++}`;
  return key;
}

const WINDOW_CATEGORIES = APP_CONFIG.WINDOW_CATEGORIES || ['Окна'];
function isWindowExtra(item){ const cat=String(item?.category||'').toLowerCase(); return WINDOW_CATEGORIES.some(x=>cat.includes(String(x).toLowerCase())) || /окн|остекл/i.test(String(item?.name||'')); }
function hasSelectedWindowExtras(){ return (state.extras||[]).some(x=>num(x.qty)>0 && isWindowExtra(x)); }
function getIncludedLines(){
  const base=(getTypeIncluded(state.form.cleanType)||'').trim().split(/\n+/).filter(Boolean);
  const win=(getTypeWindowDescription(state.form.cleanType)||'').trim().split(/\n+/).filter(Boolean);
  return hasSelectedWindowExtras() ? base.concat(win) : base;
}
function getIncludedText(){ return getIncludedLines().join('\n'); }
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadJson(data, filename){
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'}), filename);
}
function downloadText(text, filename, mimeType='text/plain;charset=utf-8'){
  downloadBlob(new Blob([text], {type:mimeType}), filename);
}
function buildConfigDefaultsFromState(){
  syncLegacyFromCleaningTypes(state);
  const configuredDefault = defaults.form?.cleanType;
  const firstTypeKey = configuredDefault && configuredDefault!=='extras_only' && state.cleaningTypes[configuredDefault]
    ? configuredDefault
    : (state.cleaningTypes.postreno ? 'postreno' : (Object.keys(state.cleaningTypes).find(k=>k!=='extras_only') || getFirstCleanTypeKey()));
  const type = state.cleaningTypes[firstTypeKey] || {};
  const firstClutter = Object.keys(type.clutter || {})[0] || 'low';
  const firstDirtiness = Object.keys(type.dirtiness || {})[0] || 'low';
  const cleanExtras = (state.extras || []).map(item=>({...clone(item), qty:0}));
  const formDefaults = {
    ...(clone(defaults.form||{})),
    clientName:'',
    address:'',
    objectType: (defaults.form && defaults.form.objectType) || 'Квартира',
    area:0,
    cleanType:firstTypeKey,
    discount:0,
    discountMode:'percent',
    discountAmount:0,
    forceDiscount:false,
    clutter:firstClutter,
    dirtiness:firstDirtiness,
    travelType: (defaults.form && defaults.form.travelType) || 'kad',
    travelKm: Number(defaults.form && defaults.form.travelKm)||20,
    outsideKad:false,
    managerOnSite:false,
    ownerRole:'none',
    profitPercent: Number(state.pricing?.profitPercent) || Number(defaults.pricing?.profitPercent) || 25,
    notes:'',
    showOnlySelected:false
  };
  return {
    brand: clone(state.brand || defaults.brand || {}),
    baseRates: clone(state.baseRates || defaults.baseRates || {}),
    clutter: clone(state.clutter || defaults.clutter || {}),
    dirtiness: clone(state.dirtiness || defaults.dirtiness || {}),
    travel: clone(state.travel || defaults.travel || {}),
    includedByType: clone(state.includedByType || defaults.includedByType || {}),
    pdfSettings: clone(state.pdfSettings || defaults.pdfSettings || {}),
    mainInfo: clone(state.mainInfo || defaults.mainInfo || {}),
    extras: cleanExtras,
    form: formDefaults,
    labor: clone(state.labor || defaults.labor || {}),
    materialPerM2: state.materialPerM2 != null ? Number(state.materialPerM2) : defaults.materialPerM2,
    estimateValidityDays: state.estimateValidityDays != null ? Number(state.estimateValidityDays) : defaults.estimateValidityDays,
    overhead: clone(state.overhead || defaults.overhead || {}),
    ui:{showTariffs:false, showSettings:false, settingsTab:'company', tariffInnerTab:'main', extraGroupsOpen:{}},
    savedOrders:[],
    serviceDescriptions: clone(state.serviceDescriptions || defaults.serviceDescriptions || {}),
    extraCategories: getExtraCategories(),
    pdfHeader: clone(state.pdfHeader || defaults.pdfHeader || {}),
    cleaningTypes: clone(state.cleaningTypes || defaults.cleaningTypes || {})
  };
}
function getSyncEndpoint(){
  return String(state?.ui?.syncEndpoint || APP_CONFIG.SYNC_ENDPOINT || '').trim();
}
function buildConfigPayload(nextRevision){
  return {
    APP_VERSION,
    APP_PASSWORD: APP_CONFIG.APP_PASSWORD || '',
    CONFIG_REVISION: Number(nextRevision)||0,
    SYNC_BRAND_PDF_ON_REVISION: true,
    SYNC_ENDPOINT: getSyncEndpoint(),
    WINDOW_CATEGORIES,
    defaults: buildConfigDefaultsFromState()
  };
}
function buildConfigText(nextRevision){
  return 'window.PROCHISTKA_CONFIG = ' + JSON.stringify(buildConfigPayload(nextRevision), null, 2) + ';\n';
}
function exportConfigFile(){
  const nextRevision = Math.max(Number(APP_CONFIG.CONFIG_REVISION)||0, Number(state.ui && state.ui.configRevision)||0, Number(state.ui && state.ui.pendingConfigRevision)||0) + 1;
  downloadText(buildConfigText(nextRevision), 'config.js', 'application/javascript;charset=utf-8');
  toast(`config.js скачан. Ревизия: ${nextRevision}`);
}
function parseConfigJsText(text){
  const raw=String(text||'').trim();
  const match=raw.match(/^window\.PROCHISTKA_CONFIG\s*=\s*([\s\S]*?);?\s*$/);
  if(!match) throw new Error('Не удалось распознать config.js');
  const parsed=JSON.parse(match[1]);
  if(!parsed || typeof parsed!=='object' || !parsed.defaults) throw new Error('В config.js нет defaults');
  return parsed;
}
function normalizeSyncEndpoint(url){
  const value=String(url||'').trim();
  if(!value) return '';
  let parsed;
  try{ parsed=new URL(value); }catch(e){ throw new Error('Некорректный URL Apps Script'); }
  if(parsed.protocol!=='https:' || parsed.hostname!=='script.google.com' || !/\/macros\/s\/[^/]+\/exec$/.test(parsed.pathname)){
    throw new Error('Нужен URL опубликованного Apps Script, заканчивающийся на /exec');
  }
  return parsed.toString();
}
function saveSyncEndpointFromUi(){
  const input=$('syncEndpoint');
  try{
    const endpoint=normalizeSyncEndpoint(input?.value||'');
    state.ui=state.ui||{};
    state.ui.syncEndpoint=endpoint;
    saveState();
    if(input) input.value=endpoint;
    renderSyncStatus();
    toast(endpoint?'URL синхронизации сохранён':'URL синхронизации очищен');
    return endpoint;
  }catch(e){ toast(e.message||'Некорректный URL'); return ''; }
}
function getSyncSecretFromUi(){
  const input=$('syncSecret');
  const typed=String(input?.value||'').trim();
  if(typed) sessionStorage.setItem('prochistka_sync_secret',typed);
  return typed || String(sessionStorage.getItem('prochistka_sync_secret')||'');
}
function renderSyncStatus(){
  const status=$('syncStatus');
  const endpointInput=$('syncEndpoint');
  if(endpointInput && document.activeElement!==endpointInput) endpointInput.value=getSyncEndpoint();
  const applied=Number(state?.ui?.configRevision||0);
  const pending=Math.max(Number(state?.ui?.pendingConfigRevision||0), Number(APP_CONFIG.CONFIG_REVISION)||0);
  const dirty=isConfigDirty();
  let text='Синхронизация ещё не настроена.';
  let kind='notice';
  if(state?.ui?.configConflict && pending>applied){
    text=`Конфликт: на GitHub доступна ревизия ${pending}, но на этом устройстве есть неопубликованные изменения.`;
    kind='notice warning';
  } else if(dirty){
    text=`Есть неопубликованные изменения · применённая ревизия ${applied || '—'}.`;
    kind='notice warning';
  } else if(pending>applied){
    text=`Доступно обновление настроек: ревизия ${pending} · локально ${applied || '—'}.`;
    kind='notice warning';
  } else if(applied){
    text=`Синхронизировано · ревизия ${applied}.`;
  }
  if(state?.ui?.remoteAppVersion && state.ui.remoteAppVersion!==APP_VERSION){
    text += ` Доступна новая версия приложения: ${state.ui.remoteAppVersion}.`;
    kind='notice warning';
  }
  if(status){ status.className=kind; status.textContent=text; }
  const applyBtn=$('applyRemoteConfigBtn');
  if(applyBtn) applyBtn.classList.toggle('hidden', !(pending>applied));
}
function rerenderAfterConfigSync(){
  ensureFormCleanTypeAndCoefs(false);
  fillForm();
  renderTariffs();
  renderExtras();
  renderSettingsPanel();
  renderSelectedExtras();
  recalc();
  renderSyncStatus();
}
async function checkRemoteConfig(interactive=false, force=false){
  try{
    const remote=await fetchPublishedConfig();
    if(!remote) throw new Error('GitHub не вернул корректный config.js');
    if(remote.APP_VERSION && remote.APP_VERSION!==APP_VERSION){
      state.ui=state.ui||{};
      state.ui.remoteAppVersion=remote.APP_VERSION;
      saveState();
      renderSyncStatus();
      if(interactive) toast(`Доступна версия ${remote.APP_VERSION}. Обновите страницу после публикации новой версии сайта.`);
      return {status:'app_update',appVersion:remote.APP_VERSION,revision:Number(remote.CONFIG_REVISION)||0};
    }
    state.ui=state.ui||{};
    delete state.ui.remoteAppVersion;
    const result=applyRemoteConfigObject(remote,force);
    if(result.status==='applied'){
      rerenderAfterConfigSync();
      if(interactive) toast(`Настройки обновлены до ревизии ${result.revision}`);
    } else if(result.status==='conflict'){
      renderSyncStatus();
      if(interactive) toast('Новая конфигурация найдена, но есть неопубликованные локальные изменения');
    } else {
      renderSyncStatus();
      if(interactive) toast('Установлена актуальная конфигурация');
    }
    return result;
  }catch(e){
    renderSyncStatus();
    if(interactive) toast(`Не удалось проверить config.js: ${e.message||e}`);
    return {status:'error',error:String(e.message||e)};
  }
}
const CONFIG_PUBLISH_API_URL='https://api.github.com/repos/dimpershko-a11y/prochistka-calculator/contents/config.js?ref=production';
const CONFIG_PUBLISH_RAW_URL='https://raw.githubusercontent.com/dimpershko-a11y/prochistka-calculator/production/config.js';
async function fetchPublishedConfig(){
  try{
    const response=await fetch(`${CONFIG_PUBLISH_RAW_URL}?sync=${Date.now()}`,{cache:'no-store'});
    if(response.ok){
      const text=await response.text();
      if(text && text.trim()) return parseConfigJsText(text);
    }
  }catch(e){}
  try{
    const response=await fetch(`${CONFIG_PUBLISH_API_URL}&sync=${Date.now()}`,{
      cache:'no-store',
      headers:{Accept:'application/vnd.github+json'}
    });
    if(response.ok){
      const body=await response.text();
      if(!body || !body.trim()) return null;
      const data=JSON.parse(body);
      const compact=String(data?.content||'').replace(/\s/g,'');
      if(!compact) return null;
      const binary=atob(compact);
      let decoded='';
      if(typeof TextDecoder==='function'){
        const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
        decoded=new TextDecoder('utf-8').decode(bytes);
      }else{
        const escaped=Array.from(binary,ch=>'%'+ch.charCodeAt(0).toString(16).padStart(2,'0')).join('');
        decoded=decodeURIComponent(escaped);
      }
      return parseConfigJsText(decoded);
    }
  }catch(e){}
  return null;
}
async function verifyPublishedConfigRevision(expectedRevision){
  const expected=Number(expectedRevision)||0;
  if(!expected) return null;
  const remote=await fetchPublishedConfig();
  const revision=Number(remote?.CONFIG_REVISION)||0;
  if(revision<expected) return null;
  return {ok:true,revision,commitSha:'',verifiedVia:'github'};
}
function postConfigToAppsScript(endpoint, fields){
  return new Promise((resolve,reject)=>{
    const requestId=`sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const frameName=`prochistkaSyncFrame_${Date.now()}`;
    const iframe=document.createElement('iframe');
    iframe.name=frameName; iframe.hidden=true; iframe.setAttribute('aria-hidden','true');
    const form=document.createElement('form');
    form.method='POST'; form.action=endpoint; form.target=frameName; form.hidden=true;
    const add=(name,value)=>{ const input=document.createElement('input'); input.type='hidden'; input.name=name; input.value=String(value??''); form.appendChild(input); };
    add('action','publishConfig'); add('requestId',requestId);
    Object.entries(fields||{}).forEach(([name,value])=>add(name,value));
    const expectedRevision=Number(fields?.revision)||0;
    let timer=null, verifyTimer=null, settled=false, verifying=false;
    const cleanup=()=>{ clearTimeout(timer); clearInterval(verifyTimer); window.removeEventListener('message',onMessage); form.remove(); iframe.remove(); };
    const finish=(fn,value)=>{ if(settled) return; settled=true; cleanup(); fn(value); };
    const onMessage=event=>{
      let host='';
      try{ host=new URL(event.origin).hostname; }catch(e){}
      if(host!=='script.google.com' && !/(^|\.)googleusercontent\.com$/.test(host)) return;
      const data=event.data||{};
      if(data.type!=='prochistka-config-sync' || data.requestId!==requestId) return;
      if(data.ok) finish(resolve,data); else finish(reject,new Error(data.error||'Apps Script вернул ошибку'));
    };
    const verify=async()=>{
      if(settled || verifying || !expectedRevision) return;
      verifying=true;
      try{
        const verified=await verifyPublishedConfigRevision(expectedRevision);
        if(verified) finish(resolve,verified);
      }finally{
        verifying=false;
      }
    };
    window.addEventListener('message',onMessage);
    document.body.appendChild(iframe); document.body.appendChild(form);
    timer=setTimeout(async()=>{
      await verify();
      if(!settled) finish(reject,new Error('Не удалось подтвердить публикацию через Apps Script и GitHub за 30 секунд'));
    },30000);
    if(expectedRevision) verifyTimer=setInterval(verify,2000);
    form.submit();
    if(expectedRevision) setTimeout(verify,2500);
  });
}
async function publishConfigToCloud(){
  const btn=$('publishConfigBtn');
  let endpoint='';
  try{
    endpoint=normalizeSyncEndpoint($('syncEndpoint')?.value || getSyncEndpoint());
    if(!endpoint) throw new Error('Сначала укажите URL Apps Script');
  }catch(e){ toast(e.message||'Не указан Apps Script'); return; }
  const secret=getSyncSecretFromUi();
  if(!secret){ toast('Введите ключ публикации Apps Script'); return; }
  state.ui=state.ui||{};
  state.ui.syncEndpoint=endpoint;
  saveState();
  const nextRevision=Math.max(Number(APP_CONFIG.CONFIG_REVISION)||0,Number(state.ui.configRevision)||0,Number(state.ui.pendingConfigRevision)||0)+1;
  const payload=buildConfigPayload(nextRevision);
  payload.SYNC_ENDPOINT=endpoint;
  const configText='window.PROCHISTKA_CONFIG = '+JSON.stringify(payload,null,2)+';\n';
  if(btn){ btn.disabled=true; btn.textContent='Публикуем…'; }
  try{
    const result=await postConfigToAppsScript(endpoint,{
      secret,
      revision:nextRevision,
      appVersion:APP_VERSION,
      configText
    });
    applyRemoteConfigObject(payload,true);
    state.ui.syncEndpoint=endpoint;
    state.ui.lastPublishedAt=Date.now();
    state.ui.lastPublishedCommit=String(result.commitSha||'');
    saveState();
    rerenderAfterConfigSync();
    toast(`Настройки опубликованы · ревизия ${nextRevision}`);
  }catch(e){
    toast(`Публикация не выполнена: ${e.message||e}`);
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Опубликовать настройки'; }
    renderSyncStatus();
  }
}
function readJsonFile(file, cb){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ try{ cb(JSON.parse(String(reader.result||'{}'))); }catch(e){ toast('Не удалось прочитать JSON-файл'); } };
  reader.readAsText(file, 'utf-8');
}
function exportOrders(){ downloadJson({type:'prochistka_orders', version:APP_VERSION, exportedAt:new Date().toISOString(), savedOrders:state.savedOrders||[]}, `prochistka-orders-${Date.now()}.json`); }
function importOrdersFile(file){ readJsonFile(file, data=>{ const incoming = Array.isArray(data.savedOrders)?data.savedOrders:(Array.isArray(data)?data:[]); if(!incoming.length){ toast('В файле нет заказов'); return; } const map=new Map((state.savedOrders||[]).map(o=>[String(o.id),o])); incoming.forEach(o=>map.set(String(o.id||Date.now()+Math.random()), o)); state.savedOrders=Array.from(map.values()).slice(0,50); saveState(); renderSavedOrders(); toast('Заказы импортированы'); }); }
function exportBackup(){ state.ui=state.ui||{}; state.ui.ordersSinceBackup=0; state.ui.lastBackupAt=Date.now(); saveState(); downloadJson({type:'prochistka_full_backup', version:APP_VERSION, exportedAt:new Date().toISOString(), state}, `prochistka-backup-${Date.now()}.json`); if(typeof updateBackupReminder==='function') updateBackupReminder(); }
function importBackupFile(file){ readJsonFile(file, data=>{ const result=CORE.validateBackup(data, defaults); if(!result.ok){ toast(result.error); return; } state=mergeState(result.state); migrateV43(); migrateV46(); migrateV415(); syncConfigRevision(); fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder(); toast('Резервная копия восстановлена'); }); }
function isEditUnlocked(){
  const pass = APP_CONFIG.APP_PASSWORD || APP_CONFIG.appPassword || '';
  return !pass || sessionStorage.getItem('prochistka_edit_ok') === '1';
}
function setEditUnlocked(){
  sessionStorage.setItem('prochistka_edit_ok','1');
  document.body.classList.add('edit-unlocked');
}
function lockEditing(){
  sessionStorage.removeItem('prochistka_edit_ok');
  document.body.classList.remove('edit-unlocked');
  state.ui.showTariffs=false;
  state.ui.showSettings=false;
  closeSettingsModal();
  renderExtras();
  saveState();
  toast('Режим изменений закрыт');
}
function requestEditAccess(afterUnlock){
  if(isEditUnlocked()){
    document.body.classList.add('edit-unlocked');
    if(typeof afterUnlock === 'function') afterUnlock();
    return true;
  }
  const overlay=$('loginOverlay');
  const input=$('appPasswordInput');
  const err=$('appPasswordError');
  if(err) err.textContent='';
  if(input) input.value='';
  window.__pendingEditAction = afterUnlock || null;
  if(overlay) overlay.classList.remove('hidden');
  setTimeout(()=>input && input.focus(),50);
  return false;
}
function setupAccess(){
  const pass = APP_CONFIG.APP_PASSWORD || APP_CONFIG.appPassword || '';
  const overlay=$('loginOverlay'); if(!overlay) return;
  overlay.classList.add('hidden');
  if(!pass){ document.body.classList.add('edit-unlocked'); return; }
  if(isEditUnlocked()) document.body.classList.add('edit-unlocked');
  const input=$('appPasswordInput'), btn=$('appPasswordBtn'), err=$('appPasswordError'), cancel=$('appPasswordCancelBtn');
  const close=()=>{ overlay.classList.add('hidden'); window.__pendingEditAction=null; };
  const check=()=>{
    if(String(input.value)===String(pass)){
      setEditUnlocked();
      overlay.classList.add('hidden');
      const cb=window.__pendingEditAction; window.__pendingEditAction=null;
      renderExtras();
      if(typeof cb === 'function') cb();
      toast('Доступ к изменениям открыт');
    } else {
      err.textContent='Неверный пароль';
    }
  };
  if(btn) btn.onclick=check;
  if(cancel) cancel.onclick=close;
  if(input) input.onkeydown=e=>{ if(e.key==='Enter') check(); if(e.key==='Escape') close(); };
}
