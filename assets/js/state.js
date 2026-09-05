// Состояние, дефолты, миграции, localStorage/IndexedDB, ревизии config.js, напоминания о копиях.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
const STORAGE_KEY = 'prochistka_calc_app_v4';
const APP_CONFIG = window.PROCHISTKA_CONFIG || {};
const CORE = window.PROCHISTKA_CORE;
const APP_VERSION = APP_CONFIG.APP_VERSION || 'v4.11.19';
const defaults = APP_CONFIG.defaults || {};
defaults.brand = defaults.brand || {name:'PRO-CHISTKA', phone:'', tagline:'Клининговые услуги', site:'', contactText:'', logoDataUrl:''};
if(!defaults.brand.contactText){ defaults.brand.contactText = [defaults.brand.phone, defaults.brand.site].filter(Boolean).join('\n'); }
defaults.pdfHeader = defaults.pdfHeader || {useLogo:false,fontFamily:'Orbitron, Arial, sans-serif',nameFontSize:30,taglineFontSize:13,contactFontSize:13,nameWeight:800,contactWeight:600,nameLetterSpacing:1.2,taglineLetterSpacing:0.2,contactLetterSpacing:0.2,nameLineHeight:1.05,taglineLineHeight:1.25,contactLineHeight:1.35,contactFontFamily:'',contactAlign:'right',uppercaseName:true,nameColor:'#0f172a',taglineColor:'#475569',contactColor:'#0f172a',borderColor:'#0f172a',borderWidth:2,paddingBottom:16,marginBottom:22};
defaults.baseRates = defaults.baseRates || {};
defaults.clutter = defaults.clutter || {};
defaults.dirtiness = defaults.dirtiness || {};
defaults.travel = defaults.travel || {kad:{label:'В пределах КАД',base:0,perKm:0},outsideKad:{label:'За КАД',base:1700,perKm:40,includedKm:15}};
defaults.labor = defaults.labor || {cleanerDay:5000,ownerManagerDay:5000,ownerCleanerManagerDay:7000,maxHoursPerDay:9,maintenanceSlots:[{maxHours:3,pay:3500},{maxHours:5,pay:4000},{maxHours:7,pay:4500},{maxHours:10,pay:5000}]};
defaults.materialPerM2 = defaults.materialPerM2 != null ? defaults.materialPerM2 : 15;
defaults.overhead = defaults.overhead || {fixedPerOrder:2500,perM2:0,maintenanceFixedPerVisit:2500,maintenancePerM2:0};
defaults.pricing = defaults.pricing || {profitPercent:25};
defaults.includedByType = defaults.includedByType || {};
defaults.serviceDescriptions = defaults.serviceDescriptions || {windows:''};
defaults.pdfSettings = defaults.pdfSettings || {order:['client','included','not_included','extras','pricing','main_info','useful_info','notes'], visible:{client:true,included:true,not_included:true,extras:true,pricing:true,main_info:true,useful_info:true,notes:true}};
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
if(defaults.form.address == null) defaults.form.address = '';
if(defaults.form.managerOnSite == null) defaults.form.managerOnSite = false;
if(defaults.form.estimateNo == null) defaults.form.estimateNo = '';
if(defaults.form.estimateDate == null) defaults.form.estimateDate = 0;
if(defaults.form.forceDiscount == null) defaults.form.forceDiscount = false;
if(defaults.overhead.taxPercent == null) defaults.overhead.taxPercent = 0;
if(defaults.form.maintenanceCrewSize == null) defaults.form.maintenanceCrewSize = 1;
if(defaults.form.outsideKad == null) defaults.form.outsideKad = false;
if(defaults.form.maintenanceFormat == null) defaults.form.maintenanceFormat = 'oneoff';
if(defaults.form.maintenanceFrequency == null) defaults.form.maintenanceFrequency = 4;
if(defaults.form.maintenanceTerm == null) defaults.form.maintenanceTerm = 6;
defaults.estimateValidityDays = defaults.estimateValidityDays != null ? defaults.estimateValidityDays : 14;
defaults.savedOrders = [];
defaults.ui = defaults.ui || {showTariffs:false, showSettings:false, extraGroupsCollapsed:{}};
function clone(x){ if(x===undefined || x===null) return x; const serialized=JSON.stringify(x); if(serialized===undefined) return undefined; return JSON.parse(serialized); }
function stableSyncValue(value){
  if(Array.isArray(value)) return value.map(stableSyncValue);
  if(value && typeof value==='object'){
    const out={};
    Object.keys(value).sort().forEach(key=>{ out[key]=stableSyncValue(value[key]); });
    return out;
  }
  return value;
}
function normalizeExtrasForSync(extras){
  return (Array.isArray(extras)?extras:[]).map(item=>{ const copy=clone(item); copy.qty=0; return copy; });
}
function buildConfigSyncSnapshot(source){
  const s=source||{};
  return stableSyncValue({
    brand:clone(s.brand||{}),
    travel:clone(s.travel||{}),
    pdfSettings:clone(s.pdfSettings||{}),
    mainInfo:clone(s.mainInfo||{}),
    extras:normalizeExtrasForSync(s.extras),
    labor:clone(s.labor||{}),
    materialPerM2:Number(s.materialPerM2)||0,
    estimateValidityDays:Number(s.estimateValidityDays)||0,
    overhead:clone(s.overhead||{}),
    pricing:clone(s.pricing||{}),
    serviceDescriptions:clone(s.serviceDescriptions||{}),
    extraCategories:clone(s.extraCategories||[]),
    pdfHeader:clone(s.pdfHeader||{}),
    cleaningTypes:clone(s.cleaningTypes||{})
  });
}
function configSnapshotString(source){ return JSON.stringify(buildConfigSyncSnapshot(source)); }
function getConfigBaseline(){ return String(state?.ui?.configBaseline||''); }
function isConfigDirty(){
  if(!state || !defaults) return false;
  return configSnapshotString(state)!==configSnapshotString(defaults);
}
function keepConfiguredObjectKeys(current, configured){
  const source=(current && typeof current==='object' && !Array.isArray(current)) ? current : {};
  const template=(configured && typeof configured==='object' && !Array.isArray(configured)) ? configured : {};
  const out={};
  Object.keys(template).forEach(key=>{
    out[key]=Object.prototype.hasOwnProperty.call(source,key) ? clone(source[key]) : clone(template[key]);
  });
  return out;
}
function setConfigBaselineFromDefaults(){
  state.ui=state.ui||{};
  state.ui.configBaseline=configSnapshotString(defaults);
}
function setConfigBaselineFromState(){
  state.ui=state.ui||{};
  state.ui.configBaseline=configSnapshotString(state);
}
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
      notIncluded: t.notIncluded ?? '',
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
    item.notIncluded = item.notIncluded ?? '';
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
if(!defaults.cleaningTypes.postreno_basic && defaults.cleaningTypes.postreno){
  defaults.cleaningTypes.postreno_basic = {...clone(defaults.cleaningTypes.postreno), label:'После ремонта — базовая', rate:250, min:13000,
    clutter:{empty:{label:'Без мебели',priceK:1,timeK:1},slight:{label:'Небольшая заставленность',priceK:1.2,timeK:1.2}}};
}
if(!defaults.cleaningTypes.extras_only){
  defaults.cleaningTypes.extras_only={label:'Только доп. услуги',rate:0,min:0,speed:1,included:'',notIncluded:'',clutter:{normal:{label:'Не применяется',priceK:1,timeK:1}},dirtiness:{normal:{label:'Не применяется',priceK:1,timeK:1}}};
}
syncLegacyFromCleaningTypes(defaults);
function getDefaultContactText(){ return [defaults.brand?.phone, defaults.brand?.site].filter(Boolean).join('\n'); }
function ensureBrandContactText(obj){
  if(!obj.brand) obj.brand={};
  if(!obj.brand.contactText) obj.brand.contactText=[obj.brand.phone,obj.brand.site].filter(Boolean).join('\n') || getDefaultContactText();
}
function mergeConfiguredExtras(configExtras, currentExtras){
  const current=Array.isArray(currentExtras)?currentExtras:[];
  const currentById=new Map(current.map(x=>[String(x.id),x]));
  const previouslySynced=new Set((state?.ui?.syncedExtraIds||[]).map(String));
  const configured=Array.isArray(configExtras)?configExtras:[];
  const configuredIds=new Set(configured.map(x=>String(x.id)));
  const merged=configured.map(x=>{
    const local=currentById.get(String(x.id));
    return {...clone(x), availableSeparately:x.availableSeparately !== false, qty:local ? Math.max(0, Number(local.qty)||0) : Math.max(0, Number(x.qty)||0)};
  });
  current.forEach(item=>{
    const id=String(item.id);
    if(!configuredIds.has(id) && !previouslySynced.has(id)) merged.push(clone(item));
  });
  return merged;
}
function mergeConfiguredCategories(configCategories, currentCategories){
  const configured=(Array.isArray(configCategories)?configCategories:[]).map(x=>String(x||'').trim()).filter(Boolean);
  const current=(Array.isArray(currentCategories)?currentCategories:[]).map(x=>String(x||'').trim()).filter(Boolean);
  const previouslySynced=new Set((state?.ui?.syncedExtraCategories||[]).map(String));
  const out=[]; const seen=new Set();
  const add=x=>{ if(x && !seen.has(x)){ seen.add(x); out.push(x); } };
  configured.forEach(add);
  current.forEach(cat=>{ if(!seen.has(cat) && !previouslySynced.has(cat)) add(cat); });
  add('Другое');
  return out;
}
function mergeConfiguredCleaningTypes(configTypes, currentTypes){
  const configured=(configTypes && typeof configTypes==='object')?configTypes:{};
  const current=(currentTypes && typeof currentTypes==='object')?currentTypes:{};
  const previouslySynced=new Set((state?.ui?.syncedCleanTypeKeys||[]).map(String));
  const merged=clone(configured);
  Object.entries(current).forEach(([key,value])=>{
    if(!Object.prototype.hasOwnProperty.call(configured,key) && !previouslySynced.has(String(key))) merged[key]=clone(value);
  });
  return merged;
}
function updateSyncedConfigIndexes(){
  state.ui=state.ui||{};
  state.ui.syncedExtraIds=(defaults.extras||[]).map(x=>String(x.id));
  state.ui.syncedExtraCategories=(defaults.extraCategories||[]).map(String);
  state.ui.syncedCleanTypeKeys=Object.keys(defaults.cleaningTypes||{});
}
function applyConfigRevisionData(){
  state.cleaningTypes = mergeConfiguredCleaningTypes(defaults.cleaningTypes, state.cleaningTypes);
  syncLegacyFromCleaningTypes(state);
  state.travel = clone(defaults.travel);
  state.labor = clone(defaults.labor);
  state.materialPerM2 = defaults.materialPerM2;
  state.overhead = clone(defaults.overhead);
  state.pricing = clone(defaults.pricing);
  state.extras = mergeConfiguredExtras(defaults.extras, state.extras);
  state.extraCategories = mergeConfiguredCategories(defaults.extraCategories, state.extraCategories);
  state.serviceDescriptions = clone(defaults.serviceDescriptions);
  state.mainInfo = clone(defaults.mainInfo);
  if(APP_CONFIG.SYNC_BRAND_PDF_ON_REVISION === true){
    state.brand = clone(defaults.brand);
    state.pdfHeader = clone(defaults.pdfHeader);
  }
  ensureBrandContactText(state);
  updateSyncedConfigIndexes();
}
function adoptRemoteDefaults(remoteConfig){
  const incoming=clone(remoteConfig?.defaults||{});
  if(!incoming || typeof incoming!=='object' || Array.isArray(incoming)) throw new Error('Некорректный defaults в удалённом config.js');
  incoming.cleaningTypes=normalizeCleaningTypes(incoming.cleaningTypes, incoming);
  syncLegacyFromCleaningTypes(incoming);
  Object.keys(defaults).forEach(key=>delete defaults[key]);
  Object.assign(defaults,incoming);
  APP_CONFIG.defaults=defaults;
  APP_CONFIG.CONFIG_REVISION=Number(remoteConfig.CONFIG_REVISION)||0;
  if(remoteConfig.SYNC_ENDPOINT !== undefined) APP_CONFIG.SYNC_ENDPOINT=String(remoteConfig.SYNC_ENDPOINT||'');
  if(remoteConfig.SYNC_BRAND_PDF_ON_REVISION !== undefined) APP_CONFIG.SYNC_BRAND_PDF_ON_REVISION=remoteConfig.SYNC_BRAND_PDF_ON_REVISION===true;
}
function applyRemoteConfigObject(remoteConfig, force=false){
  const revision=Number(remoteConfig?.CONFIG_REVISION)||0;
  const current=Number(state?.ui?.configRevision||0);
  if(!remoteConfig?.defaults || revision<=current) return {status:'noop',revision};
  if(remoteConfig.APP_VERSION && remoteConfig.APP_VERSION!==APP_VERSION) return {status:'app_update',revision,appVersion:remoteConfig.APP_VERSION};
  const remoteMatchesLocal=configSnapshotString(remoteConfig.defaults)===configSnapshotString(state);
  if(isConfigDirty() && !force && !remoteMatchesLocal){
    window.__pendingRemoteConfig=clone(remoteConfig);
    state.ui=state.ui||{};
    state.ui.pendingConfigRevision=revision;
    state.ui.configConflict=true;
    saveState();
    return {status:'conflict',revision};
  }
  adoptRemoteDefaults(remoteConfig);
  applyConfigRevisionData();
  state.ui=state.ui||{};
  state.ui.configRevision=revision;
  state.ui.pendingConfigRevision=0;
  state.ui.configConflict=false;
  setConfigBaselineFromDefaults();
  saveState();
  return {status:'applied',revision};
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
    pricing:{...d.pricing,...(parsed.pricing||{})},
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
state.brand=keepConfiguredObjectKeys(state.brand, defaults.brand);
state.mainInfo=keepConfiguredObjectKeys(state.mainInfo, defaults.mainInfo);
state.pdfHeader=keepConfiguredObjectKeys(state.pdfHeader, defaults.pdfHeader);
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
function migrateV411(){
  state.form = state.form || {};
  if(state.form.travelType === 'km15' || state.form.travelType === 'km20plus') state.form.travelType = 'outsideKad';
  if(state.form.maintenanceCrewSize == null) state.form.maintenanceCrewSize = 1;
  state.pricing = {...clone(defaults.pricing), ...(state.pricing||{})};
  if(state.form.profitPercent != null && state.pricing.profitPercent == null) state.pricing.profitPercent = Math.max(0, Number(state.form.profitPercent) || 0);
  delete state.form.profitPercent;
  state.overhead = {...clone(defaults.overhead), ...(state.overhead||{})};
  delete state.overhead.monthly; delete state.overhead.jobsPerMonth;
  state.labor = {...clone(defaults.labor), ...(state.labor||{})};
  if(!Array.isArray(state.labor.maintenanceSlots) || !state.labor.maintenanceSlots.length) state.labor.maintenanceSlots = clone(defaults.labor.maintenanceSlots);
  if(state.ui?.modelV411 !== true){ state.ui.modelV411 = true; saveState(); }
}
function migrateV412(){
  if(!state.cleaningTypes?.extras_only && defaults.cleaningTypes?.extras_only){
    state.cleaningTypes.extras_only = clone(defaults.cleaningTypes.extras_only);
    syncLegacyFromCleaningTypes(state);
    saveState();
  }
}
function migrateV413(){
  state.pdfSettings = state.pdfSettings || clone(defaults.pdfSettings);
  state.pdfSettings.order = Array.isArray(state.pdfSettings.order) ? state.pdfSettings.order : clone(defaults.pdfSettings.order);
  if(!state.pdfSettings.order.includes('not_included')){
    const includedIndex=state.pdfSettings.order.indexOf('included');
    state.pdfSettings.order.splice(includedIndex<0 ? 0 : includedIndex+1,0,'not_included');
  }
  state.pdfSettings.visible = state.pdfSettings.visible || {};
  if(state.pdfSettings.visible.not_included === undefined) state.pdfSettings.visible.not_included = true;
}
function migrateV414(){
  state.form = state.form || {};
  if(state.ui?.modelV414 === true) return;
  if(state.form.address == null) state.form.address = '';
  state.form.managerOnSite = false;
  state.form.ownerRole = 'none';
  state.ui = state.ui || {}; state.ui.modelV414 = true; saveState();
}
function migrateV415(){
  if(state.ui?.modelV415 === true) return;
  (state.extras||[]).forEach(item=>{ if(item.availableSeparately === undefined) item.availableSeparately = true; });
  state.ui = state.ui || {}; state.ui.modelV415 = true; saveState();
}
function migrateV4115(){
  state.ui=state.ui||{};
  const firstRun=state.ui.modelV4115 !== true;
  if(firstRun && state.form?.cleanType==='extras_only'){
    const preferred=defaults.form?.cleanType && defaults.form.cleanType!=='extras_only' && state.cleaningTypes?.[defaults.form.cleanType]
      ? defaults.form.cleanType
      : (state.cleaningTypes?.postreno ? 'postreno' : Object.keys(state.cleaningTypes||{}).find(k=>k!=='extras_only'));
    if(preferred) state.form.cleanType=preferred;
  }
  if(!Array.isArray(state.ui.syncedExtraIds)) state.ui.syncedExtraIds=(defaults.extras||[]).map(x=>String(x.id));
  if(!Array.isArray(state.ui.syncedExtraCategories)) state.ui.syncedExtraCategories=(defaults.extraCategories||[]).map(String);
  if(!Array.isArray(state.ui.syncedCleanTypeKeys)) state.ui.syncedCleanTypeKeys=Object.keys(defaults.cleaningTypes||{});
  if(!state.ui.configBaseline) setConfigBaselineFromDefaults();
  if(firstRun){ state.ui.modelV4115=true; saveState(); }
}
migrateV43();
migrateV46();
migrateV411();
migrateV412();
migrateV413();
migrateV414();
migrateV415();
migrateV4115();
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
    state=mergeState(saved); migrateV43(); migrateV46(); migrateV411(); migrateV412(); migrateV413(); migrateV414(); migrateV415(); migrateV4115(); syncConfigRevision();
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
    const configuredMatchesLocal=configSnapshotString(defaults)===configSnapshotString(state);
    if(isConfigDirty() && !configuredMatchesLocal){
      state.ui.pendingConfigRevision=rev;
      state.ui.configConflict=true;
      saveState();
      if(typeof toast==='function') setTimeout(()=>toast('Есть новая конфигурация, но локальные настройки изменены. Откройте «Данные» для синхронизации.'),300);
      return false;
    }
    applyConfigRevisionData();
    state.ui.configRevision = rev;
    state.ui.pendingConfigRevision=0;
    state.ui.configConflict=false;
    setConfigBaselineFromDefaults();
    saveState();
    if(typeof toast==='function') setTimeout(()=>toast('Настройки и экономика обновлены из config.js'),300);
    return true;
  }
  ensureBrandContactText(state);
  if(!state.ui.configBaseline) setConfigBaselineFromDefaults();
  return false;
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
