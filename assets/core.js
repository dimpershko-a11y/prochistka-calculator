(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.PROCHISTKA_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const num = value => Math.max(0, Number(value) || 0);
  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function calculateOrder(state){
    const form = state.form || {};
    const rate = state.baseRates?.[form.cleanType];
    const clutter = state.clutter?.[form.clutter];
    const dirt = state.dirtiness?.[form.dirtiness];
    if(!rate || !clutter || !dirt) throw new Error('Некорректные параметры тарифа');

    const area = num(form.area);
    const workers = num(form.workers);
    const workerPay = num(form.workerPay);
    const profitPercent = num(form.profitPercent);
    const discount = Math.min(100, num(form.discount));
    const clutterPriceK = Number(clutter.priceK) || 1;
    const dirtPriceK = Number(dirt.priceK) || 1;
    const clutterTimeK = Number(clutter.timeK) || 1;
    const dirtTimeK = Number(dirt.timeK) || 1;
    const priceK = clutterPriceK * dirtPriceK;
    const timeK = clutterTimeK * dirtTimeK;
    const baseNoK = area * num(rate.rate);
    const baseAfterClutter = baseNoK * clutterPriceK;
    const baseWithK = baseAfterClutter * dirtPriceK;
    const minBase = num(rate.min);
    const minBaseApplied = area > 0 && baseWithK < minBase;
    const baseRaw = area > 0 ? Math.max(baseWithK, minBase) : 0;
    const extras = Array.isArray(state.extras) ? state.extras : [];
    const extrasTotal = extras.reduce((sum, item) => sum + num(item.qty) * num(item.price), 0);
    const travelTotal = form.travelType === 'km20plus'
      ? 1500 + num(form.travelKm) * 15
      : (form.travelType === 'km15' ? 1500 : 0);
    const subtotal = baseRaw + extrasTotal + travelTotal;
    const discountValue = subtotal * (discount / 100);
    const marketPrice = Math.max(0, subtotal - discountValue);
    const baseHours = num(rate.speed) > 0 ? area / num(rate.speed) : 0;
    const extrasHours = extras.reduce((sum, item) => sum + num(item.qty) * num(item.time), 0);
    const normHours = (baseHours + extrasHours) * timeK;
    const brigadeHours = workers > 0 ? normHours / workers : normHours;
    const payroll = form.payMode === 'hourly'
      ? workers * workerPay * brigadeHours
      : workers * workerPay;
    const targetProfitValue = payroll * (profitPercent / 100);
    const costBasedPrice = payroll + travelTotal + extrasTotal + targetProfitValue;
    const directCostFloor = payroll + travelTotal + extrasTotal;
    const priceBeforeDiscount = Math.max(subtotal, costBasedPrice);
    const recommendedPrice = Math.max(priceBeforeDiscount - discountValue, directCostFloor);
    const selectedExtras = extras.filter(item => num(item.qty) > 0);
    const economyGap = Math.max(0, costBasedPrice - marketPrice);
    const economyTopup = Math.max(0, recommendedPrice - marketPrice);
    const maxAllowedDiscount = subtotal > 0
      ? Math.max(0, Math.min(100, (1 - costBasedPrice / subtotal) * 100))
      : 0;
    const breakEvenNoProfit = payroll + travelTotal + extrasTotal;

    return {
      rate, clutter, dirt, clutterPriceK, dirtPriceK, clutterTimeK, dirtTimeK,
      priceK, timeK, baseNoK, baseAfterClutter, baseWithK, minBase, minBaseApplied,
      baseRaw, extrasTotal, travelTotal, subtotal, discountValue, marketPrice,
      payroll, targetProfitValue, costBasedPrice, directCostFloor, breakEvenNoProfit,
      priceBeforeDiscount, recommendedPrice, economyGap, economyTopup,
      maxAllowedDiscount, baseHours, extrasHours, normHours, brigadeHours, selectedExtras
    };
  }

  function validateOrder(state){
    const errors = [];
    const form = state.form || {};
    if(num(form.area) <= 0) errors.push('Укажите площадь больше 0 м².');
    if(!hasOwn(state.baseRates, form.cleanType)) errors.push('Выберите корректный тип уборки.');
    if(!hasOwn(state.clutter, form.clutter)) errors.push('Выберите корректную заставленность.');
    if(!hasOwn(state.dirtiness, form.dirtiness)) errors.push('Выберите корректную загрязнённость.');
    if(!['kad', 'km15', 'km20plus'].includes(form.travelType)) errors.push('Выберите корректный тип выезда.');
    if(!['fixed', 'hourly'].includes(form.payMode)) errors.push('Выберите корректный способ оплаты сотрудников.');
    if(num(form.workers) <= 0) errors.push('Укажите количество сотрудников.');
    if(num(form.workerPay) <= 0) errors.push('Укажите оплату одного сотрудника.');
    return errors;
  }

  function validateBackup(data, defaults){
    const payload = isRecord(data) && hasOwn(data, 'state') ? data.state : data;
    if(!isRecord(payload)) return {ok:false, error:'Файл резервной копии должен содержать объект state.'};
    if(isRecord(data) && data.type && data.type !== 'prochistka_full_backup'){
      return {ok:false, error:'Выбран файл другого типа.'};
    }
    const form = isRecord(payload.form) ? payload.form : {};
    const baseRates = isRecord(payload.baseRates) ? payload.baseRates : defaults.baseRates;
    const clutter = isRecord(payload.clutter) ? payload.clutter : defaults.clutter;
    const dirtiness = isRecord(payload.dirtiness) ? payload.dirtiness : defaults.dirtiness;
    const checks = [
      [form.cleanType, baseRates, 'тип уборки'],
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
