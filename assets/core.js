(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.PROCHISTKA_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const num = value => Math.max(0, Number(value) || 0);
  const rub = value => Math.round(value);
  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const cleanType = (state, key) => state.cleaningTypes?.[key] || state.baseRates?.[key] || null;

  function travelCost(state, form, active){
    const fallback = {kad:{base:0, perKm:0}, outsideKad:{base:1700, perKm:40, includedKm:15}};
    const legacyKey = form.outsideKad === true ? 'outsideKad' : (form.travelType === 'km15' ? 'outsideKad' : form.travelType === 'km20plus' ? 'outsideKad' : form.travelType);
    const conf = state.travel?.[legacyKey] || fallback[legacyKey] || {};
    if(!active) return {base:0, perKm:0, includedKm:0, total:0};
    const base = num(conf.base), perKm = num(conf.perKm), includedKm = num(conf.includedKm);
    return {base, perKm, includedKm, total:rub(base + Math.max(0, num(form.travelKm) - includedKm) * perKm)};
  }

  function maintenanceLabor(state, normHours, form){
    const crew = Math.max(1, Math.round(num(form.maintenanceCrewSize)) || 1);
    const hoursPerPerson = normHours / crew;
    const slots = Array.isArray(state.labor?.maintenanceSlots) && state.labor.maintenanceSlots.length
      ? state.labor.maintenanceSlots : [
        {maxHours:3, pay:3500}, {maxHours:5, pay:4000},
        {maxHours:7, pay:4500}, {maxHours:10, pay:5000}
      ];
    const sorted = slots.slice().sort((a,b)=>num(a.maxHours)-num(b.maxHours));
    const slot = sorted.find(item=>hoursPerPerson<=num(item.maxHours)) || sorted[sorted.length-1];
    const payPerPerson = num(slot?.pay);
    return {crewNeeded:crew, peopleOnSite:crew, hiredCleaners:crew, ownerCost:0, hoursPerPerson, payPerPerson, laborCost:rub(payPerPerson * crew)};
  }

  function calculateOrder(state){
    const form = state.form || {};
    const rate = cleanType(state, form.cleanType);
    const clutter = (rate?.clutter || state.clutter || {})[form.clutter];
    const dirt = (rate?.dirtiness || state.dirtiness || {})[form.dirtiness];
    if(!rate || !clutter || !dirt) throw new Error('Некорректные параметры тарифа');

    const area = num(form.area), extrasOnly = form.cleanType === 'extras_only';
    const clutterPriceK = Number(clutter.priceK) || 1, dirtPriceK = Number(dirt.priceK) || 1;
    const clutterTimeK = Number(clutter.timeK) || 1, dirtTimeK = Number(dirt.timeK) || 1;
    const baseNoK = rub(area * num(rate.rate));
    const baseAfterClutter = rub(baseNoK * clutterPriceK);
    const baseWithK = rub(baseAfterClutter * dirtPriceK);
    const selectedExtras = (Array.isArray(state.extras) ? state.extras : []).filter(item=>num(item.qty)>0 && (!extrasOnly || item.availableSeparately===true));
    const active = area > 0 || (extrasOnly && selectedExtras.length > 0);
    const extrasTotal = active ? rub(selectedExtras.reduce((sum,item)=>sum + num(item.qty)*num(item.price), 0)) : 0;
    const minimumExtrasTotal = active ? rub(selectedExtras.filter(item=>item.countsTowardMinimum === true).reduce((sum,item)=>sum + num(item.qty)*num(item.price), 0)) : 0;
    const minBase = extrasOnly ? 0 : rub(num(rate.min));
    const minimumAdjustment = active ? Math.max(0, minBase - baseWithK - minimumExtrasTotal) : 0;
    const minBaseApplied = minimumAdjustment > 0;
    const baseRaw = baseWithK + minimumAdjustment;
    const workSubtotal = baseWithK + extrasTotal;
    const cleaningTotal = workSubtotal + minimumAdjustment;
    const travel = travelCost(state, form, active);
    const discountBase = cleaningTotal;
    const discountPercent = Math.min(100, num(form.discount));
    const discountValue = rub(form.discountMode === 'amount'
      ? Math.min(num(form.discountAmount), discountBase)
      : discountBase * discountPercent / 100);
    const oneoffPrice = Math.max(0, cleaningTotal + travel.total - discountValue);
    const isMaintenance = form.cleanType === 'maintenance';
    const subscription = isMaintenance && form.maintenanceFormat === 'subscription';
    const frequency = [2,4,8].includes(Number(form.maintenanceFrequency)) ? Number(form.maintenanceFrequency) : 4;
    const term = [3,6,12].includes(Number(form.maintenanceTerm)) ? Number(form.maintenanceTerm) : 6;
    const discounts = state.subscriptionDiscounts || {2:{3:.08,6:.10,12:.12},4:{3:.10,6:.12,12:.14},8:{3:.12,6:.14,12:.15}};
    const subscriptionDiscount = num(discounts[frequency]?.[term]);
    const visitPrice = Math.max(rub(oneoffPrice*(1-subscriptionDiscount)), 5400);
    const totalVisits = frequency*term;
    const marketPrice = subscription ? visitPrice*totalVisits : oneoffPrice;

    const baseHours = !extrasOnly && active && num(rate.speed)>0 ? area / num(rate.speed) : 0;
    const extrasHours = active ? selectedExtras.reduce((sum,item)=>sum + num(item.qty)*num(item.time), 0) : 0;
    const normHours = (baseHours + extrasHours) * clutterTimeK * dirtTimeK;
    let crewNeeded, hiredCleaners, peopleOnSite, ownerCost, laborCost, brigadeHours, maintenancePayPerPerson=0, hoursPerPerson=0;
    if(isMaintenance){
      const labor = maintenanceLabor(state, normHours, form);
      ({crewNeeded,hiredCleaners,peopleOnSite,ownerCost,laborCost,hoursPerPerson}=labor);
      maintenancePayPerPerson=labor.payPerPerson; brigadeHours=hoursPerPerson;
    } else {
      const labor = state.labor || {}, maxHoursPerDay=num(labor.maxHoursPerDay)||9;
      crewNeeded = normHours>0 ? Math.max(1, Math.ceil(normHours/maxHoursPerDay)) : 0;
      brigadeHours = crewNeeded ? normHours/crewNeeded : 0;
      const ownerRole=form.ownerRole || 'none';
      if(!crewNeeded){ hiredCleaners=0; ownerCost=0; peopleOnSite=0; }
      else if(ownerRole==='cleaner_manager'){ hiredCleaners=Math.max(0,crewNeeded-1); ownerCost=num(labor.ownerCleanerManagerDay)||7000; peopleOnSite=crewNeeded; }
      else if(ownerRole==='manager'){ hiredCleaners=crewNeeded; ownerCost=num(labor.ownerManagerDay)||5000; peopleOnSite=crewNeeded+1; }
      else { hiredCleaners=crewNeeded; ownerCost=0; peopleOnSite=crewNeeded; }
      laborCost=rub(hiredCleaners*(num(labor.cleanerDay)||5000)+ownerCost);
    }
    const materialsCost=rub(area*num(state.materialPerM2));
    const overhead=state.overhead || {};
    const fixedOverhead=isMaintenance ? num(overhead.maintenanceFixedPerVisit) : num(overhead.fixedPerOrder);
    const overheadPerM2=isMaintenance ? num(overhead.maintenancePerM2) : num(overhead.perM2);
    const overheadPerCleaning=active ? rub(fixedOverhead + area*overheadPerM2) : 0;
    const directCost=laborCost+materialsCost, fullCost=directCost+overheadPerCleaning;
    const taxPercent=Math.min(99,num(overhead.taxPercent)), taxK=1-taxPercent/100;
    const profitPercent=num(state.pricing?.profitPercent ?? form.profitPercent);
    const targetPrice=rub(fullCost*(1+profitPercent/100)/taxK);
    const taxValue=rub(marketPrice*taxPercent/100), netProfit=marketPrice-fullCost-taxValue;
    const costGap=Math.max(0, fullCost-marketPrice);

    return {
      rate, clutter, dirt, clutterPriceK, dirtPriceK, clutterTimeK, dirtTimeK,
      baseNoK, baseAfterClutter, baseWithK, baseRaw, minBase, minBaseApplied, minimumAdjustment, minimumExtrasTotal,
      extrasTotal, selectedExtras, workSubtotal, cleaningTotal, travelTotal:travel.total, travelBase:travel.base, travelPerKm:travel.perKm, travelIncludedKm:travel.includedKm,
      discountBase, discountPercent, discountValue, marketPrice, recommendedPrice:marketPrice,
      subscription, frequency, term, totalVisits, subscriptionDiscount, oneoffPrice, visitPrice, subscriptionTotal:visitPrice*totalVisits,
      baseHours, extrasHours, normHours, brigadeHours, crewNeeded, hiredCleaners, peopleOnSite, ownerRole:form.ownerRole||'none', ownerCost,
      laborCost, maintenancePayPerPerson, hoursPerPerson, materialsCost, materialPerM2:num(state.materialPerM2),
      fixedOverhead, overheadPerM2, overheadPerCleaning, directCost, fullCost, profitPercent, targetPrice,
      taxPercent, taxValue, netProfit, marginPct:marketPrice ? netProfit/marketPrice*100 : 0,
      belowDirect:active && marketPrice<directCost, belowFull:active && marketPrice<fullCost, costGap,
      economyTopup:0, forceDiscount:false, seriesCount:1, seriesMonths:1, seriesDiscountPercent:0, seriesDiscountValue:0,
      singleRecommendedPrice:marketPrice, seriesTotal:marketPrice, seriesSavingPerCleaning:0, seriesSavingTotal:0
    };
  }

  function validateOrder(state){
    const form=state.form||{}, errors=[];
    if(num(form.area)<=0 && !(form.cleanType==='extras_only' && (state.extras||[]).some(item=>num(item.qty)>0 && item.availableSeparately===true))) errors.push('Укажите площадь больше 0 м² или выберите доп. услугу.');
    const rate=cleanType(state,form.cleanType), clutter=(rate?.clutter||state.clutter||{}), dirt=(rate?.dirtiness||state.dirtiness||{});
    if(!rate) errors.push('Выберите корректный тип уборки.');
    if(!hasOwn(clutter,form.clutter)) errors.push('Выберите корректную заставленность.');
    if(!hasOwn(dirt,form.dirtiness)) errors.push('Выберите корректную загрязнённость.');
    return errors;
  }
  function validateBackup(data, _defaults){
    const payload=isRecord(data)&&hasOwn(data,'state')?data.state:data;
    if(!isRecord(payload)) return {ok:false,error:'Файл резервной копии должен содержать объект state.'};
    if(isRecord(data)&&data.type&&data.type!=='prochistka_full_backup') return {ok:false,error:'Выбран файл другого типа.'};
    if(payload.extras!==undefined&&!Array.isArray(payload.extras)) return {ok:false,error:'Список дополнительных услуг повреждён.'};
    if(payload.savedOrders!==undefined&&!Array.isArray(payload.savedOrders)) return {ok:false,error:'Список заказов повреждён.'};
    return {ok:true,state:payload};
  }
  return {calculateOrder, validateOrder, validateBackup, num, isRecord};
});
