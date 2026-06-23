const STORAGE_KEY = 'prochistka_calc_app_v4';
const APP_CONFIG = window.PROCHISTKA_CONFIG || {};
const CORE = window.PROCHISTKA_CORE;
const APP_VERSION = APP_CONFIG.APP_VERSION || 'v4.7.0';
const defaults = APP_CONFIG.defaults || {};
defaults.brand = defaults.brand || {name:'PRO-CHISTKA', phone:'', tagline:'Клининговые услуги', site:'', contactText:'', logoDataUrl:''};
if(!defaults.brand.contactText){ defaults.brand.contactText = [defaults.brand.phone, defaults.brand.site].filter(Boolean).join('\n'); }
defaults.pdfHeader = defaults.pdfHeader || {useLogo:false,fontFamily:'Arial, sans-serif',nameFontSize:30,taglineFontSize:13,contactFontSize:13,nameWeight:800,contactWeight:600,nameLetterSpacing:1.2,taglineLetterSpacing:0.2,contactLetterSpacing:0.2,nameLineHeight:1.05,taglineLineHeight:1.25,contactLineHeight:1.35,contactFontFamily:'',contactAlign:'right',uppercaseName:true,nameColor:'#0f172a',taglineColor:'#475569',contactColor:'#0f172a',borderColor:'#0f172a',borderWidth:2,paddingBottom:16,marginBottom:22};
defaults.baseRates = defaults.baseRates || {};
defaults.clutter = defaults.clutter || {};
defaults.dirtiness = defaults.dirtiness || {};
defaults.travel = defaults.travel || {kad:{label:'В пределах КАД',base:0,perKm:0},km15:{label:'До 15 км от КАД',base:1500,perKm:0},km20plus:{label:'20+ км',base:1500,perKm:15}};
defaults.labor = defaults.labor || {cleanerDay:5000,ownerManagerDay:5000,ownerCleanerManagerDay:7000,hourlyRate:550,maxHoursPerDay:9};
defaults.materialPerM2 = defaults.materialPerM2 != null ? defaults.materialPerM2 : 15;
defaults.overhead = defaults.overhead || {monthly:75000,jobsPerMonth:10};
defaults.includedByType = defaults.includedByType || {};
defaults.serviceDescriptions = defaults.serviceDescriptions || {windows:''};
defaults.pdfSettings = defaults.pdfSettings || {order:['client','included','extras','pricing','main_info','useful_info','notes'], visible:{client:true,included:true,extras:true,pricing:true,main_info:true,useful_info:true,notes:true}};
defaults.mainInfo = defaults.mainInfo || {equipmentText:'', chemistryText:'', usefulInfo:'Всё необходимое для клининга — техника и моющие средства — привозим самостоятельно.\nРаботаем по договору.\nПриём оплаты: наличные, перевод, QR-код СБП, ссылка СБП, карта VISA/MasterCard/МИР, Долями от Т-Банка, безналичный расчёт для юридических лиц.'};
defaults.extras = defaults.extras || [];
defaults.form = defaults.form || {clientName:'',objectType:'Квартира',area:0,cleanType:'general',discount:0,discountMode:'percent',discountAmount:0,clutter:'low',dirtiness:'low',travelType:'kad',travelKm:20,ownerRole:'cleaner_manager',profitPercent:25,notes:'',showOnlySelected:false};
defaults.savedOrders = [];
defaults.ui = defaults.ui || {showTariffs:false, showSettings:false, extraGroupsCollapsed:{}};
function clone(x){return JSON.parse(JSON.stringify(x));}
function buildCleaningTypesFromLegacy(target){
  const baseRates = (target && target.baseRates) || {};
  const includedByType = (target && target.includedByType) || {};
  const fallbackClutter = (target && target.clutter) || {};
  const fallbackDirtiness = (target && target.dirtiness) || {};
  const out = {};
  Object.entries(baseRates).forEach(([key, value])=>{
    const rate = value || {};
    out[key] = {
      label: rate.label || key,
      rate: Number(rate.rate)||0,
      min: Number(rate.min)||0,
      speed: Number(rate.speed)||1,
      included: includedByType[key] || '',
      clutter: clone(fallbackClutter),
      dirtiness: clone(fallbackDirtiness)
    };
  });
  return out;
}
function normalizeCleaningTypes(cleaningTypes, target){
  const legacy = buildCleaningTypesFromLegacy(target || {});
  const source = cleaningTypes && typeof cleaningTypes === 'object' && !Array.isArray(cleaningTypes) && Object.keys(cleaningTypes).length ? cleaningTypes : legacy;
  const fallbackClutter = (target && target.clutter) || defaults.clutter || {};
  const fallbackDirtiness = (target && target.dirtiness) || defaults.dirtiness || {};
  const includedByType = (target && target.includedByType) || {};
  const out = {};
  Object.entries(source || {}).forEach(([key, value])=>{
    const t = value || {};
    out[key] = {
      label: t.label || (legacy[key] && legacy[key].label) || key,
      rate: Number(t.rate ?? (legacy[key] && legacy[key].rate)) || 0,
      min: Number(t.min ?? (legacy[key] && legacy[key].min)) || 0,
      speed: Number(t.speed ?? (legacy[key] && legacy[key].speed)) || 1,
      included: t.included ?? includedByType[key] ?? (legacy[key] && legacy[key].included) ?? '',
      clutter: (t.clutter && typeof t.clutter === 'object' && Object.keys(t.clutter).length) ? clone(t.clutter) : clone(fallbackClutter),
      dirtiness: (t.dirtiness && typeof t.dirtiness === 'object' && Object.keys(t.dirtiness).length) ? clone(t.dirtiness) : clone(fallbackDirtiness)
    };
  });
  if(!Object.keys(out).length){
    out.general = {label:'Генеральная', rate:300, min:12000, speed:7, included:'', clutter:{low:{label:'Обычная',priceK:1,timeK:1}}, dirtiness:{low:{label:'Обычная',priceK:1,timeK:1}}};
  }
  return out;
}
function syncLegacyFromCleaningTypes(target){
  if(!target.cleaningTypes || typeof target.cleaningTypes !== 'object' || Array.isArray(target.cleaningTypes) || !Object.keys(target.cleaningTypes).length){
    target.cleaningTypes = buildCleaningTypesFromLegacy(target);
  }
  if(!target.cleaningTypes || !Object.keys(target.cleaningTypes).length){
    target.cleaningTypes = {general:{label:'Генеральная', rate:300, min:12000, speed:7, included:'', clutter:{low:{label:'Обычная',priceK:1,timeK:1}}, dirtiness:{low:{label:'Обычная',priceK:1,timeK:1}}}};
  }
  const fallbackClutter = (target && target.clutter && Object.keys(target.clutter).length) ? target.clutter : (defaults.clutter || {});
  const fallbackDirtiness = (target && target.dirtiness && Object.keys(target.dirtiness).length) ? target.dirtiness : (defaults.dirtiness || {});
  Object.entries(target.cleaningTypes).forEach(([key,t])=>{
    if(!t || typeof t !== 'object') target.cleaningTypes[key]={label:key, rate:0, min:0, speed:1, included:'', clutter:clone(fallbackClutter), dirtiness:clone(fallbackDirtiness)};
    const item=target.cleaningTypes[key];
    item.label = item.label || key;
    item.rate = Number(item.rate)||0;
    item.min = Number(item.min)||0;
    item.speed = Number(item.speed)||1;
    item.included = item.included ?? target.includedByType?.[key] ?? '';
    if(!item.clutter || typeof item.clutter !== 'object' || !Object.keys(item.clutter).length) item.clutter = clone(fallbackClutter);
    if(!item.dirtiness || typeof item.dirtiness !== 'object' || !Object.keys(item.dirtiness).length) item.dirtiness = clone(fallbackDirtiness);
  });
  const baseRates = {};
  const includedByType = {};
  Object.entries(target.cleaningTypes).forEach(([key,t])=>{
    baseRates[key] = {label:t.label, rate:Number(t.rate)||0, min:Number(t.min)||0, speed:Number(t.speed)||1};
    includedByType[key] = t.included || '';
  });
  target.baseRates = baseRates;
  target.includedByType = {...(target.includedByType||{}), ...includedByType};
  return target;
}
defaults.cleaningTypes = normalizeCleaningTypes(defaults.cleaningTypes, defaults);
syncLegacyFromCleaningTypes(defaults);
function getDefaultContactText(){ return [defaults.brand?.phone, defaults.brand?.site].filter(Boolean).join('\n'); }
function ensureBrandContactText(obj){
  if(!obj.brand) obj.brand={};
  if(!obj.brand.contactText) obj.brand.contactText=[obj.brand.phone,obj.brand.site].filter(Boolean).join('\n') || getDefaultContactText();
}
function mergeConfiguredExtras(configExtras, currentExtras){
  const qtyById = new Map((Array.isArray(currentExtras)?currentExtras:[]).map(x=>[String(x.id), Math.max(0, Number(x.qty)||0)]));
  return (Array.isArray(configExtras)?configExtras:[]).map(x=>({...clone(x), qty: qtyById.has(String(x.id)) ? qtyById.get(String(x.id)) : Math.max(0, Number(x.qty)||0)}));
}
function applyConfigRevisionData(){
  state.cleaningTypes = clone(defaults.cleaningTypes);
  syncLegacyFromCleaningTypes(state);
  state.travel = clone(defaults.travel);
  state.labor = clone(defaults.labor);
  state.materialPerM2 = defaults.materialPerM2;
  state.overhead = clone(defaults.overhead);
  state.extras = mergeConfiguredExtras(defaults.extras, state.extras);
  state.includedByType = clone(state.includedByType || defaults.includedByType);
  state.serviceDescriptions = clone(defaults.serviceDescriptions);
  state.mainInfo = {...(state.mainInfo||{}), ...(clone(defaults.mainInfo)||{})};
  // Шапка PDF и контакты часто настраиваются вручную в браузере.
  // По умолчанию повышение CONFIG_REVISION не перезаписывает их, чтобы обновления цен не сбивали оформление сметы.
  // Для принудительной раздачи шапки из config.js можно поставить SYNC_BRAND_PDF_ON_REVISION: true.
  if(APP_CONFIG.SYNC_BRAND_PDF_ON_REVISION === true){
    state.brand = {...(state.brand||{}), ...(clone(defaults.brand)||{})};
    state.pdfHeader = {...(state.pdfHeader||{}), ...(clone(defaults.pdfHeader)||{})};
  }
  ensureBrandContactText(state);
}
function mergeState(parsed){
  const d=clone(defaults);
  return {
    ...d,...parsed,
    brand:{...d.brand,...(parsed.brand||{})},
    cleaningTypes: normalizeCleaningTypes(parsed.cleaningTypes || d.cleaningTypes, {...d, ...parsed}),
    baseRates:{...d.baseRates,...(parsed.baseRates||{})},
    pdfHeader:{...d.pdfHeader,...(parsed.pdfHeader||{})},
    clutter:{...d.clutter,...(parsed.clutter||{})},
    dirtiness:{...d.dirtiness,...(parsed.dirtiness||{})},
    travel:{...d.travel,...(parsed.travel||{})},
    labor:{...d.labor,...(parsed.labor||{})},
    materialPerM2: parsed.materialPerM2 != null ? parsed.materialPerM2 : d.materialPerM2,
    overhead:{...d.overhead,...(parsed.overhead||{})},
    includedByType:{...d.includedByType,...(parsed.includedByType||{})},
    serviceDescriptions:{...d.serviceDescriptions,...(parsed.serviceDescriptions||{})},
    pdfSettings:{order:Array.isArray(parsed.pdfSettings?.order)?parsed.pdfSettings.order:d.pdfSettings.order, visible:{...d.pdfSettings.visible,...(parsed.pdfSettings?.visible||{})}},
    mainInfo:{...d.mainInfo,...(parsed.mainInfo||{})},
    form:{...d.form,...(parsed.form||{})},
    savedOrders:Array.isArray(parsed.savedOrders)?parsed.savedOrders:[],
    extras:Array.isArray(parsed.extras)?parsed.extras:d.extras,
    ui:{...d.ui,...(parsed.ui||{})}
  };
}
let __rawLocal=null; try{ __rawLocal=localStorage.getItem(STORAGE_KEY); }catch(e){}
const hadLocalState = !!__rawLocal;
let state; try{ state=__rawLocal?mergeState(JSON.parse(__rawLocal)):mergeState(clone(defaults)); }catch(e){state=mergeState(clone(defaults))}
syncLegacyFromCleaningTypes(state);
ensureBrandContactText(state);
// Миграция: новая шапка PDF по умолчанию текстовая, старый тяжёлый base64-логотип удаляем из локального состояния.
if(state.pdfHeader && state.pdfHeader.useLogo === false && state.brand && state.brand.logoDataUrl && String(state.brand.logoDataUrl).length > 10000){ state.brand.logoDataUrl=''; try{saveState();}catch(e){} }

function migrateV43(){
  state.pdfSettings = state.pdfSettings || clone(defaults.pdfSettings);
  state.pdfSettings.order = (state.pdfSettings.order||defaults.pdfSettings.order).map(k=>k==='payment_methods'?'useful_info':k);
  if(!state.pdfSettings.order.includes('useful_info')){
    const notesIdx = state.pdfSettings.order.indexOf('notes');
    if(notesIdx>=0) state.pdfSettings.order.splice(notesIdx,0,'useful_info'); else state.pdfSettings.order.push('useful_info');
  }
  state.pdfSettings.visible = {...(state.pdfSettings.visible||{})};
  if(state.pdfSettings.visible.payment_methods !== undefined && state.pdfSettings.visible.useful_info === undefined){ state.pdfSettings.visible.useful_info = state.pdfSettings.visible.payment_methods; }
  if(state.pdfSettings.visible.useful_info === undefined) state.pdfSettings.visible.useful_info = true;
  delete state.pdfSettings.visible.payment_methods;
  state.mainInfo = state.mainInfo || {};
  if(!state.mainInfo.usefulInfo){
    state.mainInfo.usefulInfo = (defaults.mainInfo&&defaults.mainInfo.usefulInfo) || '';
  }
  state.ui = state.ui || {};
  if(state.ui.lastMigration !== 'v4.3.1-pdf-clean'){
    state.ui.extraGroupsOpen = {};
    delete state.ui.extraGroupsCollapsed;
    state.ui.lastMigration = 'v4.3.1-pdf-clean';
  }
  saveState();
}
// Миграция v4.6: переход на модель полной себестоимости.
// Старый "слепой" процент прибыли (наценка на ФОТ, часто 50%) больше не означает то же самое,
// поэтому при первом запуске сбрасываем его на новую целевую наценку из конфига и ставим роль на объекте.
function migrateV46(){
  state.ui = state.ui || {};
  state.form = state.form || {};
  if(!['none','manager','cleaner_manager'].includes(state.form.ownerRole)){
    state.form.ownerRole = (defaults.form && defaults.form.ownerRole) || 'cleaner_manager';
  }
  if(state.ui.modelV46 !== true){
    state.form.profitPercent = Number(defaults.form && defaults.form.profitPercent) || 25;
    if(!state.labor) state.labor = clone(defaults.labor);
    if(state.materialPerM2 == null) state.materialPerM2 = defaults.materialPerM2;
    if(!state.overhead) state.overhead = clone(defaults.overhead);
    state.ui.modelV46 = true;
    saveState();
  }
}
migrateV43();
migrateV46();
syncConfigRevision();

// === Защита от потери данных ===
// 1) Просим браузер не вытеснять данные.
try{ if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); } }catch(e){}

// 2) Дублируем состояние в IndexedDB (переживает часть случаев очистки localStorage).
const IDB_NAME='prochistka_db', IDB_STORE='state', IDB_KEY='current';
function idbOpen(){ return new Promise((resolve,reject)=>{ try{ const rq=indexedDB.open(IDB_NAME,1); rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE); }; rq.onsuccess=()=>resolve(rq.result); rq.onerror=()=>reject(rq.error); }catch(e){ reject(e); } }); }
async function idbSave(obj){ try{ const db=await idbOpen(); await new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).put(JSON.stringify(obj),IDB_KEY); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); db.close(); }catch(e){} }
async function idbLoad(){ try{ const db=await idbOpen(); const val=await new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readonly'); const rq=tx.objectStore(IDB_STORE).get(IDB_KEY); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); }); db.close(); return val?JSON.parse(val):null; }catch(e){ return null; } }

// 3) Если localStorage оказался пустым, пробуем восстановиться из IndexedDB.
function attemptIdbRecovery(){
  if(hadLocalState) return;
  idbLoad().then(saved=>{
    if(!saved) return;
    const hasOrders = Array.isArray(saved.savedOrders) && saved.savedOrders.length>0;
    const hasExtras = Array.isArray(saved.extras) && saved.extras.length>0;
    if(!hasOrders && !hasExtras) return;
    state=mergeState(saved); migrateV43(); migrateV46(); syncConfigRevision();
    fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder();
    toast('Данные восстановлены из резервного хранилища');
  }).catch(()=>{});
}

// Источник истины для экономики и общих настроек — config.js.
// При повышении CONFIG_REVISION приложение перезаписывает из конфига ставки,
// коэффициенты, выезд, труд, материалы, накладные, доп. услуги, описания и PDF-шапку.
// Количество выбранных доп. услуг в текущем расчёте сохраняется по id.
function syncConfigRevision(){
  const rev = Number(APP_CONFIG.CONFIG_REVISION)||0;
  state.ui = state.ui || {};
  const currentRev = Number(state.ui.configRevision || 0);
  if(rev > currentRev){
    applyConfigRevisionData();
    state.ui.configRevision = rev;
    saveState();
    if(typeof toast==='function') setTimeout(()=>toast('Настройки и экономика обновлены из config.js'),300);
  } else {
    ensureBrandContactText(state);
  }
}

var __idbTimer=null;
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  clearTimeout(__idbTimer);
  __idbTimer=setTimeout(()=>idbSave(state),800);
}

const BACKUP_REMIND_AFTER = 3;   // показать напоминание после N новых заказов без копии
const AUTO_BACKUP_EVERY = 10;    // авто-скачивание копии каждые N заказов (если включено)
function updateBackupReminder(){
  state.ui = state.ui || {};
  const since = Number(state.ui.ordersSinceBackup||0);
  const last = state.ui.lastBackupAt;
  const toggle=$('autoBackupToggle'); if(toggle) toggle.checked=!!state.ui.autoBackup;
  const status=$('backupStatus');
  if(status){
    status.textContent = last
      ? `Последняя копия: ${new Date(last).toLocaleString('ru-RU')}. Новых заказов с тех пор: ${since}.`
      : 'Резервная копия ещё не скачивалась. Сделайте первую копию и храните её вне браузера.';
  }
  const el=$('backupReminder'); if(!el) return;
  const days = last ? (Date.now()-last)/86400000 : Infinity;
  const ordersCount = (state.savedOrders||[]).length;
  const show = since>=BACKUP_REMIND_AFTER || (since>0 && days>7) || (!last && ordersCount>0);
  if(show){
    el.classList.remove('hidden');
    el.innerHTML = `<strong>Пора сделать резервную копию.</strong> ${since>0?`Новых заказов без копии: ${since}. `:''}Нажмите «Скачать резервную копию» и сохраните файл в облако или на флешку.`;
  } else { el.classList.add('hidden'); el.innerHTML=''; }
}
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' ₽';
const num=n=>Math.max(0, Number(n)||0);
const hours=n=>(Math.round((Number(n)||0)*10)/10).toFixed(1)+' ч';

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
  const win=(state.serviceDescriptions?.windows||'').trim().split(/\n+/).filter(Boolean);
  return hasSelectedWindowExtras() ? base.concat(win) : base;
}
function getIncludedText(){ return getIncludedLines().join('\n'); }
function downloadJson(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
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
  $('tariffsCard').classList.add('hidden');
  $('settingsCard').classList.add('hidden');
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
function saveSettingsNow(){
  saveState();
  toast('Настройки сохранены');
}

function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(window._tt); window._tt=setTimeout(()=>t.classList.add('hidden'),2500); }
function validateCurrentOrder(){
  document.querySelectorAll('.field-error').forEach(el=>el.classList.remove('field-error'));
  const errors=CORE.validateOrder(state);
  if(num(state.form.area)<=0) $('area')?.classList.add('field-error');
  if(errors.length) toast(errors[0]);
  return errors;
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
function fillSelect(selectId, obj, selected){ const el=$(selectId); el.innerHTML=''; Object.entries(obj).forEach(([k,v])=>{ const o=document.createElement('option'); o.value=k; o.textContent=v.label; if(k===selected)o.selected=true; el.appendChild(o); }); }

function moveItem(arr, from, to){
  if(to < 0 || to >= arr.length || from === to) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from,1);
  copy.splice(to,0,item);
  return copy;
}
function renderPdfBlocks(){
  const labels = {client:'Шапка и данные клиента', included:'Что входит в уборку', extras:'Дополнительные услуги', pricing:'Стоимость и итоги', useful_info:'Дополнительная информация', main_info:'Основная информация', notes:'Заметки'};
  const wrap = $('pdfBlocksWrap'); if(!wrap) return;
  wrap.innerHTML = '';
  state.pdfSettings.order.forEach((key)=>{
    const card = document.createElement('div'); card.className = 'extra-card';
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <label style="margin:0;display:flex;align-items:center;gap:8px"><input type="checkbox" data-pdf-visible="${key}" ${state.pdfSettings.visible[key]?'checked':''}> ${labels[key]||key}</label>
      <div class="btns" style="gap:6px"><button type="button" data-pdf-up="${key}">↑</button><button type="button" data-pdf-down="${key}">↓</button></div>
    </div>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('[data-pdf-visible]').forEach(el=>el.onchange=e=>{ state.pdfSettings.visible[e.target.dataset.pdfVisible]=e.target.checked; saveState(); });
  wrap.querySelectorAll('[data-pdf-up]').forEach(el=>el.onclick=()=>{ const i=state.pdfSettings.order.indexOf(el.dataset.pdfUp); state.pdfSettings.order=moveItem(state.pdfSettings.order,i,i-1); saveState(); renderPdfBlocks(); });
  wrap.querySelectorAll('[data-pdf-down]').forEach(el=>el.onclick=()=>{ const i=state.pdfSettings.order.indexOf(el.dataset.pdfDown); state.pdfSettings.order=moveItem(state.pdfSettings.order,i,i+1); saveState(); renderPdfBlocks(); });
}
function renderExtrasEditor(){
  const wrap = $('extrasEditorWrap'); if(!wrap) return;
  wrap.innerHTML = '';
  state.extras.forEach(item=>{
    const div = document.createElement('div'); div.className = 'extra-card';
    div.innerHTML = `<div class="grid g3">
      <div><label>Название</label><input data-edit-extra="${item.id}" data-field="name" value="${esc(item.name)}"></div>
      <div><label>Ед. изм.</label><input data-edit-extra="${item.id}" data-field="unit" value="${esc(item.unit)}"></div>
      <div><label>Категория / блок</label><input data-edit-extra="${item.id}" data-field="category" value="${esc(item.category)}"></div>
      <div><label>Цена</label><input type="number" min="0" data-edit-extra="${item.id}" data-field="price" value="${num(item.price)}"></div>
      <div><label>Время, ч</label><input type="number" min="0" step="0.1" data-edit-extra="${item.id}" data-field="time" value="${num(item.time)}"></div>
      <div class="btns" style="align-items:end"><button type="button" data-extra-up="${item.id}">↑</button><button type="button" data-extra-down="${item.id}">↓</button><button type="button" data-extra-delete="${item.id}" class="danger">Удалить</button></div>
    </div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-edit-extra]').forEach(el=>el.oninput=e=>{ const item=state.extras.find(x=>x.id===Number(e.target.dataset.editExtra)); if(!item) return; const f=e.target.dataset.field; item[f]=['price','time'].includes(f)?(Number(e.target.value)||0):e.target.value; saveState(); renderExtras(); });
  wrap.querySelectorAll('[data-extra-delete]').forEach(el=>el.onclick=()=>{ state.extras=state.extras.filter(x=>x.id!==Number(el.dataset.extraDelete)); saveState(); renderExtras(); renderExtrasEditor(); });
  wrap.querySelectorAll('[data-extra-up]').forEach(el=>el.onclick=()=>{ const i=state.extras.findIndex(x=>x.id===Number(el.dataset.extraUp)); state.extras=moveItem(state.extras,i,i-1); saveState(); renderExtras(); renderExtrasEditor(); });
  wrap.querySelectorAll('[data-extra-down]').forEach(el=>el.onclick=()=>{ const i=state.extras.findIndex(x=>x.id===Number(el.dataset.extraDown)); state.extras=moveItem(state.extras,i,i+1); saveState(); renderExtras(); renderExtrasEditor(); });
}
function renderSettingsPanel(){
  if($('brandName')) $('brandName').value=state.brand.name;
  if($('brandTagline')) $('brandTagline').value=state.brand.tagline;
  if($('brandContactText')) $('brandContactText').value=state.brand.contactText || [state.brand.phone,state.brand.site].filter(Boolean).join('\n');
  setPdfHeaderInputs();
  bindPdfHeaderInputs();
  if($('equipmentText')) $('equipmentText').value=state.mainInfo.equipmentText||'';
  if($('chemistryText')) $('chemistryText').value=state.mainInfo.chemistryText||'';
  if($('usefulInfoText')) $('usefulInfoText').value=state.mainInfo.usefulInfo||'';
  if($('windowServicesDescription')) $('windowServicesDescription').value=state.serviceDescriptions?.windows||'';
  renderBrandLogoPreview();
  renderPdfBlocks();
  renderExtrasEditor();
}
function getTariffEditorKey(){
  const types=getCleaningTypes();
  state.ui=state.ui||{};
  if(!types[state.ui.tariffCleanType]) state.ui.tariffCleanType = state.form.cleanType && types[state.form.cleanType] ? state.form.cleanType : getFirstCleanTypeKey();
  return state.ui.tariffCleanType;
}
function renderCoefficientEditor(wrapId, typeKey, groupName, fieldName){
  const wrap=$(wrapId); if(!wrap) return;
  const type=getCleaningType(typeKey); if(!type) { wrap.innerHTML=''; return; }
  const collection=type[fieldName]=type[fieldName]||{};
  wrap.innerHTML='';
  const head=document.createElement('div'); head.className='extra-card';
  head.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
    <div><strong>${esc(groupName)}</strong><div class="muted" style="font-size:13px">Настраивается только для вида: ${esc(type.label)}</div></div>
    <button type="button" class="primary" data-add-coef="${fieldName}">Добавить тип</button>
  </div>`;
  wrap.appendChild(head);
  Object.entries(collection).forEach(([key,v])=>{
    const div=document.createElement('div'); div.className='extra-card';
    div.innerHTML=`<div class="grid g3">
      <div><label>Название</label><input type="text" data-coef-edit="${fieldName}" data-key="${key}" data-field="label" value="${esc(v.label||key)}"></div>
      <div><label>Коэффициент цены</label><input type="number" step="0.01" min="0" data-coef-edit="${fieldName}" data-key="${key}" data-field="priceK" value="${Number(v.priceK)||1}"></div>
      <div><label>Коэффициент времени</label><input type="number" step="0.01" min="0" data-coef-edit="${fieldName}" data-key="${key}" data-field="timeK" value="${Number(v.timeK)||1}"></div>
    </div>
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
      <span class="muted" style="font-size:12px">ID: ${esc(key)}</span>
      <button type="button" class="danger" data-delete-coef="${fieldName}" data-key="${key}">Удалить тип</button>
    </div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-add-coef]').forEach(btn=>btn.onclick=()=>{
    const field=btn.dataset.addCoef;
    const label=prompt(field==='clutter'?'Название новой заставленности':'Название новой загрязнённости','Новый тип');
    if(!label) return;
    const col=type[field]=type[field]||{};
    const key=uniqueCoefKey(col, field==='clutter'?'clutter':'dirt');
    col[key]={label, priceK:1, timeK:1};
    if(field==='clutter' && !state.form.clutter) state.form.clutter=key;
    if(field==='dirtiness' && !state.form.dirtiness) state.form.dirtiness=key;
    syncLegacyFromCleaningTypes(state); saveState(); renderTariffs(); populateMainSelects(); recalc();
  });
  wrap.querySelectorAll('[data-coef-edit]').forEach(inp=>inp.oninput=e=>{
    const {coefEdit,key,field}=e.target.dataset;
    const col=type[coefEdit]=type[coefEdit]||{};
    col[key]=col[key]||{};
    col[key][field]=field==='label'?e.target.value:num(e.target.value);
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); recalc();
  });
  wrap.querySelectorAll('[data-delete-coef]').forEach(btn=>btn.onclick=()=>{
    const field=btn.dataset.deleteCoef, key=btn.dataset.key;
    const col=type[field]||{};
    if(Object.keys(col).length<=1){ toast('Должен остаться хотя бы один тип'); return; }
    if(!confirm('Удалить этот тип коэффициента?')) return;
    delete col[key];
    if(field==='clutter' && state.form.cleanType===typeKey && state.form.clutter===key) state.form.clutter=Object.keys(col)[0];
    if(field==='dirtiness' && state.form.cleanType===typeKey && state.form.dirtiness===key) state.form.dirtiness=Object.keys(col)[0];
    syncLegacyFromCleaningTypes(state); saveState(); renderTariffs(); populateMainSelects(); recalc();
  });
}
function renderTariffs(){
  syncLegacyFromCleaningTypes(state);
  const rates=$('ratesWrap'); if(!rates) return; rates.innerHTML='';
  const types=getCleaningTypes();
  const typeKey=getTariffEditorKey();
  const type=getCleaningType(typeKey);
  const card=document.createElement('div'); card.className='extra-card';
  card.innerHTML=`<div class="grid g2">
    <div><label>Страница настроек вида уборки</label><select id="tariffCleanTypeSelect">${Object.entries(types).map(([k,t])=>`<option value="${esc(k)}" ${k===typeKey?'selected':''}>${esc(t.label||k)}</option>`).join('')}</select></div>
    <div class="btns" style="align-items:end">
      <button type="button" class="primary" id="addCleanTypeBtn">Добавить вид уборки</button>
      <button type="button" id="duplicateCleanTypeBtn">Дублировать</button>
      <button type="button" class="danger" id="deleteCleanTypeBtn">Удалить</button>
    </div>
  </div>
  <div class="notice" style="margin-top:12px">У каждого вида уборки теперь свои цена за м², минимальная стоимость, скорость, описание, заставленность и загрязнённость. Сначала выбери страницу вида уборки здесь, затем редактируй его параметры ниже.</div>`;
  rates.appendChild(card);
  const main=document.createElement('div'); main.className='extra-card';
  main.innerHTML=`<div class="chip">Основные параметры выбранного вида</div>
    <div class="grid g3">
      <div><label>Название вида уборки</label><input type="text" data-clean-main="label" value="${esc(type.label||typeKey)}"></div>
      <div><label>Цена, ₽ / м²</label><input type="number" min="0" data-clean-main="rate" value="${num(type.rate)}"></div>
      <div><label>Минимальная стоимость</label><input type="number" min="0" data-clean-main="min" value="${num(type.min)}"></div>
      <div><label>Скорость, м² / час</label><input type="number" min="0.1" step="0.1" data-clean-main="speed" value="${num(type.speed)||1}"></div>
      <div><label>ID вида</label><input type="text" value="${esc(typeKey)}" readonly></div>
    </div>
    <div style="margin-top:12px"><label>Описание / что входит именно в этот вид уборки</label><textarea id="tariffIncludedText" placeholder="Описание будет попадать в смету для выбранного вида уборки">${esc(type.included||'')}</textarea></div>`;
  rates.appendChild(main);
  const select=$('tariffCleanTypeSelect'); if(select) select.onchange=e=>{ state.ui.tariffCleanType=e.target.value; saveState(); renderTariffs(); };
  const addBtn=$('addCleanTypeBtn'); if(addBtn) addBtn.onclick=()=>{
    const label=prompt('Название нового вида уборки','Новый вид уборки');
    if(!label) return;
    const key=uniqueCleanTypeKey(label);
    const src=clone(type || Object.values(types)[0] || {});
    state.cleaningTypes[key]={...src,label, included:'', clutter:clone(src.clutter||getTypeClutter()), dirtiness:clone(src.dirtiness||getTypeDirtiness())};
    state.ui.tariffCleanType=key;
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); renderTariffs(); toast('Вид уборки добавлен');
  };
  const dupBtn=$('duplicateCleanTypeBtn'); if(dupBtn) dupBtn.onclick=()=>{
    const label=prompt('Название копии вида уборки', `${type.label||typeKey} — копия`);
    if(!label) return;
    const key=uniqueCleanTypeKey(label);
    state.cleaningTypes[key]={...clone(type), label};
    state.ui.tariffCleanType=key;
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); renderTariffs(); toast('Вид уборки скопирован');
  };
  const delBtn=$('deleteCleanTypeBtn'); if(delBtn) delBtn.onclick=()=>{
    if(Object.keys(types).length<=1){ toast('Должен остаться хотя бы один вид уборки'); return; }
    if(!confirm(`Удалить вид уборки «${type.label}»?`)) return;
    delete state.cleaningTypes[typeKey];
    const next=getFirstCleanTypeKey();
    state.ui.tariffCleanType=next;
    if(state.form.cleanType===typeKey) state.form.cleanType=next;
    ensureFormCleanTypeAndCoefs(true);
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); renderTariffs(); recalc(); toast('Вид уборки удалён');
  };
  rates.querySelectorAll('[data-clean-main]').forEach(inp=>inp.oninput=e=>{
    const field=e.target.dataset.cleanMain;
    type[field]=field==='label'?e.target.value:num(e.target.value);
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); renderIncludedPreview(); recalc();
  });
  const inc=$('tariffIncludedText'); if(inc) inc.oninput=e=>{ setTypeIncluded(typeKey,e.target.value); saveState(); if(state.form.cleanType===typeKey){ if($('includedServices')) $('includedServices').value=e.target.value; renderIncludedPreview(); } };
  renderCoefficientEditor('clutterWrap', typeKey, 'Типы заставленности для этого вида уборки', 'clutter');
  renderCoefficientEditor('dirtWrap', typeKey, 'Типы загрязнённости для этого вида уборки', 'dirtiness');
  const travel=$('travelWrap'); if(travel){ travel.innerHTML='';
    Object.entries(state.travel||{}).forEach(([k,v])=>{
      const div=document.createElement('div'); div.className='extra-card';
      div.innerHTML=`<div class="grid g3">
        <div><label>Название</label><input type="text" data-kind="travel" data-key="${k}" data-field="label" value="${esc(v.label)}"></div>
        <div><label>База, ₽</label><input type="number" min="0" data-kind="travel" data-key="${k}" data-field="base" value="${num(v.base)}"></div>
        <div><label>₽ / км</label><input type="number" min="0" data-kind="travel" data-key="${k}" data-field="perKm" value="${num(v.perKm)}"></div>
      </div>`;
      travel.appendChild(div);
    });
  }
  const laborW=$('laborWrap'); if(laborW){ const L=state.labor||{}; laborW.innerHTML='';
    const card=document.createElement('div'); card.className='extra-card';
    card.innerHTML=`<div class="grid g2">
      <div><label>День клинера, ₽</label><input type="number" min="0" data-cfg="labor" data-field="cleanerDay" value="${num(L.cleanerDay)}"></div>
      <div><label>Лимит часов на человека/день</label><input type="number" min="1" step="0.5" data-cfg="labor" data-field="maxHoursPerDay" value="${num(L.maxHoursPerDay)||9}"></div>
      <div><label>Твой день: менеджер, ₽</label><input type="number" min="0" data-cfg="labor" data-field="ownerManagerDay" value="${num(L.ownerManagerDay)}"></div>
      <div><label>Твой день: клинер+менеджер, ₽</label><input type="number" min="0" data-cfg="labor" data-field="ownerCleanerManagerDay" value="${num(L.ownerCleanerManagerDay)}"></div>
    </div>`;
    laborW.appendChild(card);
  }
  const ovW=$('overheadWrap'); if(ovW){ const O=state.overhead||{}; const perJob=num(O.jobsPerMonth)>0?num(O.monthly)/num(O.jobsPerMonth):0; ovW.innerHTML='';
    const card=document.createElement('div'); card.className='extra-card';
    card.innerHTML=`<div class="grid g3">
      <div><label>Материалы, ₽ / м²</label><input type="number" min="0" step="0.5" data-cfg="material" data-field="materialPerM2" value="${num(state.materialPerM2)}"></div>
      <div><label>Накладные в месяц, ₽</label><input type="number" min="0" data-cfg="overhead" data-field="monthly" value="${num(O.monthly)}"></div>
      <div><label>Заказов в месяц</label><input type="number" min="1" data-cfg="overhead" data-field="jobsPerMonth" value="${num(O.jobsPerMonth)||1}"></div>
    </div>
    <div class="muted" style="margin-top:8px">Накладные на один заказ: <strong id="overheadPerJobHint">${money(perJob)}</strong></div>`;
    ovW.appendChild(card);
  }
  document.querySelectorAll('[data-cfg]').forEach(inp=>inp.oninput=(e)=>{ const {cfg,field}=e.target.dataset; const val=num(e.target.value); if(cfg==='material'){ state.materialPerM2=val; } else { state[cfg]=state[cfg]||{}; state[cfg][field]=val; } if($('overheadPerJobHint')){ const O=state.overhead||{}; $('overheadPerJobHint').textContent=money(num(O.jobsPerMonth)>0?num(O.monthly)/num(O.jobsPerMonth):0); } saveState(); recalc(); });
  document.querySelectorAll('[data-kind]').forEach(inp=>inp.oninput=(e)=>{ const {kind,key,field}=e.target.dataset; state[kind][key][field]=(field==='label')?e.target.value:num(e.target.value); saveState(); populateMainSelects(); recalc(); });
}
function populateMainSelects(){ ensureFormCleanTypeAndCoefs(false); const types=getCleaningTypes(); fillSelect('cleanType', types, state.form.cleanType); const active=getActiveCleaningType(); const clutter=getTypeClutter(state.form.cleanType); const dirtiness=getTypeDirtiness(state.form.cleanType); fillSelect('clutter', clutter, state.form.clutter); fillSelect('dirtiness', dirtiness, state.form.dirtiness); const travelOpts=(state.travel&&Object.keys(state.travel).length)?state.travel:{kad:{label:'В пределах КАД'},km15:{label:'До 15 км от КАД'},km20plus:{label:'20+ км'}}; fillSelect('travelType', travelOpts, state.form.travelType); if($('includedTypeLabel')) $('includedTypeLabel').textContent=active ? active.label : '—'; if($('includedServices')) $('includedServices').value=getTypeIncluded(state.form.cleanType)||''; }
function getGroupedExtras(){ const arr=state.form.showOnlySelected?state.extras.filter(x=>num(x.qty)>0):state.extras; const map={}; arr.forEach(x=>{ const c=x.category||'Другое'; (map[c]||(map[c]=[])).push(x); }); return map; }
function isExtraGroupOpen(cat){ return !!(state.ui.extraGroupsOpen && state.ui.extraGroupsOpen[cat]); }
function setExtraGroupOpen(cat, isOpen){ state.ui.extraGroupsOpen=state.ui.extraGroupsOpen||{}; state.ui.extraGroupsOpen[cat]=!!isOpen; saveState(); }
function renderExtras(){ const wrap=$('extrasWrap'); wrap.innerHTML=''; const groups=getGroupedExtras(); const cats=Object.keys(groups); if(!cats.length){ wrap.innerHTML='<div class="notice">Нет услуг для отображения.</div>'; return; }
  cats.forEach(cat=>{
    const details=document.createElement('details'); details.className='extra-card'; details.style.padding='0'; details.open=isExtraGroupOpen(cat);
    details.innerHTML=`<summary style="list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:800"><span>${esc(cat)}</span><span class="muted" style="font-weight:600">${groups[cat].length} поз.</span></summary><div class="grid" style="gap:12px;padding:0 14px 14px"></div>`;
    const content=details.querySelector('div');
    details.addEventListener('toggle', ()=>setExtraGroupOpen(cat, details.open));
    groups[cat].forEach(item=>{
      const div=document.createElement('div'); div.className='extra-card extra-item'; div.style.margin='0';
      const edit = isEditUnlocked();
      div.innerHTML=`<div class="extra-name-row">
          <textarea class="service-name-field" rows="2" data-extra="${item.id}" data-field="name" ${edit?'':'readonly'}>${esc(item.name)}</textarea>
          ${(!item.builtIn && edit)?`<button class="extra-del-btn danger" data-remove="${item.id}" type="button">Удалить</button>`:''}
        </div>
        <div class="muted extra-meta">${esc(item.unit)} · ~ ${hours(item.time)}</div>
        <div class="extra-controls">
          <div><label>Кол-во</label><input type="number" min="0" value="${num(item.qty)}" data-extra="${item.id}" data-field="qty"></div>
          <div><label>Цена</label><input type="number" min="0" value="${num(item.price)}" data-extra="${item.id}" data-field="price" ${edit?'':'disabled'}></div>
          <div><label>Время, ч</label><input type="number" min="0" step="0.1" value="${num(item.time)}" data-extra="${item.id}" data-field="time" ${edit?'':'disabled'}></div>
        </div>`;
      content.appendChild(div);
    });
    wrap.appendChild(details);
  });
  document.querySelectorAll('[data-extra]').forEach(inp=>inp.oninput=(e)=>{ const id=Number(e.target.dataset.extra); const field=e.target.dataset.field; if(field!=='qty' && !isEditUnlocked()){ requestEditAccess(()=>renderExtras()); return; } const item=state.extras.find(x=>x.id===id); if(!item)return; item[field]=field==='name'?e.target.value:num(e.target.value); saveState(); recalc(); renderSelectedExtras(); if(field==='name'||state.form.showOnlySelected) renderExtras(); });
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>requestEditAccess(()=>{ const id=Number(btn.dataset.remove); state.extras=state.extras.filter(x=>x.id!==id); saveState(); renderExtras(); recalc(); toast('Услуга удалена'); }));
  document.querySelectorAll('.service-name-field').forEach(el=>{ el.style.height='auto'; el.style.height=(el.scrollHeight+2)+'px'; });
}
function calc(){
  return CORE.calculateOrder(state);
}
function renderIncludedPreview(){ const lines=getIncludedLines(); $('includedPreview').innerHTML=lines.length?lines.map(x=>`<div>• ${esc(x)}</div>`).join(''):'<div class="muted">Пока не заполнено.</div>'; }
function renderBrandLogoPreview(){ const wrap=$('brandLogoPreview'); if(!wrap) return; const useLogo=!!(state.pdfHeader&&state.pdfHeader.useLogo); if(!useLogo){ wrap.innerHTML='Текстовая шапка активна. Логотип-картинка в PDF не используется.'; return; } if(state.brand.logoDataUrl){ wrap.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><img src="${state.brand.logoDataUrl}" alt="Логотип" style="max-height:70px;max-width:220px;object-fit:contain;border:1px solid #dbe3ef;border-radius:10px;background:#fff;padding:6px"><span class="muted">Логотип будет показан в печатной смете.</span></div>`; } else { wrap.innerHTML='Логотип пока не выбран.'; } }
function setPdfHeaderInputs(){
  const h=state.pdfHeader||{};
  const set=(id,val)=>{ const el=$(id); if(el) el.value=val ?? ''; };
  set('pdfHeaderFontFamily',h.fontFamily||'Arial, sans-serif');
  set('pdfHeaderNameSize',h.nameFontSize||30);
  set('pdfHeaderNameWeight',h.nameWeight||800);
  set('pdfHeaderNameLetterSpacing',h.nameLetterSpacing??0);
  set('pdfHeaderTaglineSize',h.taglineFontSize||13);
  set('pdfHeaderTaglineLetterSpacing',h.taglineLetterSpacing??0);
  set('pdfHeaderContactFontFamily',h.contactFontFamily||'');
  set('pdfHeaderContactSize',h.contactFontSize||13);
  set('pdfHeaderContactWeight',h.contactWeight||600);
  set('pdfHeaderContactLetterSpacing',h.contactLetterSpacing??0);
  set('pdfHeaderContactLineHeight',h.contactLineHeight??1.35);
  set('pdfHeaderContactAlign',h.contactAlign||'right');
  set('pdfHeaderUppercaseName',String(h.uppercaseName!==false));
  set('pdfHeaderNameColor',h.nameColor||'#0f172a');
  set('pdfHeaderTaglineColor',h.taglineColor||'#475569');
  set('pdfHeaderContactColor',h.contactColor||'#0f172a');
  set('pdfHeaderBorderColor',h.borderColor||'#0f172a');
  set('pdfHeaderBorderWidth',h.borderWidth??2);
  set('pdfHeaderPaddingBottom',h.paddingBottom??16);
  set('pdfHeaderMarginBottom',h.marginBottom??22);
  set('pdfHeaderUseLogo',String(!!h.useLogo));
}
function bindPdfHeaderInputs(){
  const fields={
    pdfHeaderFontFamily:['fontFamily','string'], pdfHeaderNameSize:['nameFontSize','number'], pdfHeaderNameWeight:['nameWeight','number'], pdfHeaderNameLetterSpacing:['nameLetterSpacing','number'],
    pdfHeaderTaglineSize:['taglineFontSize','number'], pdfHeaderTaglineLetterSpacing:['taglineLetterSpacing','number'], pdfHeaderContactFontFamily:['contactFontFamily','string'], pdfHeaderContactSize:['contactFontSize','number'], pdfHeaderContactWeight:['contactWeight','number'], pdfHeaderContactLetterSpacing:['contactLetterSpacing','number'], pdfHeaderContactLineHeight:['contactLineHeight','number'], pdfHeaderContactAlign:['contactAlign','string'],
    pdfHeaderUppercaseName:['uppercaseName','bool'], pdfHeaderNameColor:['nameColor','string'], pdfHeaderTaglineColor:['taglineColor','string'], pdfHeaderContactColor:['contactColor','string'], pdfHeaderBorderColor:['borderColor','string'],
    pdfHeaderBorderWidth:['borderWidth','number'], pdfHeaderPaddingBottom:['paddingBottom','number'], pdfHeaderMarginBottom:['marginBottom','number'], pdfHeaderUseLogo:['useLogo','bool']
  };
  Object.entries(fields).forEach(([id,[key,type]])=>{ const el=$(id); if(!el || el.dataset.boundPdfHeader) return; el.dataset.boundPdfHeader='1'; const handler=e=>{ state.pdfHeader=state.pdfHeader||{}; let v=e.target.value; if(type==='number') v=Number(v)||0; if(type==='bool') v=String(v)==='true'; state.pdfHeader[key]=v; if(key==='useLogo') renderBrandLogoPreview(); saveState(); }; el.oninput=handler; el.onchange=handler; });
}
function renderSelectedExtras(){ const {selectedExtras}=calc(); const wrap=$('selectedExtrasWrap'); wrap.innerHTML=''; if(!selectedExtras.length){ wrap.innerHTML='<div class="notice">Пока ничего не выбрано.</div>'; return; } selectedExtras.forEach(x=>{ const div=document.createElement('div'); div.className='selected-item'; div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(x.name)} × ${num(x.qty)}</span><span>${money(num(x.qty)*num(x.price))}</span></div>`; wrap.appendChild(div); }); }
function renderSavedOrders(){ const wrap=$('savedOrdersWrap'); wrap.innerHTML=''; if(!state.savedOrders.length){ wrap.innerHTML='<div class="notice">Пока нет сохранённых заказов.</div>'; return; } state.savedOrders.forEach(o=>{ const div=document.createElement('div'); div.className='saved-item'; div.innerHTML=`<div style="font-weight:700">${esc(o.clientName)} · ${esc(o.objectType)}</div><div class="muted" style="margin:4px 0">${esc(o.cleanType)} · ${o.area} м²</div><div style="display:flex;justify-content:space-between;gap:8px"><span>${money(o.recommendedPrice)}</span><span class="muted">${hours(o.brigadeHours)}</span></div><div class="muted" style="font-size:12px;margin-top:4px">Нормо-часы: ${hours(o.normHours)}</div><div class="muted" style="font-size:12px;margin-top:2px">${esc(o.createdAt)}</div>`; wrap.appendChild(div); }); }
function renderEconomyWarning(r){
  const el=$('economyWarning'); if(!el) return;
  if(r.belowDirect){
    el.classList.remove('hidden');
    el.innerHTML = `<strong>Убыток: рынок (${money(r.marketPrice)}) ниже прямых затрат (${money(r.directCost)}).</strong><br>
      Даже без накладных и прибыли заказ в минус на ${money(r.directCost - r.marketPrice)}. Рекомендуемая цена поднята до ${money(r.recommendedPrice)}.`;
  } else if(r.belowFull){
    const mContrib=Math.max(0, r.marketPrice - r.directCost);
    el.classList.remove('hidden');
    el.innerHTML = `<strong>Рынок (${money(r.marketPrice)}) не покрывает полную себестоимость (${money(r.fullCost)}).</strong><br>
      Прямые затраты заказ покрывает, вклад в накладные ${money(mContrib)}, но до их покрытия не хватает ${money(r.economyGap)}, прибыли нет. Целевая цена: ${money(r.targetPrice)}.`;
  } else {
    el.classList.add('hidden');
    el.innerHTML='';
  }
}
function recalc(){
  const r=calc();
  $('recommendedPrice').textContent=money(r.recommendedPrice);
  if($('sumBaseRawNoK')) $('sumBaseRawNoK').textContent=money(r.baseNoK);
  if($('sumClutterK')) $('sumClutterK').textContent='× '+r.clutterPriceK.toFixed(2);
  if($('sumAfterClutter')) $('sumAfterClutter').textContent=money(r.baseAfterClutter);
  if($('sumDirtK')) $('sumDirtK').textContent='× '+r.dirtPriceK.toFixed(2);
  if($('sumBaseMin')) $('sumBaseMin').textContent=money(r.minBase)+(r.minBaseApplied?' применена':'');
  $('sumBase').textContent=money(r.baseRaw); $('sumExtras').textContent=money(r.extrasTotal); $('sumTravel').textContent=money(r.travelTotal); $('sumDiscount').textContent='− '+money(r.discountValue); $('sumMarket').textContent=money(r.marketPrice);
  $('sumLabor').textContent=money(r.laborCost); $('sumMaterials').textContent=money(r.materialsCost); $('sumDirect').textContent=money(r.directCost); $('sumOverhead').textContent=money(r.overheadPerJob); $('sumFull').textContent=money(r.fullCost); $('targetLabel').textContent=`Целевая цена (+${num(r.profitPercent)}%)`; $('sumTarget').textContent=money(r.targetPrice); $('sumNetProfit').textContent=money(r.netProfit); $('sumMargin').textContent=`${r.marginPct.toFixed(0)} %`;
  $('timeBase').textContent=hours(r.baseHours); $('timeExtras').textContent=hours(r.extrasHours); $('timeNorm').textContent=hours(r.normHours); $('timeBrigade').textContent=hours(r.brigadeHours); $('brigadeLabel').textContent=`Время уборки бригадой (${r.peopleOnSite} чел.)`;
  $('cardClient').textContent=state.form.clientName||'—'; $('cardObject').textContent=state.form.objectType||'—'; $('cardArea').textContent=`${num(state.form.area)} м²`; $('cardCleanType').textContent=r.rate.label; $('cardClutter').textContent=r.clutter.label; $('cardDirt').textContent=r.dirt.label;
  const tconf=(state.travel&&state.travel[state.form.travelType])||{}; const tBase=num(tconf.base), tPerKm=num(tconf.perKm);
  $('travelKmBox').classList.toggle('hidden', !(tPerKm>0));
  $('travelHint').textContent = tPerKm>0 ? `Выезд: ${money(tBase)} + ${money(tPerKm)}/км → ${money(tBase + tPerKm*num(state.form.travelKm))}` : (tBase>0 ? `Выезд: ${money(tBase)}` : 'Выезд: бесплатно');
  renderEconomyWarning(r); renderIncludedPreview(); renderSelectedExtras(); renderSavedOrders(); if(!$('pdfPreviewModal')?.classList.contains('hidden')) refreshPdfPreview(); saveState(); return r;
}
function teamTextLines(r){
  const lines=[];
  const cleaners=num(r.hiredCleaners);
  const ownerOnSite=['manager','cleaner_manager'].includes(String(r.ownerRole||''));
  if(cleaners>0) lines.push(`Клинеры: ${cleaners} чел.`);
  if(ownerOnSite) lines.push('Бригадир-менеджер: 1 чел.');
  if(!lines.length && num(r.peopleOnSite)>0) lines.push(`Клинеры: ${num(r.peopleOnSite)} чел.`);
  return lines;
}
function teamPdfRows(r){
  const rows=[];
  const cleaners=num(r.hiredCleaners);
  const ownerOnSite=['manager','cleaner_manager'].includes(String(r.ownerRole||''));
  const row=(label,value)=>`<tr><td style="padding:6px 0">${label}</td><td style="padding:6px 0;text-align:right">${value}</td></tr>`;
  if(cleaners>0) rows.push(row('Клинеры', `${cleaners} чел.`));
  if(ownerOnSite) rows.push(row('Бригадир-менеджер', '1 чел.'));
  if(!rows.length && num(r.peopleOnSite)>0) rows.push(row('Клинеры', `${num(r.peopleOnSite)} чел.`));
  return rows;
}
function estimateText(){
  const r=calc(); const included=getIncludedText()||'Не заполнено'; const extras=r.selectedExtras.length?r.selectedExtras.map(x=>`• ${x.name} × ${num(x.qty)} — ${money(num(x.qty)*num(x.price))}`).join('\n'):'• Без доп. услуг';
  const lines=[`Стоимость уборки: ${money(r.baseRaw)}`];
  if(num(r.extrasTotal)>0) lines.push(`Дополнительные услуги: ${money(r.extrasTotal)}`);
  if(num(r.travelTotal)>0) lines.push(`Выезд: ${money(r.travelTotal)}`);
  if(num(r.discountValue)>0) lines.push(`Скидка: − ${money(r.discountValue)}`);
  lines.push(`\nИТОГО к оплате: ${money(r.recommendedPrice)}`);
  lines.push(`Сумма нормо-часов: ${hours(r.normHours)}`);
  lines.push(`Примерное время уборки: ${hours(r.brigadeHours)}`);
  teamTextLines(r).forEach(line=>lines.push(line));
  return `Смета на уборку\n\nКлиент: ${state.form.clientName||'—'}\nОбъект: ${state.form.objectType}\nПлощадь: ${num(state.form.area)} м²\nТип уборки: ${r.rate.label}\nЗаставленность: ${r.clutter.label} (коэф. × ${r.clutterPriceK.toFixed(2)})\nЗагрязнённость: ${r.dirt.label} (коэф. × ${r.dirtPriceK.toFixed(2)})\n\nВ услуги входят:\n${included}\n\nДоп. услуги:\n${extras}\n\n${lines.join('\n')}\n\nДополнительная информация:\n${state.mainInfo.usefulInfo||'—'}\n\nЗаметки: ${state.form.notes||'—'}`;
}
async function copyEstimate(){ if(validateCurrentOrder().length) return; const text=estimateText(); try{ await navigator.clipboard.writeText(text); toast('Смета скопирована'); }catch(e){ $('shareText').value=text; $('shareModal').classList.remove('hidden'); toast('Открыл смету для ручного копирования'); } }
function buildPrintHtml(){
  const r=calc();
  const included=getIncludedLines();
  const extras=r.selectedExtras;
  const h=state.pdfHeader||{};
  const cleanCss=(v,fb)=>String(v||fb).replace(/[;<>]/g,'');
  const font=cleanCss(h.fontFamily,'Arial, sans-serif');
  const nameText=h.uppercaseName!==false ? String(state.brand.name||'PRO-CHISTKA').toUpperCase() : String(state.brand.name||'PRO-CHISTKA');
  const logo=(h.useLogo && state.brand.logoDataUrl) ? `<img src="${state.brand.logoDataUrl}" alt="Логотип" style="max-height:70px;max-width:160px;object-fit:contain">` : '';
  const brandBlock=`<div style="display:flex;align-items:center;gap:14px">${logo}<div><div style="font-family:${font};font-size:${num(h.nameFontSize)||30}px;font-weight:${num(h.nameWeight)||800};letter-spacing:${Number(h.nameLetterSpacing)||0}px;line-height:${Number(h.nameLineHeight)||1.05};color:${cleanCss(h.nameColor,'#0f172a')}">${esc(nameText)}</div><div style="font-family:${font};font-size:${num(h.taglineFontSize)||13}px;letter-spacing:${Number(h.taglineLetterSpacing)||0}px;line-height:${Number(h.taglineLineHeight)||1.25};color:${cleanCss(h.taglineColor,'#475569')};margin-top:6px">${esc(state.brand.tagline||'')}</div></div></div>`;
  const contactFont=cleanCss(h.contactFontFamily || font, font);
  const contactAlign=['left','center','right'].includes(String(h.contactAlign)) ? h.contactAlign : 'right';
  const contactStyle=`font-family:${contactFont};font-size:${num(h.contactFontSize)||13}px;font-weight:${num(h.contactWeight)||600};letter-spacing:${Number(h.contactLetterSpacing)||0}px;line-height:${Number(h.contactLineHeight)||1.35};color:${cleanCss(h.contactColor,'#0f172a')}`;
  const contactText = state.brand.contactText || [state.brand.phone,state.brand.site].filter(Boolean).join('\n');
  const contactHtml = String(contactText||'').split(/\n+/).filter(Boolean).map((line,i)=>`<div style="${i?'margin-top:6px;':''}color:${cleanCss(h.contactColor,'#0f172a')}">${esc(line)}</div>`).join('');
  const headerStyle=`display:flex;justify-content:space-between;gap:24px;border-bottom:${num(h.borderWidth)}px solid ${cleanCss(h.borderColor,'#0f172a')};padding-bottom:${num(h.paddingBottom)||16}px;margin-bottom:${num(h.marginBottom)||22}px`;
  const blocks = {
    client: `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:6px 0;font-weight:700">Клиент</td><td style="padding:6px 0">${esc(state.form.clientName||'—')}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Объект</td><td style="padding:6px 0">${esc(state.form.objectType)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Площадь</td><td style="padding:6px 0">${num(state.form.area)} м²</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Тип уборки</td><td style="padding:6px 0">${esc(r.rate.label)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Заставленность</td><td style="padding:6px 0">${esc(r.clutter.label)} (коэф. × ${r.clutterPriceK.toFixed(2)})</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Загрязнённость</td><td style="padding:6px 0">${esc(r.dirt.label)} (коэф. × ${r.dirtPriceK.toFixed(2)})</td></tr>
    </table>`,
    included: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">В услуги входят</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${included.length?included.map(x=>`<div style="margin:0 0 6px">• ${esc(x)}</div>`).join(''):'<div>—</div>'}</div>`,
    extras: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Дополнительные услуги</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${extras.length?extras.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px;margin:0 0 6px"><span>${esc(x.name)} × ${num(x.qty)}</span><span>${money(num(x.qty)*num(x.price))}</span></div>`).join(''):'<div>Без доп. услуг</div>'}</div>`,
    pricing: (()=>{
      const rows=[];
      rows.push(`<tr><td style="padding:6px 0">Стоимость уборки</td><td style="padding:6px 0;text-align:right">${money(r.baseNoK)}</td></tr>`);
      rows.push(`<tr><td style="padding:6px 0">Стоимость с коэффициентом заставленности</td><td style="padding:6px 0;text-align:right">${money(r.baseAfterClutter)}</td></tr>`);
      rows.push(`<tr><td style="padding:6px 0">Стоимость с коэффициентом загрязнённости</td><td style="padding:6px 0;text-align:right">${money(r.baseWithK)}</td></tr>`);
      if(num(r.extrasTotal)>0) rows.push(`<tr><td style="padding:6px 0">Дополнительные услуги</td><td style="padding:6px 0;text-align:right">${money(r.extrasTotal)}</td></tr>`);
      if(num(r.travelTotal)>0) rows.push(`<tr><td style="padding:6px 0">Выезд</td><td style="padding:6px 0;text-align:right">${money(r.travelTotal)}</td></tr>`);
      if(num(r.discountValue)>0) rows.push(`<tr><td style="padding:6px 0">Скидка</td><td style="padding:6px 0;text-align:right">− ${money(r.discountValue)}</td></tr>`);
      rows.push(`<tr><td style="padding:12px 0;border-top:2px solid #0f172a;font-weight:800;font-size:17px">Итого к оплате</td><td style="padding:12px 0;border-top:2px solid #0f172a;text-align:right;font-weight:800;font-size:17px">${money(r.recommendedPrice)}</td></tr>`);
      rows.push(`<tr><td style="padding:6px 0">Сумма нормо-часов</td><td style="padding:6px 0;text-align:right">${hours(r.normHours)}</td></tr>`);
      rows.push(`<tr><td style="padding:6px 0">Примерное время уборки</td><td style="padding:6px 0;text-align:right">${hours(r.brigadeHours)}</td></tr>`);
      teamPdfRows(r).forEach(row=>rows.push(row));
      return `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Стоимость</div><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.join('')}</table>`;
    })(),
    useful_info: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Дополнительная информация</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.usefulInfo?esc(state.mainInfo.usefulInfo).replace(/\n/g,'<br>'):'—'}</div>`,
    main_info: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Основная информация</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.equipmentText?`<div><strong>Техника:</strong><br>${esc(state.mainInfo.equipmentText).replace(/\n/g,'<br>')}</div>`:''}${state.mainInfo.chemistryText?`<div style="margin-top:10px"><strong>Химия / сертификаты:</strong><br>${esc(state.mainInfo.chemistryText).replace(/\n/g,'<br>')}</div>`:''}${!state.mainInfo.equipmentText && !state.mainInfo.chemistryText ? '<div>—</div>' : ''}</div>`,
    notes: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Заметки</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;min-height:60px">${esc(state.form.notes||'—')}</div>`
  };
  const content = state.pdfSettings.order.filter(k=>state.pdfSettings.visible[k]).map(k=>blocks[k]||'').join('');
  return `
  <div style="padding:32px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="${headerStyle}">
      <div>${brandBlock}</div>
      <div style="text-align:${contactAlign};${contactStyle}">${contactHtml || '&nbsp;'}</div>
    </div>
    <div style="font-size:24px;font-weight:800;margin-bottom:18px">Смета на уборку</div>
    ${content}
  </div>`; }
function printEstimate(){ if(validateCurrentOrder().length) return; $('printArea').innerHTML=buildPrintHtml(); window.print(); }
function refreshPdfPreview(){ const c=$('pdfPreviewContent'); if(c) c.innerHTML=buildPrintHtml(); }
function openPdfPreview(){ if(validateCurrentOrder().length) return; refreshPdfPreview(); const m=$('pdfPreviewModal'); if(m) m.classList.remove('hidden'); }
function closePdfPreview(){ const m=$('pdfPreviewModal'); if(m) m.classList.add('hidden'); }
function bind(){
  $('tariffsBtn').onclick=()=>requestEditAccess(()=>{ state.ui.showTariffs=!state.ui.showTariffs; $('tariffsCard').classList.toggle('hidden', !state.ui.showTariffs); if(state.ui.showTariffs) renderTariffs(); saveState(); });
  $('settingsBtn').onclick=()=>requestEditAccess(()=>{ state.ui.showSettings=!state.ui.showSettings; $('settingsCard').classList.toggle('hidden', !state.ui.showSettings); if(state.ui.showSettings) renderSettingsPanel(); saveState(); });
  if($('saveSettingsBtn')) $('saveSettingsBtn').onclick=saveSettingsNow;
  if($('saveTariffsSettingsBtn')) $('saveTariffsSettingsBtn').onclick=saveSettingsNow;
  if($('exportOrdersBtn')) $('exportOrdersBtn').onclick=exportOrders;
  if($('importOrdersBtn')) $('importOrdersBtn').onclick=()=>$('importOrdersFile').click();
  if($('importOrdersFile')) $('importOrdersFile').onchange=e=>importOrdersFile(e.target.files?.[0]);
  if($('exportBackupBtn')) $('exportBackupBtn').onclick=exportBackup;
  if($('importBackupBtn')) $('importBackupBtn').onclick=()=>requestEditAccess(()=>$('importBackupFile').click());
  if($('importBackupFile')) $('importBackupFile').onchange=e=>importBackupFile(e.target.files?.[0]);
  $('closeShareBtn').onclick=()=>$('shareModal').classList.add('hidden');
  if($('moreMenuBtn')) $('moreMenuBtn').onclick=()=>$('moreMenuPanel')&&$('moreMenuPanel').classList.toggle('hidden');
  if($('lockEditBtn')) $('lockEditBtn').onclick=lockEditing;
  document.addEventListener('click', e=>{ const panel=$('moreMenuPanel'), btn=$('moreMenuBtn'); if(panel && btn && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target!==btn){ panel.classList.add('hidden'); } });
  if($('previewPdfBtn')) $('previewPdfBtn').onclick=openPdfPreview;
  if($('closePdfPreviewBtn')) $('closePdfPreviewBtn').onclick=closePdfPreview;
  if($('refreshPdfPreviewBtn')) $('refreshPdfPreviewBtn').onclick=refreshPdfPreview;
  $('copyEstimateBtn').onclick=copyEstimate; $('printPdfBtn').onclick=printEstimate;
  $('equipmentText').oninput=e=>{ state.mainInfo.equipmentText=e.target.value; saveState(); };
  $('chemistryText').oninput=e=>{ state.mainInfo.chemistryText=e.target.value; saveState(); };
  if($('usefulInfoText')) $('usefulInfoText').oninput=e=>{ state.mainInfo.usefulInfo=e.target.value; saveState(); };
  if($('windowServicesDescription')) $('windowServicesDescription').oninput=e=>{ state.serviceDescriptions.windows=e.target.value; saveState(); renderIncludedPreview(); };
  $('saveIncludedBtn').onclick=()=>{ setTypeIncluded(state.form.cleanType, $('includedServices').value); saveState(); renderIncludedPreview(); renderTariffs(); toast('Шаблон сохранён'); };
  $('includedServices').oninput=(e)=>{ setTypeIncluded(state.form.cleanType, e.target.value); saveState(); renderIncludedPreview(); };
  $('saveOrderBtn').onclick=()=>{ if(validateCurrentOrder().length) return; const r=calc(); state.savedOrders.unshift({id:Date.now(), version:APP_VERSION, clientName:state.form.clientName||'Без имени', objectType:state.form.objectType, area:num(state.form.area), cleanType:r.rate.label, recommendedPrice:r.recommendedPrice, brigadeHours:r.brigadeHours, normHours:r.normHours, form:clone(state.form), extras:clone(r.selectedExtras), calculation:{recommendedPrice:r.recommendedPrice,marketPrice:r.marketPrice,payroll:r.payroll,normHours:r.normHours,brigadeHours:r.brigadeHours}, createdAt:new Date().toLocaleString('ru-RU')}); state.savedOrders=state.savedOrders.slice(0,50); state.ui=state.ui||{}; state.ui.ordersSinceBackup=Number(state.ui.ordersSinceBackup||0)+1; saveState(); renderSavedOrders(); updateBackupReminder(); toast('Заказ сохранён'); if(state.ui.autoBackup && state.ui.ordersSinceBackup>=AUTO_BACKUP_EVERY){ exportBackup(); toast('Авто-копия сохранена'); } };
  $('clearBtn').onclick=()=>{ state.form=clone(defaults.form); state.extras=state.extras.map(x=>({...x, qty:0})); fillForm(); renderExtras(); recalc(); toast('Форма очищена'); };
  $('resetStorageBtn').onclick=()=>requestEditAccess(()=>{ if(!confirm('Сбросить все сохранённые данные в этом браузере?')) return; localStorage.removeItem(STORAGE_KEY); state=mergeState(clone(defaults)); migrateV43(); migrateV46(); fillForm(); renderTariffs(); renderExtras(); recalc(); toast("Все данные сброшены"); });
  $('demoBtn').onclick=()=>{ state.form={...state.form, clientName:'Ирина', objectType:'Квартира', area:68, cleanType:'general', discount:5, clutter:'medium', dirtiness:'medium', travelType:'km15', travelKm:20, ownerRole:'cleaner_manager', profitPercent:25, notes:'Есть кот. Уборка нужна в пятницу после 11:00.'}; state.extras=state.extras.map(x=>({...x, qty:({1:1,9:1,14:4,18:1}[x.id]||0)})); fillForm(); renderExtras(); recalc(); toast('Подставлен пример'); };
  $('showOnlySelected').onchange=e=>{ state.form.showOnlySelected=e.target.checked; saveState(); renderExtras(); };
  ['clientName','objectType','area','discount','discountAmount','travelKm','profitPercent','notes'].forEach(id=>$(id).oninput=e=>{ state.form[id]=['area','discount','discountAmount','travelKm','profitPercent'].includes(id)?num(e.target.value):e.target.value; recalc(); });
  ['cleanType','clutter','dirtiness','travelType','ownerRole','discountMode'].forEach(id=>$(id).onchange=e=>{ state.form[id]=e.target.value; if(id==='cleanType'){ ensureFormCleanTypeAndCoefs(true); populateMainSelects(); } if(id==='discountMode'){ updateDiscountInputs(); } recalc(); });
  ['brandName','brandTagline'].forEach(id=>{ const el=$(id); if(!el) return; el.oninput=e=>{ const map={brandName:'name',brandTagline:'tagline'}; state.brand[map[id]]=e.target.value; saveState(); renderBrandLogoPreview(); }; });
  if($('brandContactText')) $('brandContactText').oninput=e=>{ state.brand.contactText=e.target.value; const lines=String(e.target.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean); state.brand.phone=lines[0]||''; state.brand.site=lines[1]||''; saveState(); };
  $('brandLogo').onchange=e=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; if(file.size>2*1024*1024){ toast('Логотип слишком большой. Лучше до 2 МБ'); e.target.value=''; return; } const reader=new FileReader(); reader.onload=()=>{ state.brand.logoDataUrl=String(reader.result||''); saveState(); renderBrandLogoPreview(); toast('Логотип сохранён'); $('brandLogo').value=''; }; reader.readAsDataURL(file); };
  $('removeLogoBtn').onclick=()=>{ if(!state.brand.logoDataUrl){ toast('Логотип не загружен'); return; } state.brand.logoDataUrl=''; saveState(); renderBrandLogoPreview(); toast('Логотип удалён'); };
  if($('backupNowBtn')) $('backupNowBtn').onclick=exportBackup;
  if($('autoBackupToggle')) $('autoBackupToggle').onchange=e=>{ state.ui=state.ui||{}; state.ui.autoBackup=e.target.checked; saveState(); toast(e.target.checked?'Авто-копия включена':'Авто-копия выключена'); };
  $('addExtraBtn').onclick=()=>requestEditAccess(()=>{ const name=$('newExtraName').value.trim(), unit=$('newExtraUnit').value.trim()||'шт', price=num($('newExtraPrice').value), time=num($('newExtraTime').value), category=$('newExtraCategory').value.trim()||'Другое'; if(!name||!price){ toast('Заполни название и цену'); return; } state.extras.push({id:Date.now(), name, unit, price, qty:0, time, category, builtIn:false}); $('newExtraName').value=''; $('newExtraPrice').value=''; $('newExtraTime').value=''; saveState(); renderExtras(); recalc(); toast('Услуга добавлена'); });
}
function updateDiscountInputs(){ const mode=state.form.discountMode==='amount'?'amount':'percent'; const sel=$('discountMode'); if(sel) sel.value=mode; const pct=$('discount'), amt=$('discountAmount'); if(pct) pct.classList.toggle('hidden', mode!=='percent'); if(amt) amt.classList.toggle('hidden', mode!=='amount'); }
function fillForm(){ if(!isEditUnlocked()){ state.ui.showTariffs=false; state.ui.showSettings=false; } $('clientName').value=state.form.clientName; $('objectType').value=state.form.objectType; $('area').value=state.form.area; $('discount').value=state.form.discount; if($('discountAmount')) $('discountAmount').value=state.form.discountAmount||0; updateDiscountInputs(); $('travelKm').value=state.form.travelKm; if($('ownerRole')) $('ownerRole').value=state.form.ownerRole||'none'; $('profitPercent').value=state.form.profitPercent; $('notes').value=state.form.notes; $('showOnlySelected').checked=!!state.form.showOnlySelected; $('tariffsCard').classList.toggle('hidden', !state.ui.showTariffs); $('settingsCard').classList.toggle('hidden', !state.ui.showSettings); populateMainSelects(); $('includedServices').value=getTypeIncluded(state.form.cleanType)||''; renderSettingsPanel(); }
fillForm(); renderTariffs(); bind(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder(); attemptIdbRecovery(); if($('versionBadge')) $('versionBadge').textContent=APP_VERSION; setupAccess();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
