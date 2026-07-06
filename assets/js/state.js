// Состояние, дефолты, миграции, localStorage/IndexedDB, ревизии config.js, напоминания о копиях.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
const STORAGE_KEY = 'prochistka_calc_app_v4';
const APP_CONFIG = window.PROCHISTKA_CONFIG || {};
const CORE = window.PROCHISTKA_CORE;
const APP_VERSION = APP_CONFIG.APP_VERSION || 'v4.9.3';
const defaults = APP_CONFIG.defaults || {};
defaults.brand = defaults.brand || {name:'PRO-CHISTKA', phone:'', tagline:'Клининговые услуги', site:'', contactText:'', logoDataUrl:''};
if(!defaults.brand.contactText){ defaults.brand.contactText = [defaults.brand.phone, defaults.brand.site].filter(Boolean).join('\n'); }
defaults.pdfHeader = defaults.pdfHeader || {useLogo:false,fontFamily:'Orbitron, Arial, sans-serif',nameFontSize:30,taglineFontSize:13,contactFontSize:13,nameWeight:800,contactWeight:600,nameLetterSpacing:1.2,taglineLetterSpacing:0.2,contactLetterSpacing:0.2,nameLineHeight:1.05,taglineLineHeight:1.25,contactLineHeight:1.35,contactFontFamily:'',contactAlign:'right',uppercaseName:true,nameColor:'#0f172a',taglineColor:'#475569',contactColor:'#0f172a',borderColor:'#0f172a',borderWidth:2,paddingBottom:16,marginBottom:22};
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
defaults.extraCategories = defaults.extraCategories || [];
defaults.form = defaults.form || {clientName:'',objectType:'Квартира',area:0,cleanType:'general',discount:0,discountMode:'percent',discountAmount:0,clutter:'low',dirtiness:'low',travelType:'kad',travelKm:20,ownerRole:'cleaner_manager',profitPercent:25,notes:'',showOnlySelected:false};
if(defaults.form.seriesCount == null) defaults.form.seriesCount = 1;
if(defaults.form.seriesMonths == null) defaults.form.seriesMonths = 1;
if(defaults.form.seriesDiscount == null) defaults.form.seriesDiscount = 0;
if(defaults.form.seriesSchedule == null) defaults.form.seriesSchedule = '';
if(defaults.form.clientPhone == null) defaults.form.clientPhone = '';
if(defaults.form.cleanDate == null) defaults.form.cleanDate = '';
if(defaults.form.estimateNo == null) defaults.form.estimateNo = '';
if(defaults.form.estimateDate == null) defaults.form.estimateDate = 0;
if(defaults.overhead.taxPercent == null) defaults.overhead.taxPercent = 0;
defaults.estimateValidityDays = defaults.estimateValidityDays != null ? defaults.estimateValidityDays : 14;
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
      windowsDescription: (target && target.serviceDescriptions && target.serviceDescriptions.windows) || '',
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
      windowsDescription: t.windowsDescription ?? t.windows ?? (target && target.serviceDescriptions && target.serviceDescriptions.windows) ?? (legacy[key] && legacy[key].windowsDescription) ?? '',
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
    if(!t || typeof t !== 'object') target.cleaningTypes[key]={label:key, rate:0, min:0, speed:1, included:'', windowsDescription:(target.serviceDescriptions&&target.serviceDescriptions.windows)||'', clutter:clone(fallbackClutter), dirtiness:clone(fallbackDirtiness)};
    const item=target.cleaningTypes[key];
    item.label = item.label || key;
    item.rate = Number(item.rate)||0;
    item.min = Number(item.min)||0;
    item.speed = Number(item.speed)||1;
    item.included = item.included ?? target.includedByType?.[key] ?? '';
    item.windowsDescription = item.windowsDescription ?? item.windows ?? (target.serviceDescriptions&&target.serviceDescriptions.windows) ?? '';
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
  state.extraCategories = clone(defaults.extraCategories || state.extraCategories || []);
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
    estimateValidityDays: parsed.estimateValidityDays != null ? parsed.estimateValidityDays : d.estimateValidityDays,
    overhead:{...d.overhead,...(parsed.overhead||{})},
    includedByType:{...d.includedByType,...(parsed.includedByType||{})},
    serviceDescriptions:{...d.serviceDescriptions,...(parsed.serviceDescriptions||{})},
    pdfSettings:{order:Array.isArray(parsed.pdfSettings?.order)?parsed.pdfSettings.order:d.pdfSettings.order, visible:{...d.pdfSettings.visible,...(parsed.pdfSettings?.visible||{})}},
    mainInfo:{...d.mainInfo,...(parsed.mainInfo||{})},
    form:{...d.form,...(parsed.form||{})},
    savedOrders:Array.isArray(parsed.savedOrders)?parsed.savedOrders:[],
    extras:Array.isArray(parsed.extras)?parsed.extras:d.extras,
    extraCategories:Array.isArray(parsed.extraCategories)?parsed.extraCategories:(Array.isArray(d.extraCategories)?d.extraCategories:[]),
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
  const statusText = last
    ? `Резервная копия: ${new Date(last).toLocaleString('ru-RU')} · новых заказов: ${since}`
    : 'Резервная копия: ещё не скачивалась';
  const status=$('backupStatus');
  if(status) status.textContent = statusText;
  const statusFull=$('backupStatusFull');
  if(statusFull){
    statusFull.textContent = last
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
