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
 assert.match(core.validateOrder(x).join(' '),/время прибытия/i);
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

test('hourly arrival windows are valid including midnight crossover',()=>{
 for(const time of ['00:00–01:00','09:00–10:00','14:00–15:00','23:00–00:00']){
  const x=clone(base);x.form.cleanStartTime=time;
  assert.equal(core.validateOrder(x).length,0,time);
  assert.equal(core.isValidArrivalTime(time),true);
 }
});
test('invalid arrival slot lengths and values are rejected',()=>{
 for(const value of ['09:00–11:00','09:30–10:30','23:00–24:00','25:00–26:00','bad']){
  const x=clone(base);x.form.cleanStartTime=value;
  assert.match(core.validateOrder(x).join(' '),/время прибытия/i,value);
  assert.equal(core.isValidArrivalTime(value),false);
 }
});
test('backup accepts hourly arrival window and preserves legacy exact time',()=>{
 for(const value of ['09:00–10:00','23:00–00:00','09:30']){
  const x={type:'prochistka_full_backup',state:{form:{area:70,cleanStartTime:value},extras:[],savedOrders:[]}};
  assert.equal(core.validateBackup(x).ok,true,value);
 }
});
test('backup rejects invalid arrival window',()=>{
 const x={type:'prochistka_full_backup',state:{form:{area:70,cleanStartTime:'09:00–11:00'},extras:[],savedOrders:[]}};
 assert.equal(core.validateBackup(x).ok,false);
});
