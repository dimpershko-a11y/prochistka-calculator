// Привязка событий и инициализация приложения.
// Файлы assets/js/*.js загружаются последовательно (см. index.html) и разделяют общую глобальную область.
function bind(){
  if($('settingsBtn')) $('settingsBtn').onclick=()=>requestEditAccess(openSettingsModal);
  document.querySelectorAll('[data-settings-tab]').forEach(btn=>{
    btn.onclick=()=>{ setSettingsTab(btn.dataset.settingsTab); saveState(); };
    btn.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      const tabs=Array.from(document.querySelectorAll('[data-settings-tab]'));
      const i=tabs.indexOf(btn);
      const next=e.key==='Home' ? 0 : e.key==='End' ? tabs.length-1 : e.key==='ArrowRight' ? Math.min(tabs.length-1,i+1) : Math.max(0,i-1);
      e.preventDefault();
      tabs[next]?.focus();
      tabs[next]?.click();
    };
  });
  if($('saveSettingsBtn')) $('saveSettingsBtn').onclick=saveSettingsNow;
  if($('exportConfigBtn')) $('exportConfigBtn').onclick=exportConfigFile;
  if($('closeSettingsBtn')) $('closeSettingsBtn').onclick=()=>{ closeSettingsModal(); saveState(); };
  if($('settingsModal')) $('settingsModal').onclick=e=>{ if(e.target===$('settingsModal')){ closeSettingsModal(); saveState(); } };
  if($('dataModalBtn')) $('dataModalBtn').onclick=()=>{ $('dataModal')?.classList.remove('hidden'); };
  if($('closeDataModalBtn')) $('closeDataModalBtn').onclick=()=>{ $('dataModal')?.classList.add('hidden'); };
  if($('dataModal')) $('dataModal').onclick=e=>{ if(e.target===$('dataModal')) $('dataModal')?.classList.add('hidden'); };
  const openBackupModal=()=>{ $('backupModal')?.classList.remove('hidden'); updateBackupReminder(); };
  if($('backupModalBtn')) $('backupModalBtn').onclick=openBackupModal;
  if($('backupQuickOpenBtn')) $('backupQuickOpenBtn').onclick=openBackupModal;
  if($('closeBackupModalBtn')) $('closeBackupModalBtn').onclick=()=>{ $('backupModal')?.classList.add('hidden'); };
  if($('backupModal')) $('backupModal').onclick=e=>{ if(e.target===$('backupModal')) $('backupModal')?.classList.add('hidden'); };
  if($('saveTariffsSettingsBtn')) $('saveTariffsSettingsBtn').onclick=saveSettingsNow;
  if($('exportOrdersBtn')) $('exportOrdersBtn').onclick=exportOrders;
  if($('importOrdersBtn')) $('importOrdersBtn').onclick=()=>$('importOrdersFile').click();
  if($('importOrdersFile')) $('importOrdersFile').onchange=e=>importOrdersFile(e.target.files?.[0]);
  if($('exportBackupBtn')) $('exportBackupBtn').onclick=exportBackup;
  if($('importBackupBtn')) $('importBackupBtn').onclick=()=>requestEditAccess(()=>$('importBackupFile').click());
  if($('importBackupFile')) $('importBackupFile').onchange=e=>importBackupFile(e.target.files?.[0]);
  $('closeShareBtn').onclick=()=>$('shareModal').classList.add('hidden');
  const closeMoreMenu=()=>{ $('moreMenuPanel')?.classList.add('hidden'); $('moreMenuBtn')?.setAttribute('aria-expanded','false'); };
  if($('moreMenuBtn')) $('moreMenuBtn').onclick=()=>{ const panel=$('moreMenuPanel'); if(!panel) return; panel.classList.toggle('hidden'); $('moreMenuBtn').setAttribute('aria-expanded', panel.classList.contains('hidden') ? 'false' : 'true'); };
  if($('moreMenuPanel')) $('moreMenuPanel').querySelectorAll('button').forEach(item=>item.addEventListener('click', closeMoreMenu));
  document.addEventListener('click', e=>{ const panel=$('moreMenuPanel'), btn=$('moreMenuBtn'); if(panel && btn && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target!==btn) closeMoreMenu(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ if($('settingsModal') && !$('settingsModal').classList.contains('hidden')){ closeSettingsModal(); saveState(); } ['dataModal','backupModal','shareModal','pdfPreviewModal'].forEach(id=>$(id)?.classList.add('hidden')); closeMoreMenu(); } });
  if($('lockEditBtn') && (APP_CONFIG.APP_PASSWORD || APP_CONFIG.appPassword)){ $('lockEditBtn').classList.remove('hidden'); $('lockEditBtn').onclick=lockEditing; }
  const seriesCard=$('seriesCard');
  if(seriesCard){
    seriesCard.open = !!state.ui.seriesOpen || num(state.form.seriesCount)>1;
    seriesCard.addEventListener('toggle', ()=>{ state.ui=state.ui||{}; state.ui.seriesOpen=seriesCard.open; saveState(); });
  }
  if($('previewPdfBtn')) $('previewPdfBtn').onclick=openPdfPreview;
  if($('closePdfPreviewBtn')) $('closePdfPreviewBtn').onclick=closePdfPreview;
  if($('refreshPdfPreviewBtn')) $('refreshPdfPreviewBtn').onclick=refreshPdfPreview;
  $('copyEstimateBtn').onclick=copyEstimate; $('printPdfBtn').onclick=printEstimate;
  if($('sharePdfBtn')) $('sharePdfBtn').onclick=sharePdfEstimate;
  $('equipmentText').oninput=e=>{ state.mainInfo.equipmentText=e.target.value; saveState(); };
  $('chemistryText').oninput=e=>{ state.mainInfo.chemistryText=e.target.value; saveState(); };
  if($('usefulInfoText')) $('usefulInfoText').oninput=e=>{ state.mainInfo.usefulInfo=e.target.value; saveState(); };
  if($('saveIncludedBtn')) $('saveIncludedBtn').onclick=()=>{ setTypeIncluded(state.form.cleanType, $('includedServices').value); saveState(); renderIncludedPreview(); renderTariffs(); toast('Шаблон сохранён'); };
  if($('includedServices')) $('includedServices').oninput=(e)=>{ setTypeIncluded(state.form.cleanType, e.target.value); saveState(); renderIncludedPreview(); };
  $('saveOrderBtn').onclick=()=>{ if(validateCurrentOrder().length) return; const r=calc(); state.savedOrders.unshift({id:Date.now(), version:APP_VERSION, clientName:state.form.clientName||'Без имени', objectType:state.form.objectType, area:num(state.form.area), cleanType:r.rate.label, recommendedPrice:r.recommendedPrice, seriesCount:r.seriesCount, seriesMonths:r.seriesMonths, seriesTotal:r.seriesTotal, brigadeHours:r.brigadeHours, normHours:r.normHours, form:clone(state.form), extras:clone(r.selectedExtras), calculation:{recommendedPrice:r.recommendedPrice,marketPrice:r.marketPrice,payroll:r.payroll,normHours:r.normHours,brigadeHours:r.brigadeHours,seriesCount:r.seriesCount,seriesTotal:r.seriesTotal,seriesDiscountPercent:r.seriesDiscountPercent}, createdAt:new Date().toLocaleString('ru-RU')}); state.savedOrders=state.savedOrders.slice(0,50); state.ui=state.ui||{}; state.ui.ordersSinceBackup=Number(state.ui.ordersSinceBackup||0)+1; saveState(); renderSavedOrders(); updateBackupReminder(); toast('Заказ сохранён'); if(state.ui.autoBackup && state.ui.ordersSinceBackup>=AUTO_BACKUP_EVERY){ exportBackup(); toast('Авто-копия сохранена'); } };
  $('clearBtn').onclick=()=>{ state.form=clone(defaults.form); state.extras=state.extras.map(x=>({...x, qty:0})); fillForm(); renderExtras(); recalc(); toast('Форма очищена'); };
  $('resetStorageBtn').onclick=()=>requestEditAccess(()=>{ if(!confirm('Сбросить все сохранённые данные в этом браузере?')) return; localStorage.removeItem(STORAGE_KEY); state=mergeState(clone(defaults)); migrateV43(); migrateV46(); fillForm(); renderTariffs(); renderExtras(); recalc(); toast("Все данные сброшены"); });
  $('demoBtn').onclick=()=>{ state.form={...state.form, clientName:'Ирина', objectType:'Квартира', area:68, cleanType:'general', discount:5, clutter:'medium', dirtiness:'medium', travelType:'km15', travelKm:20, ownerRole:'cleaner_manager', profitPercent:25, notes:'Есть кот. Уборка нужна в пятницу после 11:00.'}; state.extras=state.extras.map(x=>({...x, qty:({1:1,9:1,14:4,18:1}[x.id]||0)})); fillForm(); renderExtras(); recalc(); toast('Подставлен пример'); };
  $('showOnlySelected').onchange=e=>{ state.form.showOnlySelected=e.target.checked; saveState(); renderExtras(); };
  if($('extrasSearch')) $('extrasSearch').oninput=e=>{ extrasQuery=String(e.target.value||''); renderExtras(); };
  if($('mobileShareBtn')) $('mobileShareBtn').onclick=sharePdfEstimate;
  if($('mobileSummaryInfo')){ const goToSummary=()=>document.querySelector('.summary-box')?.scrollIntoView({behavior:'smooth', block:'start'}); $('mobileSummaryInfo').onclick=goToSummary; $('mobileSummaryInfo').onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goToSummary(); } }; }
  if($('estimateValidityDays')) $('estimateValidityDays').oninput=e=>{ state.estimateValidityDays=num(e.target.value); saveState(); };
  ['clientName','clientPhone','objectType','cleanDate','area','discount','discountAmount','travelKm','profitPercent','seriesCount','seriesMonths','seriesDiscount','seriesSchedule','notes'].forEach(id=>{ const el=$(id); if(!el) return; el.oninput=e=>{ state.form[id]=['area','discount','discountAmount','travelKm','profitPercent','seriesCount','seriesMonths','seriesDiscount'].includes(id)?num(e.target.value):e.target.value; recalc(); }; });
  ['cleanType','clutter','dirtiness','travelType','ownerRole','discountMode'].forEach(id=>$(id).onchange=e=>{ state.form[id]=e.target.value; if(id==='cleanType'){ ensureFormCleanTypeAndCoefs(true); populateMainSelects(); } if(id==='discountMode'){ updateDiscountInputs(); } recalc(); });
  ['brandName','brandTagline'].forEach(id=>{ const el=$(id); if(!el) return; el.oninput=e=>{ const map={brandName:'name',brandTagline:'tagline'}; state.brand[map[id]]=e.target.value; saveState(); renderBrandLogoPreview(); }; });
  if($('brandContactText')) $('brandContactText').oninput=e=>{ state.brand.contactText=e.target.value; const lines=String(e.target.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean); state.brand.phone=lines[0]||''; state.brand.site=lines[1]||''; saveState(); };
  $('brandLogo').onchange=e=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; if(file.size>2*1024*1024){ toast('Логотип слишком большой. Лучше до 2 МБ'); e.target.value=''; return; } const reader=new FileReader(); reader.onload=()=>{ const dataUrl=String(reader.result||''); if(!dataUrl.startsWith('data:image/')){ toast('Файл не похож на изображение'); $('brandLogo').value=''; return; } state.brand.logoDataUrl=dataUrl; saveState(); renderBrandLogoPreview(); toast('Логотип сохранён'); $('brandLogo').value=''; }; reader.readAsDataURL(file); };
  $('removeLogoBtn').onclick=()=>{ if(!state.brand.logoDataUrl){ toast('Логотип не загружен'); return; } state.brand.logoDataUrl=''; saveState(); renderBrandLogoPreview(); toast('Логотип удалён'); };
  if($('backupNowBtn')) $('backupNowBtn').onclick=exportBackup;
  if($('autoBackupToggle')) $('autoBackupToggle').onchange=e=>{ state.ui=state.ui||{}; state.ui.autoBackup=e.target.checked; saveState(); toast(e.target.checked?'Авто-копия включена':'Авто-копия выключена'); };
  if($('newExtraCategoryCustom')) $('newExtraCategoryCustom').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); if(addExtraCategory(e.target.value)){ e.target.value=''; } } };
  if($('addExtraBtn')) $('addExtraBtn').onclick=()=>requestEditAccess(()=>{ const name=$('newExtraName').value.trim(), unit=$('newExtraUnit').value.trim()||'шт', price=num($('newExtraPrice').value), time=num($('newExtraTime').value); let category=($('newExtraCategoryCustom')&&$('newExtraCategoryCustom').value.trim()) || ($('newExtraCategory')&&$('newExtraCategory').value) || 'Другое'; if($('newExtraCategoryCustom')&&$('newExtraCategoryCustom').value.trim()){ addExtraCategory(category); $('newExtraCategoryCustom').value=''; } if(!name||!price){ toast('Заполни название и цену'); return; } state.extras.push({id:Date.now(), name, unit, price, qty:0, time, category, builtIn:false}); ensureExtraCategories(); if(!state.extraCategories.includes(category)) state.extraCategories.push(category); $('newExtraName').value=''; $('newExtraPrice').value=''; $('newExtraTime').value=''; saveState(); renderCategoryOptions(category); renderCategoryManager(); renderExtras(); renderExtrasEditor(); recalc(); toast('Услуга добавлена'); });
}
function updateDiscountInputs(){ const mode=state.form.discountMode==='amount'?'amount':'percent'; const sel=$('discountMode'); if(sel) sel.value=mode; const pct=$('discount'), amt=$('discountAmount'); if(pct) pct.classList.toggle('hidden', mode!=='percent'); if(amt) amt.classList.toggle('hidden', mode!=='amount'); }
function fillForm(){ if(!isEditUnlocked()){ state.ui.showTariffs=false; state.ui.showSettings=false; } $('clientName').value=state.form.clientName; if($('clientPhone')) $('clientPhone').value=state.form.clientPhone||''; if($('cleanDate')) $('cleanDate').value=state.form.cleanDate||''; $('objectType').value=state.form.objectType; $('area').value=state.form.area; $('discount').value=state.form.discount; if($('discountAmount')) $('discountAmount').value=state.form.discountAmount||0; updateDiscountInputs(); $('travelKm').value=state.form.travelKm; if($('ownerRole')) $('ownerRole').value=state.form.ownerRole||'none'; $('profitPercent').value=state.form.profitPercent; if($('seriesCount')) $('seriesCount').value=state.form.seriesCount||1; if($('seriesMonths')) $('seriesMonths').value=state.form.seriesMonths||1; if($('seriesDiscount')) $('seriesDiscount').value=state.form.seriesDiscount||0; if($('seriesSchedule')) $('seriesSchedule').value=state.form.seriesSchedule||''; if($('seriesCard') && num(state.form.seriesCount)>1) $('seriesCard').open=true; $('notes').value=state.form.notes; $('showOnlySelected').checked=!!state.form.showOnlySelected; $('settingsModal')?.classList.toggle('hidden', !state.ui.showSettings); populateMainSelects(); if($('includedServices')) $('includedServices').value=getTypeIncluded(state.form.cleanType)||''; renderSettingsPanel(); setSettingsTab(state.ui.settingsTab); }
fillForm(); renderTariffs(); bind(); renderExtras(); renderSettingsPanel(); setSettingsTab(state.ui.settingsTab); enhanceAccessibility(); recalc(); updateBackupReminder(); attemptIdbRecovery(); if($('versionBadge')) $('versionBadge').textContent=APP_VERSION; setupAccess();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
