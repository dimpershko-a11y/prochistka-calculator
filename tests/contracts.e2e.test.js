/* global state, ensureFormCleanTypeAndCoefs, calc, APP_VERSION, clone, getTypeIncluded, saveState, renderSavedOrders, STORAGE_KEY, estimateText, buildPrintHtml */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
test('contract editor, first-page letterhead, price lock, PDF and act',async()=>{
 const server=http.createServer((req,res)=>{
  const dest=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,'')||'index.html');
  if(!dest.startsWith(root)||!fs.existsSync(dest)){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.json':'application/json'};
  res.setHeader('Content-Type',mime[path.extname(dest)]||'application/octet-stream');fs.createReadStream(dest).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const chromeFromWindows=process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'';
 const exe=process.env.CHROME_PATH||(chromeFromWindows&&fs.existsSync(chromeFromWindows)?chromeFromWindows:'');
 const browser=await chromium.launch(exe?{executablePath:exe,headless:true}:{headless:true});
 try {
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#cleanStartTime option').count(),25,'hourly slots + optional blank');
  assert.equal(await page.locator('#cleanStartTime option').nth(1).getAttribute('value'),'00:00–01:00');
  assert.equal(await page.locator('#cleanStartTime option').last().getAttribute('value'),'23:00–00:00');
  assert.ok(!(await page.evaluate(()=>estimateText())).includes('Время прибытия бригады:'),'empty slot must not appear in estimate');
  await page.locator('#cleanStartTime').selectOption('09:00–10:00');
  const estimateChecks=await page.evaluate(()=>({text:estimateText(),html:buildPrintHtml(),value:state.form.cleanStartTime}));
  assert.equal(estimateChecks.value,'09:00–10:00');
  assert.ok(estimateChecks.text.includes('Время прибытия бригады: 09:00–10:00'));
  assert.ok(estimateChecks.html.includes('Время прибытия бригады</td><td style="padding:6px 0">09:00–10:00'));
  await page.locator('#cleanStartTime').selectOption('');
  assert.ok(!(await page.evaluate(()=>buildPrintHtml())).includes('Время прибытия бригады</td>'));
  await page.evaluate(()=>{
   state.form.area=70;state.form.cleanType='general';state.form.cleanDate='2026-11-01';state.form.cleanStartTime='10:00–11:00';state.form.clientName='Тестовый заказчик';state.form.address='Санкт-Петербург, тестовый адрес';ensureFormCleanTypeAndCoefs(true);
   const r=calc();
   state.savedOrders.unshift({id:919191,version:APP_VERSION,clientName:state.form.clientName,objectType:'Квартира',area:70,cleanType:r.rate.label,recommendedPrice:r.recommendedPrice,
    form:clone(state.form),extras:clone(r.selectedExtras),quoteSnapshot:{schemaVersion:1,form:clone(state.form),service:{label:r.rate.label,included:getTypeIncluded(state.form.cleanType)},extras:clone(r.selectedExtras),pricing:{total:r.recommendedPrice}}});
   saveState();renderSavedOrders();
  });
  await page.locator('[data-order-contract="919191"]').click();
  assert.equal(await page.locator('#contractModal').isVisible(),true);
  assert.equal(await page.locator('[data-contract-field="cleanStartTime"]').inputValue(),'10:00–11:00');
  assert.ok((await page.locator('[data-contract-field="cleanStartTime"] option').allTextContents()).includes('10:00–11:00'));
  await page.locator('#contractPreviewBtn').click();
  assert.equal(await page.locator('.contract-preview .document-brand').count(),1);
  assert.ok((await page.locator('#contractPreviewArea').innerText()).includes('ДОГОВОР НА ОКАЗАНИЕ КЛИНИНГОВЫХ УСЛУГ'));
  assert.ok((await page.locator('#contractPreviewArea').innerText()).includes('2.1.1.'));
  assert.ok((await page.locator('#contractPreviewArea').innerText()).includes('Время прибытия бригады: 10:00–11:00'));
  const initialPrice=await page.locator('[data-contract-field="total"]').inputValue();
  await page.locator('[data-contract-field="total"]').fill(String(Number(initialPrice)+3000));
  await page.locator('#contractDownloadPdf').click();
  assert.equal(await page.locator('#contractPriceWarning').isVisible(),true);
  await page.locator('[data-contract-field="changeReason"]').fill('Согласована дополнительная уборка');
  await page.locator('#contractApprovePrice').check();
  const downloadWait=page.waitForEvent('download',{timeout:45000});
  await page.locator('#contractDownloadPdf').click();
  const download=await downloadWait;
  assert.ok(download.suggestedFilename().startsWith('Договор-'));
  const actDownload=page.waitForEvent('download',{timeout:45000});
  await page.locator('#contractDownloadAct').click();
  const act=await actDownload;
  assert.ok(act.suggestedFilename().startsWith('Акт-'));
  const persisted=await page.evaluate(()=>{
    const raw=localStorage.getItem(STORAGE_KEY);
    const saved=JSON.parse(raw||'{}').contractDrafts||[];
    return saved.find(x=>String(x.orderId)==='919191')?.changeReason;
  });
  assert.equal(persisted,'Согласована дополнительная уборка');
  const pdfPath=await download.path(),actPath=await act.path();
  for(const file of [pdfPath,actPath]){
    const bytes=fs.readFileSync(file);
    assert.ok(bytes.subarray(0,5).toString('ascii')==='%PDF-','not PDF');
    assert.ok(bytes.byteLength>1500,'PDF file too small');
  }
  assert.deepEqual(errors,[]);
 } finally{await browser.close();await new Promise(r=>server.close(r));}
},{timeout:180000});
