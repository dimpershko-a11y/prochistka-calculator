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
  const firstTypeKey = state.form.cleanType && state.cleaningTypes[state.form.cleanType] ? state.form.cleanType : getFirstCleanTypeKey();
  const type = state.cleaningTypes[firstTypeKey] || {};
  const firstClutter = Object.keys(type.clutter || {})[0] || 'low';
  const firstDirtiness = Object.keys(type.dirtiness || {})[0] || 'low';
  const cleanExtras = (state.extras || []).map(item=>({...clone(item), qty:0}));
  const formDefaults = {
    ...(clone(defaults.form||{})),
    clientName:'',
    objectType: state.form.objectType || (defaults.form && defaults.form.objectType) || 'Квартира',
    area:0,
    cleanType:firstTypeKey,
    discount:0,
    discountMode:'percent',
    discountAmount:0,
    clutter:firstClutter,
    dirtiness:firstDirtiness,
    travelType: state.form.travelType || (defaults.form && defaults.form.travelType) || 'kad',
    travelKm: Number(state.form.travelKm)||20,
    ownerRole: state.form.ownerRole || (defaults.form && defaults.form.ownerRole) || 'cleaner_manager',
    profitPercent: Number(state.form.profitPercent) || Number(defaults.form && defaults.form.profitPercent) || 25,
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
function exportConfigFile(){
  const nextRevision = Math.max(Number(APP_CONFIG.CONFIG_REVISION)||0, Number(state.ui && state.ui.configRevision)||0) + 1;
  const payload = {
    APP_VERSION,
    APP_PASSWORD: APP_CONFIG.APP_PASSWORD || '',
    CONFIG_REVISION: nextRevision,
    SYNC_BRAND_PDF_ON_REVISION: true,
    WINDOW_CATEGORIES,
    defaults: buildConfigDefaultsFromState()
  };
  const text = 'window.PROCHISTKA_CONFIG = ' + JSON.stringify(payload, null, 2) + ';\n';
  downloadText(text, 'config.js', 'application/javascript;charset=utf-8');
  toast(`config.js скачан. Ревизия: ${nextRevision}`);
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
function importBackupFile(file){ readJsonFile(file, data=>{ const result=CORE.validateBackup(data, defaults); if(!result.ok){ toast(result.error); return; } state=mergeState(result.state); migrateV43(); migrateV46(); syncConfigRevision(); fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder(); toast('Резервная копия восстановлена'); }); }
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
