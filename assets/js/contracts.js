/* PRO-CHISTKA — автономный генератор договора и акта.
 * Файлы заказчиков не передаются в GitHub или Apps Script.
 * Основа юридических пунктов: предоставленный пользователем договор 2026 v4.
 */
const CONTRACT_TEMPLATE_VERSION='2026-v4';
function contractEsc(value){ return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function contractMoney(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽':'—';}
function contractSafeNumber(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;}
function contractDate(value){
  const s=String(value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.split('-').reverse().join('.');
  return s || '____________';
}
function contractLines(value){
  return String(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
}
function buildQuoteSnapshot(r){
  const type=getActiveCleaningType()||{};
  const selected=Array.isArray(r.selectedExtras)?r.selectedExtras:[];
  const form=clone(state.form);
  return {
    schemaVersion:1,
    createdAt:new Date().toISOString(),appVersion:APP_VERSION,configRevision:Number(state.ui?.configRevision||APP_CONFIG.CONFIG_REVISION||0),
    customer:{name:String(form.clientName||''),phone:String(form.clientPhone||'')},
    object:{address:String(form.address||''),type:String(form.objectType||''),areaM2:contractSafeNumber(form.area)},
    schedule:{date:String(form.cleanDate||''),startTime:String(form.cleanStartTime||'')},
    service:{typeKey:String(form.cleanType||''),label:String(r.rate?.label||form.cleanType||''),included:contractLines(getTypeIncluded(form.cleanType)),notIncluded:contractLines(type.notIncluded||'')},
    items:selected.map(x=>({id:String(x.id),name:String(x.name||''),unit:String(x.unit||'шт'),qty:contractSafeNumber(x.qty),unitPrice:contractSafeNumber(x.price),lineTotal:Math.round(contractSafeNumber(x.qty)*contractSafeNumber(x.price))})),
    pricing:{base:contractSafeNumber(r.baseWithK),minimumAdjustment:contractSafeNumber(r.minimumAdjustment),extras:contractSafeNumber(r.extrasTotal),travel:contractSafeNumber(r.travelTotal),discount:contractSafeNumber(r.discountValue),total:contractSafeNumber(r.recommendedPrice),currency:'RUB'},
    estimateNo:String(form.estimateNo||'')
  };
}
function snapshotForOrder(order){
  if(order.quoteSnapshot) return clone(order.quoteSnapshot);
  const o=order||{}, form=o.form||{},calc=o.calculation||{};
  const items=(Array.isArray(o.extras)?o.extras:[]).map(x=>({id:String(x.id),name:String(x.name||''),unit:String(x.unit||'шт'),qty:contractSafeNumber(x.qty),unitPrice:contractSafeNumber(x.price),lineTotal:Math.round(contractSafeNumber(x.qty)*contractSafeNumber(x.price))}));
  return {schemaVersion:1,legacy:true,createdAt:o.createdAt||'',appVersion:o.version||'',configRevision:0,
    customer:{name:o.clientName||form.clientName||'',phone:form.clientPhone||''},
    object:{type:o.objectType||form.objectType||'',address:form.address||'',areaM2:contractSafeNumber(o.area||form.area)},
    schedule:{date:form.cleanDate||'',startTime:form.cleanStartTime||''},
    service:{typeKey:form.cleanType||'',label:o.cleanType||'',included:[],notIncluded:[]},items,
    pricing:{total:contractSafeNumber(o.recommendedPrice??calc.recommendedPrice),currency:'RUB'},estimateNo:form.estimateNo||''};
}
function getContractDraft(order){
  state.contractDrafts=Array.isArray(state.contractDrafts)?state.contractDrafts:[];
  const id=String(order.id);
  let draft=state.contractDrafts.find(x=>String(x.orderId)===id);
  if(draft) return draft;
  const q=snapshotForOrder(order);
  draft={schemaVersion:1,templateVersion:CONTRACT_TEMPLATE_VERSION,orderId:id,
    documentNo:q.estimateNo||'',documentDate:new Date().toISOString().slice(0,10),customerType:'individual',
    customerName:q.customer.name,customerPhone:q.customer.phone,customerInn:'',customerKpp:'',
    customerOgrn:'',customerAddress:'',customerRepresentative:'',customerAuthority:'',
    contractorName:'ИП Першко Дмитрий Олегович',contractorInn:'',contractorOgrnip:'',
    contractDate:q.schedule.date||'',startTime:q.schedule.startTime||'',objectAddress:q.object.address,objectArea:String(q.object.areaM2),
    workText:q.service.included.join('\n'),extraText:q.items.map(x=>x.name+' — '+x.qty+' '+x.unit+' × '+contractMoney(x.unitPrice)).join('\n'),
    notes:'',price:String(q.pricing.total),priceApproval:false,priceReason:'',
    vatText:'без НДС',actNo:'',actDate:'',actRemarks:'',actAccepted:true,updatedAt:new Date().toISOString()};
  state.contractDrafts.push(draft);
  saveState();
  return draft;
}
let currentContractOrderId=null;
function contractLegalHtml(keys){
  const clauses=window.PROCHISTKA_CONTRACT_LEGAL?.clauses||{};
  return keys.map(key=>clauses[key]?'<p class="contract-clause">'+contractEsc(clauses[key])+'</p>':'').join('');
}
function documentBrandHeader(){
  const contact=contractLines(state.brand?.contactText || [state.brand?.phone,state.brand?.site].filter(Boolean).join('\n'));
  return '<header class="contract-brand"><div class="contract-brand-left"><div class="contract-brand-name">'+contractEsc(state.brand?.name||'PRO-CHISTKA')+'</div><div class="contract-brand-tagline">'+contractEsc(state.brand?.tagline||'клининговые услуги')+'</div></div><div class="contract-brand-contact">'+contact.map(contractEsc).join('<br>')+'</div></header>';
}
function contractPartiesHtml(d){
  const cust=d.customerType==='legal_entity'
    ? [d.customerName, d.customerInn?'ИНН: '+d.customerInn:'',d.customerKpp?'КПП: '+d.customerKpp:'',d.customerOgrn?'ОГРН: '+d.customerOgrn:'',d.customerAddress?'Юридический адрес: '+d.customerAddress:'',d.customerPhone?'Телефон: '+d.customerPhone:'',d.customerRepresentative?'Представитель: '+d.customerRepresentative:'',d.customerAuthority?'Основание: '+d.customerAuthority:'']
    : [d.customerName,d.customerAddress?'Адрес регистрации: '+d.customerAddress:'',d.customerPhone?'Телефон: '+d.customerPhone:''];
  const exec=[d.contractorName,d.contractorInn?'ИНН: '+d.contractorInn:'',d.contractorOgrnip?'ОГРНИП: '+d.contractorOgrnip:'',state.brand?.phone?'Телефон: '+state.brand.phone:''];
  const build=lines=>lines.filter(Boolean).map(contractEsc).map(s=>'<div>'+s+'</div>').join('');
  return '<h3 class="contract-sign-title">Реквизиты и подписи сторон</h3><div class="contract-signatures"><div><strong>Исполнитель</strong>'+build(exec)+'<div class="contract-sign-line">________________ / _________________</div></div><div><strong>Заказчик</strong>'+build(cust)+'<div class="contract-sign-line">________________ / _________________</div></div></div>';
}
function contractMainHtml(order,d){
  const q=snapshotForOrder(order);
  const keysA=['2.1.1','2.1.2','2.1.3','2.1.4','2.1.5'];
  const keysB=['2.2.1','2.2.2','2.2.3','2.2.4','2.2.5'];
  const keysPay=['3.1','3.3','3.4','3.5','3.6','3.6.1','3.6.2','3.7','3.8','3.9'];
  const total=contractSafeNumber(d.price),numArea=contractSafeNumber(d.objectArea);
  const cust=d.customerType==='legal_entity'?'организация '+d.customerName:d.customerName;
  const details=d.customerType==='legal_entity' && d.customerRepresentative?' в лице '+d.customerRepresentative+(d.customerAuthority?', действующего на основании '+d.customerAuthority:''):'';
  const work=contractLines(d.workText).map(x=>'<li>'+contractEsc(x)+'</li>').join('');
  const more=contractLines(d.extraText).map(x=>'<li>'+contractEsc(x)+'</li>').join('');
  return '<article class="contract-document">'+documentBrandHeader()
  +'<h2>ДОГОВОР НА ОКАЗАНИЕ КЛИНИНГОВЫХ УСЛУГ</h2>'
  +'<div class="contract-center">№ '+contractEsc(d.documentNo||'________')+'</div>'
  +'<div class="contract-city">г. Санкт-Петербург <span>'+contractDate(d.documentDate)+'</span></div>'
  +'<p>'+contractEsc(cust||'________________')+contractEsc(details)+', именуемый в дальнейшем «Заказчик», и '+contractEsc(d.contractorName)+', именуемый в дальнейшем «Исполнитель», совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:</p>'
  +'<h3>1. Предмет договора</h3>'
  +'<p>1.1. Заказчик поручает и обязуется оплатить, а Исполнитель принимает на себя обязательство организовать услуги по уборке помещения Заказчика, площадью '+contractEsc(numArea)+' квадратных метров, расположенного по адресу: '+contractEsc(d.objectAddress||'________________')+'.</p>'
  +'<p>1.2. Вид уборки и перечень услуг Исполнителя: <strong>'+contractEsc(q.service.label)+'</strong>.</p>'
  +(work?'<p>В услугу входят работы:</p><ul>'+work+'</ul>':'<p class="contract-unfilled">Перечень работ отсутствует в историческом заказе — заполните вручную.</p>')
  +(more?'<p>Дополнительные услуги:</p><ul>'+more+'</ul>':'')
  +contractLegalHtml(['1.3'])
  +(d.contractDate||d.startTime?'<p>Согласованные дата и время начала: '+contractEsc(contractDate(d.contractDate))+(d.startTime?' в '+contractEsc(d.startTime):'')+'.</p>':'')
  +'<h3>2. Права и обязанности сторон</h3><h4>2.1. Права и обязанности Исполнителя</h4>'
  +contractLegalHtml(keysA)+'<h4>2.2. Права и обязанности Заказчика</h4>'+contractLegalHtml(keysB)
  +'<h3>3. Оплата и приемка услуг</h3>'+contractLegalHtml(['3.1'])
  +'<p>3.2. Общая стоимость уборки объекта составляет <strong>'+contractMoney(total)+'</strong> '+contractEsc(d.vatText||'без НДС')+'.</p>'
  +contractLegalHtml(keysPay)
  +'<h3>4. Ответственность сторон</h3>'+contractLegalHtml(['4.1','4.2','4.3'])
  +(d.notes?'<p><strong>Дополнительные условия:</strong> '+contractEsc(d.notes)+'</p>':'')
  +contractPartiesHtml(d)+'</article>';
}
function contractActHtml(order,d){
  return '<article class="contract-document">'+documentBrandHeader()
  +'<div class="contract-right">Приложение № 1</div>'
  +'<h2>АКТ № '+contractEsc(d.actNo||d.documentNo||'________')+'</h2>'
  +'<div class="contract-center">оказанных услуг от '+contractEsc(contractDate(d.actDate||d.documentDate))+'</div>'
  +'<p>1. Во исполнение Договора на оказание клининговых услуг № '+contractEsc(d.documentNo||'________')+' от '+contractEsc(contractDate(d.documentDate))+' Исполнитель сдал, а Заказчик принял оказанные услуги в полном объёме.</p>'
  +'<p>2. Качество выполненных работ проверено Заказчиком и соответствует условиям Договора. Заказчик не имеет претензий по качеству, объёму и срокам выполненных работ.</p>'
  +'<p>3. Акт подписан Сторонами '+(d.actAccepted?'без замечаний':'с замечаниями')+'.</p>'
  +(d.actRemarks?'<p>Замечания: '+contractEsc(d.actRemarks)+'</p>':'')
  +'<div class="contract-act-sign"><div>Сдал:<br>Исполнитель<br><br>________________________</div><div>Принял:<br>Заказчик<br><br>________________________</div></div>'
  +'</article>';
}
function contractCreateModal(){
  if($('contractModal'))return;
  const modal=document.createElement('div');modal.className='modal-overlay hidden';modal.id='contractModal';
  modal.innerHTML='<div class="modal-card contract-modal-card"><div class="topbar"><div><div class="section-title">Договор и акт</div><div class="muted">Документ создаётся из сохранённой стоимости заказа. Перед подписанием проверьте юридическую редакцию и налоги.</div></div><button id="contractClose" type="button">Закрыть</button></div>'
    +'<div id="contractLegacyWarning" class="notice hidden"></div><div id="contractPriceWarning" class="notice hidden"></div>'
    +'<div class="contract-columns"><div class="contract-editor">'
    +'<div class="contract-form-grid">'
    +'<label>Тип заказчика<select data-contract="customerType"><option value="individual">Физическое лицо</option><option value="legal_entity">Юридическое лицо</option></select></label>'
    +'<label>Номер договора<input data-contract="documentNo"/></label>'
    +'<label>Дата договора<input type="date" data-contract="documentDate"/></label>'
    +'<label>Заказчик: ФИО / организация<input data-contract="customerName"/></label>'
    +'<label>Телефон<input data-contract="customerPhone"/></label>'
    +'<label>Адрес регистрации / юридический адрес<input data-contract="customerAddress"/></label>'
    +'<label class="contract-legal">ИНН заказчика<input data-contract="customerInn"/></label>'
    +'<label class="contract-legal">КПП<input data-contract="customerKpp"/></label>'
    +'<label class="contract-legal">ОГРН<input data-contract="customerOgrn"/></label>'
    +'<label class="contract-legal">Представитель организации<input data-contract="customerRepresentative"/></label>'
    +'<label class="contract-legal">Основание полномочий<input data-contract="customerAuthority"/></label>'
    +'<label>Дата уборки<input type="date" data-contract="contractDate"/></label>'
    +'<label>Время начала<input type="time" data-contract="startTime"/></label>'
    +'<label>Площадь, м²<input type="number" min="0" step="0.01" data-contract="objectArea"/></label>'
    +'<label class="contract-span">Адрес объекта<input data-contract="objectAddress"/></label>'
    +'<label class="contract-span">Работы (каждая с новой строки)<textarea rows="5" data-contract="workText"></textarea></label>'
    +'<label class="contract-span">Дополнительные услуги<textarea rows="3" data-contract="extraText"></textarea></label>'
    +'<label class="contract-span">Дополнительные условия<textarea rows="2" data-contract="notes"></textarea></label>'
    +'<label>Стоимость договора, ₽<input type="number" min="0" step="0.01" data-contract="price"/></label>'
    +'<label>Налоговая формулировка (проверить с бухгалтером)<input data-contract="vatText"/></label>'
    +'<label class="contract-span">Причина изменения стоимости<textarea rows="2" data-contract="priceReason"></textarea></label>'
    +'<label class="contract-span contract-check"><input type="checkbox" data-contract="priceApproval"/> Я подтверждаю изменение цены относительно сохранённого заказа</label>'
    +'<h4 class="contract-span">Реквизиты исполнителя (сохраняются локально)</h4>'
    +'<label class="contract-span">Наименование ИП<input data-contract="contractorName"/></label>'
    +'<label>ИНН ИП<input data-contract="contractorInn"/></label><label>ОГРНИП<input data-contract="contractorOgrnip"/></label>'
    +'<h4 class="contract-span">Акт оказанных услуг (Приложение № 1)</h4>'
    +'<label>Номер акта<input data-contract="actNo"/></label><label>Дата акта<input type="date" data-contract="actDate"/></label>'
    +'<label class="contract-span">Замечания по акту<textarea rows="2" data-contract="actRemarks"></textarea></label>'
    +'<label class="contract-span contract-check"><input type="checkbox" data-contract="actAccepted"/> Услуги приняты без замечаний</label>'
    +'</div><div class="contract-actions"><button id="contractPreviewBtn">Обновить превью</button><button class="primary" id="contractDownloadBtn">Скачать договор PDF</button><button id="actDownloadBtn">Скачать акт PDF</button><button id="contractPackageBtn">Договор + акт PDF</button></div><div id="contractSavedStatus" class="muted"></div></div>'
    +'<div class="contract-preview-pane"><div class="contract-preview-tabs"><button id="contractTabDoc">Договор</button><button id="contractTabAct">Акт</button></div><div class="contract-preview-content" id="contractPreviewContent"></div></div></div></div>';
  document.body.appendChild(modal);
  $('contractClose').onclick=()=>modal.classList.add('hidden');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden');});
  modal.querySelectorAll('[data-contract]').forEach(input=>{
    input.addEventListener('input',contractSyncDraft);
    input.addEventListener('change',contractSyncDraft);
  });
  $('contractPreviewBtn').onclick=()=>contractRenderPreview();
  $('contractTabDoc').onclick=()=>{modal.dataset.view='contract';contractRenderPreview();};
  $('contractTabAct').onclick=()=>{modal.dataset.view='act';contractRenderPreview();};
  $('contractDownloadBtn').onclick=()=>contractDownloadPdf('contract');
  $('actDownloadBtn').onclick=()=>contractDownloadPdf('act');
  $('contractPackageBtn').onclick=()=>contractDownloadPdf('both');
}
function openContractForOrder(orderId){
  const order=state.savedOrders.find(x=>String(x.id)===String(orderId));
  if(!order){toast('Не удалось найти заказ');return;}
  contractCreateModal();
  currentContractOrderId=String(orderId);
  const d=getContractDraft(order);
  const modal=$('contractModal');
  modal.dataset.view='contract';
  modal.querySelectorAll('[data-contract]').forEach(el=>{
    const k=el.dataset.contract;
    if(el.type==='checkbox')el.checked=!!d[k];
    else el.value=String(d[k]??'');
  });
  const q=snapshotForOrder(order);
  $('contractLegacyWarning').classList.toggle('hidden',!q.legacy);
  $('contractLegacyWarning').textContent=q.legacy?'Это старый заказ: исторический перечень работ не сохранён. Проверьте и заполните работы вручную перед экспортом.':'';
  contractUpdateFields();contractRenderPreview();
  modal.classList.remove('hidden');
}
function contractUpdateFields(){
  const d=state.contractDrafts.find(x=>String(x.orderId)===currentContractOrderId);
  if(!d)return;
  $('contractModal').querySelectorAll('.contract-legal').forEach(el=>el.classList.toggle('hidden',d.customerType!=='legal_entity'));
  const q=snapshotForOrder(state.savedOrders.find(x=>String(x.id)===currentContractOrderId));
  const changed=Math.abs(Number(d.price)-Number(q.pricing.total))>0.009;
  const warning=$('contractPriceWarning');
  warning.classList.toggle('hidden',!changed);
  if(changed)warning.textContent='Цена заказа: '+contractMoney(q.pricing.total)+'; цена договора: '+contractMoney(d.price)+'. Для экспорта необходимы причина и отдельное подтверждение.';
}
function contractSyncDraft(event){
  const d=state.contractDrafts.find(x=>String(x.orderId)===currentContractOrderId);
  if(!d)return;
  const input=event.target,key=input.dataset.contract;
  if(!key)return;
  const value=input.type==='checkbox'?input.checked:input.value;
  if(key==='price' && String(value)!==String(d.price))d.priceApproval=false;
  d[key]=value;
  if(key==='price' && !d.priceApproval){
    const checkbox=$('contractModal').querySelector('[data-contract="priceApproval"]');
    if(checkbox)checkbox.checked=false;
  }
  d.updatedAt=new Date().toISOString();
  const saved=saveState();
  $('contractSavedStatus').textContent=saved?'Черновик сохранён на этом устройстве':'Ошибка сохранения: скачайте резервную копию';
  contractUpdateFields();
  contractRenderPreview();
}
function contractRenderPreview(){
  const o=state.savedOrders.find(x=>String(x.id)===currentContractOrderId);
  const d=state.contractDrafts.find(x=>String(x.orderId)===currentContractOrderId);
  if(!o||!d)return;
  const isAct=$('contractModal').dataset.view==='act';
  $('contractPreviewContent').innerHTML=isAct?contractActHtml(o,d):contractMainHtml(o,d);
}
function contractCheckExport(order,d){
  if(!d.customerName?.trim()||!d.contractorName?.trim()||!d.objectAddress?.trim()){
    toast('Укажите заказчика, исполнителя и адрес объекта');return false;
  }
  if(!d.workText?.trim()){
    toast('Заполните перечень выполняемых работ');return false;
  }
  if(!d.documentNo?.trim()){toast('Укажите номер договора');return false;}
  if(!Number.isFinite(Number(d.price))||Number(d.price)<0||Number(d.price)>1e12){
    toast('Некорректная сумма договора');return false;
  }
  if(d.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime)){
    toast('Некорректное время начала уборки');return false;
  }
  const q=snapshotForOrder(order);
  const changed=Math.abs(Number(d.price)-Number(q.pricing.total))>0.009;
  if(changed && (!d.priceApproval || !String(d.priceReason||'').trim())){
    toast('Подтвердите изменение цены и укажите причину');return false;
  }
  return true;
}
async function contractDownloadPdf(which){
  const order=state.savedOrders.find(x=>String(x.id)===currentContractOrderId);
  const d=state.contractDrafts.find(x=>String(x.orderId)===currentContractOrderId);
  if(!order||!d||!contractCheckExport(order,d))return;
  const btn=which==='act'?$('actDownloadBtn'):which==='both'?$('contractPackageBtn'):$('contractDownloadBtn');
  btn.disabled=true;
  try{
    await document.fonts.load('900 24px Orbitron','PRO-CHISTKA');
    const host=document.createElement('div');
    host.className='contract-export-host';
    host.style.cssText='position:fixed;left:-10000px;top:0;width:694px;background:white;';
    let html=which==='act'?contractActHtml(order,d):contractMainHtml(order,d);
    if(which==='both')html+='<div class="contract-page-break"></div>'+contractActHtml(order,d);
    host.innerHTML='<div class="contract-export-content">'+html+'</div>';
    document.body.appendChild(host);
    try{
      const opts={
        margin:[12.7,12.7,12.7,12.7],
        filename:(which==='act'?'Акт':which==='both'?'Договор-и-акт':'Договор')+'-'+String(d.documentNo).replace(/[^\wа-яёА-ЯЁ0-9-]/gi,'_')+'.pdf',
        image:{type:'jpeg',quality:0.96},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',windowWidth:800},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
        pagebreak:{mode:['css','legacy'],before:'.contract-page-break'}
      };
      await html2pdf().set(opts).from(host.firstElementChild).save();
    }finally{host.remove();}
    toast('PDF сформирован');
  }catch(e){toast('Не удалось создать PDF: '+String(e.message||e));}
  finally{btn.disabled=false;}
}
