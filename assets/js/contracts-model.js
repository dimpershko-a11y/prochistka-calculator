
function contractSnapshot(order){
 const q=order.quoteSnapshot||{}, f=q.form||order.form||{};
 return {form:f,label:q.service?.label||order.cleanType||'',included:q.service?.included||'',extras:(q.extras||order.extras||[]).filter(x=>Number(x.qty)>0),price:Number(q.pricing?.total??order.recommendedPrice)};
}
function contractDraft(order){
 state.contractDrafts=Array.isArray(state.contractDrafts)?state.contractDrafts:[];
 let d=state.contractDrafts.find(x=>String(x.orderId)===String(order.id));
 if(d)return d;
 const q=contractSnapshot(order), f=q.form;
 d={schemaVersion:1,orderId:order.id,documentNo:f.estimateNo||String(order.id),
 documentDate:new Date().toISOString().slice(0,10),customerType:'individual',customerName:order.clientName||'',clientPhone:f.clientPhone||'',
 customerInn:'',customerKpp:'',customerOgrn:'',customerAddress:'',representative:'',
 objectAddress:f.address||'',cleanDate:f.cleanDate||'',cleanStartTime:f.cleanStartTime||'',
 total:q.price,changeReason:'',changeApproved:false,additionalWorks:'',taxText:'без НДС',savedAt:new Date().toISOString()};
 state.contractDrafts.push(d);saveState();return d;
}
function contractSafe(value){return esc(String(value??''));}
function contractDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return contractSafe(value||'________');
 return new Date(value+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
}
function contractBrandHtml(){
 return `<div class="document-brand"><div><div class="document-brand-name">PRO-CHISTKA</div><div class="document-brand-tag">к л и н и н г о в ы е &nbsp; у с л у г и</div></div><div class="document-brand-contact">+7 993 635 60 64<br>info@pro-chistka.pro<br>pro-chistka.pro</div></div>`;
}
function contractActHtml(order,d){
 return `<article class="contract-page" data-type="act">${contractBrandHtml()}<p class="contract-act-heading">Приложение № 1</p><h2>АКТ № ${contractSafe(d.documentNo)}</h2><p class="contract-center">оказанных услуг от ${contractDate(d.documentDate)}</p>
 <ol><li>Во исполнение Договора на оказание клининговых услуг № ${contractSafe(d.documentNo)} от ${contractDate(d.documentDate)} Исполнитель сдал, а Заказчик принял оказанные услуги в полном объёме.</li>
 <li>Качество выполненных работ проверено Заказчиком и соответствует условиям Договора. Заказчик не имеет претензий по качеству, объему и срокам выполненных работ.</li>
 <li>Акт подписан Сторонами без замечаний / с замечаниями (нужное подчеркнуть).</li></ol>
 <div class="contract-sign-line">Сдал: Исполнитель ________________ &nbsp;&nbsp;&nbsp; Принял: Заказчик ________________</div></article>`;
}
function contractDocumentHtml(order,d){
 const q=contractSnapshot(order),total=Number(d.total);
 const customer=d.customerType==='legal_entity'?'Организация '+contractSafe(d.customerName):contractSafe(d.customerName);
 const listed=String(q.included||'').split(/\n+/).map(x=>x.replace(/^[•\s-]+/,'').trim()).filter(Boolean);
 const extras=q.extras.map(x=>`${x.name} (${x.qty} ${x.unit||'шт'})`);
 const manual=String(d.additionalWorks||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const works=[...listed,...extras,...manual];
 const importantNote=order.quoteSnapshot?'':'<p><b>Исторический заказ:</b> проверьте перечень работ по ранее согласованной смете. Он не был полностью зафиксирован в старой версии калькулятора.</p>';
 const legal=CONTRACT_LEGAL.map(line=>{
   if(/^[234]\.\s/.test(line))return '<h3>'+contractSafe(line)+'</h3>';
   return '<p>'+contractSafe(line)+'</p>';
 });
 const pricePosition=legal.findIndex(x=>x.includes('3.3.'));
 legal.splice(pricePosition,0,`<p>3.2. Общая стоимость уборки объекта составляет <b>${money(total)}</b> ${contractSafe(d.taxText)}.</p>`);
 const customerDetails=d.customerType==='legal_entity'
   ?`ИНН: ${contractSafe(d.customerInn)}<br>КПП: ${contractSafe(d.customerKpp)}<br>ОГРН: ${contractSafe(d.customerOgrn)}<br>Юридический адрес: ${contractSafe(d.customerAddress)}<br>Представитель: ${contractSafe(d.representative)}`
   :`Адрес регистрации: ${contractSafe(d.customerAddress)}<br>Телефон: ${contractSafe(d.clientPhone)}`;
 return `<article class="contract-page" data-type="contract">${contractBrandHtml()}<h2>ДОГОВОР НА ОКАЗАНИЕ КЛИНИНГОВЫХ УСЛУГ<br>№ ${contractSafe(d.documentNo)}</h2>
 <p class="contract-place">г. Санкт-Петербург <span>${contractDate(d.documentDate)}</span></p>
 <p>${customer}, именуемый в дальнейшем «Заказчик», и индивидуальный предприниматель Першко Дмитрий Олегович, именуемый в дальнейшем «Исполнитель», совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:</p>
 <h3>1. Предмет договора</h3>
 <p>1.1. Заказчик поручает и обязуется оплатить, а Исполнитель принимает на себя обязательство организовать услуги по уборке (не)жилого помещения Заказчика, площадью ${contractSafe(order.area)} квадратных метров, расположенного по адресу: ${contractSafe(d.objectAddress)}.</p>
 <p>1.2. Вид уборки и перечень услуг Исполнителя включает в себя: <b>${contractSafe(q.label)}</b>.</p>
 ${importantNote}
 ${works.length?'<p>В услугу входят работы:</p><ul>'+works.map(x=>'<li>'+contractSafe(x)+'</li>').join('')+'</ul>':'<p>Перечень работ требуется уточнить по смете.</p>'}
 <p>Дата уборки: ${contractSafe(d.cleanDate||'не указана')}. Время начала: ${contractSafe(d.cleanStartTime||'не указано')}.</p>
 <p>1.3. К дополнительным услугам относятся только работы, прямо отмеченные Сторонами в настоящем Договоре либо согласованные отдельно в письменной форме, в том числе в мессенджере, СМС или по электронной почте.</p>
 ${legal.join('')}
 <h3 class="contract-sign-heading">Реквизиты и подписи сторон</h3><table class="contract-signatures"><tr><td><b>Исполнитель</b><p><b>ИП Першко Дмитрий Олегович</b></p>ИНН: 504796653452<br>ОГРНИП: 322508100458280<br>Телефон: +7 993 635 60 64<br><br><br>____________ / Першко Д.О. /</td>
 <td><b>Заказчик</b><p><b>${contractSafe(d.customerName)}</b></p>${customerDetails}<br><br><br>____________ / ____________ /</td></tr></table></article>`;
}
function contractQuoteMismatch(order,d){return Number(d.total)!==contractSnapshot(order).price;}
function contractValidate(order,d){
 if(!String(d.customerName).trim()||!String(d.documentNo).trim()||!String(d.objectAddress).trim())return 'Укажите заказчика, номер договора и адрес объекта.';
 if(!Number.isFinite(Number(d.total))||Number(d.total)<0)return 'Некорректная стоимость договора.';
 if(d.cleanStartTime&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(d.cleanStartTime))return 'Некорректное время начала.';
 if(d.customerType==='legal_entity'&&!String(d.customerInn).trim())return 'Для юридического лица необходим ИНН.';
 if(contractQuoteMismatch(order,d)&&(!d.changeApproved||!String(d.changeReason).trim()))return 'Изменение стоимости требует подтверждения и обязательной причины.';
 return '';
}
