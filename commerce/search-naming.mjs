import plan from './search-naming-plan.json' with {type:'json'};
import {brandedSearchTitle,searchDescription} from './product-search.mjs';

// A deliberate, one-time migration. Future admin edits are never reprocessed.
export function prepareSearchNaming(catalog) {
  const next=structuredClone(catalog), changes=[];
  for(const p of next.products) {
    const entry=plan.products[p.id];
    if(!entry || p.searchNamingVersion===plan.version)continue;
    const old=p.name;
    // Preserve names edited since the reviewed snapshot.
    if(old===entry.from)p.name=entry.name;
    if(!p.seoTitle && entry.seoTitle)p.seoTitle=entry.seoTitle;
    if(!p.seoDescription && entry.seoDescription)p.seoDescription=entry.seoDescription;
    p.titleSource='trained_algorithmic_media';
    p.searchNamingVersion=plan.version;
    p.images=p.images.map(image=>image.alt===old?{...image,alt:p.name}:image);
    changes.push({id:p.id,before:old,after:p.name,seoTitle:p.seoTitle || p.name});
  }
  const records=new Map(next.products.map(p=>[p.id,p]));
  for(const p of next.products) {
    if(p.groupedDesigns)p.groupedDesigns=p.groupedDesigns.map(d=>({...d,label:records.get(d.id)?.name || d.label}));
    if(p.groupedDesigns && p.variants)p.variants=p.variants.map(v=>({...v,label:records.get(v.id)?.name || v.label}));
  }
  for(const c of next.collections)Object.assign(c,plan.collections[c.id] || {});
  return {catalog:next,changes,version:plan.version};
}

export async function syncSearchNames(admin,products,lookup) {
  if(!admin)throw Error('Shopify is not connected.');
  const results=[];
  for(const p of products.filter(p=>!p.variantOf&&!p.groupedDesigns)) {
    const current=await lookup(admin,p);
    if(!current)throw Error(`Shopify product missing: ${p.id}. No new product was created.`);
    const before=JSON.stringify(current.variants.nodes.map(v=>({id:v.id,sku:v.sku,price:v.price,compareAtPrice:v.compareAtPrice})));
    const payload=await admin.call(`mutation SearchNames($product:ProductUpdateInput!){productUpdate(product:$product){product{id} userErrors{message}}}`,{product:{id:current.id,title:p.name,seo:{title:brandedSearchTitle(p),description:searchDescription(p)}}});
    if(payload.productUpdate.userErrors.length)throw Error(payload.productUpdate.userErrors.map(e=>e.message).join('; '));
    const verified=await lookup(admin,p);
    if(verified.title!==p.name || JSON.stringify(verified.variants.nodes.map(v=>({id:v.id,sku:v.sku,price:v.price,compareAtPrice:v.compareAtPrice})))!==before)throw Error(`Name/price verification failed: ${p.id}`);
    results.push({id:p.id,shopifyId:current.id,title:verified.title});
  }
  return results;
}
