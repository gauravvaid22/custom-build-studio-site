export const defaultDeliveryPolicy = {
  version: 2, active: false, defaultAllowanceCents: 500,
  pickupRewardEnabled: true, pickupRewardPercent: 10, pickupRegion: 'South Edmonton',
  rewardExpiryDays: 90,
};
export function validateDeliveryPolicy(input) {
  const value = {...defaultDeliveryPolicy, ...input};
  if (!Number.isSafeInteger(value.defaultAllowanceCents) || value.defaultAllowanceCents < 0 || value.defaultAllowanceCents > 10000) throw new Error('Use a delivery allowance between CAD0 and CAD100.');
  if (!Number.isInteger(value.pickupRewardPercent) || value.pickupRewardPercent < 1 || value.pickupRewardPercent > 50) throw new Error('Use a pickup reward between 1% and 50%.');
  if (!Number.isInteger(value.rewardExpiryDays) || value.rewardExpiryDays < 1 || value.rewardExpiryDays > 365) throw new Error('Use a reward expiry of 1–365 days.');
  const pickupRegion = String(value.pickupRegion || '').trim().slice(0,80);
  if (!pickupRegion) throw new Error('Enter a public pickup area.');
  return {version:2,active:value.active===true,defaultAllowanceCents:value.defaultAllowanceCents,pickupRewardEnabled:value.pickupRewardEnabled===true,pickupRewardPercent:value.pickupRewardPercent,pickupRegion,rewardExpiryDays:value.rewardExpiryDays};
}
export function retailPrice(base, extra, policy) {
  if (![base,extra].every(v=>Number.isSafeInteger(v) && v>=0)) throw new Error('Base price and additional allowance must be non-negative CAD amounts.');
  const result=base+extra+policy.defaultAllowanceCents;
  if (result<100 || result>1000000) throw new Error('Final prices must be between CAD1 and CAD10,000.');
  return result;
}
export function priceRecord(record, policy, livePrice = record.priceCents) {
  const p=structuredClone(record);
  // Legacy accessory sets explicitly use zero; never subtract the normal $10 from them.
  p.basePriceCents = p.pricingSchemaVersion===2 ? p.basePriceCents : livePrice-(p.pickupPriceDifferenceCents ?? 1000);
  p.deliveryExtraCents = p.deliveryExtraCents ?? 0;
  p.priceCents=retailPrice(p.basePriceCents,p.deliveryExtraCents,policy);
  p.pricingSchemaVersion=2;p.pickupPriceDifferenceCents=0;p.shippingFeeCents=0;
  return p;
}
export function priceCatalog(products, policy, livePrices={}) {
  const result=products.map(p=>priceRecord(p,policy,livePrices[p.id] ?? p.priceCents));
  const byId=new Map(result.map(p=>[p.id,p]));
  for (const p of result) if(p.variants?.length) {
    p.variants=p.variants.map(v=>{
      const child=byId.get(v.id);
      if(child) return {...v,basePriceCents:child.basePriceCents,deliveryExtraCents:child.deliveryExtraCents,pricingSchemaVersion:2,priceCents:child.priceCents};
      return priceRecord({...v,pickupPriceDifferenceCents:products.find(x=>x.id===p.id)?.pickupPriceDifferenceCents},policy,livePrices[v.id] ?? v.priceCents);
    });
    p.priceCents=Math.min(...p.variants.map(v=>v.priceCents));
  }
  return result;
}
