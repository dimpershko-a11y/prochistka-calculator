// Модальное окно настроек: вкладки, категории услуг, PDF-блоки, редакторы услуг и тарифов.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
function saveSettingsNow(){
  saveState();
  toast('Настройки сохранены');
}
function openSettingsModal(){
  state.ui = state.ui || {};
  state.ui.showSettings = true;
  const modal = $('settingsModal');
  if(modal) modal.classList.remove('hidden');
  renderSettingsPanel();
  setSettingsTab(state.ui.settingsTab);
  saveState();
}
function closeSettingsModal(){
  state.ui = state.ui || {};
  state.ui.showSettings = false;
  const modal = $('settingsModal');
  if(modal) modal.classList.add('hidden');
}
function setSettingsTab(tab){
  const active = ['company','tariffs','texts','services'].includes(tab) ? tab : 'company';
  state.ui = state.ui || {};
  state.ui.settingsTab = active;
  document.querySelectorAll('[data-settings-tab]').forEach(btn=>{
    const selected = btn.dataset.settingsTab === active;
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.setAttribute('tabindex', selected ? '0' : '-1');
  });
  document.querySelectorAll('[data-settings-panel]').forEach(panel=>{
    panel.classList.toggle('hidden', panel.dataset.settingsPanel !== active);
  });
}
function setTariffInnerTab(tab){
  const active = ['main','description','clutter','dirtiness','travel','economy'].includes(tab) ? tab : 'main';
  state.ui = state.ui || {};
  state.ui.tariffInnerTab = active;
  document.querySelectorAll('[data-tariff-inner-tab]').forEach(btn=>{
    const selected = btn.dataset.tariffInnerTab === active;
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.setAttribute('tabindex', selected ? '0' : '-1');
  });
  const mainPanel = $('tariffMainPanel');
  if(mainPanel) mainPanel.classList.toggle('hidden', active !== 'main');
  const descPanel = $('tariffDescriptionPanel');
  if(descPanel) descPanel.classList.toggle('hidden', active !== 'description');
  const mapping = {clutter:'clutterWrap', dirtiness:'dirtWrap', travel:'travelWrap'};
  Object.entries(mapping).forEach(([key,id])=>{
    const wrap=$(id);
    const block=wrap ? wrap.closest('.tariff-panel-block') || wrap.parentElement : null;
    if(block) block.classList.toggle('hidden', active !== key);
  });
  const labor=$('laborWrap')?.closest('.tariff-panel-block') || $('laborWrap')?.parentElement;
  const overhead=$('overheadWrap')?.closest('.tariff-panel-block') || $('overheadWrap')?.parentElement;
  if(labor) labor.classList.toggle('hidden', active !== 'economy');
  if(overhead) overhead.classList.toggle('hidden', active !== 'economy');
}
function enhanceAccessibility(){
  document.querySelectorAll('label').forEach((label, index)=>{
    if(label.htmlFor) return;
    const control = label.querySelector('input,select,textarea') || label.parentElement?.querySelector('input,select,textarea');
    if(!control) return;
    if(!control.id) control.id = `fieldAuto${index}`;
    label.htmlFor = control.id;
  });
  const menuBtn = $('moreMenuBtn'), menu = $('moreMenuPanel');
  if(menuBtn && menu){
    menuBtn.setAttribute('aria-controls','moreMenuPanel');
    menuBtn.setAttribute('aria-expanded', menu.classList.contains('hidden') ? 'false' : 'true');
  }
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
// Переставляет ключ объекта на delta позиций: порядок ключей задаёт порядок отображения в списках.
function moveObjectKey(obj, key, delta){
  const keys=Object.keys(obj||{});
  const from=keys.indexOf(key);
  const to=from+delta;
  if(from<0 || to<0 || to>=keys.length) return obj;
  const reordered=moveItem(keys, from, to);
  const out={};
  reordered.forEach(k=>{ out[k]=obj[k]; });
  return out;
}

function ensureExtraCategories(){
  state.extraCategories = Array.isArray(state.extraCategories) ? state.extraCategories : [];
  if(!state.extraCategories.includes('Другое')) state.extraCategories.push('Другое');
}
function getExtraCategories(){
  ensureExtraCategories();
  const seen=new Set();
  const out=[];
  const add=cat=>{ const name=String(cat||'').trim() || 'Другое'; if(!seen.has(name)){ seen.add(name); out.push(name); } };
  state.extraCategories.forEach(add);
  (state.extras||[]).forEach(x=>add(x.category));
  add('Другое');
  return out;
}
function renderCategoryOptions(selected){
  const sel=$('newExtraCategory'); if(!sel) return;
  const current=selected || sel.value || 'Другое';
  sel.innerHTML=getExtraCategories().map(cat=>`<option value="${esc(cat)}" ${cat===current?'selected':''}>${esc(cat)}</option>`).join('');
  if(!getExtraCategories().includes(current)){ const opt=document.createElement('option'); opt.value=current; opt.textContent=current; opt.selected=true; sel.appendChild(opt); }
}
function addExtraCategory(name){
  const cat=String(name||'').trim();
  if(!cat){ toast('Укажите название категории'); return false; }
  ensureExtraCategories();
  const exists=getExtraCategories().some(x=>x.toLowerCase()===cat.toLowerCase());
  if(!exists) state.extraCategories.push(cat);
  saveState(); renderCategoryOptions(cat); renderCategoryManager(); return true;
}
function renameExtraCategory(oldCat, newCat){
  oldCat=String(oldCat||'').trim(); newCat=String(newCat||'').trim();
  if(!oldCat||!newCat||oldCat===newCat) return;
  ensureExtraCategories();
  state.extraCategories=state.extraCategories.map(x=>x===oldCat?newCat:x).filter((x,i,a)=>x && a.indexOf(x)===i);
  (state.extras||[]).forEach(x=>{ if(String(x.category||'')===oldCat) x.category=newCat; });
  saveState(); renderCategoryOptions(newCat); renderCategoryManager(); renderExtras(); renderExtrasEditor(); renderSelectedExtras(); toast('Категория переименована');
}
function deleteExtraCategory(cat, target){
  cat=String(cat||'').trim(); target=String(target||'').trim()||'Другое';
  if(!cat || cat==='Другое'){ toast('Категорию «Другое» удалять нельзя'); return; }
  ensureExtraCategories();
  if(target===cat){ toast('Выберите другую категорию для переноса'); return; }
  if(!getExtraCategories().includes(target)) state.extraCategories.push(target);
  (state.extras||[]).forEach(x=>{ if(String(x.category||'')===cat) x.category=target; });
  state.extraCategories=state.extraCategories.filter(x=>x!==cat);
  saveState(); renderCategoryOptions(target); renderCategoryManager(); renderExtras(); renderExtrasEditor(); renderSelectedExtras(); toast('Категория удалена, услуги перенесены');
}
function renderCategoryManager(){
  const wrap=$('extraCategoriesWrap'); if(!wrap) return;
  const cats=getExtraCategories();
  wrap.innerHTML=cats.map(cat=>{
    const count=(state.extras||[]).filter(x=>String(x.category||'Другое')===cat).length;
    const opts=cats.filter(x=>x!==cat).map(x=>`<option value="${esc(x)}" ${x==='Другое'?'selected':''}>${esc(x)}</option>`).join('');
    return `<div class="category-row"><div><strong>${esc(cat)}</strong><div class="muted" style="font-size:12px">Услуг: ${count}</div></div><div class="category-row-controls"><button type="button" data-cat-rename="${esc(cat)}">Переименовать</button>${cat==='Другое'?'':`<select data-cat-target="${esc(cat)}">${opts}</select><button type="button" class="danger" data-cat-delete="${esc(cat)}">Удалить</button>`}</div></div>`;
  }).join('');
  wrap.querySelectorAll('[data-cat-rename]').forEach(btn=>btn.onclick=()=>{ const old=btn.dataset.catRename; const next=prompt('Новое название категории', old); if(next) renameExtraCategory(old,next); });
  wrap.querySelectorAll('[data-cat-delete]').forEach(btn=>btn.onclick=()=>{ const cat=btn.dataset.catDelete; const target=wrap.querySelector(`[data-cat-target="${CSS.escape(cat)}"]`)?.value || 'Другое'; if(confirm(`Удалить категорию «${cat}» и перенести услуги в «${target}»?`)) deleteExtraCategory(cat,target); });
}
function renderPdfBlocks(){
  const labels = {client:'Шапка и данные клиента', included:'Что входит в уборку', extras:'Дополнительные услуги', pricing:'Стоимость и итоги', useful_info:'Дополнительная информация', main_info:'Основная информация', notes:'Заметки'};
  const wrap = $('pdfBlocksWrap'); if(!wrap) return;
  wrap.innerHTML = '';
  state.pdfSettings.order.forEach((key)=>{
    const card = document.createElement('div');
    card.className = 'pdf-block-card';
    card.innerHTML = `<label class="pdf-block-toggle"><input type="checkbox" data-pdf-visible="${key}" ${state.pdfSettings.visible[key]?'checked':''}><span>${labels[key]||key}</span></label>
      <div class="pdf-block-actions"><button type="button" aria-label="Поднять блок" title="Поднять" data-pdf-up="${key}">↑</button><button type="button" aria-label="Опустить блок" title="Опустить" data-pdf-down="${key}">↓</button></div>`;
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
      <div><label>Категория / блок</label><select data-edit-extra="${item.id}" data-field="category">${getExtraCategories().map(cat=>`<option value="${esc(cat)}" ${cat===(item.category||'Другое')?'selected':''}>${esc(cat)}</option>`).join('')}</select></div>
      <div><label>Цена</label><input type="number" min="0" data-edit-extra="${item.id}" data-field="price" value="${num(item.price)}"></div>
      <div><label>Время, ч</label><input type="number" min="0" step="0.1" data-edit-extra="${item.id}" data-field="time" value="${num(item.time)}"></div>
      <div class="btns" style="align-items:end"><button type="button" data-extra-up="${item.id}">↑</button><button type="button" data-extra-down="${item.id}">↓</button><button type="button" data-extra-delete="${item.id}" class="danger">Удалить</button></div>
    </div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-edit-extra]').forEach(el=>{ const handler=e=>{ const item=state.extras.find(x=>x.id===Number(e.target.dataset.editExtra)); if(!item) return; const f=e.target.dataset.field; item[f]=['price','time'].includes(f)?(Number(e.target.value)||0):e.target.value; if(f==='category' && !state.extraCategories.includes(item[f])) state.extraCategories.push(item[f]); saveState(); renderCategoryOptions(item.category); renderCategoryManager(); renderExtras(); }; el.oninput=handler; el.onchange=handler; });
  wrap.querySelectorAll('[data-extra-delete]').forEach(el=>el.onclick=()=>{ state.extras=state.extras.filter(x=>x.id!==Number(el.dataset.extraDelete)); saveState(); renderCategoryManager(); renderExtras(); renderExtrasEditor(); });
  wrap.querySelectorAll('[data-extra-up]').forEach(el=>el.onclick=()=>{ const i=state.extras.findIndex(x=>x.id===Number(el.dataset.extraUp)); state.extras=moveItem(state.extras,i,i-1); saveState(); renderExtras(); renderExtrasEditor(); });
  wrap.querySelectorAll('[data-extra-down]').forEach(el=>el.onclick=()=>{ const i=state.extras.findIndex(x=>x.id===Number(el.dataset.extraDown)); state.extras=moveItem(state.extras,i,i+1); saveState(); renderExtras(); renderExtrasEditor(); });
}
function renderSettingsPanel(){
  if($('brandName')) $('brandName').value=state.brand.name;
  if($('brandTagline')) $('brandTagline').value=state.brand.tagline;
  if($('brandContactText')) $('brandContactText').value=state.brand.contactText || [state.brand.phone,state.brand.site].filter(Boolean).join('\n');
  setPdfHeaderInputs();
  bindPdfHeaderInputs();
  if($('estimateValidityDays')) $('estimateValidityDays').value=state.estimateValidityDays != null ? state.estimateValidityDays : 14;
  if($('equipmentText')) $('equipmentText').value=state.mainInfo.equipmentText||'';
  if($('chemistryText')) $('chemistryText').value=state.mainInfo.chemistryText||'';
  if($('usefulInfoText')) $('usefulInfoText').value=state.mainInfo.usefulInfo||'';
  renderBrandLogoPreview();
  renderPdfBlocks();
  renderCategoryOptions();
  renderCategoryManager();
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
      <div class="btns" style="align-items:center">
        <button type="button" aria-label="Поднять выше" title="Поднять выше" data-move-coef="${fieldName}" data-key="${key}" data-dir="-1">↑</button>
        <button type="button" aria-label="Опустить ниже" title="Опустить ниже" data-move-coef="${fieldName}" data-key="${key}" data-dir="1">↓</button>
        <button type="button" class="danger" data-delete-coef="${fieldName}" data-key="${key}">Удалить тип</button>
      </div>
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
    if(field!=='label'){
      const isZero=String(e.target.value).trim()!=='' && Number(e.target.value)===0;
      e.target.classList.toggle('field-error', isZero);
      if(isZero) toast('Коэффициент 0 игнорируется — в расчёте будет использован 1');
    }
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); recalc();
  });
  wrap.querySelectorAll('[data-move-coef]').forEach(btn=>btn.onclick=()=>{
    const field=btn.dataset.moveCoef, key=btn.dataset.key, dir=Number(btn.dataset.dir)||0;
    type[field]=moveObjectKey(type[field]||{}, key, dir);
    syncLegacyFromCleaningTypes(state); saveState(); renderTariffs(); populateMainSelects(); recalc();
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
  const card=document.createElement('div'); card.className='extra-card tariff-editor-card';
  card.innerHTML=`<div class="grid g2 tariff-type-head">
    <div><label>Страница настроек вида уборки</label><select id="tariffCleanTypeSelect">${Object.entries(types).map(([k,t])=>`<option value="${esc(k)}" ${k===typeKey?'selected':''}>${esc(t.label||k)}</option>`).join('')}</select></div>
    <div class="btns tariff-type-actions" style="align-items:end">
      <button type="button" class="primary" id="addCleanTypeBtn">Добавить вид уборки</button>
      <button type="button" id="duplicateCleanTypeBtn">Дублировать</button>
      <button type="button" aria-label="Выше в списке" title="Выше в списке" data-move-type="-1">↑</button>
      <button type="button" aria-label="Ниже в списке" title="Ниже в списке" data-move-type="1">↓</button>
      <button type="button" class="danger" id="deleteCleanTypeBtn">Удалить</button>
    </div>
  </div>
  <div class="notice" style="margin-top:12px">У каждого вида уборки теперь свои цена за м², минимальная стоимость, скорость, описание, заставленность и загрязнённость.</div>
  <div class="tariff-inner-tabs" role="tablist" aria-label="Настройки выбранного вида уборки">
    <button type="button" data-tariff-inner-tab="main" role="tab">Вид уборки</button>
    <button type="button" data-tariff-inner-tab="description" role="tab">Описание</button>
    <button type="button" data-tariff-inner-tab="clutter" role="tab">Заставленность</button>
    <button type="button" data-tariff-inner-tab="dirtiness" role="tab">Загрязнённость</button>
    <button type="button" data-tariff-inner-tab="travel" role="tab">Выезд</button>
    <button type="button" data-tariff-inner-tab="economy" role="tab">Экономика</button>
  </div>`;
  rates.appendChild(card);
  const main=document.createElement('div'); main.className='extra-card tariff-main-panel'; main.id='tariffMainPanel';
  main.innerHTML=`<div class="chip">Основные параметры выбранного вида</div>
    <div class="grid g3">
      <div><label>Название вида уборки</label><input type="text" data-clean-main="label" value="${esc(type.label||typeKey)}"></div>
      <div><label>Цена, ₽ / м²</label><input type="number" min="0" data-clean-main="rate" value="${num(type.rate)}"></div>
      <div><label>Минимальная стоимость</label><input type="number" min="0" data-clean-main="min" value="${num(type.min)}"></div>
      <div><label>Скорость, м² / час</label><input type="number" min="0.1" step="0.1" data-clean-main="speed" value="${num(type.speed)||1}"></div>
      <div><label>ID вида</label><input type="text" value="${esc(typeKey)}" readonly></div>
    </div>`;
  rates.appendChild(main);
  const description=document.createElement('div'); description.className='extra-card tariff-main-panel'; description.id='tariffDescriptionPanel';
  description.innerHTML=`<div class="chip">Описание выбранного вида</div>
    <div class="grid g2">
      <div><label>Описание / что входит именно в этот вид уборки</label><textarea id="tariffIncludedText" placeholder="Описание будет попадать в смету для выбранного вида уборки">${esc(type.included||'')}</textarea></div>
      <div><label>Описание работ по окнам / остеклению для этого вида</label><textarea id="tariffWindowsText" placeholder="Добавляется в смету только если выбраны услуги из категории Окна">${esc(getTypeWindowDescription(typeKey)||'')}</textarea></div>
    </div>`;
  rates.appendChild(description);
  const select=$('tariffCleanTypeSelect'); if(select) select.onchange=e=>{ state.ui.tariffCleanType=e.target.value; saveState(); renderTariffs(); };
  const addBtn=$('addCleanTypeBtn'); if(addBtn) addBtn.onclick=()=>{
    const label=prompt('Название нового вида уборки','Новый вид уборки');
    if(!label) return;
    const key=uniqueCleanTypeKey(label);
    const src=clone(type || Object.values(types)[0] || {});
    state.cleaningTypes[key]={...src,label, included:'', windowsDescription:src.windowsDescription||'', clutter:clone(src.clutter||getTypeClutter()), dirtiness:clone(src.dirtiness||getTypeDirtiness())};
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
  rates.querySelectorAll('[data-move-type]').forEach(btn=>btn.onclick=()=>{
    state.cleaningTypes=moveObjectKey(getCleaningTypes(), typeKey, Number(btn.dataset.moveType)||0);
    syncLegacyFromCleaningTypes(state); saveState(); populateMainSelects(); renderTariffs();
  });
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
  const winText=$('tariffWindowsText'); if(winText) winText.oninput=e=>{ setTypeWindowDescription(typeKey,e.target.value); saveState(); if(state.form.cleanType===typeKey) renderIncludedPreview(); };
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
      <div><label>Налог с выручки, %</label><input type="number" min="0" max="50" step="0.5" data-cfg="overhead" data-field="taxPercent" value="${num(O.taxPercent)}"></div>
    </div>
    <div class="muted" style="margin-top:8px">Накладные на один заказ: <strong id="overheadPerJobHint">${money(perJob)}</strong>. Налог (УСН/НПД) закладывается в целевую цену и вычитается из фактической прибыли.</div>`;
    ovW.appendChild(card);
  }
  document.querySelectorAll('[data-cfg]').forEach(inp=>inp.oninput=(e)=>{ const {cfg,field}=e.target.dataset; const val=num(e.target.value); if(cfg==='material'){ state.materialPerM2=val; } else { state[cfg]=state[cfg]||{}; state[cfg][field]=val; } if($('overheadPerJobHint')){ const O=state.overhead||{}; $('overheadPerJobHint').textContent=money(num(O.jobsPerMonth)>0?num(O.monthly)/num(O.jobsPerMonth):0); } saveState(); recalc(); });
  document.querySelectorAll('[data-kind]').forEach(inp=>inp.oninput=(e)=>{ const {kind,key,field}=e.target.dataset; state[kind][key][field]=(field==='label')?e.target.value:num(e.target.value); saveState(); populateMainSelects(); recalc(); });
  ['clutterWrap','dirtWrap','travelWrap','laborWrap','overheadWrap'].forEach(id=>{ const block=$(id)?.parentElement; if(block) block.classList.add('tariff-panel-block'); });
  document.querySelectorAll('[data-tariff-inner-tab]').forEach(btn=>{
    btn.onclick=()=>{ setTariffInnerTab(btn.dataset.tariffInnerTab); saveState(); };
  });
  setTariffInnerTab(state.ui && state.ui.tariffInnerTab);
}
