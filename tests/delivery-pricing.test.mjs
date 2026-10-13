import {test} from 'node:test';
import assert from 'node:assert/strict';
import {priceCatalog,priceRecord,retailPrice,validateDeliveryPolicy,defaultDeliveryPolicy} from '../commerce/delivery-pricing.mjs';
const policy={...defaultDeliveryPolicy,active:true};
test('normal legacy allowance is removed once and quantities charge per unit',()=>{
 const p=priceRecord({id:'lamp',priceCents:7999},policy);assert.equal(p.basePriceCents,6999);assert.equal(p.priceCents,7499);assert.equal(priceRecord(p,policy).priceCents,7499);assert.equal(p.priceCents*2,14998);
});
test('accessory exceptions do not lose a nonexistent ten dollar allowance',()=>{
 const p=priceRecord({id:'topper',priceCents:1499,pickupPriceDifferenceCents:0,shippingFeeCents:500},policy);assert.equal(p.priceCents,1999);assert.equal(p.shippingFeeCents,0);
});
test('changing the global allowance preserves the base and explicit extra',()=>{
 const p=priceRecord({priceCents:2999,deliveryExtraCents:400},policy);assert.equal(p.priceCents,2899);assert.equal(priceRecord(p,{...policy,defaultAllowanceCents:700}).priceCents,3099);
});
test('grouped listing and size prices follow actual children',()=>{
 const items=[{id:'group',priceCents:2999,variants:[{id:'small',priceCents:2999},{id:'large',priceCents:3999}]},{id:'small',priceCents:2999},{id:'large',priceCents:3999,deliveryExtraCents:500}];
 const next=priceCatalog(items,policy,{small:3499});assert.equal(next[0].priceCents,2999);assert.equal(next[0].variants[0].priceCents,2999);assert.equal(next[0].variants[1].priceCents,3999);
});
test('bad amounts, negative migrated bases and invalid rewards are blocked',()=>{
 assert.throws(()=>retailPrice(1.5,0,policy));assert.throws(()=>priceRecord({priceCents:300},policy));assert.throws(()=>validateDeliveryPolicy({...policy,pickupRewardPercent:99}));
});
