import {test} from 'node:test';
import assert from 'node:assert/strict';
import {priceCatalog,priceRecord,retailPrice,validateDeliveryPolicy,defaultDeliveryPolicy} from '../commerce/delivery-pricing.mjs';
import {validateDocument} from '../commerce/catalog-management.mjs';
import {applyDeliveryGroup,installDeliveryCatalog} from '../commerce/delivery-sync.mjs';
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
test('new admin prices are derived server-side and option fields survive validation',()=>{
 const doc={id:'lamp',template:'size',products:[{id:'lamp',name:'Lamp',category:'Decor',priceCents:99999,basePriceCents:2000,deliveryExtraCents:200,pricingSchemaVersion:2,images:[],variants:[{id:'small',label:'Small',dimensions:'',priceCents:99999,basePriceCents:1000,deliveryExtraCents:0,pricingSchemaVersion:2}]}]};
 const result=validateDocument(doc,{policy});assert.equal(result.products[0].priceCents,1500);assert.equal(result.products[0].variants[0].priceCents,1500);assert.equal(result.pickupPriceDifferenceCents,0);
});
test('resuming a partly updated group verifies equal prices and assigns both fulfillment profiles',async()=>{
 const group={id:'lamp',handle:'lamp',productId:'p1',old:[{id:'delivery',sku:'lamp',oldPrice:'29.99'},{id:'pickup',sku:'lamp-pickup',oldPrice:'19.99'}],updates:[{id:'delivery',price:'24.99',compareAtPrice:null},{id:'pickup',price:'24.99',compareAtPrice:null}]};
 const nodes=[{id:'delivery',sku:'lamp',price:'24.99'},{id:'pickup',sku:'lamp-pickup',price:'24.99'}],profiles=[];
 const admin={call:async(q,v)=>{if(q.includes('ManagedProduct'))return{productByIdentifier:{id:'p1',variants:{nodes}}};if(q.includes('DeliveryPrices'))return{productVariantsBulkUpdate:{userErrors:[]}};profiles.push(v);return{deliveryProfileUpdate:{userErrors:[]}};}};
 await applyDeliveryGroup(admin,group,{deliveryProfileId:'delivery-profile',pickupProfileId:'pickup-profile'});assert.deepEqual(profiles.map(p=>p.profile.variantsToAssociate),[['delivery'],['pickup']]);
 nodes[0].price='23.00';await assert.rejects(()=>applyDeliveryGroup(admin,group,{}),/edited in Shopify/);
});
test('install preserves archived documents and customer-independent drafts',()=>{
 const p={id:'lamp',priceCents:2999,images:[]};const state={revision:7,documents:{archived:{id:'archived',products:[{id:'archived',priceCents:4000}]}},drafts:{lamp:{id:'lamp',products:[{...p,priceCents:3499}]}},collections:[],archived:['archived']};
 installDeliveryCatalog(state,{products:priceCatalog([p],policy),policy});assert.equal(state.documents.archived.products[0].priceCents,4000);assert.equal(state.drafts.lamp.products[0].priceCents,2999);assert.equal(state.revision,8);
});
