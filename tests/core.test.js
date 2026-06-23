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
  // целевая = 13250 * 1.25 = 16562.5
  assert.equal(result.targetPrice,16562.5);
  // рынок 10000 < целевой -> рекомендуем целевую
  assert.equal(result.marketPrice,10000);
  assert.equal(result.recommendedPrice,16562.5);
  // маржа при наценке 25% ~ 20%
  assert.ok(Math.abs(result.marginPct-20)<0.001);
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


test('принудительная скидка отключает защитный подъём до себестоимости', () => {
  const state=makeState();
  state.form.discount=100;
  state.form.forceDiscount=true;
  const result=calculateOrder(state);
  assert.equal(result.marketPrice,0);
  assert.equal(result.recommendedPrice,0);
  assert.equal(result.forceDiscount,true);
  assert.equal(result.economyTopup,0);
  assert.equal(result.belowDirect,true);
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

test('стоимость выезда берётся из настроек travel', () => {
  const state=makeState({
    travel:{km15:{label:'До 15 км',base:2000,perKm:0},kad:{label:'КАД',base:0,perKm:0}}
  });
  state.form.travelType='km15';
  const result=calculateOrder(state);
  assert.equal(result.travelTotal,2000);
});
