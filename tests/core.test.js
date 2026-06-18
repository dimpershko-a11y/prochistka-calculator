const test = require('node:test');
const assert = require('node:assert/strict');
const {calculateOrder, validateOrder, validateBackup} = require('../assets/core.js');

function makeState(overrides = {}){
  return {
    baseRates:{general:{label:'Генеральная',rate:200,min:9000,speed:10}},
    clutter:{low:{label:'Минимальная',priceK:1,timeK:1}},
    dirtiness:{low:{label:'Обычная',priceK:1,timeK:1}},
    extras:[],
    form:{
      area:50,cleanType:'general',clutter:'low',dirtiness:'low',
      discount:0,travelType:'kad',travelKm:0,workers:2,
      payMode:'fixed',workerPay:3000,profitPercent:20
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

test('почасовая оплата учитывает состав бригады и время', () => {
  const state=makeState();
  state.form.payMode='hourly';
  state.form.workerPay=500;
  const result=calculateOrder(state);
  assert.equal(result.normHours,5);
  assert.equal(result.brigadeHours,2.5);
  assert.equal(result.payroll,2500);
});

test('скидка не опускает цену ниже прямых затрат', () => {
  const state=makeState();
  state.form.discount=100;
  const result=calculateOrder(state);
  assert.equal(result.recommendedPrice,result.directCostFloor);
});

test('валидация требует площадь, сотрудников и оплату', () => {
  const state=makeState();
  state.form.area=0;
  state.form.workers=0;
  state.form.workerPay=0;
  assert.equal(validateOrder(state).length,3);
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
