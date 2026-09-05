// Сквозные проверки калькулятора в реальном браузере (Chromium через Playwright).
// Запуск: npm run test:e2e
// Требуется установленный пакет playwright (npm i -D playwright) или глобальная установка.
// Скрипт сам поднимает статический сервер на свободном порту и закрывает его после прогона.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream'});
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* пробуем глобальную установку */ }
  try {
    const globalRoot = require('child_process').execSync('npm root -g', {encoding: 'utf-8'}).trim();
    return require(path.join(globalRoot, 'playwright'));
  } catch (e) {
    console.error('Playwright не найден. Установите: npm i -D playwright');
    process.exit(2);
  }
}

const checks = [];
function check(name, ok, detail) {
  checks.push({name, ok});
  console.log(`${ok ? 'ok' : 'FAIL'} - ${name}${!ok && detail !== undefined ? ` (${detail})` : ''}`);
}

(async () => {
  const playwright = loadPlaywright();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({viewport: {width: 1280, height: 900}, acceptDownloads: true});
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(base, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(500);

  // v4.11.16: дефолт, услуги, уведомления и безопасное объединение config.js
  const initialState = await page.evaluate(() => ({
    cleanType: state.form.cleanType,
    extrasTotal: state.extras.length,
    extrasRendered: document.querySelectorAll('#extrasWrap input[data-extra]').length,
    dirty: isConfigDirty()
  }));
  check('дефолтный вид уборки не «Только доп. услуги»', initialState.cleanType !== 'extras_only', initialState.cleanType);
  check('в обычном режиме отображаются все услуги из config.js', initialState.extrasRendered === initialState.extrasTotal, JSON.stringify(initialState));
  check('свежая конфигурация не помечена как локально изменённая', initialState.dirty === false, initialState.dirty);

  const v41116Ui = await page.evaluate(() => ({
    extraQty: extraQtyLabel({qty: 2, unit: 'шт'}),
    toastZ: Number(getComputedStyle(document.getElementById('toast')).zIndex)
  }));
  check('доп. услуги показывают количество с единицей измерения', v41116Ui.extraQty === '2 шт', JSON.stringify(v41116Ui));
  check('уведомления находятся выше модальных окон', v41116Ui.toastZ > 100, JSON.stringify(v41116Ui));

  const sameConfigCheck = await page.evaluate(() => {
    const remoteDefaults = buildConfigDefaultsFromState();
    return {
      matches: configSnapshotString(remoteDefaults) === configSnapshotString(state),
      dirty: isConfigDirty()
    };
  });
  check('собственная опубликованная конфигурация распознаётся как совпадающая с локальной', sameConfigCheck.matches === true, JSON.stringify(sameConfigCheck));

  const remoteSourceCheck = await page.evaluate(() => ({
    raw: CONFIG_PUBLISH_RAW_URL,
    api: CONFIG_PUBLISH_API_URL,
    usesRelativeConfig: checkRemoteConfig.toString().includes('config.js?sync=')
  }));
  check('получение версии использует абсолютный GitHub source', remoteSourceCheck.raw.includes('raw.githubusercontent.com') && remoteSourceCheck.api.includes('api.github.com'), JSON.stringify(remoteSourceCheck));
  check('получение версии не использует относительный config.js', remoteSourceCheck.usesRelativeConfig === false, JSON.stringify(remoteSourceCheck));

  const mergeCheck = await page.evaluate(() => {
    const oldIds = (state.ui.syncedExtraIds || []).slice();
    state.ui.syncedExtraIds = ['1'];
    const merged = mergeConfiguredExtras(
      [{id: 1, name: 'Системная', unit: 'шт', price: 100, qty: 0, time: 1, category: 'Другое', availableSeparately: true}],
      [{id: 1, name: 'Системная старая', unit: 'шт', price: 90, qty: 3, time: 1, category: 'Другое'}, {id: 999, name: 'Локальная', unit: 'шт', price: 200, qty: 0, time: 1, category: 'Другое', builtIn: false}]
    );
    state.ui.syncedExtraIds = oldIds;
    return {ids: merged.map(x => x.id), qty: merged.find(x => x.id === 1)?.qty};
  });
  check('обновление config.js сохраняет локально добавленную услугу', mergeCheck.ids.includes(999), JSON.stringify(mergeCheck));
  check('обновление config.js сохраняет количество выбранной системной услуги', mergeCheck.qty === 3, JSON.stringify(mergeCheck));

  await page.selectOption('#cleanType', 'general');
  await page.waitForTimeout(100);
  await page.click('#moreMenuBtn');
  await page.click('#clearBtn');
  await page.waitForTimeout(150);
  const cleanTypeAfterClear = await page.$eval('#cleanType', el => el.value);
  check('«Очистить форму» сохраняет выбранный вид уборки', cleanTypeAfterClear === 'general', cleanTypeAfterClear);

  // Демо-заказ и сходимость сметы
  await page.click('#moreMenuBtn');
  await page.click('#demoBtn');
  await page.waitForTimeout(300);
  const menuHidden = await page.$eval('#moreMenuPanel', el => el.classList.contains('hidden'));
  check('меню закрывается после клика по пункту', menuHidden);

  const r1 = await page.evaluate(() => calc());
  check('строки сметы сходятся с итогом',
    r1.baseRaw + r1.extrasTotal + r1.travelTotal - r1.discountValue + r1.economyTopup - r1.seriesDiscountValue === r1.recommendedPrice,
    JSON.stringify({base: r1.baseRaw, extras: r1.extrasTotal, travel: r1.travelTotal, disc: r1.discountValue, topup: r1.economyTopup, total: r1.recommendedPrice}));
  check('все суммы целые', ['baseRaw','extrasTotal','travelTotal','discountValue','marketPrice','recommendedPrice','fullCost','targetPrice'].every(k => Number.isInteger(r1[k])));

  // Серия уборок
  await page.evaluate(() => { state.form.seriesCount = 4; state.form.seriesDiscount = 5; recalc(); });
  await page.waitForTimeout(200);
  const r2 = await page.evaluate(() => calc());
  check('серия: итог = цена × количество', r2.seriesTotal === r2.recommendedPrice * 4);
  check('серия: накладные делятся', r2.overheadPerCleaning === Math.round(r2.overheadPerJob / 4));
  check('серия: скидка не уводит ниже прямых затрат', r2.recommendedPrice >= r2.directCost);
  const seriesRowsShown = await page.$eval('#seriesRows', el => !el.classList.contains('hidden'));
  check('серия: блок в итоге виден', seriesRowsShown);
  await page.evaluate(() => { state.form.seriesCount = 1; state.form.seriesDiscount = 0; recalc(); });

  // PDF-файл
  const pdf = await page.evaluate(async () => {
    const blob = await generatePdfBlob();
    const head = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    return {size: blob.size, head};
  });
  check('PDF генерируется (%PDF, > 50 КБ)', pdf.head === '%PDF-' && pdf.size > 50000, JSON.stringify(pdf));
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#printPdfBtn')
  ]);
  const expectedPdfName = await page.evaluate(() => buildPdfFileName());
  check('«Скачать PDF» использует то же имя файла, что и «Поделиться PDF»', pdfDownload.suggestedFilename() === expectedPdfName, JSON.stringify({download: pdfDownload.suggestedFilename(), expected: expectedPdfName}));

  // Сохранить / повторить / удалить заказ
  await page.click('#saveOrderBtn');
  await page.waitForTimeout(200);
  const savedCount = await page.evaluate(() => state.savedOrders.length);
  check('заказ сохраняется', savedCount >= 1);
  await page.click('#moreMenuBtn');
  await page.click('#clearBtn');
  await page.waitForTimeout(200);
  await page.click('[data-order-repeat]');
  await page.waitForTimeout(200);
  const areaAfterRepeat = await page.$eval('#area', el => Number(el.value));
  check('«Повторить» восстанавливает форму', areaAfterRepeat > 0, areaAfterRepeat);
  page.once('dialog', d => d.accept());
  await page.click('[data-order-delete]');
  await page.waitForTimeout(200);
  const savedAfterDelete = await page.evaluate(() => state.savedOrders.length);
  check('«Удалить» удаляет заказ', savedAfterDelete === savedCount - 1);

  // Поиск по услугам
  await page.fill('#extrasSearch', 'холодильник');
  await page.dispatchEvent('#extrasSearch', 'input');
  await page.waitForTimeout(200);
  const found = await page.$$eval('#extrasWrap input[data-extra]', els => els.length);
  check('поиск фильтрует услуги', found >= 1 && found <= 3, found);
  await page.fill('#extrasSearch', '');
  await page.dispatchEvent('#extrasSearch', 'input');

  // Перестановка коэффициентов
  await page.click('#moreMenuBtn');
  await page.click('#settingsBtn');
  await page.waitForTimeout(200);
  await page.click('#settingsTabTariffs');
  await page.click('[data-tariff-inner-tab="clutter"]');
  await page.waitForTimeout(200);
  const orderChanged = await page.evaluate(() => {
    const typeKey = state.ui.tariffCleanType;
    const before = Object.keys(state.cleaningTypes[typeKey].clutter).join(',');
    document.querySelector('#clutterWrap [data-move-coef][data-dir="1"]').click();
    const after = Object.keys(state.cleaningTypes[typeKey].clutter).join(',');
    return before !== after;
  });
  check('перестановка коэффициентов меняет порядок', orderChanged);

  // Принудительная скидка
  await page.click('[data-tariff-inner-tab="main"]').catch(() => {});
  await page.click('#closeSettingsBtn');
  await page.waitForTimeout(150);
  await page.fill('#discount', '80');
  await page.dispatchEvent('#discount', 'input');
  await page.waitForTimeout(150);
  const beforeForce = await page.evaluate(() => calc());
  check('без принудительной скидки цена поднимается выше рынка', beforeForce.recommendedPrice > beforeForce.marketPrice, JSON.stringify(beforeForce.recommendedPrice));
  await page.check('#forceDiscount');
  await page.waitForTimeout(150);
  const afterForce = await page.evaluate(() => calc());
  check('принудительная скидка держит цену на уровне рынка', afterForce.recommendedPrice === afterForce.marketPrice, JSON.stringify(afterForce));
  const warningShown = await page.$eval('#economyWarning', el => !el.classList.contains('hidden'));
  check('предупреждение об убытке показывается при принудительной скидке', warningShown || afterForce.recommendedPrice >= afterForce.fullCost);
  await page.uncheck('#forceDiscount');
  await page.fill('#discount', '0');
  await page.dispatchEvent('#discount', 'input');

  check('нет ошибок JS на странице', pageErrors.length === 0, pageErrors.join('; '));

  await browser.close();
  server.close();
  const failed = checks.filter(c => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} проверок прошло`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
