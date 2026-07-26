const test = require('node:test');
const assert = require('node:assert/strict');
const {calculateOrder, validateOrder} = require('../assets/core.js');

function makeState(overrides={}){
  return {
    cleaningTypes:{
      general:{label:'Генеральная',rate:300,min:12000,speed:10,clutter:{normal:{label:'Обычная',priceK:1,timeK:1}},dirtiness:{normal:{label:'Обычная',priceK:1,timeK:1}}},
      maintenance:{label:'Поддерживающая',rate:120,min:6500,speed:20,clutter:{normal:{label:'Обычная',priceK:1,timeK:1}},dirtiness:{normal:{label:'Обычная',priceK:1,timeK:1}}}
    },
    extras:[], travel:{kad:{label:'КАД',base:0,perKm:0},outsideKad:{label:'За КАД',base:1700,perKm:40,includedKm:15}},
    labor:{cleanerDay:5000,ownerManagerDay:5000,ownerCleanerManagerDay:7000,maxHoursPerDay:9,maintenanceSlots:[{maxHours:3,pay:3500},{maxHours:5,pay:4000},{maxHours:7,pay:4500},{maxHours:10,pay:5000}]},
    materialPerM2:15, overhead:{fixedPerOrder:2500,perM2:0,maintenanceFixedPerVisit:1000,maintenancePerM2:10,taxPercent:0}, pricing:{profitPercent:25},
    form:{area:50,cleanType:'general',clutter:'normal',dirtiness:'normal',discount:0,discountMode:'percent',travelType:'kad',travelKm:0,ownerRole:'none',maintenanceCrewSize:1},
    ...overrides
  };
}

test('минимум учитывает только отмеченные допуслуги',()=>{
  const state=makeState({extras:[{id:1,qty:1,price:3000,time:0,countsTowardMinimum:true},{id:2,qty:1,price:1000,time:0,countsTowardMinimum:false}]});
  state.form.area=20; // 6000 + 3000 + 1000, минимум 12000
  const r=calculateOrder(state);
  assert.equal(r.minimumAdjustment,3000);
  assert.equal(r.recommendedPrice,13000);
});

test('выезд за КАД: до 15 км — 1700, далее 40 рублей за км сверх лимита',()=>{
  const state=makeState(); state.form.travelType='outsideKad';
  state.form.travelKm=15; assert.equal(calculateOrder(state).travelTotal,1700);
  state.form.travelKm=16; assert.equal(calculateOrder(state).travelTotal,1740);
  state.form.travelKm=30; assert.equal(calculateOrder(state).travelTotal,2300);
});

test('поддерживающая уборка выбирает слот оплаты по часам на одного сотрудника',()=>{
  const state=makeState();
  state.form={...state.form,cleanType:'maintenance',area:160,maintenanceCrewSize:2}; // 4 часа на человека
  const r=calculateOrder(state);
  assert.equal(r.hoursPerPerson,4);
  assert.equal(r.maintenancePayPerPerson,4000);
  assert.equal(r.laborCost,8000);
});

test('себестоимость не поднимает цену автоматически',()=>{
  const state=makeState({overhead:{fixedPerOrder:20000,perM2:0,taxPercent:0}}); state.form.area=50;
  const r=calculateOrder(state);
  assert.equal(r.recommendedPrice,r.marketPrice);
  assert.ok(r.fullCost>r.recommendedPrice);
  assert.equal(r.costGap,r.fullCost-r.recommendedPrice);
});

test('строки цены всегда складываются в итог',()=>{
  const state=makeState({extras:[{id:1,qty:2,price:500,time:0,countsTowardMinimum:true}]});
  state.form={...state.form,area:30,travelType:'outsideKad',travelKm:16,discount:10};
  const r=calculateOrder(state);
  assert.equal(r.baseWithK+r.extrasTotal+r.minimumAdjustment+r.travelTotal-r.discountValue,r.recommendedPrice);
});

test('менеджер-клинер входит в состав бригады',()=>{
  const state=makeState(); state.form={...state.form,ownerRole:'cleaner_manager'};
  const r=calculateOrder(state);
  assert.equal(r.peopleOnSite,r.crewNeeded);
  assert.equal(r.hiredCleaners+1,r.crewNeeded);
});

test('заказ только допуслуг печатается без площади',()=>{
  const state=makeState({extras:[{id:1,qty:1,price:500,time:0,availableSeparately:true}]});
  state.form={...state.form,area:0,cleanType:'extras_only',clutter:'normal',dirtiness:'normal',travelType:'устаревшее значение'};
  state.cleaningTypes.extras_only={label:'Только доп. услуги',rate:0,min:0,speed:1,clutter:{normal:{label:'—',priceK:1,timeK:1}},dirtiness:{normal:{label:'—',priceK:1,timeK:1}}};
  assert.deepEqual(validateOrder(state),[]);
});

test('недоступная отдельно услуга не попадает в заказ без основной уборки',()=>{
  const state=makeState({extras:[{id:1,qty:1,price:500,time:0,availableSeparately:false}]});
  state.form={...state.form,area:0,cleanType:'extras_only',clutter:'normal',dirtiness:'normal'};
  state.cleaningTypes.extras_only={label:'Только доп. услуги',rate:0,min:0,speed:1,clutter:{normal:{label:'—',priceK:1,timeK:1}},dirtiness:{normal:{label:'—',priceK:1,timeK:1}}};
  assert.equal(calculateOrder(state).extrasTotal,0);
  assert.equal(calculateOrder(state).selectedExtras.length,0);
  assert.equal(validateOrder(state).length,1);
});

test('недоступная отдельно услуга остаётся допуслугой обычной уборки',()=>{
  const state=makeState({extras:[{id:1,qty:1,price:500,time:0,availableSeparately:false}]});
  assert.equal(calculateOrder(state).extrasTotal,500);
});
