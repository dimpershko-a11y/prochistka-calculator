const STORAGE_KEY = 'prochistka_calc_app_v4';
const APP_CONFIG = window.PROCHISTKA_CONFIG || {};
const CORE = window.PROCHISTKA_CORE;
const APP_VERSION = APP_CONFIG.APP_VERSION || 'v4.5-data-discount';
const defaults = APP_CONFIG.defaults || {};
defaults.brand = defaults.brand || {name:'PRO-CHISTKA', phone:'', tagline:'Клининговые услуги', site:'', logoDataUrl:''};
defaults.pdfHeader = defaults.pdfHeader || {useLogo:false,fontFamily:'Arial, sans-serif',nameFontSize:30,taglineFontSize:13,contactFontSize:13,nameWeight:800,nameLetterSpacing:1.2,taglineLetterSpacing:0.2,contactLetterSpacing:0.2,nameLineHeight:1.05,taglineLineHeight:1.25,uppercaseName:true,nameColor:'#0f172a',taglineColor:'#475569',contactColor:'#0f172a',borderColor:'#0f172a',borderWidth:2,paddingBottom:16,marginBottom:22};
defaults.baseRates = defaults.baseRates || {};
defaults.clutter = defaults.clutter || {};
defaults.dirtiness = defaults.dirtiness || {};
defaults.travel = defaults.travel || {kad:{label:'В пределах КАД',base:0,perKm:0},km15:{label:'До 15 км от КАД',base:1500,perKm:0},km20plus:{label:'20+ км',base:1500,perKm:15}};
defaults.includedByType = defaults.includedByType || {};
defaults.serviceDescriptions = defaults.serviceDescriptions || {windows:''};
defaults.pdfSettings = defaults.pdfSettings || {order:['client','included','extras','pricing','main_info','useful_info','notes'], visible:{client:true,included:true,extras:true,pricing:true,main_info:true,useful_info:true,notes:true}};
defaults.mainInfo = defaults.mainInfo || {equipmentText:'', chemistryText:'', usefulInfo:'Всё необходимое для клининга — техника и моющие средства — привозим самостоятельно.\nРаботаем по договору.\nПриём оплаты: наличные, перевод, QR-код СБП, ссылка СБП, карта VISA/MasterCard/МИР, Долями от Т-Банка, безналичный расчёт для юридических лиц.'};
defaults.extras = defaults.extras || [];
defaults.form = defaults.form || {clientName:'',objectType:'Квартира',area:0,cleanType:'general',discount:0,discountMode:'percent',discountAmount:0,clutter:'low',dirtiness:'low',travelType:'kad',travelKm:20,workers:0,payMode:'fixed',workerPay:0,profitPercent:0,notes:'',showOnlySelected:false};
defaults.savedOrders = [];
defaults.ui = defaults.ui || {showTariffs:false, showSettings:false, extraGroupsCollapsed:{}};
function clone(x){return JSON.parse(JSON.stringify(x));}
function mergeState(parsed){
  const d=clone(defaults);
  return {
    ...d,...parsed,
    brand:{...d.brand,...(parsed.brand||{})},
    baseRates:{...d.baseRates,...(parsed.baseRates||{})},
    pdfHeader:{...d.pdfHeader,...(parsed.pdfHeader||{})},
    clutter:{...d.clutter,...(parsed.clutter||{})},
    dirtiness:{...d.dirtiness,...(parsed.dirtiness||{})},
    travel:{...d.travel,...(parsed.travel||{})},
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
migrateV43();
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
    state=mergeState(saved); migrateV43(); syncConfigRevision();
    fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder();
    toast('Данные восстановлены из резервного хранилища');
  }).catch(()=>{});
}

// Источник истины для цен — config.js. При повышении CONFIG_REVISION цены
// (ставки, коэффициенты, выезд) перезаписываются из конфига на всех устройствах.
function syncConfigRevision(){
  const rev = Number(APP_CONFIG.CONFIG_REVISION)||0;
  state.ui = state.ui || {};
  if(state.ui.configRevision === undefined){
    // Первый запуск этой версии: принимаем текущие цены как есть, без перезаписи.
    if(!state.travel || !Object.keys(state.travel).length) state.travel = clone(defaults.travel);
    state.ui.configRevision = rev;
    saveState();
    return;
  }
  if(rev > Number(state.ui.configRevision||0)){
    state.baseRates = clone(defaults.baseRates);
    state.clutter = clone(defaults.clutter);
    state.dirtiness = clone(defaults.dirtiness);
    state.travel = clone(defaults.travel);
    state.ui.configRevision = rev;
    saveState();
    if(typeof toast==='function') setTimeout(()=>toast('Цены обновлены из настроек (config.js)'),300);
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

const WINDOW_CATEGORIES = APP_CONFIG.WINDOW_CATEGORIES || ['Окна'];
function isWindowExtra(item){ const cat=String(item?.category||'').toLowerCase(); return WINDOW_CATEGORIES.some(x=>cat.includes(String(x).toLowerCase())) || /окн|остекл/i.test(String(item?.name||'')); }
function hasSelectedWindowExtras(){ return (state.extras||[]).some(x=>num(x.qty)>0 && isWindowExtra(x)); }
function getIncludedLines(){
  const base=(state.includedByType?.[state.form.cleanType]||'').trim().split(/\n+/).filter(Boolean);
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
function importBackupFile(file){ readJsonFile(file, data=>{ const result=CORE.validateBackup(data, defaults); if(!result.ok){ toast(result.error); return; } state=mergeState(result.state); migrateV43(); syncConfigRevision(); fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder(); toast('Резервная копия восстановлена'); }); }
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
  if(num(state.form.workers)<=0) $('workers')?.classList.add('field-error');
  if(num(state.form.workerPay)<=0) $('workerPay')?.classList.add('field-error');
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
  if($('brandPhone')) $('brandPhone').value=state.brand.phone;
  if($('brandTagline')) $('brandTagline').value=state.brand.tagline;
  if($('brandSite')) $('brandSite').value=state.brand.site;
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
function renderTariffs(){
  const rates=$('ratesWrap'); rates.innerHTML='';
  Object.entries(state.baseRates).forEach(([k,v])=>{
    const div=document.createElement('div'); div.className='extra-card';
    div.innerHTML=`<div style="font-weight:800;margin-bottom:10px">${esc(v.label)}</div>
      <div class="grid g3">
        <div><label>₽ / м²</label><input type="number" min="0" data-kind="baseRates" data-key="${k}" data-field="rate" value="${v.rate}"></div>
        <div><label>Минималка</label><input type="number" min="0" data-kind="baseRates" data-key="${k}" data-field="min" value="${v.min}"></div>
        <div><label>м² / час</label><input type="number" min="0" data-kind="baseRates" data-key="${k}" data-field="speed" value="${v.speed}"></div>
      </div>`;
    rates.appendChild(div);
  });
  const clutter=$('clutterWrap'); clutter.innerHTML='';
  Object.entries(state.clutter).forEach(([k,v])=>{
    const div=document.createElement('div'); div.className='extra-card';
    div.innerHTML=`<div style="font-weight:800;margin-bottom:10px">${esc(v.label)}</div>
      <div class="grid g2">
        <div><label>Коэффициент цены</label><input type="number" step="0.01" min="0" data-kind="clutter" data-key="${k}" data-field="priceK" value="${v.priceK}"></div>
        <div><label>Коэффициент времени</label><input type="number" step="0.01" min="0" data-kind="clutter" data-key="${k}" data-field="timeK" value="${v.timeK}"></div>
      </div>`;
    clutter.appendChild(div);
  });
  const dirt=$('dirtWrap'); dirt.innerHTML='';
  Object.entries(state.dirtiness).forEach(([k,v])=>{
    const div=document.createElement('div'); div.className='extra-card';
    div.innerHTML=`<div style="font-weight:800;margin-bottom:10px">${esc(v.label)}</div>
      <div class="grid g2">
        <div><label>Коэффициент цены</label><input type="number" step="0.01" min="0" data-kind="dirtiness" data-key="${k}" data-field="priceK" value="${v.priceK}"></div>
        <div><label>Коэффициент времени</label><input type="number" step="0.01" min="0" data-kind="dirtiness" data-key="${k}" data-field="timeK" value="${v.timeK}"></div>
      </div>`;
    dirt.appendChild(div);
  });
  document.querySelectorAll('[data-kind]').forEach(inp=>inp.oninput=(e)=>{ const {kind,key,field}=e.target.dataset; state[kind][key][field]=num(e.target.value); saveState(); populateMainSelects(); recalc(); });
}
function populateMainSelects(){ fillSelect('cleanType', state.baseRates, state.form.cleanType); fillSelect('clutter', state.clutter, state.form.clutter); fillSelect('dirtiness', state.dirtiness, state.form.dirtiness); const travelOpts=(state.travel&&Object.keys(state.travel).length)?state.travel:{kad:{label:'В пределах КАД'},km15:{label:'До 15 км от КАД'},km20plus:{label:'20+ км'}}; fillSelect('travelType', travelOpts, state.form.travelType); $('includedTypeLabel').textContent=state.baseRates[state.form.cleanType].label; $('includedServices').value=state.includedByType[state.form.cleanType]||''; }
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
  set('pdfHeaderContactSize',h.contactFontSize||13);
  set('pdfHeaderContactLetterSpacing',h.contactLetterSpacing??0);
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
    pdfHeaderTaglineSize:['taglineFontSize','number'], pdfHeaderTaglineLetterSpacing:['taglineLetterSpacing','number'], pdfHeaderContactSize:['contactFontSize','number'], pdfHeaderContactLetterSpacing:['contactLetterSpacing','number'],
    pdfHeaderUppercaseName:['uppercaseName','bool'], pdfHeaderNameColor:['nameColor','string'], pdfHeaderTaglineColor:['taglineColor','string'], pdfHeaderContactColor:['contactColor','string'], pdfHeaderBorderColor:['borderColor','string'],
    pdfHeaderBorderWidth:['borderWidth','number'], pdfHeaderPaddingBottom:['paddingBottom','number'], pdfHeaderMarginBottom:['marginBottom','number'], pdfHeaderUseLogo:['useLogo','bool']
  };
  Object.entries(fields).forEach(([id,[key,type]])=>{ const el=$(id); if(!el || el.dataset.boundPdfHeader) return; el.dataset.boundPdfHeader='1'; const handler=e=>{ state.pdfHeader=state.pdfHeader||{}; let v=e.target.value; if(type==='number') v=Number(v)||0; if(type==='bool') v=String(v)==='true'; state.pdfHeader[key]=v; if(key==='useLogo') renderBrandLogoPreview(); saveState(); }; el.oninput=handler; el.onchange=handler; });
}
function renderSelectedExtras(){ const {selectedExtras}=calc(); const wrap=$('selectedExtrasWrap'); wrap.innerHTML=''; if(!selectedExtras.length){ wrap.innerHTML='<div class="notice">Пока ничего не выбрано.</div>'; return; } selectedExtras.forEach(x=>{ const div=document.createElement('div'); div.className='selected-item'; div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(x.name)} × ${num(x.qty)}</span><span>${money(num(x.qty)*num(x.price))}</span></div>`; wrap.appendChild(div); }); }
function renderSavedOrders(){ const wrap=$('savedOrdersWrap'); wrap.innerHTML=''; if(!state.savedOrders.length){ wrap.innerHTML='<div class="notice">Пока нет сохранённых заказов.</div>'; return; } state.savedOrders.forEach(o=>{ const div=document.createElement('div'); div.className='saved-item'; div.innerHTML=`<div style="font-weight:700">${esc(o.clientName)} · ${esc(o.objectType)}</div><div class="muted" style="margin:4px 0">${esc(o.cleanType)} · ${o.area} м²</div><div style="display:flex;justify-content:space-between;gap:8px"><span>${money(o.recommendedPrice)}</span><span class="muted">${hours(o.brigadeHours)}</span></div><div class="muted" style="font-size:12px;margin-top:4px">Нормо-часы: ${hours(o.normHours)}</div><div class="muted" style="font-size:12px;margin-top:2px">${esc(o.createdAt)}</div>`; wrap.appendChild(div); }); }
function renderEconomyWarning(r){
  const el=$('economyWarning'); if(!el) return;
  if(r.economyGap>0){
    const noDiscountText = r.maxAllowedDiscount>0 ? `допустимая скидка не выше ${r.maxAllowedDiscount.toFixed(1)}%` : 'убрать скидку полностью';
    el.classList.remove('hidden');
    el.innerHTML = `<strong>Внимание: цена объекта ниже экономики на ${money(r.economyGap)}.</strong><br>
      Рекомендованная цена уже поднята до безопасного уровня: ${money(r.recommendedPrice)}.<br>
      Варианты: поднять цену на ${money(r.economyTopup)}, ${noDiscountText} или уменьшить желаемый % прибыли.`;
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
  $('sumBase').textContent=money(r.baseRaw); $('sumExtras').textContent=money(r.extrasTotal); $('sumTravel').textContent=money(r.travelTotal); $('sumDiscount').textContent='− '+money(r.discountValue); $('sumMarket').textContent=money(r.marketPrice); $('sumPayroll').textContent=money(r.payroll); $('sumProfit').textContent=money(r.targetProfitValue); $('sumCost').textContent=money(r.costBasedPrice); $('timeBase').textContent=hours(r.baseHours); $('timeExtras').textContent=hours(r.extrasHours); $('timeNorm').textContent=hours(r.normHours); $('timeBrigade').textContent=hours(r.brigadeHours); $('brigadeLabel').textContent=`Примерное время уборки бригады (${num(state.form.workers)} чел.)`;
  $('cardClient').textContent=state.form.clientName||'—'; $('cardObject').textContent=state.form.objectType||'—'; $('cardArea').textContent=`${num(state.form.area)} м²`; $('cardCleanType').textContent=r.rate.label; $('cardClutter').textContent=r.clutter.label; $('cardDirt').textContent=r.dirt.label;
  const tconf=(state.travel&&state.travel[state.form.travelType])||{}; const tBase=num(tconf.base), tPerKm=num(tconf.perKm);
  $('travelKmBox').classList.toggle('hidden', !(tPerKm>0));
  $('workerPayLabel').textContent=state.form.payMode==='hourly' ? 'Почасовая ставка 1 сотрудника, ₽/час' : 'ЗП 1 сотрудника, ₽';
  $('travelHint').textContent = tPerKm>0 ? `Выезд: ${money(tBase)} + ${money(tPerKm)}/км → ${money(tBase + tPerKm*num(state.form.travelKm))}` : (tBase>0 ? `Выезд: ${money(tBase)}` : 'Выезд: бесплатно');
  renderEconomyWarning(r); renderIncludedPreview(); renderSelectedExtras(); renderSavedOrders(); if(!$('pdfPreviewModal')?.classList.contains('hidden')) refreshPdfPreview(); saveState(); return r;
}
function estimateText(){
  const r=calc(); const included=getIncludedText()||'Не заполнено'; const extras=r.selectedExtras.length?r.selectedExtras.map(x=>`• ${x.name} × ${num(x.qty)} — ${money(num(x.qty)*num(x.price))}`).join('\n'):'• Без доп. услуг';
  return `Смета на уборку\n\nКлиент: ${state.form.clientName||'—'}\nОбъект: ${state.form.objectType}\nПлощадь: ${num(state.form.area)} м²\nТип уборки: ${r.rate.label}\nЗаставленность: ${r.clutter.label} × ${r.clutterPriceK.toFixed(2)}\nЗагрязнённость: ${r.dirt.label} × ${r.dirtPriceK.toFixed(2)}\n\nВ услуги входят:\n${included}\n\nДоп. услуги:\n${extras}\n\nБаза до коэффициентов: ${money(r.baseNoK)}\nПосле коэффициента заставленности: ${money(r.baseAfterClutter)}\nБаза с коэффициентами: ${money(r.baseWithK)}\nСтоимость по уборке: ${money(r.baseRaw)}\nДоп. услуги: ${money(r.extrasTotal)}\nВыезд: ${money(r.travelTotal)}\nСкидка: ${money(r.discountValue)}\nЦена по рынку после скидки: ${money(r.marketPrice)}\nЦена по экономике: ${money(r.costBasedPrice)}\n\nИтого для клиента: ${money(r.recommendedPrice)}\nПримерное время уборки бригады: ${hours(r.brigadeHours)}\nСумма нормо-часов: ${hours(r.normHours)}\nКоличество сотрудников: ${num(state.form.workers)} чел.\nФОТ: ${money(r.payroll)}\n\nДополнительная информация:\n${state.mainInfo.usefulInfo||'—'}\n\nЗаметки: ${state.form.notes||'—'}`;
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
  const contactStyle=`font-family:${font};font-size:${num(h.contactFontSize)||13}px;letter-spacing:${Number(h.contactLetterSpacing)||0}px;color:${cleanCss(h.contactColor,'#0f172a')}`;
  const headerStyle=`display:flex;justify-content:space-between;gap:24px;border-bottom:${num(h.borderWidth)}px solid ${cleanCss(h.borderColor,'#0f172a')};padding-bottom:${num(h.paddingBottom)||16}px;margin-bottom:${num(h.marginBottom)||22}px`;
  const blocks = {
    client: `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr><td style="padding:6px 0;font-weight:700">Клиент</td><td style="padding:6px 0">${esc(state.form.clientName||'—')}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Объект</td><td style="padding:6px 0">${esc(state.form.objectType)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Площадь</td><td style="padding:6px 0">${num(state.form.area)} м²</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Тип уборки</td><td style="padding:6px 0">${esc(r.rate.label)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Заставленность</td><td style="padding:6px 0">${esc(r.clutter.label)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">Загрязнённость</td><td style="padding:6px 0">${esc(r.dirt.label)}</td></tr>
    </table>`,
    included: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">В услуги входят</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${included.length?included.map(x=>`<div style="margin:0 0 6px">• ${esc(x)}</div>`).join(''):'<div>—</div>'}</div>`,
    extras: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Дополнительные услуги</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${extras.length?extras.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px;margin:0 0 6px"><span>${esc(x.name)} × ${num(x.qty)}</span><span>${money(num(x.qty)*num(x.price))}</span></div>`).join(''):'<div>Без доп. услуг</div>'}</div>`,
    pricing: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Стоимость и время</div><table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0">База до коэффициентов</td><td style="padding:6px 0;text-align:right">${money(r.baseNoK)}</td></tr>
      <tr><td style="padding:6px 0">Коэф. заставленности: ${esc(r.clutter.label)}</td><td style="padding:6px 0;text-align:right">× ${r.clutterPriceK.toFixed(2)} → ${money(r.baseAfterClutter)}</td></tr>
      <tr><td style="padding:6px 0">Коэф. загрязнённости: ${esc(r.dirt.label)}</td><td style="padding:6px 0;text-align:right">× ${r.dirtPriceK.toFixed(2)} → ${money(r.baseWithK)}</td></tr>
      <tr><td style="padding:6px 0">Стоимость по уборке</td><td style="padding:6px 0;text-align:right">${money(r.baseRaw)}</td></tr>
      <tr><td style="padding:6px 0">Доп. услуги</td><td style="padding:6px 0;text-align:right">${money(r.extrasTotal)}</td></tr>
      <tr><td style="padding:6px 0">Выезд</td><td style="padding:6px 0;text-align:right">${money(r.travelTotal)}</td></tr>
      <tr><td style="padding:6px 0">Скидка</td><td style="padding:6px 0;text-align:right">− ${money(r.discountValue)}</td></tr>
      <tr><td style="padding:6px 0">Цена по рынку после скидки</td><td style="padding:6px 0;text-align:right">${money(r.marketPrice)}</td></tr>
      <tr><td style="padding:6px 0">Цена по себестоимости + прибыль</td><td style="padding:6px 0;text-align:right">${money(r.costBasedPrice)}</td></tr>
      <tr><td style="padding:10px 0;font-weight:800">Итого для клиента</td><td style="padding:10px 0;text-align:right;font-weight:800">${money(r.recommendedPrice)}</td></tr>
      <tr><td style="padding:6px 0">Сумма нормо-часов</td><td style="padding:6px 0;text-align:right">${hours(r.normHours)}</td></tr>
      <tr><td style="padding:6px 0">Примерное время уборки бригады</td><td style="padding:6px 0;text-align:right">${hours(r.brigadeHours)}</td></tr>
      <tr><td style="padding:6px 0">Количество сотрудников</td><td style="padding:6px 0;text-align:right">${num(state.form.workers)} чел.</td></tr>
    </table>`,
    useful_info: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Дополнительная информация</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.usefulInfo?esc(state.mainInfo.usefulInfo).replace(/\n/g,'<br>'):'—'}</div>`,
    main_info: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Основная информация</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.equipmentText?`<div><strong>Техника:</strong><br>${esc(state.mainInfo.equipmentText).replace(/\n/g,'<br>')}</div>`:''}${state.mainInfo.chemistryText?`<div style="margin-top:10px"><strong>Химия / сертификаты:</strong><br>${esc(state.mainInfo.chemistryText).replace(/\n/g,'<br>')}</div>`:''}${!state.mainInfo.equipmentText && !state.mainInfo.chemistryText ? '<div>—</div>' : ''}</div>`,
    notes: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Заметки</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;min-height:60px">${esc(state.form.notes||'—')}</div>`
  };
  const content = state.pdfSettings.order.filter(k=>state.pdfSettings.visible[k]).map(k=>blocks[k]||'').join('');
  return `
  <div style="padding:32px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="${headerStyle}">
      <div>${brandBlock}</div>
      <div style="text-align:right;${contactStyle}"><div>${esc(state.brand.phone)}</div><div style="margin-top:6px;color:${cleanCss(h.contactColor,'#0f172a')}">${esc(state.brand.site)}</div></div>
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
  $('saveIncludedBtn').onclick=()=>{ state.includedByType[state.form.cleanType]=$('includedServices').value; saveState(); renderIncludedPreview(); toast('Шаблон сохранён'); };
  $('includedServices').oninput=(e)=>{ state.includedByType[state.form.cleanType]=e.target.value; saveState(); renderIncludedPreview(); };
  $('saveOrderBtn').onclick=()=>{ if(validateCurrentOrder().length) return; const r=calc(); state.savedOrders.unshift({id:Date.now(), version:APP_VERSION, clientName:state.form.clientName||'Без имени', objectType:state.form.objectType, area:num(state.form.area), cleanType:r.rate.label, recommendedPrice:r.recommendedPrice, brigadeHours:r.brigadeHours, normHours:r.normHours, form:clone(state.form), extras:clone(r.selectedExtras), calculation:{recommendedPrice:r.recommendedPrice,marketPrice:r.marketPrice,payroll:r.payroll,normHours:r.normHours,brigadeHours:r.brigadeHours}, createdAt:new Date().toLocaleString('ru-RU')}); state.savedOrders=state.savedOrders.slice(0,50); state.ui=state.ui||{}; state.ui.ordersSinceBackup=Number(state.ui.ordersSinceBackup||0)+1; saveState(); renderSavedOrders(); updateBackupReminder(); toast('Заказ сохранён'); if(state.ui.autoBackup && state.ui.ordersSinceBackup>=AUTO_BACKUP_EVERY){ exportBackup(); toast('Авто-копия сохранена'); } };
  $('clearBtn').onclick=()=>{ state.form=clone(defaults.form); state.extras=state.extras.map(x=>({...x, qty:0})); fillForm(); renderExtras(); recalc(); toast('Форма очищена'); };
  $('resetStorageBtn').onclick=()=>requestEditAccess(()=>{ if(!confirm('Сбросить все сохранённые данные в этом браузере?')) return; localStorage.removeItem(STORAGE_KEY); state=mergeState(clone(defaults)); migrateV43(); fillForm(); renderTariffs(); renderExtras(); recalc(); toast('Все данные сброшены'); });
  $('demoBtn').onclick=()=>{ state.form={...state.form, clientName:'Ирина', objectType:'Квартира', area:68, cleanType:'general', discount:5, clutter:'medium', dirtiness:'medium', travelType:'km15', travelKm:20, workers:2, workerPay:4000, profitPercent:35, notes:'Есть кот. Уборка нужна в пятницу после 11:00.'}; state.extras=state.extras.map(x=>({...x, qty:({1:1,9:1,14:4,18:1}[x.id]||0)})); fillForm(); renderExtras(); recalc(); toast('Подставлен пример'); };
  $('showOnlySelected').onchange=e=>{ state.form.showOnlySelected=e.target.checked; saveState(); renderExtras(); };
  ['clientName','objectType','area','discount','discountAmount','travelKm','workers','workerPay','profitPercent','notes'].forEach(id=>$(id).oninput=e=>{ state.form[id]=['area','discount','discountAmount','travelKm','workers','workerPay','profitPercent'].includes(id)?num(e.target.value):e.target.value; recalc(); });
  ['cleanType','clutter','dirtiness','travelType','payMode','discountMode'].forEach(id=>$(id).onchange=e=>{ state.form[id]=e.target.value; if(id==='cleanType'){ $('includedTypeLabel').textContent=state.baseRates[state.form.cleanType].label; $('includedServices').value=state.includedByType[state.form.cleanType]||''; } if(id==='discountMode'){ updateDiscountInputs(); } recalc(); });
  ['brandName','brandPhone','brandTagline','brandSite'].forEach(id=>$(id).oninput=e=>{ const map={brandName:'name',brandPhone:'phone',brandTagline:'tagline',brandSite:'site'}; state.brand[map[id]]=e.target.value; saveState(); renderBrandLogoPreview(); });
  $('brandLogo').onchange=e=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; if(file.size>2*1024*1024){ toast('Логотип слишком большой. Лучше до 2 МБ'); e.target.value=''; return; } const reader=new FileReader(); reader.onload=()=>{ state.brand.logoDataUrl=String(reader.result||''); saveState(); renderBrandLogoPreview(); toast('Логотип сохранён'); $('brandLogo').value=''; }; reader.readAsDataURL(file); };
  $('removeLogoBtn').onclick=()=>{ if(!state.brand.logoDataUrl){ toast('Логотип не загружен'); return; } state.brand.logoDataUrl=''; saveState(); renderBrandLogoPreview(); toast('Логотип удалён'); };
  if($('backupNowBtn')) $('backupNowBtn').onclick=exportBackup;
  if($('autoBackupToggle')) $('autoBackupToggle').onchange=e=>{ state.ui=state.ui||{}; state.ui.autoBackup=e.target.checked; saveState(); toast(e.target.checked?'Авто-копия включена':'Авто-копия выключена'); };
  $('addExtraBtn').onclick=()=>requestEditAccess(()=>{ const name=$('newExtraName').value.trim(), unit=$('newExtraUnit').value.trim()||'шт', price=num($('newExtraPrice').value), time=num($('newExtraTime').value), category=$('newExtraCategory').value.trim()||'Другое'; if(!name||!price){ toast('Заполни название и цену'); return; } state.extras.push({id:Date.now(), name, unit, price, qty:0, time, category, builtIn:false}); $('newExtraName').value=''; $('newExtraPrice').value=''; $('newExtraTime').value=''; saveState(); renderExtras(); recalc(); toast('Услуга добавлена'); });
}
function updateDiscountInputs(){ const mode=state.form.discountMode==='amount'?'amount':'percent'; const sel=$('discountMode'); if(sel) sel.value=mode; const pct=$('discount'), amt=$('discountAmount'); if(pct) pct.classList.toggle('hidden', mode!=='percent'); if(amt) amt.classList.toggle('hidden', mode!=='amount'); }
function fillForm(){ if(!isEditUnlocked()){ state.ui.showTariffs=false; state.ui.showSettings=false; } $('clientName').value=state.form.clientName; $('objectType').value=state.form.objectType; $('area').value=state.form.area; $('discount').value=state.form.discount; if($('discountAmount')) $('discountAmount').value=state.form.discountAmount||0; updateDiscountInputs(); $('travelKm').value=state.form.travelKm; $('workers').value=state.form.workers; $('workerPay').value=state.form.workerPay; $('profitPercent').value=state.form.profitPercent; $('notes').value=state.form.notes; $('showOnlySelected').checked=!!state.form.showOnlySelected; $('tariffsCard').classList.toggle('hidden', !state.ui.showTariffs); $('settingsCard').classList.toggle('hidden', !state.ui.showSettings); populateMainSelects(); $('includedServices').value=state.includedByType[state.form.cleanType]||''; renderSettingsPanel(); }
fillForm(); renderTariffs(); bind(); renderExtras(); renderSettingsPanel(); recalc(); updateBackupReminder(); attemptIdbRecovery(); if($('versionBadge')) $('versionBadge').textContent=APP_VERSION; setupAccess();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
