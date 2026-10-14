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
 const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,headless:true}:{headless:true});
 try {
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(350);
  await page.evaluate(()=>{
   state.form.area=70;state.form.cleanType='general';state.form.cleanDate='2026-11-01';state.form.cleanStartTime='09:30';state.form.clientName='Тестовый заказчик';state.form.address='Санкт-Петербург, тестовый адрес';ensureFormCleanTypeAndCoefs(true);
   const r=calc();
   state.savedOrders.unshift({id:919191,version:APP_VERSION,clientName:state.form.clientName,objectType:'Квартира',area:70,cleanType:r.rate.label,recommendedPrice:r.recommendedPrice,
    form:clone(state.form),extras:clone(r.selectedExtras),quoteSnapshot:{schemaVersion:1,form:clone(state.form),service:{label:r.rate.label,included:getTypeIncluded(state.form.cleanType)},extras:clone(r.selectedExtras),pricing:{total:r.recommendedPrice}}});
   saveState();renderSavedOrders();
  });
  await page.locator('[data-order-contract="919191"]').click();
  assert.equal(await page.locator('#contractModal').isVisible(),true);
  assert.equal(await page.locator('[data-contract-field="cleanStartTime"]').inputValue(),'09:30');
  await page.locator('#contractPreviewBtn').click();
  assert.equal(await page.locator('.contract-preview .document-brand').count(),1);
  assert.ok((await page.locator('#contractPreviewArea').innerText()).includes('ДОГОВОР НА ОКАЗАНИЕ КЛИНИНГОВЫХ УСЛУГ'));
  assert.ok((await page.locator('#contractPreviewArea').innerText()).includes('2.1.1.'));
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
  assert.ok((await actDownload).suggestedFilename().startsWith('Акт-'));
  await page.locator('#contractClose').click();
  await page.locator('[data-order-contract="919191"]').click();
  assert.equal(await page.locator('[data-contract-field="changeReason"]').inputValue(),'Согласована дополнительная уборка');
  assert.deepEqual(errors,[]);
 } finally{await browser.close();await new Promise(r=>server.close(r));}
},{timeout:180000});
