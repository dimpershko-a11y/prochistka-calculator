
let contractActiveOrderId=null;
function contractOrder(){return (state.savedOrders||[]).find(o=>String(o.id)===String(contractActiveOrderId));}
function contractActiveDraft(){const order=contractOrder();return order?contractDraft(order):null;}
function contractControl(label,key,type='text'){
 return `<label class="contract-edit-field">${esc(label)}<input data-contract-field="${key}" type="${type}" /></label>`;
}
function contractEnsureEditor(){
 if($('contractModal'))return;
 const node=document.createElement('div');
 node.id='contractModal';node.className='modal-overlay hidden';
 node.innerHTML=`<div class="modal-card wide contract-modal-card" role="dialog" aria-modal="true" aria-labelledby="contractTitle">
 <div class="topbar"><h2 id="contractTitle">Договор и акт</h2><button id="contractClose" type="button">Закрыть</button></div>
 <div class="notice">Редактирование не изменяет сохранённый заказ. Налоговую оговорку и реквизиты проверьте перед подписанием.</div>
 <div class="grid g2">
 <label class="contract-edit-field">Тип заказчика<select data-contract-field="customerType"><option value="individual">Физическое лицо</option><option value="legal_entity">Юридическое лицо</option></select></label>
 ${contractControl('Заказчик / название организации','customerName')}
 ${contractControl('Номер договора','documentNo')}
 ${contractControl('Дата договора','documentDate','date')}
 ${contractControl('Телефон заказчика','clientPhone')}
 ${contractControl('ИНН организации','customerInn')}
 ${contractControl('КПП организации','customerKpp')}
 ${contractControl('ОГРН организации','customerOgrn')}
 ${contractControl('Представитель организации','representative')}
 ${contractControl('Юридический адрес / регистрация','customerAddress')}
 ${contractControl('Адрес объекта уборки','objectAddress')}
 ${contractControl('Дата уборки','cleanDate','date')}
 ${contractControl('Время начала','cleanStartTime','time')}
 ${contractControl('Стоимость договора, ₽','total','number')}
 </div>
 <label class="contract-edit-field">Дополнительные работы (каждая с новой строки)<textarea data-contract-field="additionalWorks" rows="3"></textarea></label>
 <label class="contract-edit-field">Формулировка НДС — проверьте у бухгалтера<input data-contract-field="taxText" /></label>
 <div class="notice hidden" id="contractPriceWarning"></div>
 <label class="contract-edit-field">Причина изменения стоимости<textarea data-contract-field="changeReason" rows="2"></textarea></label>
 <label class="check-row"><input type="checkbox" id="contractApprovePrice"/>Подтверждаю изменение согласованной стоимости</label>
 <div class="btns"><button class="primary" type="button" id="contractSave">Сохранить черновик</button><button type="button" id="contractPreviewBtn">Предпросмотр</button><button type="button" id="contractDownloadPdf">Договор PDF</button><button type="button" id="contractDownloadAct">Акт PDF</button></div>
 <div id="contractPreviewArea" class="contract-preview hidden"></div>
 </div>`;
 document.body.appendChild(node);
 node.querySelector('#contractClose').onclick=()=>node.classList.add('hidden');
 node.querySelectorAll('[data-contract-field]').forEach(el=>{
  const handler=()=>{
   const d=contractActiveDraft();if(!d)return;
   const k=el.dataset.contractField;
   d[k]=k==='total'?Number(el.value):el.value;
   if(k==='total'){d.changeApproved=false;node.querySelector('#contractApprovePrice').checked=false;}
   d.savedAt=new Date().toISOString();saveState();contractUpdateWarning();
  };
  el.addEventListener('input',handler);el.addEventListener('change',handler);
 });
 node.querySelector('#contractApprovePrice').onchange=e=>{
  const d=contractActiveDraft();if(!d)return;d.changeApproved=e.target.checked;saveState();contractUpdateWarning();
 };
 node.querySelector('#contractSave').onclick=()=>{saveState();toast('Черновик договора сохранён');};
 node.querySelector('#contractPreviewBtn').onclick=()=>{
   const o=contractOrder(),d=contractActiveDraft();if(!o||!d)return;
   const preview=node.querySelector('#contractPreviewArea');
   preview.innerHTML=contractDocumentHtml(o,d);preview.classList.remove('hidden');
   preview.scrollIntoView({behavior:'smooth',block:'start'});
 };
 node.querySelector('#contractDownloadPdf').onclick=()=>contractDownload(false);
 node.querySelector('#contractDownloadAct').onclick=()=>contractDownload(true);
}
function contractUpdateWarning(){
 const order=contractOrder(),d=contractActiveDraft(),el=$('contractPriceWarning');
 if(!order||!d||!el)return;
 const changed=contractQuoteMismatch(order,d);
 el.classList.toggle('hidden',!changed);
 if(changed)el.textContent=`Сохранённая цена: ${money(contractSnapshot(order).price)}. Цена договора: ${money(d.total)}. Разница: ${money(Number(d.total)-contractSnapshot(order).price)}. Укажите причину и подтвердите изменение.`;
}
function openContractEditor(id){
 const order=(state.savedOrders||[]).find(o=>String(o.id)===String(id));if(!order)return;
 contractEnsureEditor();contractActiveOrderId=id;
 const d=contractDraft(order),modal=$('contractModal');
 modal.querySelectorAll('[data-contract-field]').forEach(el=>el.value=d[el.dataset.contractField]??'');
 modal.querySelector('#contractApprovePrice').checked=!!d.changeApproved;
 modal.querySelector('#contractPreviewArea').classList.add('hidden');
 modal.classList.remove('hidden');contractUpdateWarning();
 if(!order.quoteSnapshot)toast('Старый заказ: проверьте перечень работ по согласованной смете перед договором.');
}


async function contractDownload(actOnly){
 const order=contractOrder(),d=contractActiveDraft();if(!order||!d)return;
 const error=contractValidate(order,d);if(error){toast(error);return;}
 try{
  const blob=await contractRenderPdf(order,d,actOnly);
  if(!blob || blob.size<1000)throw new Error('Пустой PDF');
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;
  a.download=(actOnly?'Акт-':'Договор-')+String(d.documentNo||'').replace(/[^\wа-яА-Я-]/g,'_')+'.pdf';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
  toast('PDF сформирован');
 }catch(e){toast('Ошибка PDF: '+String(e?.message||e));}
}
