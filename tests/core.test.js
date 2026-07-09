const test = require('node:test');
const assert = require('node:assert/strict');
const {calculateOrder, validateOrder, validateBackup} = require('../assets/core.js');

function makeState(overrides = {}){
  return {
    baseRates:{general:{label:'Генеральная',rate:200,min:9000,speed:10}},
    clutter:{low:{label:'Минимальная',priceK:1,timeK:1}},
    dirtiness:{low:{label:'Обычная',priceK:1,timeK:1}},
    labor:{cleanerDay:5000,ownerManagerDay:5000,ownerCleanerManagerDay:7000,maxHoursPerDay:9},
    materialPerM2:15,
    overhead:{monthly:75000,jobsPerMonth:10},
    extras:[],
    form:{
      area:50,cleanType:'general',clutter:'low',dirtiness:'low',
      discount:0,travelType:'kad',travelKm:0,ownerRole:'none',profitPercent:25
    },
    ...overrides
  };
}

test('нулевая площадь не применяет минимальную стоимость', () => {
  const state=makeState();
  state.form.area=0;
  const result=calculateOrder(state);
  assert.equal(result.baseRaw,0);
  assert.equal(result.minBaseApplied,false);
  assert.equal(result.crewNeeded,0);
  assert.equal(result.laborCost,0);
});

test('нулевая площадь не создаёт рекомендованную цену из допов, выезда и накладных', () => {
  const state=makeState({extras:[{id:1,name:'Окно',qty:3,price:500,time:.5}]});
  state.form.area=0;
  state.form.travelType='km20plus';
  state.form.travelKm=20;
  const result=calculateOrder(state);
  assert.equal(result.extrasTotal,0);
  assert.equal(result.travelTotal,0);
  assert.equal(result.overheadPerCleaning,0);
  assert.equal(result.targetPrice,0);
  assert.equal(result.singleRecommendedPrice,0);
  assert.equal(result.recommendedPrice,0);
});

test('минимальная стоимость применяется при положительной площади', () => {
  const state=makeState();
  state.form.area=10;
  const result=calculateOrder(state);
  assert.equal(result.baseRaw,9000);
  assert.equal(result.minBaseApplied,true);
});

test('коэффициенты, услуги и выезд участвуют в расчёте', () => {
  const state=makeState({
    clutter:{low:{label:'Минимальная',priceK:1.2,timeK:1.1}},
    dirtiness:{low:{label:'Обычная',priceK:1.5,timeK:1.2}},
    extras:[{id:1,name:'Окно',qty:2,price:500,time:.5}]
  });
  state.form.travelType='km20plus';
  state.form.travelKm=20;
  const result=calculateOrder(state);
  assert.equal(result.baseWithK,18000);
  assert.equal(result.extrasTotal,1000);
  assert.equal(result.travelTotal,1800);
  assert.equal(result.selectedExtras.length,1);
});

test('размер бригады выводится из нормо-часов и лимита часов в день', () => {
  const state=makeState();
  state.form.area=100; // speed 10 -> 10 нормо-часов, лимит 9 -> нужно 2 человека
  const result=calculateOrder(state);
  assert.equal(result.normHours,10);
  assert.equal(result.crewNeeded,2);
  assert.equal(result.brigadeHours,5);
});

test('роль владельца на объекте меняет состав и стоимость труда', () => {
  const base=makeState(); base.form.area=100; // нужно 2 человека
  const none=calculateOrder({...base, form:{...base.form, ownerRole:'none'}});
  assert.equal(none.laborCost,10000);   // 2 клинера
  assert.equal(none.peopleOnSite,2);
  const cm=calculateOrder({...base, form:{...base.form, ownerRole:'cleaner_manager'}});
  assert.equal(cm.laborCost,12000);     // 1 клинер 5000 + ты 7000
  assert.equal(cm.peopleOnSite,2);
  assert.equal(cm.hiredCleaners,1);
  const mgr=calculateOrder({...base, form:{...base.form, ownerRole:'manager'}});
  assert.equal(mgr.laborCost,15000);    // 2 клинера + ты-менеджер 5000
  assert.equal(mgr.peopleOnSite,3);
});

test('материалы считаются по м²', () => {
  const result=calculateOrder(makeState());
  assert.equal(result.materialsCost,750); // 50 * 15
});

test('накладные на заказ = расходы в месяц / число заказов', () => {
  const result=calculateOrder(makeState());
  assert.equal(result.overheadPerJob,7500); // 75000 / 10
});

test('себестоимость, целевая цена и маржа', () => {
  const result=calculateOrder(makeState()); // area 50, none -> 1 человек
  // труд 5000 + материалы 750 = 5750 (жёсткий пол)
  assert.equal(result.directCost,5750);
  // + накладные 7500 = 13250 (полная)
  assert.equal(result.fullCost,13250);
  // целевая = 13250 * 1.25 = 16562.5 -> округляется до рубля
  assert.equal(result.targetPrice,16563);
  // рынок 10000 < целевой -> рекомендуем целевую
  assert.equal(result.marketPrice,10000);
  assert.equal(result.recommendedPrice,16563);
  // маржа при наценке 25% ~ 20%
  assert.ok(Math.abs(result.marginPct-20)<0.01);
});

test('флаги: рынок ниже полной себестоимости, но выше прямых затрат', () => {
  const result=calculateOrder(makeState());
  assert.equal(result.belowFull,true);   // 10000 < 13250
  assert.equal(result.belowDirect,false);// 10000 > 5750
});

test('рекомендованная цена никогда не ниже жёсткого пола', () => {
  const state=makeState();
  state.form.discount=100; // рынок падает почти в ноль
  const result=calculateOrder(state);
  assert.ok(result.recommendedPrice>=result.directCost);
});

test('валидация требует площадь и корректную роль', () => {
  const state=makeState();
  state.form.area=0;
  assert.equal(validateOrder(state).length,1);
  const bad=makeState();
  bad.form.ownerRole='boss';
  assert.equal(validateOrder(bad).length,1);
});

test('валидная резервная копия принимается', () => {
  const defaults=makeState();
  const result=validateBackup({type:'prochistka_full_backup',state:makeState()},defaults);
  assert.equal(result.ok,true);
});

test('резервная копия с неизвестным тарифом отклоняется', () => {
  const defaults=makeState();
  const backup=makeState();
  backup.form.cleanType='missing';
  const result=validateBackup({type:'prochistka_full_backup',state:backup},defaults);
  assert.equal(result.ok,false);
});

test('массив не принимается как резервная копия', () => {
  const result=validateBackup([],makeState());
  assert.equal(result.ok,false);
});

test('скидка в % не затрагивает стоимость выезда', () => {
  const state=makeState();
  state.form.travelType='km20plus';
  state.form.travelKm=20;
  state.form.discount=100;
  const result=calculateOrder(state);
  assert.equal(result.travelTotal,1800);
  assert.equal(result.discountBase,10000);
  assert.equal(result.discountValue,10000);
  assert.equal(result.marketPrice,1800);
});

test('скидка фиксированной суммой ограничена базой и доп.услугами', () => {
  const state=makeState({extras:[{id:1,name:'Окно',qty:2,price:500,time:.5}]});
  state.form.discountMode='amount';
  state.form.discountAmount=3000;
  const result=calculateOrder(state);
  assert.equal(result.discountBase,11000);
  assert.equal(result.discountValue,3000);
});

test('скидка суммой не уходит ниже нуля по базе', () => {
  const state=makeState();
  state.form.discountMode='amount';
  state.form.discountAmount=999999;
  const result=calculateOrder(state);
  assert.equal(result.discountValue,result.discountBase);
});

test('строки сметы сходятся с итогом через economyTopup', () => {
  const result=calculateOrder(makeState()); // рынок 10000 < целевой 16562.5
  const rowsSum=result.baseRaw+result.extrasTotal+result.travelTotal-result.discountValue+result.economyTopup;
  assert.equal(rowsSum,result.recommendedPrice);
  assert.equal(result.economyTopup,result.recommendedPrice-result.marketPrice);
});

test('серия уборок делит накладные и показывает выгоду', () => {
  const state=makeState();
  state.form.seriesCount=4;
  state.form.seriesMonths=1;
  const r=calculateOrder(state);
  assert.equal(r.overheadPerCleaning,1875);            // 7500 / 4
  assert.equal(r.fullCost,5750+1875);                  // прямые + доля накладных
  assert.equal(r.singleFullCost,5750+7500);            // разовый заказ несёт все накладные
  assert.ok(r.recommendedPrice<r.singleRecommendedPrice);
  assert.equal(r.seriesTotal,r.recommendedPrice*4);
  assert.equal(r.seriesSavingPerCleaning,r.singleRecommendedPrice-r.recommendedPrice);
  assert.equal(r.seriesSavingTotal,r.seriesSavingPerCleaning*4);
});

test('все денежные величины округлены до рубля и сходятся', () => {
  const state=makeState({
    clutter:{low:{label:'Минимальная',priceK:0.95,timeK:1}},
    dirtiness:{low:{label:'Обычная',priceK:1.4,timeK:1}}
  });
  state.form.area=55;
  state.form.discount=5;
  const r=calculateOrder(state);
  const moneyFields=['baseNoK','baseAfterClutter','baseWithK','baseRaw','extrasTotal','travelTotal','discountValue','marketPrice','laborCost','materialsCost','overheadPerJob','overheadPerCleaning','fullCost','targetPrice','recommendedPrice','singleRecommendedPrice','seriesTotal','economyTopup'];
  moneyFields.forEach(f=>assert.equal(r[f],Math.round(r[f]),`${f} должен быть целым`));
  // строки сметы сходятся с итогом без копеек
  assert.equal(r.baseRaw+r.extrasTotal+r.travelTotal-r.discountValue+r.economyTopup-r.seriesDiscountValue, r.recommendedPrice);
});

test('скидка за серию снижает цену уборки, но не ниже прямых затрат', () => {
  const state=makeState();
  state.form.seriesCount=4;
  state.form.seriesDiscount=10;
  const r=calculateOrder(state);
  assert.equal(r.seriesDiscountValue,Math.round(r.priceBeforeSeriesDiscount*0.1));
  assert.equal(r.recommendedPrice,r.priceBeforeSeriesDiscount-r.seriesDiscountValue);
  assert.ok(r.recommendedPrice>=r.directCost);
  // строки сметы: рынок + корректировка − скидка за серию = итог за уборку
  assert.equal(r.marketPrice+r.economyTopup-r.seriesDiscountValue, r.recommendedPrice);
  // экстремальная скидка упирается в пол по прямым затратам
  state.form.seriesDiscount=95;
  const floored=calculateOrder(state);
  assert.equal(floored.recommendedPrice,floored.directCost);
});

test('скидка за серию игнорируется при одиночном заказе', () => {
  const state=makeState();
  state.form.seriesDiscount=50;
  const r=calculateOrder(state);
  assert.equal(r.seriesDiscountPercent,0);
  assert.equal(r.seriesDiscountValue,0);
});

test('принудительная скидка: рекомендованная цена не поднимается выше рынка', () => {
  const state=makeState();
  const withoutForce=calculateOrder(state);
  assert.equal(withoutForce.recommendedPrice,16563); // без флага цена поднята до целевой

  state.form.forceDiscount=true;
  const forced=calculateOrder(state);
  assert.equal(forced.recommendedPrice,10000); // с флагом остаётся на уровне рынка
  assert.equal(forced.forceDiscount,true);
  assert.equal(forced.economyTopup,0); // корректировки в смете больше нет
  assert.equal(forced.forcedBelowDirect,false);
  assert.equal(forced.forcedBelowFull,true); // рынок покрывает прямые затраты, но не полную себестоимость
  assert.equal(forced.forcedGapValue,forced.fullCost-forced.recommendedPrice);
});

test('принудительная скидка: явный убыток ниже прямых затрат помечается флагом', () => {
  const state=makeState();
  state.form.forceDiscount=true;
  state.form.discount=100; // рынок падает почти в ноль
  const r=calculateOrder(state);
  assert.equal(r.marketPrice,0);
  assert.equal(r.recommendedPrice,0);
  assert.equal(r.forcedBelowDirect,true);
  assert.equal(r.forcedLossValue,r.directCost);
});

test('принудительная скидка снимает пол по прямым затратам у скидки за серию', () => {
  const state=makeState();
  state.form.seriesCount=4;
  state.form.seriesDiscount=95;
  state.form.forceDiscount=true;
  const r=calculateOrder(state);
  assert.ok(r.recommendedPrice<r.directCost); // без forceDiscount такое невозможно (см. тест ниже)
  assert.equal(r.forcedBelowDirect,true);

  state.form.forceDiscount=false;
  const floored=calculateOrder(state);
  assert.equal(floored.recommendedPrice,floored.directCost); // обычный режим не даёт уйти в минус
});

test('налог с выручки закладывается в целевую цену и вычитается из прибыли', () => {
  const state=makeState();
  state.overhead={monthly:75000,jobsPerMonth:10,taxPercent:6};
  const r=calculateOrder(state);
  // целевая = 13250 * 1.25 / 0.94 = 17619.68 -> 17620
  assert.equal(r.targetPrice,17620);
  assert.equal(r.recommendedPrice,17620);
  assert.equal(r.taxValue,Math.round(17620*0.06));
  // чистая прибыль ~ 25% от полной себестоимости (с точностью до округления)
  assert.ok(Math.abs(r.netProfit-13250*0.25)<2);
});

test('рыночная прибыль и точка безубыточности учитывают налог с выручки', () => {
  const state=makeState({extras:[{id:1,name:'Разовая услуга',qty:1,price:5000,time:0}]});
  state.overhead={monthly:75000,jobsPerMonth:10,taxPercent:10};
  state.form.forceDiscount=true;
  state.form.discountMode='amount';
  state.form.discountAmount=1000; // рынок = 14000: себестоимость покрыта, налоговая точка ещё нет
  const r=calculateOrder(state);
  assert.equal(r.breakEvenPrice,14722); // 13250 / 0.9
  assert.equal(r.marketPrice,14000);
  assert.equal(r.marketTaxValue,1400);
  assert.equal(r.marketNetProfit,r.marketPrice-r.fullCost-r.marketTaxValue);
  assert.equal(r.forcedBelowBreakEven,true);
  assert.equal(r.forcedBreakEvenGapValue,r.breakEvenPrice-r.recommendedPrice);
});

test('налог 0 не меняет расчёт', () => {
  const r=calculateOrder(makeState());
  assert.equal(r.taxPercent,0);
  assert.equal(r.taxValue,0);
  assert.equal(r.targetPrice,16563);
});

test('seriesCount=1 (или отсутствует) не меняет расчёт', () => {
  const r=calculateOrder(makeState());
  assert.equal(r.seriesCount,1);
  assert.equal(r.overheadPerCleaning,r.overheadPerJob);
  assert.equal(r.fullCost,13250);
  assert.equal(r.recommendedPrice,r.singleRecommendedPrice);
  assert.equal(r.seriesSavingTotal,0);
});

test('стоимость выезда берётся из настроек travel', () => {
  const state=makeState({
    travel:{km15:{label:'До 15 км',base:2000,perKm:0},kad:{label:'КАД',base:0,perKm:0}}
  });
  state.form.travelType='km15';
  const result=calculateOrder(state);
  assert.equal(result.travelTotal,2000);
});
