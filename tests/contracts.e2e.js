/* global state, ensureFormCleanTypeAndCoefs, recalc, contractCheckExport */
// Smoke/regression tests of B2C/B2B contract editor, immutable saved quote, act and PDF.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.ttf':'font/ttf','.json':'application/json'};
const server=http.createServer((req,res)=>{
  let local;
  try{local=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));}
  catch(e){res.writeHead(400);return res.end();}
  if(!local.startsWith(ROOT)||!fs.existsSync(local)||fs.statSync(local).isDirectory()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',types[path.extname(local)]||'application/octet-stream');
  fs.createReadStream(local).pipe(res);
});
let passed=0;
function check(label,valid,data){
  if(!valid)throw new Error(label+': '+JSON.stringify(data));
  passed++;console.log('ok - '+label);
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch(process.platform==='win32'?{channel:'chrome'}:{});
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true,viewport:{width:390,height:844}});
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded'});
    const saved=await page.evaluate(()=>{
      state.form.clientName='Тестовый заказчик';
      state.form.cleanDate='2026-11-12';
      state.form.cleanStartTime='11:30';
      state.form.address='Тестовый адрес';
      state.form.area=70;state.form.cleanType='general';
      ensureFormCleanTypeAndCoefs(true);
      recalc();
      document.querySelector('#saveOrderBtn').click();
      const o=state.savedOrders[0];
      return {total:o.recommendedPrice,snapshot:o.quoteSnapshot,orderId:o.id};
    });
    check('новый заказ имеет неизменяемый снимок',saved.snapshot?.pricing.total===saved.total,saved);
    check('дата и время начала сохранены',saved.snapshot?.schedule.startTime==='11:30',saved.snapshot?.schedule);
    await page.locator('[data-order-contract]').first().click();
    const before=await page.evaluate(()=>({
      modal:!document.querySelector('#contractModal').classList.contains('hidden'),
      draftCount:state.contractDrafts.length,
      source:state.savedOrders[0].quoteSnapshot.pricing.total,
      headerCount:document.querySelectorAll('#contractPreviewContent .contract-brand').length,
      preview:document.querySelector('#contractPreviewContent').innerText
    }));
    check('редактор открывается из сохранённого заказа',before.modal&&before.draftCount===1);
    check('шапка только одна на отдельный документ',before.headerCount===1);
    check('работы и сумма перенесены из заказа',before.preview.includes('Общая стоимость')&&before.preview.includes('В услугу входят работы'));
    await page.locator('[data-contract="contractorInn"]').fill('111111111111');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-order-contract]').first().click();
    const persisted=await page.locator('[data-contract="contractorInn"]').inputValue();
    check('черновик переживает перезагрузку',persisted==='111111111111');
    await page.locator('[data-contract="price"]').fill(String(saved.total+500));
    const blocked=await page.evaluate(()=>contractCheckExport(state.savedOrders[0],state.contractDrafts[0]));
    check('несогласованная новая цена блокирует экспорт',blocked===false);
    await page.locator('[data-contract="priceReason"]').fill('Дополнительные согласованные работы');
    await page.locator('[data-contract="priceApproval"]').check();
    const accepted=await page.evaluate(()=>contractCheckExport(state.savedOrders[0],state.contractDrafts[0]));
    check('изменение цены разрешается после подтверждения и причины',accepted===true);
    const preserved=await page.evaluate(()=>state.savedOrders[0].quoteSnapshot.pricing.total);
    check('историческая цена заказа не перезаписана',preserved===saved.total);
    await page.locator('[data-contract="customerType"]').selectOption('legal_entity');
    check('для юрлица показываются реквизиты',await page.locator('[data-contract="customerInn"]').isVisible());
    await page.locator('[data-contract="customerType"]').selectOption('individual');
    check('для физлица скрываются реквизиты организации',!(await page.locator('[data-contract="customerKpp"]').isVisible()));
    const pdfs={};
    for(const [name,selector] of [['contract','#contractDownloadBtn'],['act','#actDownloadBtn'],['package','#contractPackageBtn']]){
      const received=page.waitForEvent('download',{timeout:30000});
      await page.locator(selector).click();
      const dl=await received;
      const contents=fs.readFileSync(await dl.path());
      // jsPDF emits visible /Type /Page objects; .pdf is not enough if its pages are blank.
      pdfs[name]={size:contents.length,valid:contents.subarray(0,5).toString()==='%PDF-',pages:contents.toString('latin1').split('/Type /Page').length-2};
      check(name+' PDF downloaded with content',pdfs[name].valid&&pdfs[name].size>50000&&pdfs[name].pages>=1,pdfs[name]);
    }
    check('договор многостраничный',pdfs.contract.pages>=2,pdfs.contract);
    check('акт занимает отдельную страницу',pdfs.act.pages>=1,pdfs.act);
    check('пакет включает договор и акт',pdfs.package.pages>=pdfs.contract.pages+pdfs.act.pages,pdfs);
    check('нет JS ошибок',pageErrors.length===0,pageErrors);
    console.log('CONTRACTS_E2E: '+passed+' checks passed');
  }finally{await browser.close();server.close();}
})().catch(err=>{console.error('CONTRACTS_E2E_FAIL',err.stack||err);server.close();process.exitCode=1;});
