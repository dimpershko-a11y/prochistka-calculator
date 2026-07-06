// Форма и итог: селекты, список услуг, пересчёт, текстовая смета, печатная вёрстка, PDF.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
function populateMainSelects(){ ensureFormCleanTypeAndCoefs(false); const types=getCleaningTypes(); fillSelect('cleanType', types, state.form.cleanType); const active=getActiveCleaningType(); const clutter=getTypeClutter(state.form.cleanType); const dirtiness=getTypeDirtiness(state.form.cleanType); fillSelect('clutter', clutter, state.form.clutter); fillSelect('dirtiness', dirtiness, state.form.dirtiness); const travelOpts=(state.travel&&Object.keys(state.travel).length)?state.travel:{kad:{label:'В пределах КАД'},km15:{label:'До 15 км от КАД'},km20plus:{label:'20+ км'}}; fillSelect('travelType', travelOpts, state.form.travelType); if($('includedTypeLabel')) $('includedTypeLabel').textContent=active ? active.label : '—'; if($('includedServices')) $('includedServices').value=getTypeIncluded(state.form.cleanType)||''; }
let extrasQuery='';
function getGroupedExtras(){
  let arr=state.form.showOnlySelected?state.extras.filter(x=>num(x.qty)>0):state.extras;
  const q=extrasQuery.trim().toLowerCase();
  if(q) arr=arr.filter(x=>String(x.name||'').toLowerCase().includes(q) || String(x.category||'').toLowerCase().includes(q));
  const map={}; arr.forEach(x=>{ const c=x.category||'Другое'; (map[c]||(map[c]=[])).push(x); }); return map;
}
function isExtraGroupOpen(cat){ return !!(state.ui.extraGroupsOpen && state.ui.extraGroupsOpen[cat]); }
function setExtraGroupOpen(cat, isOpen){ state.ui.extraGroupsOpen=state.ui.extraGroupsOpen||{}; state.ui.extraGroupsOpen[cat]=!!isOpen; saveState(); }
function renderExtras(){ const wrap=$('extrasWrap'); wrap.innerHTML=''; const groups=getGroupedExtras(); const cats=Object.keys(groups); const searching=!!extrasQuery.trim(); if(!cats.length){ wrap.innerHTML=`<div class="notice">${searching?'Ничего не найдено по запросу.':'Нет услуг для отображения.'}</div>`; return; }
  cats.forEach(cat=>{
    const details=document.createElement('details'); details.className='extra-card'; details.style.padding='0'; details.open=searching || isExtraGroupOpen(cat);
    details.innerHTML=`<summary style="list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:800"><span>${esc(cat)}</span><span class="muted" style="font-weight:600">${groups[cat].length} поз.</span></summary><div class="grid" style="gap:12px;padding:0 14px 14px"></div>`;
    const content=details.querySelector('div');
    if(!searching) details.addEventListener('toggle', ()=>setExtraGroupOpen(cat, details.open));
    groups[cat].forEach(item=>{
      const div=document.createElement('div'); div.className='extra-card extra-item extra-pick-card'; div.style.margin='0';
      div.innerHTML=`<div class="extra-pick-head">
          <div class="service-name-text">${esc(item.name)}</div>
          <div class="muted extra-meta">${esc(item.unit)} · ${money(item.price)} · ~ ${hours(item.time)}</div>
        </div>
        <div class="extra-qty-control"><label>Кол-во</label><div class="qty-stepper"><button type="button" aria-label="Убавить" data-qty-step="-1" data-id="${item.id}">−</button><input type="number" min="0" value="${num(item.qty)}" data-extra="${item.id}" data-field="qty"><button type="button" aria-label="Прибавить" data-qty-step="1" data-id="${item.id}">+</button></div></div>`;
      content.appendChild(div);
    });
    wrap.appendChild(details);
  });
  const applyQty=(id, qty, inputEl)=>{ const item=state.extras.find(x=>x.id===id); if(!item) return; item.qty=num(qty); if(inputEl) inputEl.value=item.qty; saveState(); recalc(); renderSelectedExtras(); if(state.form.showOnlySelected) renderExtras(); };
  wrap.querySelectorAll('[data-extra]').forEach(inp=>inp.oninput=e=>{ if(e.target.dataset.field!=='qty') return; applyQty(Number(e.target.dataset.extra), e.target.value); });
  wrap.querySelectorAll('[data-qty-step]').forEach(btn=>btn.onclick=()=>{ const id=Number(btn.dataset.id); const item=state.extras.find(x=>x.id===id); if(!item) return; const next=Math.max(0, num(item.qty)+Number(btn.dataset.qtyStep)); const input=wrap.querySelector(`input[data-extra="${id}"]`); applyQty(id, next, input); });
}
function calc(){
  return CORE.calculateOrder(state);
}
function renderIncludedPreview(){ const lines=getIncludedLines(); $('includedPreview').innerHTML=lines.length?lines.map(x=>`<div>• ${esc(x)}</div>`).join(''):'<div class="muted">Пока не заполнено.</div>'; }
function safeLogoSrc(){ const url=String(state.brand.logoDataUrl||''); return /^data:image\//.test(url) ? esc(url) : ''; }
function renderBrandLogoPreview(){ const wrap=$('brandLogoPreview'); if(!wrap) return; const useLogo=!!(state.pdfHeader&&state.pdfHeader.useLogo); if(!useLogo){ wrap.innerHTML='Текстовая шапка активна. Логотип-картинка в PDF не используется.'; return; } const logoSrc=safeLogoSrc(); if(logoSrc){ wrap.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><img src="${logoSrc}" alt="Логотип" style="max-height:70px;max-width:220px;object-fit:contain;border:1px solid #dbe3ef;border-radius:10px;background:#fff;padding:6px"><span class="muted">Логотип будет показан в печатной смете.</span></div>`; } else { wrap.innerHTML='Логотип пока не выбран.'; } }
function setPdfHeaderInputs(){
  const h=state.pdfHeader||{};
  const set=(id,val)=>{ const el=$(id); if(el) el.value=val ?? ''; };
  set('pdfHeaderFontFamily',h.fontFamily||'Orbitron, Arial, sans-serif');
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
function renderSavedOrders(){ const wrap=$('savedOrdersWrap'); wrap.innerHTML=''; if(!state.savedOrders.length){ wrap.innerHTML='<div class="notice">Пока нет сохранённых заказов.</div>'; return; }
  state.savedOrders.forEach(o=>{
    const isSeries=Number(o.seriesCount)>1;
    const seriesLine=isSeries?`<div class="muted" style="font-size:12px;margin-top:2px">Серия: ${Number(o.seriesCount)} × ${money(o.recommendedPrice)} = ${money(o.seriesTotal)}${o.seriesMonths?` · ${Number(o.seriesMonths)} мес.`:''}</div>`:'';
    const div=document.createElement('div'); div.className='saved-item';
    const metaBits=[o.form&&o.form.estimateNo?`№ ${esc(o.form.estimateNo)}`:'', o.form&&o.form.clientPhone?esc(o.form.clientPhone):'', o.form&&o.form.cleanDate?esc(String(o.form.cleanDate).split('-').reverse().join('.')):''].filter(Boolean).join(' · ');
    div.innerHTML=`<div style="font-weight:700">${esc(o.clientName)} · ${esc(o.objectType)}</div>${metaBits?`<div class="muted" style="font-size:12px;margin-top:2px">${metaBits}</div>`:''}<div class="muted" style="margin:4px 0">${esc(o.cleanType)} · ${num(o.area)} м²${isSeries?' · серия × '+Number(o.seriesCount):''}</div><div style="display:flex;justify-content:space-between;gap:8px"><span>${money(isSeries?o.seriesTotal:o.recommendedPrice)}</span><span class="muted">${hours(o.brigadeHours)}</span></div>${seriesLine}<div class="muted" style="font-size:12px;margin-top:4px">Нормо-часы: ${hours(o.normHours)}</div><div class="muted" style="font-size:12px;margin-top:2px">${esc(o.createdAt)}</div><div class="btns" style="margin-top:8px"><button type="button" data-order-repeat="${o.id}">Повторить</button><button type="button" class="danger" data-order-delete="${o.id}">Удалить</button></div>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('[data-order-repeat]').forEach(btn=>btn.onclick=()=>repeatSavedOrder(btn.dataset.orderRepeat));
  wrap.querySelectorAll('[data-order-delete]').forEach(btn=>btn.onclick=()=>{ const o=state.savedOrders.find(x=>String(x.id)===String(btn.dataset.orderDelete)); if(!o) return; if(!confirm(`Удалить заказ «${o.clientName}» от ${o.createdAt}?`)) return; state.savedOrders=state.savedOrders.filter(x=>String(x.id)!==String(btn.dataset.orderDelete)); saveState(); renderSavedOrders(); toast('Заказ удалён'); });
}
function repeatSavedOrder(orderId){
  const o=state.savedOrders.find(x=>String(x.id)===String(orderId));
  if(!o) return;
  state.form={...clone(defaults.form), ...clone(o.form||{})};
  state.form.estimateNo=''; state.form.estimateDate=0; // повтор — новая смета с новым номером
  state.extras=state.extras.map(x=>({...x, qty:0}));
  (o.extras||[]).forEach(saved=>{ const item=state.extras.find(x=>String(x.id)===String(saved.id)); if(item) item.qty=num(saved.qty); });
  ensureFormCleanTypeAndCoefs(false);
  fillForm(); renderExtras(); recalc();
  toast('Заказ загружен в форму');
}
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
  $('sumLabor').textContent=money(r.laborCost); $('sumMaterials').textContent=money(r.materialsCost); $('sumDirect').textContent=money(r.directCost); $('sumOverhead').textContent=money(r.overheadPerCleaning)+(r.seriesCount>1?` (${money(r.overheadPerJob)} / ${r.seriesCount})`:''); $('sumFull').textContent=money(r.fullCost); $('targetLabel').textContent=`Целевая цена (+${num(r.profitPercent)}%${r.taxPercent>0?` и налог ${num(r.taxPercent)}%`:''})`; $('sumTarget').textContent=money(r.targetPrice); $('sumNetProfit').textContent=money(r.netProfit); $('sumMargin').textContent=`${r.marginPct.toFixed(0)} %`;
  if($('taxRow')){
    $('taxRow').classList.toggle('hidden', !(r.taxPercent>0));
    if(r.taxPercent>0){ $('taxLabel').textContent=`Налог с выручки (${num(r.taxPercent)}%)`; $('sumTax').textContent='− '+money(r.taxValue); }
  }
  if($('mobileSummaryPrice')){
    $('mobileSummaryPrice').textContent=money(r.seriesCount>1?r.seriesTotal:r.recommendedPrice);
    $('mobileSummarySub').textContent=r.seriesCount>1?`серия: ${r.seriesCount} × ${money(r.recommendedPrice)}`:'рекомендованная цена';
  }
  const seriesRows=$('seriesRows');
  if(seriesRows){
    const showSeries=r.seriesCount>1;
    seriesRows.classList.toggle('hidden', !showSeries);
    if(showSeries){
      $('sumSinglePrice').textContent=money(r.singleRecommendedPrice);
      $('sumSeriesCount').textContent=`${r.seriesCount} × ${money(r.recommendedPrice)} · ${r.seriesMonths} мес.`;
      const discountRow=$('seriesDiscountRow');
      if(discountRow) discountRow.classList.toggle('hidden', !(r.seriesDiscountValue>0));
      if($('sumSeriesDiscount')) $('sumSeriesDiscount').textContent=`− ${money(r.seriesDiscountValue)} (${num(r.seriesDiscountPercent)}% с уборки)`;
      $('sumSeriesSaving').textContent='− '+money(r.seriesSavingTotal);
      $('sumSeriesTotal').textContent=money(r.seriesTotal);
    }
  }
  const seriesHint=$('seriesHint');
  if(seriesHint){
    if(r.seriesCount>1){
      seriesHint.classList.remove('hidden');
      seriesHint.textContent=`Серия: ${r.seriesCount} ${cleaningsWord(r.seriesCount)} за ${r.seriesMonths} мес. Одна уборка: ${money(r.recommendedPrice)} вместо ${money(r.singleRecommendedPrice)} разовой${r.seriesSavingPerCleaning>0?` (выгода ${money(r.seriesSavingPerCleaning)} за уборку)`:''}. Итого за серию: ${money(r.seriesTotal)}.`;
    } else {
      seriesHint.classList.add('hidden'); seriesHint.textContent='';
    }
  }
  const seriesBadge=$('seriesBadge');
  if(seriesBadge){
    if(r.seriesCount>1){
      seriesBadge.textContent=`${r.seriesCount} ${cleaningsWord(r.seriesCount)} · ${r.seriesMonths} мес.${r.seriesDiscountPercent>0?` · скидка ${num(r.seriesDiscountPercent)}%`:''}`;
      seriesBadge.classList.add('active');
    } else {
      seriesBadge.textContent='разовая уборка';
      seriesBadge.classList.remove('active');
    }
  }
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
  const row=(label,value)=>`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">${label}</td><td style="padding:6px 0;text-align:right">${value}</td></tr>`;
  if(cleaners>0) rows.push(row('Клинеры', `${cleaners} чел.`));
  if(ownerOnSite) rows.push(row('Бригадир-менеджер', '1 чел.'));
  if(!rows.length && num(r.peopleOnSite)>0) rows.push(row('Клинеры', `${num(r.peopleOnSite)} чел.`));
  return rows;
}
// Пояснение для клиента к строке «Корректировка стоимости заказа» (показывается только когда корректировка есть).
const TOPUP_NOTE='* Корректировка — доведение итога до минимальной стоимости выполнения заказа. Она покрывает работу бригады, выезд, профессиональную химию и расходные материалы для вашего объекта.';
// Номер сметы присваивается один раз на заказ — при первом создании PDF или копии сметы.
// «Очистить форму» и «Повторить» сбрасывают номер, и следующая смета получает новый.
function ensureEstimateNo(){
  if(state.form.estimateNo) return;
  state.ui=state.ui||{};
  const seq=Number(state.ui.estimateSeq||0)+1;
  state.ui.estimateSeq=seq;
  state.form.estimateNo=`${new Date().getFullYear()}-${String(seq).padStart(3,'0')}`;
  state.form.estimateDate=Date.now();
  saveState();
}
function estimateMetaLine(){
  if(!state.form.estimateNo) return '';
  const issued=new Date(Number(state.form.estimateDate)||Date.now());
  const days=Math.max(0, Math.round(num(state.estimateValidityDays)));
  let line=`Смета № ${state.form.estimateNo} от ${issued.toLocaleDateString('ru-RU')}`;
  if(days>0){
    const until=new Date(issued.getTime()+days*86400000);
    line+=` · действительна до ${until.toLocaleDateString('ru-RU')}`;
  }
  return line;
}
function formatCleanDate(){
  const v=String(state.form.cleanDate||'').trim();
  if(!v) return '';
  const d=new Date(v+'T00:00:00');
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('ru-RU');
}
function estimateText(){
  const r=calc(); const included=getIncludedText()||'Не заполнено'; const extras=r.selectedExtras.length?r.selectedExtras.map(x=>`• ${x.name} × ${num(x.qty)} — ${money(num(x.qty)*num(x.price))}`).join('\n'):'• Без доп. услуг';
  const lines=[`Стоимость уборки: ${money(r.baseRaw)}${r.minBaseApplied?' (применена минимальная стоимость)':''}`];
  if(num(r.extrasTotal)>0) lines.push(`Дополнительные услуги: ${money(r.extrasTotal)}`);
  if(num(r.travelTotal)>0) lines.push(`Выезд: ${money(r.travelTotal)}`);
  if(num(r.discountValue)>0) lines.push(`Скидка: − ${money(r.discountValue)}`);
  if(num(r.economyTopup)>0) lines.push(`Корректировка стоимости заказа *: + ${money(r.economyTopup)}`);
  if(num(r.seriesDiscountValue)>0) lines.push(`Скидка за серию (${num(r.seriesDiscountPercent)}%): − ${money(r.seriesDiscountValue)}`);
  lines.push(`\nИТОГО к оплате${r.seriesCount>1?' (за 1 уборку)':''}: ${money(r.recommendedPrice)}`);
  if(r.seriesCount>1){
    lines.push(`Серия уборок: ${r.seriesCount} (обслуживание ${r.seriesMonths} мес.)`);
    if(String(state.form.seriesSchedule||'').trim()) lines.push(`График уборок: ${String(state.form.seriesSchedule).trim()}`);
    lines.push(`ИТОГО за серию: ${money(r.seriesTotal)}`);
    if(r.seriesSavingTotal>0) lines.push(`Ваша выгода за серию по сравнению с разовыми уборками: ${money(r.seriesSavingTotal)}`);
  }
  lines.push(`Сумма нормо-часов: ${hours(r.normHours)}`);
  lines.push(`Примерное время уборки: ${hours(r.brigadeHours)}`);
  teamTextLines(r).forEach(line=>lines.push(line));
  if(num(r.economyTopup)>0) lines.push(`\n${TOPUP_NOTE}`);
  const meta=estimateMetaLine();
  const phone=String(state.form.clientPhone||'').trim();
  const cleanDateText=formatCleanDate();
  return `Смета на уборку${meta?`\n${meta}`:''}\n\nКлиент: ${state.form.clientName||'—'}${phone?`\nТелефон: ${phone}`:''}\nОбъект: ${state.form.objectType}${cleanDateText?`\nДата уборки: ${cleanDateText}`:''}\nПлощадь: ${num(state.form.area)} м²\nТип уборки: ${r.rate.label}\nЗаставленность: ${r.clutter.label} (коэф. × ${r.clutterPriceK.toFixed(2)})\nЗагрязнённость: ${r.dirt.label} (коэф. × ${r.dirtPriceK.toFixed(2)})\n\nВ услуги входят:\n${included}\n\nДоп. услуги:\n${extras}\n\n${lines.join('\n')}\n\nДополнительная информация:\n${state.mainInfo.usefulInfo||'—'}\n\nЗаметки: ${state.form.notes||'—'}`;
}
async function copyEstimate(){ if(validateCurrentOrder().length) return; ensureEstimateNo(); const text=estimateText(); try{ await navigator.clipboard.writeText(text); toast('Смета скопирована'); }catch(e){ $('shareText').value=text; $('shareModal').classList.remove('hidden'); toast('Открыл смету для ручного копирования'); } }
function buildPrintHtml(){
  const r=calc();
  const included=getIncludedLines();
  const extras=r.selectedExtras;
  const h=state.pdfHeader||{};
  const cleanCss=(v,fb)=>String(v||fb).replace(/[;<>]/g,'');
  const font=cleanCss(h.fontFamily,'Orbitron, Arial, sans-serif');
  const nameText=h.uppercaseName!==false ? String(state.brand.name||'PRO-CHISTKA').toUpperCase() : String(state.brand.name||'PRO-CHISTKA');
  const logoSrc=safeLogoSrc();
  const logo=(h.useLogo && logoSrc) ? `<img src="${logoSrc}" alt="Логотип" style="max-height:70px;max-width:160px;object-fit:contain">` : '';
  const brandBlock=`<div style="display:flex;align-items:center;gap:14px">${logo}<div><div style="font-family:${font};font-size:${num(h.nameFontSize)||30}px;font-weight:${num(h.nameWeight)||800};letter-spacing:${Number(h.nameLetterSpacing)||0}px;line-height:${Number(h.nameLineHeight)||1.05};color:${cleanCss(h.nameColor,'#0f172a')}">${esc(nameText)}</div><div style="font-family:${font};font-size:${num(h.taglineFontSize)||13}px;letter-spacing:${Number(h.taglineLetterSpacing)||0}px;line-height:${Number(h.taglineLineHeight)||1.25};color:${cleanCss(h.taglineColor,'#475569')};margin-top:6px">${esc(state.brand.tagline||'')}</div></div></div>`;
  const contactFont=cleanCss(h.contactFontFamily || font, font);
  const contactAlign=['left','center','right'].includes(String(h.contactAlign)) ? h.contactAlign : 'right';
  const contactStyle=`font-family:${contactFont};font-size:${num(h.contactFontSize)||13}px;font-weight:${num(h.contactWeight)||600};letter-spacing:${Number(h.contactLetterSpacing)||0}px;line-height:${Number(h.contactLineHeight)||1.35};color:${cleanCss(h.contactColor,'#0f172a')}`;
  const contactText = state.brand.contactText || [state.brand.phone,state.brand.site].filter(Boolean).join('\n');
  const contactHtml = String(contactText||'').split(/\n+/).filter(Boolean).map((line,i)=>`<div style="${i?'margin-top:6px;':''}color:${cleanCss(h.contactColor,'#0f172a')}">${esc(line)}</div>`).join('');
  const headerStyle=`display:flex;justify-content:space-between;gap:24px;border-bottom:${num(h.borderWidth)}px solid ${cleanCss(h.borderColor,'#0f172a')};padding-bottom:${num(h.paddingBottom)||16}px;margin-bottom:${num(h.marginBottom)||22}px`;
  const clientPhone=String(state.form.clientPhone||'').trim();
  const cleanDateText=formatCleanDate();
  // Запрет разрыва страницы внутри строки: html2pdf режет лист по высоте,
  // поэтому каждая строка текста должна быть отдельным элементом с break-inside:avoid.
  const AVOID='break-inside:avoid;page-break-inside:avoid';
  const multiline=(text,gap=4)=>String(text||'').split(/\n/).map(l=>`<div style="${AVOID};margin:0 0 ${gap}px">${esc(l)||'&nbsp;'}</div>`).join('');
  const sectionTitle=t=>`<div style="${AVOID};page-break-after:avoid;font-size:18px;font-weight:800;margin:18px 0 8px">${t}</div>`;
  const blocks = {
    client: `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Клиент</td><td style="padding:6px 0">${esc(state.form.clientName||'—')}</td></tr>
      ${clientPhone?`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Телефон</td><td style="padding:6px 0">${esc(clientPhone)}</td></tr>`:''}
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Объект</td><td style="padding:6px 0">${esc(state.form.objectType)}</td></tr>
      ${cleanDateText?`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Дата уборки</td><td style="padding:6px 0">${esc(cleanDateText)}</td></tr>`:''}
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Площадь</td><td style="padding:6px 0">${num(state.form.area)} м²</td></tr>
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Тип уборки</td><td style="padding:6px 0">${esc(r.rate.label)}</td></tr>
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Заставленность</td><td style="padding:6px 0">${esc(r.clutter.label)} (коэф. × ${r.clutterPriceK.toFixed(2)})</td></tr>
      <tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0;font-weight:700">Загрязнённость</td><td style="padding:6px 0">${esc(r.dirt.label)} (коэф. × ${r.dirtPriceK.toFixed(2)})</td></tr>
    </table>`,
    included: `${sectionTitle('В услуги входят')}<div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${included.length?included.map(x=>`<div style="${AVOID};margin:0 0 6px">• ${esc(x)}</div>`).join(''):'<div>—</div>'}</div>`,
    extras: `${sectionTitle('Дополнительные услуги')}<div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${extras.length?extras.map(x=>`<div style="${AVOID};display:flex;justify-content:space-between;gap:12px;margin:0 0 7px;align-items:flex-start"><span><span style="display:inline-block;font-size:10px;line-height:1;padding:4px 7px;border-radius:999px;background:#eef2f7;color:#475569;font-weight:700;margin-right:7px;vertical-align:middle;text-transform:uppercase;letter-spacing:.2px">${esc(x.category||'Другое')}</span>${esc(x.name)} × ${num(x.qty)}</span><span style="white-space:nowrap">${money(num(x.qty)*num(x.price))}</span></div>`).join(''):'<div>Без доп. услуг</div>'}</div>`,
    pricing: (()=>{
      const rows=[];
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Стоимость уборки</td><td style="padding:6px 0;text-align:right">${money(r.baseNoK)}</td></tr>`);
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Стоимость с коэффициентом заставленности</td><td style="padding:6px 0;text-align:right">${money(r.baseAfterClutter)}</td></tr>`);
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Стоимость с коэффициентом загрязнённости</td><td style="padding:6px 0;text-align:right">${money(r.baseWithK)}</td></tr>`);
      if(r.minBaseApplied) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Применена минимальная стоимость уборки</td><td style="padding:6px 0;text-align:right">${money(r.baseRaw)}</td></tr>`);
      if(num(r.extrasTotal)>0) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Дополнительные услуги</td><td style="padding:6px 0;text-align:right">${money(r.extrasTotal)}</td></tr>`);
      if(num(r.travelTotal)>0) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Выезд</td><td style="padding:6px 0;text-align:right">${money(r.travelTotal)}</td></tr>`);
      if(num(r.discountValue)>0) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Скидка</td><td style="padding:6px 0;text-align:right">− ${money(r.discountValue)}</td></tr>`);
      if(num(r.economyTopup)>0) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Корректировка стоимости заказа *</td><td style="padding:6px 0;text-align:right">+ ${money(r.economyTopup)}</td></tr>`);
      if(num(r.seriesDiscountValue)>0) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Скидка за серию (${num(r.seriesDiscountPercent)}%)</td><td style="padding:6px 0;text-align:right">− ${money(r.seriesDiscountValue)}</td></tr>`);
      const isSeries=r.seriesCount>1;
      const seriesSchedule=String(state.form.seriesSchedule||'').trim();
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:12px 0;border-top:2px solid #0f172a;font-weight:800;font-size:17px">${isSeries?'Итого за одну уборку':'Итого к оплате'}</td><td style="padding:12px 0;border-top:2px solid #0f172a;text-align:right;font-weight:800;font-size:17px">${money(r.recommendedPrice)}</td></tr>`);
      if(isSeries){
        rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Уборок в серии</td><td style="padding:6px 0;text-align:right">${r.seriesCount} (обслуживание ${r.seriesMonths} мес.)</td></tr>`);
        if(seriesSchedule) rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">График уборок</td><td style="padding:6px 0;text-align:right">${esc(seriesSchedule)}</td></tr>`);
        rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:12px 0;border-top:2px solid #0f172a;font-weight:800;font-size:17px">Итого за серию к оплате</td><td style="padding:12px 0;border-top:2px solid #0f172a;text-align:right;font-weight:800;font-size:17px">${money(r.seriesTotal)}</td></tr>`);
      }
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Сумма нормо-часов</td><td style="padding:6px 0;text-align:right">${hours(r.normHours)}</td></tr>`);
      rows.push(`<tr style="break-inside:avoid;page-break-inside:avoid"><td style="padding:6px 0">Примерное время уборки</td><td style="padding:6px 0;text-align:right">${hours(r.brigadeHours)}</td></tr>`);
      teamPdfRows(r).forEach(row=>rows.push(row));
      const seriesNote=(isSeries && r.seriesSavingTotal>0) ? `<div style="${AVOID};font-size:12.5px;color:#166534;font-weight:700;line-height:1.45;margin-top:8px">Ваша выгода за серию по сравнению с ${r.seriesCount} разовыми уборками: ${money(r.seriesSavingTotal)} (разовая уборка — ${money(r.singleRecommendedPrice)}).</div>` : '';
      const topupNote=num(r.economyTopup)>0 ? `<div style="${AVOID};font-size:11.5px;color:#475569;line-height:1.45;margin-top:8px">${esc(TOPUP_NOTE)}</div>` : '';
      return `${sectionTitle('Стоимость')}<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.join('')}</table>${seriesNote}${topupNote}`;
    })(),
    useful_info: `${sectionTitle('Дополнительная информация')}<div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.usefulInfo?multiline(state.mainInfo.usefulInfo):'—'}</div>`,
    main_info: `${sectionTitle('Основная информация')}<div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;margin-bottom:18px">${state.mainInfo.equipmentText?`<div><strong style="${AVOID};display:block;margin-bottom:4px">Техника:</strong>${multiline(state.mainInfo.equipmentText)}</div>`:''}${state.mainInfo.chemistryText?`<div style="margin-top:10px"><strong style="${AVOID};display:block;margin-bottom:4px">Химия / сертификаты:</strong>${multiline(state.mainInfo.chemistryText)}</div>`:''}${!state.mainInfo.equipmentText && !state.mainInfo.chemistryText ? '<div>—</div>' : ''}</div>`,
    notes: `${sectionTitle('Заметки')}<div style="border:1px solid #cbd5e1;border-radius:14px;padding:14px;min-height:60px">${multiline(state.form.notes||'—')}</div>`
  };
  const content = state.pdfSettings.order.filter(k=>state.pdfSettings.visible[k]).map(k=>blocks[k]||'').join('');
  return `
  <div style="padding:32px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="${headerStyle}">
      <div>${brandBlock}</div>
      <div style="text-align:${contactAlign};${contactStyle}">${contactHtml || '&nbsp;'}</div>
    </div>
    <div style="font-size:24px;font-weight:800;margin-bottom:${estimateMetaLine()?'6':'18'}px">Смета на уборку</div>
    ${estimateMetaLine()?`<div style="font-size:13px;color:#475569;margin-bottom:18px">${esc(estimateMetaLine())}</div>`:''}
    ${content}
  </div>`; }
function printEstimate(){ if(validateCurrentOrder().length) return; ensureEstimateNo(); $('printArea').innerHTML=buildPrintHtml(); window.print(); }
function buildPdfFileName(){
  const client=String(state.form.clientName||'').trim().replace(/[^\wа-яёА-ЯЁ. -]/g,'').slice(0,40);
  const no=state.form.estimateNo?`_№${state.form.estimateNo}`:'';
  const date=new Date().toISOString().slice(0,10);
  return `Смета${no}${client?'_'+client:''}_${date}.pdf`;
}
// Генерирует PDF-файл из той же вёрстки, что печать и превью. Требует локальную библиотеку html2pdf.
async function generatePdfBlob(){
  if(typeof html2pdf==='undefined') throw new Error('html2pdf не загружен');
  const host=document.createElement('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';
  host.innerHTML=buildPrintHtml();
  document.body.appendChild(host);
  try{
    return await html2pdf().set({
      margin:[10,0,12,0],
      image:{type:'jpeg', quality:.95},
      html2canvas:{scale:2, backgroundColor:'#ffffff', windowWidth:794},
      jsPDF:{unit:'mm', format:'a4', orientation:'portrait'},
      pagebreak:{mode:['css','legacy']}
    }).from(host.firstElementChild).output('blob');
  } finally {
    host.remove();
  }
}
async function sharePdfEstimate(){
  if(validateCurrentOrder().length) return;
  ensureEstimateNo();
  const btn=$('sharePdfBtn');
  if(btn) btn.disabled=true;
  toast('Готовлю PDF…');
  try{
    const blob=await generatePdfBlob();
    const file=new File([blob], buildPdfFileName(), {type:'application/pdf'});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'Смета на уборку'});
        toast('Смета отправлена');
      }catch(e){
        if(e && e.name!=='AbortError'){ downloadBlob(blob, file.name); toast('Поделиться не получилось — PDF скачан'); }
      }
    } else {
      downloadBlob(blob, file.name);
      toast('«Поделиться» здесь не поддерживается — PDF скачан файлом');
    }
  }catch(e){
    toast('Не удалось создать PDF');
  } finally {
    if(btn) btn.disabled=false;
  }
}
function refreshPdfPreview(){ const c=$('pdfPreviewContent'); if(c) c.innerHTML=buildPrintHtml(); }
function openPdfPreview(){ if(validateCurrentOrder().length) return; ensureEstimateNo(); refreshPdfPreview(); const m=$('pdfPreviewModal'); if(m) m.classList.remove('hidden'); }
function closePdfPreview(){ const m=$('pdfPreviewModal'); if(m) m.classList.add('hidden'); }
