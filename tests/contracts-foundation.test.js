const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assets/core.js');
const base={
  form:{area:70,cleanType:'general',clutter:'low',dirtiness:'low',cleanStartTime:'09:30'},
  cleaningTypes:{general:{rate:300,min:12000,speed:10,clutter:{low:{priceK:1,timeK:1}},dirtiness:{low:{priceK:1,timeK:1}}}},
  extras:[],travel:{kad:{base:0,perKm:0}},labor:{},overhead:{},pricing:{}
};
function clone(x){return JSON.parse(JSON.stringify(x));}
test('valid contract start time is allowed',()=>assert.equal(core.validateOrder(clone(base)).length,0));
test('invalid contract start time is blocked',()=>{
 const x=clone(base);x.form.cleanStartTime='25:88';
 assert.match(core.validateOrder(x).join(' '),/Время начала/);
});
test('unbounded area is rejected before saving',()=>{
 const x=clone(base);x.form.area=1e308;
 assert.match(core.validateOrder(x).join(' '),/Некорректная площадь/);
});
test('huge quantities in extras are rejected',()=>{
 const x=clone(base);x.extras=[{id:1,qty:1e308,price:200}];
 assert.match(core.validateOrder(x).join(' '),/допуслуги/);
});
test('malformed backup area is rejected before state migration',()=>{
 const x={type:'prochistka_full_backup',state:{form:{area:1e308},extras:[],savedOrders:[]}};
 assert.equal(core.validateBackup(x).ok,false);
});
test('backup preserves new start-time field',()=>{
 const x={type:'prochistka_full_backup',state:{form:{area:70,cleanStartTime:'09:30'},extras:[],savedOrders:[]}};
 assert.equal(core.validateBackup(x).ok,true);
});
