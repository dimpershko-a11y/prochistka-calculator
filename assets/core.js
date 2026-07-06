(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.PROCHISTKA_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const num = value => Math.max(0, Number(value) || 0);
  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function getCleaningType(state, cleanType){
    return state.cleaningTypes && state.cleaningTypes[cleanType] ? state.cleaningTypes[cleanType] : null;
  }

  function getRateConf(state, form){
    const type = getCleaningType(state, form.cleanType);
    if(type){
      return {label:type.label, rate:type.rate, min:type.min, speed:type.speed, code:form.cleanType};
    }
    return state.baseRates?.[form.cleanType];
  }

  function getClutterCollection(state, form){
    const type = getCleaningType(state, form.cleanType);
    return (type && isRecord(type.clutter)) ? type.clutter : state.clutter;
  }

  function getDirtinessCollection(state, form){
    const type = getCleaningType(state, form.cleanType);
    return (type && isRecord(type.dirtiness)) ? type.dirtiness : state.dirtiness;
  }

  function calculateOrder(state){
    const form = state.form || {};
    const rate = getRateConf(state, form);
    const clutter = getClutterCollection(state, form)?.[form.clutter];
    const dirt = getDirtinessCollection(state, form)?.[form.dirtiness];
    if(!rate || !clutter || !dirt) throw new Error('Некорректные параметры тарифа');

    const area = num(form.area);
    const profitPercent = num(form.profitPercent);
    const discountPercent = Math.min(100, num(form.discount));
    const clutterPriceK = Number(clutter.priceK) || 1;
    const dirtPriceK = Number(dirt.priceK) || 1;
    const clutterTimeK = Number(clutter.timeK) || 1;
    const dirtTimeK = Number(dirt.timeK) || 1;
    const priceK = clutterPriceK * dirtPriceK;
    const timeK = clutterTimeK * dirtTimeK;
    // Все денежные величины округляются до рубля сразу в расчёте,
    // чтобы строки сметы всегда сходились с итогом копейка в копейку.
    const rub = value => Math.round(value);
    const baseNoK = rub(area * num(rate.rate));
    const baseAfterClutter = rub(baseNoK * clutterPriceK);
    const baseWithK = rub(baseAfterClutter * dirtPriceK);
    const minBase = rub(num(rate.min));
    const minBaseApplied = area > 0 && baseWithK < minBase;
    const baseRaw = area > 0 ? Math.max(baseWithK, minBase) : 0;
    const extras = Array.isArray(state.extras) ? state.extras : [];
    const extrasTotal = rub(extras.reduce((sum, item) => sum + num(item.qty) * num(item.price), 0));
    // Стоимость выезда берётся из настроек (state.travel), с запасным значением для старых копий.
    const DEFAULT_TRAVEL = {
      kad: {base: 0, perKm: 0},
      km15: {base: 1500, perKm: 0},
      km20plus: {base: 1500, perKm: 15}
    };
    const travelConf = (state.travel && state.travel[form.travelType]) || DEFAULT_TRAVEL[form.travelType] || {base: 0, perKm: 0};
    const travelBase = num(travelConf.base);
    const travelPerKm = num(travelConf.perKm);
    const travelTotal = rub(travelBase + (travelPerKm > 0 ? num(form.travelKm) * travelPerKm : 0));
    // Скидка считается от базовой стоимости уборки и доп. услуг. Выезд НЕ дисконтируется.
    const discountBase = baseRaw + extrasTotal;
    const discountValue = rub(form.discountMode === 'amount'
      ? Math.min(num(form.discountAmount), discountBase)
      : discountBase * (discountPercent / 100));
    const subtotal = baseRaw + extrasTotal + travelTotal;
    const marketPrice = Math.max(0, subtotal - discountValue);

    // --- Время и размер бригады (бригада выводится из нормо-часов и лимита часов в день) ---
    const baseHours = num(rate.speed) > 0 ? area / num(rate.speed) : 0;
    const extrasHours = extras.reduce((sum, item) => sum + num(item.qty) * num(item.time), 0);
    const normHours = (baseHours + extrasHours) * timeK;
    const labor = state.labor || {};
    const maxHoursPerDay = num(labor.maxHoursPerDay) || 9;
    const crewNeeded = normHours > 0 ? Math.max(1, Math.ceil(normHours / maxHoursPerDay)) : 0;
    const brigadeHours = crewNeeded > 0 ? normHours / crewNeeded : 0;

    // --- Себестоимость труда (дневные ставки + роль владельца на объекте) ---
    const cleanerDay = num(labor.cleanerDay) || 5000;
    const ownerManagerDay = num(labor.ownerManagerDay) || 5000;
    const ownerCleanerManagerDay = num(labor.ownerCleanerManagerDay) || 7000;
    const ownerRole = form.ownerRole || 'none';
    let hiredCleaners, ownerCost, peopleOnSite;
    if(crewNeeded === 0){
      hiredCleaners = 0; ownerCost = 0; peopleOnSite = 0;
    } else if(ownerRole === 'cleaner_manager'){
      hiredCleaners = Math.max(0, crewNeeded - 1);
      ownerCost = ownerCleanerManagerDay;
      peopleOnSite = crewNeeded;
    } else if(ownerRole === 'manager'){
      hiredCleaners = crewNeeded;
      ownerCost = ownerManagerDay;
      peopleOnSite = crewNeeded + 1;
    } else {
      hiredCleaners = crewNeeded;
      ownerCost = 0;
      peopleOnSite = crewNeeded;
    }
    const laborCost = rub(hiredCleaners * cleanerDay + ownerCost);

    // --- Материалы (расходники на м²) ---
    const materialPerM2 = num(state.materialPerM2 != null ? state.materialPerM2 : 15);
    const materialsCost = rub(area * materialPerM2);

    // --- Накладные на заказ (постоянные расходы в месяц / число заказов) ---
    const overhead = state.overhead || {};
    const overheadMonthly = num(overhead.monthly);
    const jobsPerMonth = num(overhead.jobsPerMonth);
    const overheadPerJob = jobsPerMonth > 0 ? rub(overheadMonthly / jobsPerMonth) : 0;

    // --- Серия уборок (абонемент): накладные одного заказа делятся на все уборки серии ---
    const seriesCount = Math.max(1, Math.round(num(form.seriesCount)) || 1);
    const seriesMonths = Math.max(1, Math.round(num(form.seriesMonths)) || 1);
    const overheadPerCleaning = rub(overheadPerJob / seriesCount);

    // --- Налог с выручки (УСН/НПД). Целевая цена закладывает налог, чтобы заданная прибыль оставалась чистой ---
    const taxPercent = Math.min(99, num(overhead.taxPercent));
    const taxK = 1 - taxPercent / 100;

    // --- Себестоимость и цены (за одну уборку) ---
    const directCost = laborCost + materialsCost;              // жёсткий пол: ниже = прямой убыток
    const fullCost = directCost + overheadPerCleaning;         // полная себестоимость одной уборки в серии
    const targetPrice = rub(fullCost * (1 + profitPercent / 100) / taxK); // целевая цена (наценка на полную себестоимость + налог)

    // --- Принудительная скидка: продаём строго по рыночной цене, без автоподъёма до себестоимости.
    // Оператор берёт риск убытка на себя; интерфейс показывает предупреждение.
    const forceDiscount = form.forceDiscount === true;
    const priceBeforeSeriesDiscount = forceDiscount ? marketPrice : Math.max(marketPrice, targetPrice, directCost);

    // --- Скидка за серию (абонемент): применяется к цене одной уборки, обычно не ниже прямых затрат ---
    const seriesDiscountPercent = seriesCount > 1 ? Math.min(100, num(form.seriesDiscount)) : 0;
    const seriesDiscountValue = seriesDiscountPercent > 0
      ? (forceDiscount
        ? rub(priceBeforeSeriesDiscount * seriesDiscountPercent / 100)
        : Math.min(rub(priceBeforeSeriesDiscount * seriesDiscountPercent / 100), Math.max(0, priceBeforeSeriesDiscount - directCost)))
      : 0;
    const recommendedPrice = priceBeforeSeriesDiscount - seriesDiscountValue;

    // --- Разовый заказ для сравнения (все накладные ложатся на одну уборку) ---
    const singleFullCost = directCost + overheadPerJob;
    const singleTargetPrice = rub(singleFullCost * (1 + profitPercent / 100) / taxK);
    const singleRecommendedPrice = Math.max(marketPrice, singleTargetPrice, directCost);
    const seriesTotal = recommendedPrice * seriesCount;
    const seriesSavingPerCleaning = Math.max(0, singleRecommendedPrice - recommendedPrice);
    const seriesSavingTotal = seriesSavingPerCleaning * seriesCount;

    const taxValue = rub(recommendedPrice * taxPercent / 100); // налог при рекомендованной цене
    const netProfit = recommendedPrice - fullCost - taxValue;  // факт. прибыль при рекомендованной цене (после налога)
    const marginPct = recommendedPrice > 0 ? (netProfit / recommendedPrice) * 100 : 0;
    const contribution = recommendedPrice - directCost;        // вклад в накладные + прибыль
    const marketNetProfit = marketPrice - fullCost;            // прибыль, если продать строго по рынку
    const belowDirect = area > 0 && marketPrice < directCost;
    const belowFull = area > 0 && marketPrice < fullCost;
    const economyGap = Math.max(0, fullCost - marketPrice);

    // --- Предупреждения для принудительной скидки: тут в убыток может уйти именно итоговая цена ---
    const forcedBelowDirect = forceDiscount && area > 0 && recommendedPrice < directCost;
    const forcedBelowFull = forceDiscount && area > 0 && !forcedBelowDirect && recommendedPrice < fullCost;
    const forcedLossValue = forcedBelowDirect ? rub(directCost - recommendedPrice) : 0;
    const forcedGapValue = forcedBelowFull ? rub(fullCost - recommendedPrice) : 0;

    const selectedExtras = extras.filter(item => num(item.qty) > 0);

    return {
      rate, clutter, dirt, clutterPriceK, dirtPriceK, clutterTimeK, dirtTimeK, priceK, timeK,
      baseNoK, baseAfterClutter, baseWithK, minBase, minBaseApplied, baseRaw,
      extrasTotal, travelTotal, travelBase, travelPerKm, subtotal,
      discountValue, discountBase, discountPercent, marketPrice,
      baseHours, extrasHours, normHours, brigadeHours, maxHoursPerDay,
      crewNeeded, hiredCleaners, peopleOnSite, ownerRole, ownerCost,
      cleanerDay, ownerManagerDay, ownerCleanerManagerDay,
      laborCost, materialPerM2, materialsCost, overheadMonthly, jobsPerMonth, overheadPerJob,
      taxPercent, taxValue,
      seriesCount, seriesMonths, overheadPerCleaning,
      seriesDiscountPercent, seriesDiscountValue, priceBeforeSeriesDiscount,
      singleFullCost, singleTargetPrice, singleRecommendedPrice,
      seriesTotal, seriesSavingPerCleaning, seriesSavingTotal,
      directCost, fullCost, profitPercent, targetPrice, recommendedPrice,
      netProfit, marginPct, contribution, marketNetProfit, belowDirect, belowFull, economyGap,
      forceDiscount, forcedBelowDirect, forcedBelowFull, forcedLossValue, forcedGapValue,
      selectedExtras,
      // алиасы для обратной совместимости со старым кодом отображения
      payroll: laborCost,
      costBasedPrice: fullCost,
      directCostFloor: directCost,
      breakEvenNoProfit: directCost,
      targetProfitValue: targetPrice - fullCost,
      // Корректировка в смете считается до скидки за серию: рынок + корректировка − скидка за серию = итог.
      economyTopup: Math.max(0, priceBeforeSeriesDiscount - marketPrice),
      priceBeforeDiscount: Math.max(subtotal, targetPrice),
      maxAllowedDiscount: subtotal > 0 ? Math.max(0, Math.min(100, (1 - fullCost / subtotal) * 100)) : 0
    };
  }

  function validateOrder(state){
    const errors = [];
    const form = state.form || {};
    if(num(form.area) <= 0) errors.push('Укажите площадь больше 0 м².');
    const rateConf = getRateConf(state, form);
    const clutterCollection = getClutterCollection(state, form) || {};
    const dirtinessCollection = getDirtinessCollection(state, form) || {};
    if(!rateConf) errors.push('Выберите корректный тип уборки.');
    if(!hasOwn(clutterCollection, form.clutter)) errors.push('Выберите корректную заставленность.');
    if(!hasOwn(dirtinessCollection, form.dirtiness)) errors.push('Выберите корректную загрязнённость.');
    const travelKeys = state.travel ? Object.keys(state.travel) : ['kad', 'km15', 'km20plus'];
    if(!travelKeys.includes(form.travelType)) errors.push('Выберите корректный тип выезда.');
    if(form.discountMode && !['percent', 'amount'].includes(form.discountMode)) errors.push('Выберите корректный режим скидки.');
    if(form.ownerRole && !['none', 'manager', 'cleaner_manager'].includes(form.ownerRole)) errors.push('Выберите корректную роль на объекте.');
    return errors;
  }

  function validateBackup(data, defaults){
    const payload = isRecord(data) && hasOwn(data, 'state') ? data.state : data;
    if(!isRecord(payload)) return {ok:false, error:'Файл резервной копии должен содержать объект state.'};
    if(isRecord(data) && data.type && data.type !== 'prochistka_full_backup'){
      return {ok:false, error:'Выбран файл другого типа.'};
    }
    const form = isRecord(payload.form) ? payload.form : {};
    const cleanTypes = isRecord(payload.cleaningTypes) ? payload.cleaningTypes : (isRecord(defaults.cleaningTypes) ? defaults.cleaningTypes : null);
    const activeType = cleanTypes && form.cleanType ? cleanTypes[form.cleanType] : null;
    const baseRates = isRecord(payload.baseRates) ? payload.baseRates : defaults.baseRates;
    const clutter = activeType && isRecord(activeType.clutter) ? activeType.clutter : (isRecord(payload.clutter) ? payload.clutter : defaults.clutter);
    const dirtiness = activeType && isRecord(activeType.dirtiness) ? activeType.dirtiness : (isRecord(payload.dirtiness) ? payload.dirtiness : defaults.dirtiness);
    const checks = [
      [form.cleanType, cleanTypes || baseRates, 'тип уборки'],
      [form.clutter, clutter, 'заставленность'],
      [form.dirtiness, dirtiness, 'загрязнённость']
    ];
    for(const [key, collection, label] of checks){
      if(key !== undefined && !hasOwn(collection, key)){
        return {ok:false, error:`Резервная копия содержит неизвестное значение: ${label}.`};
      }
    }
    if(payload.extras !== undefined && !Array.isArray(payload.extras)){
      return {ok:false, error:'Список дополнительных услуг повреждён.'};
    }
    if(payload.savedOrders !== undefined && !Array.isArray(payload.savedOrders)){
      return {ok:false, error:'Список заказов повреждён.'};
    }
    return {ok:true, state:payload};
  }

  return {calculateOrder, validateOrder, validateBackup, num, isRecord};
});
