
const STORAGE_KEY = 'prochistka_calc_miniapp_v3_free';
const LEGACY_STORAGE_KEYS = ['prochistka_calc_miniapp_v2'];
const ACCESS_STORAGE_KEY = 'prochistka_calc_access_v3_free';
const CALC_VERSION = 'v3.0-free';
const defaults = {
  brand:{name:'PRO-CHISTKA', phone:'+7 (993) 635-60-64', tagline:'Клининговые услуги', site:'pro-chistka.pro', logoDataUrl:''},
  baseRates:{
    maintenance:{label:'Поддерживающая', rate:80, min:5000, speed:25},
    general:{label:'Генеральная', rate:200, min:9000, speed:7},
    postreno:{label:'После ремонта', rate:300, min:12000, speed:5}
  },
  clutter:{
    low:{label:'Минимальная', priceK:0.95, timeK:1},
    medium:{label:'Средняя', priceK:1.2, timeK:1.2},
    high:{label:'Высокая', priceK:1.6, timeK:1.4}
  },
  dirtiness:{
    low:{label:'Обычная', priceK:1, timeK:1},
    medium:{label:'Повышенная', priceK:1.4, timeK:1.2},
    high:{label:'Сильная', priceK:1.8, timeK:1.4}
  },
  includedByType:{
    maintenance:'Влажная уборка всех доступных поверхностей\nПылесос пола\nМытьё санузла\nПротирка кухни снаружи',
    general:'Влажная уборка всех доступных поверхностей\nПылесос пола и плинтусов\nМытьё санузла и кухни\nУдаление сложных загрязнений в доступных местах',
    postreno:'Удаление строительной пыли\nПылесос пола и поверхностей\nВлажная уборка всех доступных зон\nМытьё санузла и кухни'
  },
  pdfSettings:{
    order:['client','included','extras','pricing','payment_methods','main_info','notes'],
    visible:{client:true,included:true,extras:true,pricing:true,payment_methods:true,main_info:true,notes:true}
  },
  paymentMethods:[
    {id:1,title:'Наличные',text:'Оплата после завершения работ',imageDataUrl:''},
    {id:2,title:'Перевод',text:'Перевод по согласованным реквизитам',imageDataUrl:''},
    {id:3,title:'QR-код СБП',text:'Оплата по QR-коду СБП',imageDataUrl:''},
    {id:4,title:'Ссылка СБП',text:'Оплата по ссылке СБП',imageDataUrl:''},
    {id:5,title:'Банковская карта',text:'VISA / MasterCard / МИР',imageDataUrl:''},
    {id:6,title:'Долями',text:'Рассрочка от Т-Банка',imageDataUrl:''},
    {id:7,title:'Безналичный платёж',text:'Для юридических лиц',imageDataUrl:''}
  ],
  mainInfo:{equipmentText:'',chemistryText:''},
  extras:[
    {id:1,name:'Холодильник',unit:'шт',price:800,qty:0,time:0.5,category:'Кухня',builtIn:true},
    {id:2,name:'Духовой шкаф',unit:'шт',price:750,qty:0,time:0.5,category:'Кухня',builtIn:true},
    {id:3,name:'Вытяжка',unit:'шт',price:350,qty:0,time:0.3,category:'Кухня',builtIn:true},
    {id:4,name:'Варочная панель',unit:'шт',price:450,qty:0,time:0.35,category:'Кухня',builtIn:true},
    {id:5,name:'Плита',unit:'шт',price:1200,qty:0,time:0.8,category:'Кухня',builtIn:true},
    {id:6,name:'СВЧ',unit:'шт',price:450,qty:0,time:0.25,category:'Кухня',builtIn:true},
    {id:7,name:'Озонирование',unit:'час',price:1000,qty:0,time:1,category:'Другое',builtIn:true},
    {id:8,name:'Стул (химчистка)',unit:'шт',price:700,qty:0,time:0.4,category:'Химчистка',builtIn:true},
    {id:9,name:'Диван стандарт 3 места',unit:'шт',price:4000,qty:0,time:2.5,category:'Химчистка',builtIn:true},
    {id:10,name:'Диван угловой',unit:'шт',price:4500,qty:0,time:3,category:'Химчистка',builtIn:true},
    {id:11,name:'Матрас',unit:'сторона',price:3500,qty:0,time:1.5,category:'Химчистка',builtIn:true},
    {id:12,name:'Окно одностороннее, открывающаяся створка',unit:'створка',price:450,qty:0,time:0.25,category:'Окна',builtIn:true},
    {id:13,name:'Окно одностороннее, глухая секция',unit:'секция',price:350,qty:0,time:0.2,category:'Окна',builtIn:true},
    {id:14,name:'Окно двухстороннее, открывающаяся створка',unit:'створка',price:650,qty:0,time:0.35,category:'Окна',builtIn:true},
    {id:15,name:'Окно двухстороннее, глухая секция',unit:'секция',price:500,qty:0,time:0.3,category:'Окна',builtIn:true},
    {id:16,name:'Окно после ремонта, открывающаяся створка',unit:'створка',price:800,qty:0,time:0.45,category:'Окна',builtIn:true},
    {id:17,name:'Окно после ремонта, глухая секция',unit:'секция',price:650,qty:0,time:0.4,category:'Окна',builtIn:true},
    {id:18,name:'Балконный блок',unit:'компл',price:1800,qty:0,time:1,category:'Окна',builtIn:true},
    {id:19,name:'Лоджия / остекление',unit:'компл',price:3500,qty:0,time:2,category:'Окна',builtIn:true},
    {id:20,name:'Панорамное остекление',unit:'м²',price:450,qty:0,time:0.2,category:'Окна',builtIn:true}
  ],
  form:{clientName:'',objectType:'Квартира',area:50,cleanType:'general',discount:0,clutter:'low',dirtiness:'low',travelType:'kad',travelKm:20,workers:2,payMode:'fixed',workerPay:3500,profitPercent:30,notes:'',showOnlySelected:false},
  savedOrders:[], ui:{showTariffs:false, extraGroupsCollapsed:{}, currentOrderId:null, cloudReady:false, cloudLastSync:''}
};
function clone(x){return JSON.parse(JSON.stringify(x));}
function mergeState(parsed){
  const d=clone(defaults);
  return {
    ...d,...parsed,
    brand:{...d.brand,...(parsed.brand||{})},
    baseRates:{...d.baseRates,...(parsed.baseRates||{})},
    clutter:{...d.clutter,...(parsed.clutter||{})},
    dirtiness:{...d.dirtiness,...(parsed.dirtiness||{})},
    includedByType:{...d.includedByType,...(parsed.includedByType||{})},
    pdfSettings:{order:Array.isArray(parsed.pdfSettings?.order)?parsed.pdfSettings.order:d.pdfSettings.order, visible:{...d.pdfSettings.visible,...(parsed.pdfSettings?.visible||{})}},
    paymentMethods:Array.isArray(parsed.paymentMethods)?parsed.paymentMethods:d.paymentMethods,
    mainInfo:{...d.mainInfo,...(parsed.mainInfo||{})},
    form:{...d.form,...(parsed.form||{})},
    savedOrders:Array.isArray(parsed.savedOrders)?parsed.savedOrders:[],
    extras:Array.isArray(parsed.extras)?parsed.extras:d.extras,
    ui:{...d.ui,...(parsed.ui||{})}
  };
}
let state;
try{
  let raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    for(const legacyKey of LEGACY_STORAGE_KEYS){
      raw = localStorage.getItem(legacyKey);
      if(raw) break;
    }
  }
  state = raw ? mergeState(JSON.parse(raw)) : clone(defaults);
}catch(e){ state=clone(defaults); }
function saveState(){try{localStorage.setItem(STORAGE_KEY, JSON.stringify(state));}catch(e){console.warn('localStorage save failed',e); toast('Не удалось сохранить локально: слишком много данных');}}
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' ₽';
const num=n=>Math.max(0, Number(n)||0);
const hours=n=>(Math.round((Number(n)||0)*10)/10).toFixed(1)+' ч';
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); clearTimeout(window._tt); window._tt=setTimeout(()=>t.classList.add('hidden'),2500); }

function setCloudStatus(msg){ const el=$('cloudStatus'); if(el) el.textContent=msg; }
function setAuthStatus(msg){ const el=$('authStatus'); if(el) el.textContent=msg; }
const APP_CONFIG = window.PROCHISTKA_CONFIG || {};
function accessPassword(){ return String(APP_CONFIG.APP_PASSWORD || '7421'); }
function accessEnabled(){ return accessPassword().trim().length > 0; }
function hasAccess(){ return !accessEnabled() || localStorage.getItem(ACCESS_STORAGE_KEY) === 'ok'; }
function renderAuth(){
  const unlocked = hasAccess();
  const lf=$('loginFields'), lo=$('logoutBtn'), hint=$('authHint'), card=$('authCard');
  document.body.classList.toggle('locked', !unlocked);
  if(lf) lf.classList.toggle('hidden', unlocked);
  if(lo) lo.classList.toggle('hidden', !unlocked);
  if(card) card.classList.toggle('hidden', unlocked && !APP_CONFIG.SHOW_AUTH_CARD_AFTER_LOGIN);
  if(hint) hint.textContent = unlocked
    ? 'Доступ открыт. Заказы хранятся локально в браузере. Для переноса используйте экспорт/импорт.'
    : 'Введите рабочий пароль. Это бесплатная временная версия без облачной базы.';
  setAuthStatus(unlocked ? 'Доступ открыт.' : 'Введите пароль для входа.');
}
function initAccess(){
  renderAuth();
  setCloudStatus('Локальный режим: заказы хранятся в этом браузере. Для переноса между устройствами используйте экспорт и импорт JSON-файла.');
}
function loginLocal(){
  const password=$('loginPassword')?.value || '';
  if(password === accessPassword()){
    localStorage.setItem(ACCESS_STORAGE_KEY, 'ok');
    if($('loginPassword')) $('loginPassword').value='';
    renderAuth();
    toast('Доступ открыт');
  }else{
    setAuthStatus('Неверный пароль.');
  }
}
function logoutLocal(){
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  renderAuth();
}
function downloadJson(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function safeDateForFilename(){
  return new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
}
function exportOrders(){
  const data = {
    app:'PRO-CHISTKA calculator',
    type:'orders',
    version:CALC_VERSION,
    exportedAt:new Date().toISOString(),
    orders:state.savedOrders || []
  };
  downloadJson(data, `prochistka-orders-${safeDateForFilename()}.json`);
  toast('Заказы экспортированы');
}
function exportBackup(){
  const data = {
    app:'PRO-CHISTKA calculator',
    type:'full-backup',
    version:CALC_VERSION,
    exportedAt:new Date().toISOString(),
    state:clone(state)
  };
  downloadJson(data, `prochistka-calculator-backup-${safeDateForFilename()}.json`);
  toast('Резервная копия скачана');
}
function mergeOrders(incoming){
  const map = new Map();
  [...(state.savedOrders||[]), ...(incoming||[])].forEach(o=>{
    if(!o) return;
    const id = String(o.id || Date.now()+Math.random());
    const prev = map.get(id);
    if(!prev) map.set(id, o);
    else{
      const pa = Date.parse(prev.updatedAt || prev.createdAt || '') || 0;
      const na = Date.parse(o.updatedAt || o.createdAt || '') || 0;
      map.set(id, na >= pa ? o : prev);
    }
  });
  state.savedOrders = Array.from(map.values()).slice(0,200);
}
function importDataFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(String(reader.result||''));
      if(Array.isArray(data)){
        mergeOrders(data);
        saveState(); renderSavedOrders(); toast('Заказы импортированы'); return;
      }
      if(data.type === 'orders' && Array.isArray(data.orders)){
        mergeOrders(data.orders);
        saveState(); renderSavedOrders(); toast('Заказы импортированы'); return;
      }
      if(data.type === 'full-backup' && data.state){
        if(!confirm('Заменить текущие данные калькулятора резервной копией? Текущие локальные данные будут перезаписаны.')) return;
        state = mergeState(data.state);
        saveState(); fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); renderSavedOrders(); recalc();
        toast('Резервная копия восстановлена'); return;
      }
      if(data.state){
        if(!confirm('Найден файл с состоянием калькулятора. Восстановить его полностью?')) return;
        state = mergeState(data.state);
        saveState(); fillForm(); renderTariffs(); renderExtras(); renderSettingsPanel(); renderSavedOrders(); recalc();
        toast('Данные восстановлены'); return;
      }
      toast('Не удалось понять файл импорта');
    }catch(e){
      console.error(e);
      toast('Ошибка импорта JSON');
    }finally{
      if($('importDataFile')) $('importDataFile').value='';
    }
  };
  reader.readAsText(file, 'UTF-8');
}
async function syncCloudOrders(showToast=true){
  setCloudStatus('Облачной базы в бесплатной версии нет. Используйте экспорт/импорт JSON-файла.');
  if(showToast) toast('Используйте экспорт/импорт');
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
  const labels = {client:'Шапка и данные клиента', included:'Что входит в уборку', extras:'Дополнительные услуги', pricing:'Стоимость и итоги', payment_methods:'Способы оплаты', main_info:'Основная информация', notes:'Заметки'};
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
function renderPayments(){
  const wrap = $('paymentsWrap'); if(!wrap) return;
  wrap.innerHTML = '';
  state.paymentMethods.forEach(item=>{
    const div = document.createElement('div'); div.className = 'extra-card';
    div.innerHTML = `<div class="grid g3">
      <div><label>Название</label><input data-pay-id="${item.id}" data-field="title" value="${esc(item.title)}"></div>
      <div><label>Описание</label><input data-pay-id="${item.id}" data-field="text" value="${esc(item.text)}"></div>
      <div><label>Картинка</label><input type="file" data-pay-upload="${item.id}" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px">
      <div>${item.imageDataUrl ? `<img src="${item.imageDataUrl}" style="max-height:40px;max-width:80px;object-fit:contain;border:1px solid var(--line);padding:4px;border-radius:8px;background:#fff">` : '<div class="muted" style="font-size:12px">Без картинки</div>'}</div>
      <div class="btns">
        <button type="button" data-pay-up="${item.id}">↑</button>
        <button type="button" data-pay-down="${item.id}">↓</button>
        <button type="button" data-pay-remove="${item.id}" class="danger">Удалить</button>
      </div>
    </div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-pay-id]').forEach(el=>el.oninput=e=>{ const item=state.paymentMethods.find(x=>x.id===Number(e.target.dataset.payId)); if(!item) return; item[e.target.dataset.field]=e.target.value; saveState(); });
  wrap.querySelectorAll('[data-pay-upload]').forEach(el=>el.onchange=e=>{ const file=e.target.files?.[0]; if(!file) return; const item=state.paymentMethods.find(x=>x.id===Number(e.target.dataset.payUpload)); const reader=new FileReader(); reader.onload=()=>{ item.imageDataUrl=String(reader.result||''); saveState(); renderPayments(); }; reader.readAsDataURL(file); });
  wrap.querySelectorAll('[data-pay-remove]').forEach(el=>el.onclick=()=>{ state.paymentMethods=state.paymentMethods.filter(x=>x.id!==Number(el.dataset.payRemove)); saveState(); renderPayments(); });
  wrap.querySelectorAll('[data-pay-up]').forEach(el=>el.onclick=()=>{ const i=state.paymentMethods.findIndex(x=>x.id===Number(el.dataset.payUp)); state.paymentMethods=moveItem(state.paymentMethods,i,i-1); saveState(); renderPayments(); });
  wrap.querySelectorAll('[data-pay-down]').forEach(el=>el.onclick=()=>{ const i=state.paymentMethods.findIndex(x=>x.id===Number(el.dataset.payDown)); state.paymentMethods=moveItem(state.paymentMethods,i,i+1); saveState(); renderPayments(); });
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
  if($('equipmentText')) $('equipmentText').value=state.mainInfo.equipmentText||'';
  if($('chemistryText')) $('chemistryText').value=state.mainInfo.chemistryText||'';
  renderBrandLogoPreview();
  renderPdfBlocks();
  renderPayments();
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
function populateMainSelects(){ fillSelect('cleanType', state.baseRates, state.form.cleanType); fillSelect('clutter', state.clutter, state.form.clutter); fillSelect('dirtiness', state.dirtiness, state.form.dirtiness); fillSelect('travelType', {kad:{label:'В пределах КАД'},km15:{label:'До 15 км от КАД'},km20plus:{label:'20+ км'}}, state.form.travelType); $('includedTypeLabel').textContent=state.baseRates[state.form.cleanType].label; $('includedServices').value=state.includedByType[state.form.cleanType]||''; }
function getGroupedExtras(){ const arr=state.form.showOnlySelected?state.extras.filter(x=>num(x.qty)>0):state.extras; const map={}; arr.forEach(x=>{ const c=x.category||'Другое'; (map[c]||(map[c]=[])).push(x); }); return map; }
function isExtraGroupOpen(cat){ return !(state.ui.extraGroupsCollapsed && state.ui.extraGroupsCollapsed[cat]); }
function setExtraGroupOpen(cat, isOpen){ state.ui.extraGroupsCollapsed=state.ui.extraGroupsCollapsed||{}; state.ui.extraGroupsCollapsed[cat]=!isOpen; saveState(); }
function renderExtras(){ const wrap=$('extrasWrap'); wrap.innerHTML=''; const groups=getGroupedExtras(); const cats=Object.keys(groups); if(!cats.length){ wrap.innerHTML='<div class="notice">Нет услуг для отображения.</div>'; return; }
  cats.forEach(cat=>{
    const details=document.createElement('details'); details.className='extra-card'; details.style.padding='0'; details.open=isExtraGroupOpen(cat);
    details.innerHTML=`<summary style="list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:800"><span>${esc(cat)}</span><span class="muted" style="font-weight:600">${groups[cat].length} поз.</span></summary><div class="grid" style="gap:12px;padding:0 14px 14px"></div>`;
    const content=details.querySelector('div');
    details.addEventListener('toggle', ()=>setExtraGroupOpen(cat, details.open));
    groups[cat].forEach(item=>{
      const div=document.createElement('div'); div.className='extra-card'; div.style.margin='0';
      div.innerHTML=`<div class="extra-grid">
        <div>
          <label>Название услуги</label>
          <input value="${esc(item.name)}" data-extra="${item.id}" data-field="name">
          <div class="muted" style="font-size:14px;margin-top:6px">${esc(item.unit)} · ~ ${hours(item.time)}</div>
        </div>
        <div><label>Кол-во</label><input type="number" min="0" value="${num(item.qty)}" data-extra="${item.id}" data-field="qty"></div>
        <div><label>Цена</label><input type="number" min="0" value="${num(item.price)}" data-extra="${item.id}" data-field="price"></div>
        <div><label>Время, ч</label><input type="number" min="0" step="0.1" value="${num(item.time)}" data-extra="${item.id}" data-field="time"></div>
        <div style="align-self:end">${item.builtIn?'':`<button data-remove="${item.id}">Удалить</button>`}</div>
      </div>`;
      content.appendChild(div);
    });
    wrap.appendChild(details);
  });
  document.querySelectorAll('[data-extra]').forEach(inp=>inp.oninput=(e)=>{ const id=Number(e.target.dataset.extra); const field=e.target.dataset.field; const item=state.extras.find(x=>x.id===id); if(!item)return; item[field]=field==='name'?e.target.value:num(e.target.value); saveState(); recalc(); renderSelectedExtras(); if(field==='name'||state.form.showOnlySelected) renderExtras(); });
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>{ const id=Number(btn.dataset.remove); state.extras=state.extras.filter(x=>x.id!==id); saveState(); renderExtras(); recalc(); toast('Услуга удалена'); });
}
function calc(){
  const f=state.form, rate=state.baseRates[f.cleanType], clutter=state.clutter[f.clutter], dirt=state.dirtiness[f.dirtiness];
  const area=num(f.area), workers=num(f.workers), workerPay=num(f.workerPay), profitPercent=num(f.profitPercent), discount=Math.min(100,num(f.discount));
  const clutterPriceK=clutter.priceK||1, dirtPriceK=dirt.priceK||1;
  const clutterTimeK=clutter.timeK||1, dirtTimeK=dirt.timeK||1;
  const priceK=clutterPriceK*dirtPriceK; const timeK=clutterTimeK*dirtTimeK;
  const baseWithoutK=area*(rate.rate||0);
  const baseAfterClutter=baseWithoutK*clutterPriceK;
  const baseAfterDirt=baseAfterClutter*dirtPriceK;
  const baseRaw=Math.max(baseAfterDirt, rate.min||0);
  const extrasTotal=state.extras.reduce((s,x)=>s+num(x.qty)*num(x.price),0);
  const travelTotal=f.travelType==='km20plus'?(1500+num(f.travelKm)*15):(f.travelType==='km15'?1500:0);
  const marketSubtotal=baseRaw+extrasTotal+travelTotal;
  const baseHours=(rate.speed>0)?area/rate.speed:0;
  const extrasHours=state.extras.reduce((s,x)=>s+num(x.qty)*num(x.time),0);
  const normHours=(baseHours+extrasHours)*timeK;
  const brigadeHours=workers>0?normHours/workers:normHours;
  const payroll=(f.payMode==='hourly') ? workers*workerPay*brigadeHours : workers*workerPay;
  const targetProfitValue=payroll*(profitPercent/100);
  const costBasedPrice=payroll+travelTotal+extrasTotal+targetProfitValue;
  const directCostFloor=payroll+travelTotal+extrasTotal;
  const economyCorrection=Math.max(0, costBasedPrice-marketSubtotal);
  const priceBeforeDiscount=marketSubtotal+economyCorrection;
  const discountValue=priceBeforeDiscount*(discount/100);
  const marketPrice=Math.max(0, priceBeforeDiscount-discountValue);
  const floorCorrection=Math.max(0, directCostFloor-marketPrice);
  const recommendedPrice=marketPrice+floorCorrection;
  const selectedExtras=state.extras.filter(x=>num(x.qty)>0);
  return {rate,clutter,dirt,clutterPriceK,dirtPriceK,priceK,timeK,baseWithoutK,baseAfterClutter,baseAfterDirt,baseRaw,extrasTotal,travelTotal,marketSubtotal,discountValue,marketPrice,payroll,targetProfitValue,costBasedPrice,directCostFloor,economyCorrection,priceBeforeDiscount,floorCorrection,recommendedPrice,baseHours,extrasHours,normHours,brigadeHours,selectedExtras};
}

function renderIncludedPreview(){ const txt=(state.includedByType[state.form.cleanType]||'').trim(); $('includedPreview').innerHTML=txt?txt.split(/\n+/).map(x=>`<div>• ${esc(x)}</div>`).join(''):'<div class="muted">Пока не заполнено.</div>'; }
function renderBrandLogoPreview(){ const wrap=$('brandLogoPreview'); if(!wrap) return; if(state.brand.logoDataUrl){ wrap.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><img src="${state.brand.logoDataUrl}" alt="Логотип" style="max-height:70px;max-width:220px;object-fit:contain;border:1px solid #dbe3ef;border-radius:10px;background:#fff;padding:6px"><span class="muted">Логотип будет показан в печатной смете.</span></div>`; } else { wrap.innerHTML='Логотип пока не выбран.'; } }
function renderSelectedExtras(){ const {selectedExtras}=calc(); const wrap=$('selectedExtrasWrap'); wrap.innerHTML=''; if(!selectedExtras.length){ wrap.innerHTML='<div class="notice">Пока ничего не выбрано.</div>'; return; } selectedExtras.forEach(x=>{ const div=document.createElement('div'); div.className='selected-item'; div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(x.name)} × ${num(x.qty)}</span><span>${money(num(x.qty)*num(x.price))}</span></div>`; wrap.appendChild(div); }); }
function createOrderSnapshot(existingId){
  const r=calc();
  const old = state.savedOrders.find(x=>String(x.id)===String(existingId));
  return {
    id: existingId || Date.now(),
    clientName: state.form.clientName || 'Без имени',
    objectType: state.form.objectType,
    area: num(state.form.area),
    cleanType: r.rate.label,
    cleanTypeKey: state.form.cleanType,
    recommendedPrice: r.recommendedPrice,
    brigadeHours: r.brigadeHours,
    normHours: r.normHours,
    createdAt: old?.createdAt || new Date().toLocaleString('ru-RU'),
    updatedAt: new Date().toLocaleString('ru-RU'),
    version: CALC_VERSION,
    form: clone(state.form),
    extras: clone(state.extras)
  };
}
function applyOrderSnapshot(o){
  if(!o) return;
  if(o.form){ state.form={...clone(defaults.form), ...o.form}; }
  else { state.form={...state.form, clientName:o.clientName||'', objectType:o.objectType||state.form.objectType, area:num(o.area)||state.form.area, cleanType:o.cleanTypeKey||state.form.cleanType}; }
  if(Array.isArray(o.extras)){ state.extras=clone(o.extras); }
  state.ui.currentOrderId=o.id || null;
  fillForm(); renderExtras(); recalc(); saveState(); toast('Заказ открыт');
}

async function saveCurrentOrder(){
  const id = state.ui.currentOrderId || Date.now();
  const order = createOrderSnapshot(id);
  const idx = state.savedOrders.findIndex(x=>String(x.id)===String(id));
  if(idx>=0) state.savedOrders[idx]=order; else state.savedOrders.unshift(order);
  state.ui.currentOrderId=id;
  state.savedOrders=state.savedOrders.slice(0,200);
  saveState(); renderSavedOrders();
  setCloudStatus('Локально сохранено. Для переноса на другое устройство нажмите «Экспорт заказов».');
  toast('Заказ сохранён локально');
}
async function deleteSavedOrder(id){
  state.savedOrders=state.savedOrders.filter(x=>String(x.id)!==String(id));
  if(String(state.ui.currentOrderId)===String(id)) state.ui.currentOrderId=null;
  saveState(); renderSavedOrders(); toast('Заказ удалён локально');
}
function renderSavedOrders(){
  const wrap=$('savedOrdersWrap'); wrap.innerHTML='';
  if(!state.savedOrders.length){ wrap.innerHTML='<div class="notice">Пока нет сохранённых заказов.</div>'; return; }
  state.savedOrders.forEach(o=>{
    const div=document.createElement('div'); div.className='saved-item';
    const active=String(state.ui.currentOrderId)===String(o.id);
    div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-weight:700">${esc(o.clientName)} · ${esc(o.objectType)}</div><div class="muted" style="margin:4px 0">${esc(o.cleanType)} · ${num(o.area)} м² ${active?'· открыт':''}</div></div><strong>${money(o.recommendedPrice)}</strong></div><div style="display:flex;justify-content:space-between;gap:8px"><span class="muted">Бригада: ${hours(o.brigadeHours)}</span><span class="muted">Нормо-часы: ${hours(o.normHours)}</span></div><div class="muted" style="font-size:12px;margin-top:4px">Создан: ${esc(o.createdAt||'—')} · Изменён: ${esc(o.updatedAt||o.createdAt||'—')}</div><div class="btns" style="margin-top:8px"><button type="button" data-open-order="${esc(o.id)}">Открыть</button><button type="button" data-overwrite-order="${esc(o.id)}">Перезаписать текущими данными</button><button type="button" class="danger" data-delete-order="${esc(o.id)}">Удалить</button></div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-open-order]').forEach(btn=>btn.onclick=()=>{ const o=state.savedOrders.find(x=>String(x.id)===String(btn.dataset.openOrder)); applyOrderSnapshot(o); });
  wrap.querySelectorAll('[data-overwrite-order]').forEach(btn=>btn.onclick=()=>{ state.ui.currentOrderId=btn.dataset.overwriteOrder; saveCurrentOrder(); });
  wrap.querySelectorAll('[data-delete-order]').forEach(btn=>btn.onclick=()=>{ if(confirm('Удалить заказ?')) deleteSavedOrder(btn.dataset.deleteOrder); });
}
function recalc(){
  const r=calc();
  $('recommendedPrice').textContent=money(r.recommendedPrice);
  $('sumBaseRaw').textContent=money(r.baseWithoutK);
  $('sumClutterK').textContent=`× ${Number(r.clutterPriceK).toFixed(2)} → ${money(r.baseAfterClutter)}`;
  $('sumDirtK').textContent=`× ${Number(r.dirtPriceK).toFixed(2)} → ${money(r.baseAfterDirt)}`;
  $('sumMin').textContent=money(r.rate.min||0);
  $('sumBase').textContent=money(r.baseRaw); $('sumExtras').textContent=money(r.extrasTotal); $('sumTravel').textContent=money(r.travelTotal);
  $('sumMarketBefore').textContent=money(r.marketSubtotal);
  $('sumDiscount').textContent='− '+money(r.discountValue); $('sumMarket').textContent=money(r.recommendedPrice);
  $('sumPayroll').textContent=money(r.payroll); $('sumProfit').textContent=money(r.targetProfitValue); $('sumCost').textContent=money(r.costBasedPrice);
  $('sumEconomyCorrection').textContent=money(r.economyCorrection);
  $('sumFloorCorrection').textContent=money(r.floorCorrection);
  $('timeBase').textContent=hours(r.baseHours); $('timeExtras').textContent=hours(r.extrasHours); $('timeNorm').textContent=hours(r.normHours); $('timeBrigade').textContent=hours(r.brigadeHours); $('brigadeLabel').textContent=`Примерное время уборки бригады (${num(state.form.workers)} чел.)`;
  $('cardClient').textContent=state.form.clientName||'—'; $('cardObject').textContent=state.form.objectType||'—'; $('cardArea').textContent=`${num(state.form.area)} м²`; $('cardCleanType').textContent=r.rate.label; $('cardClutter').textContent=r.clutter.label; $('cardDirt').textContent=r.dirt.label;
  $('travelKmBox').classList.toggle('hidden', state.form.travelType!=='km20plus');
  $('workerPayLabel').textContent=state.form.payMode==='hourly' ? 'Почасовая ставка 1 сотрудника, ₽/час' : 'ЗП 1 сотрудника, ₽';
  $('travelHint').textContent=state.form.travelType==='kad'?'Выезд в пределах КАД: бесплатно':state.form.travelType==='km15'?'Выезд до 15 км от КАД: 1 500 ₽':`Выезд 20+ км: ${money(1500 + num(state.form.travelKm)*15)}`;
  renderIncludedPreview(); renderSelectedExtras(); renderSavedOrders(); saveState(); return r;
}
function estimateText(){ const r=calc(); const included=(state.includedByType[state.form.cleanType]||'').trim()||'Не заполнено'; const extras=r.selectedExtras.length?r.selectedExtras.map(x=>`• ${x.name} × ${num(x.qty)} — ${money(num(x.qty)*num(x.price))}`).join('\n'):'• Без доп. услуг'; return `Смета на уборку\n\nКлиент: ${state.form.clientName||'—'}\nОбъект: ${state.form.objectType}\nПлощадь: ${num(state.form.area)} м²\nТип уборки: ${r.rate.label}\nЗаставленность: ${r.clutter.label} × ${Number(r.clutterPriceK).toFixed(2)}\nЗагрязнённость: ${r.dirt.label} × ${Number(r.dirtPriceK).toFixed(2)}\n\nВ услуги входят:\n${included}\n\nДоп. услуги:\n${extras}\n\nБаза без коэффициентов: ${money(r.baseWithoutK)}\nПосле коэффициента заставленности: ${money(r.baseAfterClutter)}\nПосле коэффициента загрязнённости: ${money(r.baseAfterDirt)}\nМинималка: ${money(r.rate.min||0)}\nБаза по уборке к расчёту: ${money(r.baseRaw)}\nДоп. услуги: ${money(r.extrasTotal)}\nВыезд: ${money(r.travelTotal)}\nРыночная сумма до скидки: ${money(r.marketSubtotal)}\nЦена по экономике: ${money(r.costBasedPrice)}\nКорректировка до экономики: ${money(r.economyCorrection)}\nСкидка: ${money(r.discountValue)}\nЗащита от продажи ниже прямых затрат: ${money(r.floorCorrection)}\n\nИтого для клиента: ${money(r.recommendedPrice)}\nПримерное время уборки бригады: ${hours(r.brigadeHours)}\nСумма нормо-часов: ${hours(r.normHours)}\nКоличество сотрудников: ${num(state.form.workers)} чел.\nФОТ: ${money(r.payroll)}\nЖелаемая прибыль: ${money(r.targetProfitValue)}\n\nЗаметки: ${state.form.notes||'—'}`; }
async function copyEstimate(){ const text=estimateText(); try{ await navigator.clipboard.writeText(text); toast('Смета скопирована'); }catch(e){ $('shareText').value=text; $('shareModal').classList.remove('hidden'); toast('Открыл смету для ручного копирования'); } }
function buildPrintHtml(){
  const r=calc();
  const included=(state.includedByType[state.form.cleanType]||'').trim().split(/\n+/).filter(Boolean);
  const extras=r.selectedExtras;
  const brandBlock=state.brand.logoDataUrl
    ? `<div style="display:flex;align-items:center;gap:14px"><img src="${state.brand.logoDataUrl}" alt="Логотип" style="max-height:80px;max-width:180px;object-fit:contain"><div><div style="font-size:28px;font-weight:800">${esc(state.brand.name)}</div><div style="color:#475569;margin-top:6px">${esc(state.brand.tagline)}</div></div></div>`
    : `<div><div style="font-size:28px;font-weight:800">${esc(state.brand.name)}</div><div style="color:#475569;margin-top:6px">${esc(state.brand.tagline)}</div></div>`;
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
      <tr><td style="padding:6px 0">База без коэффициентов</td><td style="padding:6px 0;text-align:right">${money(r.baseWithoutK)}</td></tr>
      <tr><td style="padding:6px 0">Заставленность × ${Number(r.clutterPriceK).toFixed(2)}</td><td style="padding:6px 0;text-align:right">${money(r.baseAfterClutter)}</td></tr>
      <tr><td style="padding:6px 0">Загрязнённость × ${Number(r.dirtPriceK).toFixed(2)}</td><td style="padding:6px 0;text-align:right">${money(r.baseAfterDirt)}</td></tr>
      <tr><td style="padding:6px 0">Минималка</td><td style="padding:6px 0;text-align:right">${money(r.rate.min||0)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700">База по уборке к расчёту</td><td style="padding:6px 0;text-align:right;font-weight:700">${money(r.baseRaw)}</td></tr>
      <tr><td style="padding:6px 0">Доп. услуги</td><td style="padding:6px 0;text-align:right">${money(r.extrasTotal)}</td></tr>
      <tr><td style="padding:6px 0">Выезд</td><td style="padding:6px 0;text-align:right">${money(r.travelTotal)}</td></tr>
      <tr><td style="padding:6px 0">Рыночная сумма до скидки</td><td style="padding:6px 0;text-align:right">${money(r.marketSubtotal)}</td></tr>
      <tr><td style="padding:6px 0">Цена по экономике</td><td style="padding:6px 0;text-align:right">${money(r.costBasedPrice)}</td></tr>
      <tr><td style="padding:6px 0">Корректировка до экономики</td><td style="padding:6px 0;text-align:right">${money(r.economyCorrection)}</td></tr>
      <tr><td style="padding:6px 0">Скидка</td><td style="padding:6px 0;text-align:right">− ${money(r.discountValue)}</td></tr>
      <tr><td style="padding:6px 0">Защита от продажи ниже прямых затрат</td><td style="padding:6px 0;text-align:right">${money(r.floorCorrection)}</td></tr>
      <tr><td style="padding:10px 0;font-weight:800">Итого для клиента</td><td style="padding:10px 0;text-align:right;font-weight:800">${money(r.recommendedPrice)}</td></tr>
      <tr><td style="padding:6px 0">Сумма нормо-часов</td><td style="padding:6px 0;text-align:right">${hours(r.normHours)}</td></tr>
      <tr><td style="padding:6px 0">Примерное время уборки бригады</td><td style="padding:6px 0;text-align:right">${hours(r.brigadeHours)}</td></tr>
      <tr><td style="padding:6px 0">Количество сотрудников</td><td style="padding:6px 0;text-align:right">${num(state.form.workers)} чел.</td></tr>
    </table>`,
    payment_methods: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Способы оплаты</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.paymentMethods.length?state.paymentMethods.map(x=>`<div style="margin:0 0 10px">${x.imageDataUrl?`<img src="${x.imageDataUrl}" style="max-height:24px;max-width:60px;object-fit:contain;vertical-align:middle;margin-right:8px">`:''}<strong>${esc(x.title)}</strong>${x.text?` — ${esc(x.text)}`:''}</div>`).join(''):'<div>—</div>'}</div>`,
    main_info: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Основная информация</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.equipmentText?`<div><strong>Техника:</strong><br>${esc(state.mainInfo.equipmentText).replace(/\n/g,'<br>')}</div>`:''}${state.mainInfo.chemistryText?`<div style="margin-top:10px"><strong>Химия / сертификаты:</strong><br>${esc(state.mainInfo.chemistryText).replace(/\n/g,'<br>')}</div>`:''}${!state.mainInfo.equipmentText && !state.mainInfo.chemistryText ? '<div>—</div>' : ''}</div>`,
    notes: `<div style="font-size:18px;font-weight:800;margin:18px 0 8px">Заметки</div><div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;min-height:60px">${esc(state.form.notes||'—')}</div>`
  };
  const content = state.pdfSettings.order.filter(k=>state.pdfSettings.visible[k]).map(k=>blocks[k]||'').join('');
  return `
  <div style="padding:32px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:22px">
      <div>${brandBlock}</div>
      <div style="text-align:right"><div>${esc(state.brand.phone)}</div><div style="margin-top:6px;color:#475569">${esc(state.brand.site)}</div></div>
    </div>
    <div style="font-size:24px;font-weight:800;margin-bottom:18px">Смета на уборку</div>
    ${content}
  </div>`; }
function printEstimate(){ $('printArea').innerHTML=buildPrintHtml(); window.print(); }
function downloadCurrentHtml(){
  try{
    const snapshot = JSON.stringify(state).replace(/<\/script/gi,'<\\/script');
    let html = document.documentElement.outerHTML;
    html = html.replace(/<script>window\.__EXPORTED_STATE__ = window\.__EXPORTED_STATE__ \|\| null;<\/script>/, `<script>window.__EXPORTED_STATE__ = ${snapshot};<\/script>`);
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (state.brand?.name || 'calculator').toLowerCase().replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'') || 'calculator';
    a.href = url;
    a.download = `${safeName}-calculator.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('HTML с текущими изменениями скачан');
  }catch(e){
    console.error(e);
    toast('Не удалось скачать HTML');
  }
}
function bind(){
  $('tariffsBtn').onclick=()=>{ state.ui.showTariffs=!state.ui.showTariffs; $('tariffsCard').classList.toggle('hidden', !state.ui.showTariffs); saveState(); };
  $('settingsBtn').onclick=()=>{ state.ui.showSettings=!state.ui.showSettings; $('settingsCard').classList.toggle('hidden', !state.ui.showSettings); if(state.ui.showSettings) renderSettingsPanel(); saveState(); };
  $('closeShareBtn').onclick=()=>$('shareModal').classList.add('hidden');
  $('copyEstimateBtn').onclick=copyEstimate; $('printPdfBtn').onclick=printEstimate; if($('downloadHtmlBtn')) $('downloadHtmlBtn').onclick=downloadCurrentHtml; if($('exportOrdersBtn')) $('exportOrdersBtn').onclick=exportOrders; if($('exportBackupBtn')) $('exportBackupBtn').onclick=exportBackup; if($('importDataBtn')) $('importDataBtn').onclick=()=>$('importDataFile')?.click(); if($('importDataFile')) $('importDataFile').onchange=e=>importDataFile(e.target.files?.[0]); if($('loginBtn')) $('loginBtn').onclick=loginLocal; if($('logoutBtn')) $('logoutBtn').onclick=logoutLocal;
  ['brandName','brandPhone','brandTagline','brandSite'].forEach(id=>$(id).oninput=e=>{ const map={brandName:'name',brandPhone:'phone',brandTagline:'tagline',brandSite:'site'}; state.brand[map[id]]=e.target.value; saveState(); });
  $('brandLogo').onchange=e=>{ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ state.brand.logoDataUrl=String(reader.result||''); saveState(); renderBrandLogoPreview(); }; reader.readAsDataURL(file); };
  $('removeLogoBtn').onclick=()=>{ state.brand.logoDataUrl=''; saveState(); renderBrandLogoPreview(); };
  $('equipmentText').oninput=e=>{ state.mainInfo.equipmentText=e.target.value; saveState(); };
  $('chemistryText').oninput=e=>{ state.mainInfo.chemistryText=e.target.value; saveState(); };
  $('addPaymentBtn').onclick=()=>{ const title=$('newPaymentTitle').value.trim(); const textVal=$('newPaymentText').value.trim(); if(!title){ toast('Введи название способа оплаты'); return; } state.paymentMethods.push({id:Date.now(), title, text:textVal, imageDataUrl:''}); $('newPaymentTitle').value=''; $('newPaymentText').value=''; saveState(); renderPayments(); };
  $('saveIncludedBtn').onclick=()=>{ state.includedByType[state.form.cleanType]=$('includedServices').value; saveState(); renderIncludedPreview(); toast('Шаблон сохранён'); };
  $('includedServices').oninput=(e)=>{ state.includedByType[state.form.cleanType]=e.target.value; saveState(); renderIncludedPreview(); };
  $('saveOrderBtn').onclick=saveCurrentOrder;
  $('clearBtn').onclick=()=>{ state.form=clone(defaults.form); state.extras=state.extras.map(x=>({...x, qty:0})); state.ui.currentOrderId=null; fillForm(); renderExtras(); recalc(); toast('Форма очищена'); };
  $('resetStorageBtn').onclick=()=>{ if(!confirm('Сбросить все сохранённые данные в этом браузере?')) return; localStorage.removeItem(STORAGE_KEY); state=clone(defaults); fillForm(); renderTariffs(); renderExtras(); recalc(); toast('Все данные сброшены'); };
  $('demoBtn').onclick=()=>{ state.form={...state.form, clientName:'Ирина', objectType:'Квартира', area:68, cleanType:'general', discount:5, clutter:'medium', dirtiness:'medium', travelType:'km15', travelKm:20, workers:2, workerPay:4000, profitPercent:35, notes:'Есть кот. Уборка нужна в пятницу после 11:00.'}; state.extras=state.extras.map(x=>({...x, qty:({1:1,9:1,14:4,18:1}[x.id]||0)})); fillForm(); renderExtras(); recalc(); toast('Подставлен пример'); };
  $('showOnlySelected').onchange=e=>{ state.form.showOnlySelected=e.target.checked; saveState(); renderExtras(); };
  ['clientName','objectType','area','discount','travelKm','workers','workerPay','profitPercent','notes'].forEach(id=>$(id).oninput=e=>{ state.form[id]=['area','discount','travelKm','workers','workerPay','profitPercent'].includes(id)?num(e.target.value):e.target.value; recalc(); });
  ['cleanType','clutter','dirtiness','travelType','payMode'].forEach(id=>$(id).onchange=e=>{ state.form[id]=e.target.value; if(id==='cleanType'){ $('includedTypeLabel').textContent=state.baseRates[state.form.cleanType].label; $('includedServices').value=state.includedByType[state.form.cleanType]||''; } recalc(); });
  ['brandName','brandPhone','brandTagline','brandSite'].forEach(id=>$(id).oninput=e=>{ const map={brandName:'name',brandPhone:'phone',brandTagline:'tagline',brandSite:'site'}; state.brand[map[id]]=e.target.value; saveState(); renderBrandLogoPreview(); });
  $('brandLogo').onchange=e=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; if(file.size>2*1024*1024){ toast('Логотип слишком большой. Лучше до 2 МБ'); e.target.value=''; return; } const reader=new FileReader(); reader.onload=()=>{ state.brand.logoDataUrl=String(reader.result||''); saveState(); renderBrandLogoPreview(); toast('Логотип сохранён'); $('brandLogo').value=''; }; reader.readAsDataURL(file); };
  $('removeLogoBtn').onclick=()=>{ if(!state.brand.logoDataUrl){ toast('Логотип не загружен'); return; } state.brand.logoDataUrl=''; saveState(); renderBrandLogoPreview(); toast('Логотип удалён'); };
  $('addExtraBtn').onclick=()=>{ const name=$('newExtraName').value.trim(), unit=$('newExtraUnit').value.trim()||'шт', price=num($('newExtraPrice').value), time=num($('newExtraTime').value), category=$('newExtraCategory').value.trim()||'Другое'; if(!name||!price){ toast('Заполни название и цену'); return; } state.extras.push({id:Date.now(), name, unit, price, qty:0, time, category, builtIn:false}); $('newExtraName').value=''; $('newExtraPrice').value=''; $('newExtraTime').value=''; saveState(); renderExtras(); recalc(); toast('Услуга добавлена'); };
}
function fillForm(){ $('clientName').value=state.form.clientName; $('objectType').value=state.form.objectType; $('area').value=state.form.area; $('discount').value=state.form.discount; $('travelKm').value=state.form.travelKm; $('workers').value=state.form.workers; $('workerPay').value=state.form.workerPay; $('profitPercent').value=state.form.profitPercent; $('notes').value=state.form.notes; $('showOnlySelected').checked=!!state.form.showOnlySelected; $('tariffsCard').classList.toggle('hidden', !state.ui.showTariffs); $('settingsCard').classList.toggle('hidden', !state.ui.showSettings); populateMainSelects(); $('includedServices').value=state.includedByType[state.form.cleanType]||''; renderSettingsPanel(); }
fillForm(); renderTariffs(); bind(); renderExtras(); renderSettingsPanel(); renderSavedOrders(); recalc(); if($('calcVersionBadge')) $('calcVersionBadge').textContent=CALC_VERSION; initAccess(); if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
