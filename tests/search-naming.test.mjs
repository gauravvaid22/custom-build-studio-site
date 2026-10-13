import {test} from 'node:test';
import assert from 'node:assert/strict';
import products from '../commerce/products.json' with {type:'json'};
import collections from '../commerce/collections.json' with {type:'json'};
import {prepareSearchNaming,syncSearchNames} from '../commerce/search-naming.mjs';
import {brandedSearchTitle} from '../commerce/product-search.mjs';
import {merchantFeed} from '../commerce/search-discovery.mjs';

test('naming keeps all IDs, prices, packs, media URLs and gallery membership; reruns preserve owner edits',()=>{
  const result=prepareSearchNaming({products,collections}).catalog;
  const financial=p=>({id:p.id,price:p.priceCents,base:p.basePriceCents,fee:p.shippingFeeCents,extra:p.deliveryExtraCents,handle:p.shopifyHandle,group:p.listingGroup,owner:p.variantOf,packs:p.bundleOffers,options:p.variants?.map(v=>({id:v.id,price:v.priceCents,dimensions:v.dimensions})),gallery:p.images.map(i=>i.src),video:p.video,designs:p.groupedDesigns?.map(d=>({id:d.id,optionIds:d.optionIds}))});
  assert.deepEqual(result.products.map(financial),products.map(financial));
  assert.equal(result.products.find(p=>p.id==='lithophane-table-lamp').name,'Personalized Photo Lamp — Wooden Base');
  assert.equal(result.products.find(p=>p.id==='up-in-the-clouds-photo-frame').name,'Airplane & Clouds Personalized Photo Holder');
  assert.deepEqual(prepareSearchNaming(result).catalog,result);
  result.products[0].name='Owner custom name';
  assert.equal(prepareSearchNaming(result).catalog.products[0].name,'Owner custom name');
});
test('search titles add the brand once and Merchant feed uses structured titles for AI names',()=>{
  assert.equal(brandedSearchTitle({name:'Lamp',seoTitle:'Photo Lamp | Custom Build Studio'}),'Photo Lamp | Custom Build Studio');
  const p={id:'lamp',name:'Personalized Photo Lamp',description:'Custom lamp',included:'Lamp',category:'Lamps',images:[{src:'/media/shop/lamp/1.webp'}],livePrice:'79.99',available:true,titleSource:'trained_algorithmic_media'};
  const xml=merchantFeed([p]);
  assert.ok(xml.includes('<g:structured_title>'));
  assert.ok(xml.includes('<g:digital_source_type>trained_algorithmic_media</g:digital_source_type>'));
  assert.ok(!xml.includes('<g:title>'));
});
test('Shopify naming sync submits only title/SEO and verifies unchanged variants',async()=>{
  const calls=[];let title='Old';
  const lookup=async()=>({id:'gid://shopify/Product/1',title,variants:{nodes:[{id:'gid://shopify/ProductVariant/2',sku:'lamp',price:'79.99',compareAtPrice:null}]}});
  const admin={call:async(query,args)=>{calls.push(args.product);title=args.product.title;return {productUpdate:{userErrors:[]}};}};
  await syncSearchNames(admin,[{id:'lamp',name:'Personalized Photo Lamp',description:'Custom lamp'}],lookup);
  assert.deepEqual(Object.keys(calls[0]).sort(),['id','seo','title']);
});
