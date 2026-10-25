import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryDefaults,validateInventorySettings,inventoryUnits,initialQuantity,readInventory,setAvailable,addAvailable,enforceStockPolicy,inventoryConnection,publicStock} from '../commerce/inventory.mjs';
import {assertStockQuantities,stockLimit} from '../commerce/stock-limits.mjs';
import {managedVariantInput} from '../commerce/managed-product-input.mjs';
import {initializePublishedInventory} from '../commerce/inventory-publish.mjs';
const row={sku:'mask-small',variantId:'gid://shopify/ProductVariant/1',shopifyProductId:'gid://shopify/Product/1',inventoryItemId:'gid://shopify/InventoryItem/1',tracked:true,policy:'DENY',available:3,status:'ACTIVE',otherAvailable:0};
test('defaults are per stock unit with a separately counted ten-pack exception',()=>{
 const defaults=inventoryDefaults();assert.equal(initialQuantity('lamp',defaults),3);assert.equal(initialQuantity('mini-safari-animal-figurines-mix-pack-10',defaults),20);
 assert.equal(initialQuantity('lamp',{...defaults,defaultQuantity:7}),7);assert.equal(defaults.enabled,false);
 assert.throws(()=>validateInventorySettings({...defaults,defaultQuantity:1.5}),/whole numbers/);
 assert.throws(()=>validateInventorySettings({...defaults,overrides:{lamp:-1}}),/exceptions/);
});
test('group covers and variant child records do not duplicate their stock',()=>{
 const units=inventoryUnits([{id:'group',groupedDesigns:[{id:'mask'}]},{id:'mask',name:'Mask',listingGroup:'group',variants:[{id:'mask-small',label:'Small'},{id:'mask-large',label:'Large'}]},{id:'mask-small',variantOf:'mask'},{id:'preview',launchReady:false}]);
 assert.deepEqual(units.map(u=>u.sku),['mask-small','mask-large']);assert.equal(units[0].listingId,'group');
 assert.throws(()=>inventoryUnits([{id:'x'},{id:'x'}]),/Duplicate/);
});
test('Shopify reads validate exact SKU mapping and preserve unavailable/missing states',async()=>{
 const admin={call:async()=>({productVariants:{nodes:[{id:row.variantId,sku:row.sku,inventoryPolicy:'DENY',inventoryQuantity:3,product:{id:row.shopifyProductId,handle:'mask',status:'ACTIVE'},inventoryItem:{id:row.inventoryItemId,tracked:true,inventoryLevel:{id:'level',quantities:[{name:'available',quantity:3},{name:'committed',quantity:2},{name:'on_hand',quantity:5}]}}}],pageInfo:{hasNextPage:false}}})};
 const rows=await readInventory(admin,[{sku:row.sku,handle:'mask'},{sku:'missing',handle:'missing'}],'gid://shopify/Location/1');assert.equal(rows[0].available,3);assert.equal(rows[0].committed,2);assert.equal(rows[0].otherAvailable,0);assert.equal(rows[1].missing,true);
 await assert.rejects(()=>readInventory(admin,[{sku:row.sku,handle:'different'}],'gid://shopify/Location/1'),/mismatch/);
});
test('absolute corrections use API 2026-07 compare-and-swap and idempotency',async()=>{
 let sent;const admin={call:async(q,v)=>{sent={q,v};return {inventorySetQuantities:{userErrors:[]}};}};
 await setAvailable(admin,row,'gid://shopify/Location/1',5,3,'stable-key');assert.match(sent.q,/@idempotent/);assert.equal(sent.v.key,'stable-key');assert.deepEqual(sent.v.input.quantities,[{inventoryItemId:row.inventoryItemId,locationId:'gid://shopify/Location/1',quantity:5,changeFromQuantity:3}]);
 await assert.rejects(()=>setAvailable(admin,row,'loc',5,null,'key'),/Refresh/);
 const stale={call:async()=>({inventorySetQuantities:{userErrors:[{code:'CHANGE_FROM_QUANTITY_STALE',message:'Quantity changed'}]}})};await assert.rejects(()=>setAvailable(stale,row,'loc',5,3,'key'),/Quantity changed/);
});
test('replenishment adds a delta rather than overwriting concurrent sales',async()=>{
 let sent;const admin={call:async(q,v)=>{sent={q,v};return {inventoryAdjustQuantities:{userErrors:[]}};}};await addAvailable(admin,row,'loc',3,'stable-key');assert.match(sent.q,/@idempotent/);assert.equal(sent.v.input.changes[0].delta,3);assert.equal(sent.v.input.name,'available');await assert.rejects(()=>addAvailable(admin,row,'loc',0,'key'),/addition/);
});
test('policy enforcement does not reset any quantity',async()=>{
 const calls=[];const admin={call:async(q,v)=>{calls.push({q,v});return q.includes('TrackStudioStock')?{inventoryItemUpdate:{userErrors:[]}}:{productVariantsBulkUpdate:{userErrors:[]}};}};
 await enforceStockPolicy(admin,{...row,tracked:false,policy:'CONTINUE'});assert.equal(calls.length,2);assert.equal(calls[1].v.variants[0].inventoryPolicy,'DENY');assert.ok(calls.every(c=>!c.q.includes('inventorySetQuantities')&&!c.q.includes('inventoryAdjustQuantities')));
 await enforceStockPolicy(admin,row);assert.equal(calls.length,2);
});
test('stock only exposes confirmed tracked quantities and blocks other-location stock',()=>{
 const stock=publicStock([row,{...row,sku:'zero',available:0},{...row,sku:'untracked',tracked:false},{...row,sku:'other',otherAvailable:2},{sku:'missing',missing:true}]);assert.equal(stock['mask-small'].available,3);assert.equal(stock.zero.sellable,false);assert.equal(stock.untracked.unknown,true);assert.equal(stock.other.unknown,true);assert.equal(stock.missing.unknown,true);assert.equal(stockLimit(stock,true,'missing'),0);
});
test('separate personalization lines share one inventory limit',()=>{
 const stock=publicStock([row]),skuFor=()=>row.sku;
 assert.doesNotThrow(()=>assertStockQuantities([{id:'a',quantity:1},{id:'b',quantity:2}],stock,true,skuFor));
 assert.throws(()=>assertStockQuantities([{id:'a',quantity:2},{id:'b',quantity:2}],stock,true,skuFor),/Only 3/);
 assert.throws(()=>assertStockQuantities([{id:'a',quantity:1}],{},true,skuFor),/could not be confirmed/);
 assert.throws(()=>assertStockQuantities([{id:'a',quantity:1}],publicStock([{...row,available:0}]),true,skuFor),/sold out/);
 assert.doesNotThrow(()=>assertStockQuantities([{id:'a',quantity:1}],{},false,skuFor));
});
test('inventory connection asks only for missing stock permissions',async()=>{
 const admin={call:async()=>({currentAppInstallation:{accessScopes:[{handle:'read_products'}]}})};assert.deepEqual((await inventoryConnection(admin)).missing,['read_inventory','write_inventory','read_locations']);
});
test('new managed products are tracked and cannot oversell even before stock initialization',()=>{
 const input=managedVariantInput({id:'lamp',priceCents:7999,unifiedFulfillment:true},0);assert.equal(input.variants[0].inventoryItem.tracked,true);assert.equal(input.variants[0].inventoryPolicy,'DENY');
});
test('publication initializes once and never replenishes stock after a sale or retry',async()=>{
 const records=new Map([['settings',{enabled:true,locationId:'gid://shopify/Location/1',defaultQuantity:3,overrides:{}}]]);
 const store={get:async k=>structuredClone(records.get(k)),getWithMetadata:async k=>records.has(k)?{data:structuredClone(records.get(k)),etag:'current'}:null,setJSON:async(k,value,options)=>{if(options?.onlyIfNew&&records.has(k))return {modified:false};records.set(k,structuredClone(value));return {modified:true};}};
 let available=0,tracked=true,policy='DENY',sets=0;const applied=new Set();
 const admin={call:async(q,v)=>{
  if(q.includes('query StudioStock'))return {productVariants:{nodes:[{id:row.variantId,sku:'lamp',inventoryPolicy:policy,inventoryQuantity:available,product:{id:row.shopifyProductId,handle:'lamp',status:'DRAFT'},inventoryItem:{id:row.inventoryItemId,tracked,inventoryLevel:{id:'level',quantities:[{name:'available',quantity:available},{name:'committed',quantity:0}]}}}],pageInfo:{hasNextPage:false}}};
  if(q.includes('SetStudioStock')){sets++;if(!applied.has(v.key)){assert.equal(v.input.quantities[0].changeFromQuantity,available);available=v.input.quantities[0].quantity;applied.add(v.key);}return {inventorySetQuantities:{userErrors:[]}};}
  throw Error('Unexpected inventory operation');
 }};
 await initializePublishedInventory(admin,{id:'lamp',name:'Lamp'},{store});assert.equal(available,3);assert.equal(sets,1);
 available=2;await initializePublishedInventory(admin,{id:'lamp',name:'Lamp'},{store});assert.equal(available,2);assert.equal(sets,1);
 // Simulate losing the final receipt after Shopify accepted the request. Same key must replay safely.
 const opKey=[...records.keys()].find(k=>k.startsWith('operations/'));const op=records.get(opKey);records.set(opKey,{...op,status:'pending'});
 await initializePublishedInventory(admin,{id:'lamp',name:'Lamp'},{store});assert.equal(available,2);assert.equal(sets,2);
});
