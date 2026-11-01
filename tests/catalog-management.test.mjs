import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDocument as validateDocumentImpl,compileCatalog,seedDocuments,safeMediaUrl} from '../commerce/catalog-management.mjs';
import {sessionCookie,requestAdminKey,requireAdmin} from '../commerce/admin-session.mjs';
import {syncDocument as syncDocumentImpl,withdrawDocument,hasDocumentPricingChange} from '../commerce/catalog-shopify.mjs';
import {finalizePublicCatalog} from '../commerce/public-catalog.mjs';
const validateDocument=(input,options={})=>validateDocumentImpl(input,{...options,policy:{active:false}});
const syncDocument=(admin,doc,config={},expected={},previousDoc=null)=>syncDocumentImpl(admin,doc,{...config,pricingPolicy:{active:false}},expected,previousDoc);
const product=(id='test-product')=>({id,name:'Test product',priceCents:2500,category:'Decor',description:'A desk decoration.',included:'One decoration; props excluded.',dimensions:'85 mm',notes:'Keep away from heat.',images:[{src:'/media/shop/test/1.webp',thumb:'/media/shop/test/1.webp',alt:'Test decoration'}],pickupPriceDifferenceCents:1000});
const document=()=>({id:'test-product',template:'single',products:[product()],categoryIds:['decor'],pickupPriceDifferenceCents:1000,fulfillmentConfirmed:true});
test('drafts accept missing buyer details but publishing rejects them',()=>{
  const d=document();d.products[0].name='';d.products[0].images=[];
  assert.equal(validateDocument(d).products[0].name,'');assert.throws(()=>validateDocument(d,{publish:true}),/Before publishing/);
});
test('integer cents, positive pickup prices and launch blockers are enforced',()=>{
  const d=document();d.products[0].priceCents=24.99;assert.throws(()=>validateDocument(d),/valid CAD/);
  d.products[0].priceCents=999;assert.throws(()=>validateDocument(d),/reduction/);
  d.products[0].priceCents=2500;d.products[0].launchReady=false;assert.throws(()=>validateDocument(d,{publish:true}),/launch/);
});
test('private customer uploads and arbitrary media origins cannot become public marketing photos',()=>{
  assert.equal(safeMediaUrl('/.netlify/functions/shop-media?id=private'),false);
  assert.equal(safeMediaUrl('https://evil.example/photo.png'),false);
  assert.equal(safeMediaUrl('https://cdn.shopify.com/s/files/photo.png'),true);
  assert.equal(safeMediaUrl('https://cdn.shopify.com.evil.example/photo.png'),false);
});
test('compiling changed listings preserves unrelated products and categories',()=>{
  const base=[product(),product('other')],cats=[{id:'decor',products:['test-product','other'],coverProduct:'test-product'}];
  const d=document();d.products[0].name='Renamed';
  const result=compileCatalog(base,cats,[d]);assert.equal(result.products.find(p=>p.id==='test-product').name,'Renamed');assert.equal(result.products.find(p=>p.id==='other').name,'Test product');
  assert.equal(base[0].name,'Test product');assert.equal(cats[0].products.length,2);
});
test('archiving a collection removes its children and options; restoration is reversible',()=>{
  const root={...product('group'),groupedDesigns:[{id:'design',label:'Design',optionIds:['design-small']}],variants:[{id:'design-small',label:'Small',priceCents:2500,dimensions:'85 mm'}]};
  const child={...product('design'),listingGroup:'group'},option={...product('design-small'),variantOf:'design'};
  const result=compileCatalog([root,child,option],[],[],['group']);assert.equal(result.products.length,0);
  assert.equal(compileCatalog([root,child,option],[],[],[]).products.length,3);
});
test('removing one design updates collection options without mutating seed data',()=>{
  const root={...product('group'),groupedDesigns:[{id:'a',label:'A',optionIds:['a']},{id:'b',label:'B',optionIds:['b']}],variants:[{id:'a',label:'A',priceCents:2500},{id:'b',label:'B',priceCents:3000}]};
  const base=[root,{...product('a'),listingGroup:'group'},{...product('b'),listingGroup:'group'}];
  const result=compileCatalog(base,[],[],['a']);assert.deepEqual(result.products[0].groupedDesigns.map(d=>d.id),['b']);assert.equal(result.products[0].priceCents,3000);assert.equal(base[0].groupedDesigns.length,2);
});
test('seed documents include nested size variants of grouped designs',()=>{
  const base=[product('group'),{...product('design'),listingGroup:'group'},{...product('small'),variantOf:'design'}];
  assert.equal(seedDocuments(base,[])[0].products.length,3);
});
test('signed admin sessions are HttpOnly, expire and reject tampering',()=>{
  const key='a'.repeat(40),now=1800000000000;
  const cookie=sessionCookie(key,now);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  const request=new Request('https://custombuildstudio.ca/.netlify/functions/shop',{headers:{cookie}});
  assert.equal(requestAdminKey(request,key,now),key);assert.equal(requestAdminKey(request,key,now+9*3600000),'');
  assert.equal(requestAdminKey(new Request(request,{headers:{cookie:cookie.replace(/\.([A-Za-z0-9_-])/,'.z')}}),key,now),'');
});
test('admin writes require both authentication and same origin',()=>{
  process.env.SHOP_ADMIN_KEY='b'.repeat(40);
  assert.throws(()=>requireAdmin(new Request('https://custombuildstudio.ca/.netlify/functions/shop-catalog',{method:'POST',headers:{origin:'https://evil.example',authorization:'Bearer '+process.env.SHOP_ADMIN_KEY}})),/origin/);
  assert.throws(()=>requireAdmin(new Request('https://custombuildstudio.ca/.netlify/functions/shop-catalog',{method:'POST',headers:{origin:'https://custombuildstudio.ca'}})),/unlock/);
});
test('Shopify price changes use existing SKU IDs and verify delivery/pickup amounts',async()=>{
  const calls=[];let lookup=0;const variants=[{id:'gid://shopify/ProductVariant/1',sku:'test-product',price:'25.00'},{id:'gid://shopify/ProductVariant/2',sku:'test-product-pickup',price:'15.00'}];
  const admin={call:async(query,variables)=>{calls.push({query,variables});if(query.includes('query ManagedProduct')){lookup++;return{productByIdentifier:{id:'gid://shopify/Product/1',status:'ACTIVE',updatedAt:'today',variants:{nodes:variants}}};}if(query.includes('ManagedDetails'))return{productUpdate:{userErrors:[]}};if(query.includes('ManagedPrices'))return{productVariantsBulkUpdate:{userErrors:[]}};throw new Error('Unexpected operation');}};
  await syncDocument(admin,document(),{},{});assert.equal(lookup,2);
  const update=calls.find(c=>c.query.includes('ManagedPrices'));assert.equal(update.variables.variants[0].price,'25.00');assert.equal(update.variables.variants[1].price,'15.00');
  assert.equal(calls.some(c=>c.query.includes('productSet')),false);
});
test('existing Shopify sales and stale changes block publishing',async()=>{
  const admin={call:async()=>({productByIdentifier:{updatedAt:'new',variants:{nodes:[{sku:'test-product',price:'20',compareAtPrice:'25'}]}}})};
  await assert.rejects(()=>syncDocument(admin,document(),{},{}),/End the sale/);
  await assert.rejects(()=>syncDocument(admin,document(),{},{'test-product':'old'}),/changed in Shopify/);
});
test('withdrawal targets the configured website publication instead of deleting Shopify products',async()=>{
  const calls=[];const admin={call:async(q,v)=>{calls.push({q,v});return q.includes('query ManagedProduct')?{productByIdentifier:{id:'gid://shopify/Product/1'}}:{publishableUnpublish:{userErrors:[]}};}};
  await withdrawDocument(admin,document(),'gid://shopify/Publication/1');assert.equal(calls[1].v.input[0].publicationId,'gid://shopify/Publication/1');assert.equal(calls.some(c=>c.q.includes('productDelete')),false);
});

test('a partially created draft resumes shipping and publication without creating another product',async()=>{
  const calls=[];let reads=0;const variants=[{id:'gid://shopify/ProductVariant/1',sku:'test-product',price:'25.00'},{id:'gid://shopify/ProductVariant/2',sku:'test-product-pickup',price:'15.00'}];
  const admin={call:async(q,v)=>{calls.push({q,v});if(q.includes('query ManagedProduct'))return{productByIdentifier:{id:'gid://shopify/Product/1',status:++reads===1?'DRAFT':'ACTIVE',updatedAt:'now',variants:{nodes:variants}}};if(q.includes('ManagedShipping'))return{deliveryProfileUpdate:{userErrors:[]}};if(q.includes('PublishManaged'))return{publishablePublish:{userErrors:[]}};if(q.includes('ManagedPrices'))return{productVariantsBulkUpdate:{userErrors:[]}};return{productUpdate:{userErrors:[]}};}};
  await syncDocument(admin,document(),{publicationId:'gid://shopify/Publication/1',deliveryProfileId:'gid://shopify/DeliveryProfile/1',pickupProfileId:'gid://shopify/DeliveryProfile/2'});
  assert.equal(calls.filter(c=>c.q.includes('ManagedShipping')).length,2);assert.equal(calls.some(c=>c.q.includes('PublishManaged')),true);assert.equal(calls.some(c=>c.q.includes('productSet')),false);
});
test('uploaded images and video are associated with the existing Shopify product',async()=>{
  const d=document();d.products[0].images[0].mediaId='gid://shopify/MediaImage/10';d.products[0].videoMediaId='gid://shopify/Video/11';let attached;
  const variants=[{id:'gid://shopify/ProductVariant/1',sku:'test-product',price:'25.00'},{id:'gid://shopify/ProductVariant/2',sku:'test-product-pickup',price:'15.00'}];
  const admin={call:async(q,v)=>{if(q.includes('query ManagedProduct'))return{productByIdentifier:{id:'gid://shopify/Product/1',status:'ACTIVE',updatedAt:'now',variants:{nodes:variants}}};if(q.includes('AttachManagedMedia')){attached=v.files;return{fileUpdate:{userErrors:[]}};}if(q.includes('ManagedPrices'))return{productVariantsBulkUpdate:{userErrors:[]}};return{productUpdate:{userErrors:[]}};}};
  await syncDocument(admin,d,{});assert.equal(attached.length,2);assert.equal(attached[1].id,'gid://shopify/Video/11');assert.deepEqual(attached[1].referencesToAdd,['gid://shopify/Product/1']);
});
test('absolute private photo URLs are excluded from public product media',()=>{assert.equal(safeMediaUrl('https://custombuildstudio.ca/.netlify/functions/shop-media?id=private'),false);});

test('baseline collections add Christmas while preserving archive and explicit membership edits',async()=>{
 const {mergeCollectionsWithBaseline}=await import('../commerce/catalog-management.mjs');
 const state=[{id:'seasonal',name:'Owner title',products:['existing']},...Array.from({length:14},(_,i)=>({id:`old-${i}`,products:[]}))];
 const base=[{id:'seasonal',products:['existing','new-tree','grumpy-kitty-planter','owner-moved']},{id:'christmas',products:['new-tree','grumpy-kitty-planter']}];
 const merged=mergeCollectionsWithBaseline(state,base,[{id:'owner-moved'}],['grumpy-kitty-planter']);
 assert.equal(merged.length,16);assert.equal(merged[0].name,'Owner title');
 assert.deepEqual(merged[0].products,['existing','new-tree']);
 assert.deepEqual(merged.find(c=>c.id==='christmas').products,['new-tree']);
 assert.deepEqual(state[0].products,['existing']);
});

test('Christmas season refreshes stale Halloween coverProduct and copy on seasonal collection',async()=>{
 const {mergeCollectionsWithBaseline}=await import('../commerce/catalog-management.mjs');
 const state=[
   {id:'seasonal',coverProduct:'pumpkin-head-halloween-mask',description:'Explore finished Halloween masks and spooky ghosts.',seoDescription:'Shop Halloween masks.',products:['pumpkin-head-halloween-mask','figurine-fidget-designs']},
   {id:'gifts-under-25',coverProduct:'mood-ghost',products:['mini-safari-animal-figurines','mood-ghost']},
 ];
 const base=[
   {id:'seasonal',coverProduct:'endless-swirling-tree',description:'Holiday warmth crafted in Edmonton.',seoDescription:'Shop Canadian-made Christmas gifts.',products:['endless-swirling-tree','christmas-angel','figurine-fidget-designs','pumpkin-head-halloween-mask']},
   {id:'gifts-under-25',coverProduct:'mini-safari-animal-figurines',products:['mini-safari-animal-figurines','mood-ghost']},
 ];
 const merged=mergeCollectionsWithBaseline(state,base,[],[],{activeSeason:'christmas',hideOffSeasonProducts:true});
 assert.equal(merged[0].coverProduct,'endless-swirling-tree');
 assert.equal(merged[0].description,'Holiday warmth crafted in Edmonton.');
 assert.equal(merged[0].seoDescription,'Shop Canadian-made Christmas gifts.');
 assert.deepEqual(merged[0].products,['endless-swirling-tree','christmas-angel','figurine-fidget-designs','pumpkin-head-halloween-mask']);
 assert.equal(merged[1].coverProduct,'mini-safari-animal-figurines');
});

test('hasDocumentPricingChange distinguishes description/SEO edits from price or shipping changes',()=>{
  const prev=document();
  const textEdited=structuredClone(prev);
  textEdited.products[0].description='Updated handcrafted description.';
  textEdited.products[0].seoTitle='Custom SEO Title';
  textEdited.products[0].seoEdited=true;
  assert.equal(hasDocumentPricingChange(textEdited,prev),false);

  const priceEdited=structuredClone(prev);
  priceEdited.products[0].priceCents=2900;
  assert.equal(hasDocumentPricingChange(priceEdited,prev),true);

  const shippingEdited=structuredClone(prev);
  shippingEdited.products[0].shippingPriceMode='per-order';
  assert.equal(hasDocumentPricingChange(shippingEdited,prev),true);
});

test('content-only syncDocument fast path skips price/shipping mutations and succeeds during active sales',async()=>{
  const prev={...document(),_fromPublishedState:true};
  const next=structuredClone(prev);
  next.products[0].description='Brand new description visible right away.';
  const calls=[];
  let lookups=0;
  const admin={
    call:async(query,variables)=>{
      calls.push({query,variables});
      if(query.includes('query ManagedProduct')){
        lookups++;
        return {
          productByIdentifier:{
            id:'gid://shopify/Product/1',
            status:'ACTIVE',
            updatedAt:'2026-11-01T10:00:00Z',
            variants:{nodes:[
              {id:'gid://shopify/ProductVariant/1',sku:'test-product',price:'20.00',compareAtPrice:'25.00'},
              {id:'gid://shopify/ProductVariant/2',sku:'test-product-pickup',price:'12.00',compareAtPrice:'15.00'},
            ]},
          },
        };
      }
      if(query.includes('ManagedDetails')){
        return {productUpdate:{product:{id:'gid://shopify/Product/1',updatedAt:'2026-11-01T10:01:00Z'},userErrors:[]}};
      }
      throw new Error('Unexpected GraphQL call in content-only fast path: '+query);
    },
  };
  const results=await syncDocument(admin,next,{},{'test-product':'2026-11-01T10:00:00Z'},prev);
  assert.equal(lookups,1);
  assert.equal(calls.some(c=>c.query.includes('ManagedPrices')),false);
  assert.equal(calls.some(c=>c.query.includes('ManagedShipping')),false);
  assert.equal(results[0].updatedAt,'2026-11-01T10:01:00Z');

  // Price edits must still be blocked during an active sale
  const priceChanged=structuredClone(prev);
  priceChanged.products[0].priceCents=3000;
  await assert.rejects(()=>syncDocument(admin,priceChanged,{},{'test-product':'2026-11-01T10:00:00Z'},prev),/End the sale/);
});

test('grouped listing syncDocument skips unchanged sibling designs when previousDoc is from published state',async()=>{
  const root={...product('group'),groupedDesigns:[{id:'design-a',label:'A',optionIds:['design-a']},{id:'design-b',label:'B',optionIds:['design-b']}],variants:[{id:'design-a',label:'A',priceCents:2500,dimensions:'85 mm'},{id:'design-b',label:'B',priceCents:2500,dimensions:'85 mm'}]};
  const prev={id:'group',template:'design',products:[root,{...product('design-a'),listingGroup:'group'},{...product('design-b'),listingGroup:'group'}],categoryIds:['decor'],pickupPriceDifferenceCents:1000,fulfillmentConfirmed:true,_fromPublishedState:true};
  const next=structuredClone(prev);
  next.products.find(p=>p.id==='design-b').description='Edited only Design B description.';
  const touchedHandles=[];
  const admin={
    call:async(query,variables)=>{
      if(query.includes('query ManagedProduct')){
        touchedHandles.push(variables.handle);
        return {productByIdentifier:{id:`gid://shopify/Product/${variables.handle}`,status:'ACTIVE',updatedAt:'t1',variants:{nodes:[{id:'gid://shopify/ProductVariant/1',sku:variables.handle,price:'25.00'},{id:'gid://shopify/ProductVariant/2',sku:`${variables.handle}-pickup`,price:'15.00'}]}}};
      }
      if(query.includes('ManagedDetails')){
        return {productUpdate:{product:{id:'gid://shopify/Product/design-b',updatedAt:'t2'},userErrors:[]}};
      }
      throw new Error('Unexpected query: '+query);
    },
  };
  const results=await syncDocument(admin,next,{},{'design-a':'t1','design-b':'t1'},prev);
  assert.deepEqual(touchedHandles,['design-b']);
  assert.equal(results.find(r=>r.id==='design-a').updatedAt,'t1');
  assert.equal(results.find(r=>r.id==='design-b').updatedAt,'t2');
});

test('finalizePublicCatalog preserves edited descriptions and seoEdited while excluding archived and unready items',()=>{
  const baseProd1={...product('item-live'),seoTitle:'Baseline SEO Title',seoDescription:'Baseline longer SEO description for search engines.'};
  const baseProd2={...product('item-custom-seo'),seoTitle:'Baseline SEO 2',seoDescription:'Baseline longer SEO description 2 for search engines.'};
  const baseProd3={...product('item-archived')};
  const baseline={
    products:[baseProd1,baseProd2,baseProd3],
    collections:[{id:'decor',name:'Decor',kind:'department',description:'Decor items',seoDescription:'Decor SEO',coverProduct:'item-live',products:['item-live','item-custom-seo','item-archived']}],
  };
  const rawSnapshot={
    revision:52,
    products:[
      {...baseProd1,description:'Owner updated live description right from Admin!'},
      {...baseProd2,seoTitle:'Owner Custom SEO Title',seoDescription:'Short custom meta',seoEdited:true},
      {...product('item-unready'),launchReady:false},
    ],
    collections:structuredClone(baseline.collections),
    rows:[],
  };
  const finalized=finalizePublicCatalog(rawSnapshot,baseline,['item-archived'],{validate:false});
  assert.equal(finalized.revision,52);
  assert.equal(finalized.products.some(p=>p.id==='item-archived'),false);
  assert.equal(finalized.products.some(p=>p.id==='item-unready'),false);
  assert.equal(finalized.products.find(p=>p.id==='item-live').description,'Owner updated live description right from Admin!');
  assert.equal(finalized.products.find(p=>p.id==='item-custom-seo').seoTitle,'Owner Custom SEO Title');
  assert.equal(finalized.products.find(p=>p.id==='item-custom-seo').seoDescription,'Short custom meta');
});
