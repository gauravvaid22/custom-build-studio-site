import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {validateDocument} from '../commerce/catalog-management.mjs';
import {groupRemainingDesigns} from '../commerce/group-remaining-designs.mjs';
import {applyDefaultListingCovers} from '../commerce/listing-covers.mjs';
import {prepareSearchNaming} from '../commerce/search-naming.mjs';
import baseline from '../commerce/catalog-baseline.json' with {type:'json'};
const source=process.env.SHOP_CATALOG_SOURCE_URL;
if (source || process.env.CONTEXT==='production') {
  let snapshot;
  if(source) {
  const url=new URL(source);
  if (url.protocol!=='https:' || url.hostname!=='custombuildstudio.ca' || url.pathname!=='/.netlify/functions/shop-catalog') throw new Error('Invalid catalog source URL.');
  url.searchParams.set('action','snapshot');
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});
  if (!response.ok) throw new Error('Catalog export failed. Keeping the previous live deploy.');
  snapshot=await response.json();
  } else snapshot={...JSON.parse(await readFile('commerce/catalog-baseline.json','utf8')),revision:0,rows:[]};
  if (!Array.isArray(snapshot.products) || !Array.isArray(snapshot.collections) || !Number.isSafeInteger(snapshot.revision)) throw new Error('Invalid catalog snapshot.');
  if(snapshot.deliveryPolicy)await writeFile('commerce/delivery-policy.json',JSON.stringify(snapshot.deliveryPolicy,null,2)+'\n');
  snapshot=groupRemainingDesigns(snapshot);
  snapshot=prepareSearchNaming(snapshot).catalog;
  snapshot.products=applyDefaultListingCovers(snapshot.products,baseline.products);
  const baselineMap = new Map(baseline.products.map(p => [p.id, p]));
  for (const p of snapshot.products) {
    const base = baselineMap.get(p.id);
    if (base) {
      if (base.name && !p.name) p.name = base.name;
      if (base.seoTitle && !p.seoTitle) p.seoTitle = base.seoTitle;
      if (base.seoDescription && !p.seoDescription) p.seoDescription = base.seoDescription;
      if (Array.isArray(base.searchKeywords)) p.searchKeywords = base.searchKeywords;
    }
  }
  const baselineColls = new Map((baseline.collections || []).map(c => [c.id, c]));
  for (const c of snapshot.collections) {
    const base = baselineColls.get(c.id);
    if (base) {
      if (base.seoTitle) c.seoTitle = base.seoTitle;
      if (base.seoDescription) c.seoDescription = base.seoDescription;
    }
  }
  const ids=new Set(snapshot.products.map(p=>p.id));
  if (ids.size!==snapshot.products.length) throw new Error('Duplicate catalog IDs.');
  for(const root of snapshot.products.filter(p=>p.bundleOffers?.length))validateDocument({id:root.id,template:'design',products:snapshot.products.filter(p=>p.id===root.id||p.listingGroup===root.id||snapshot.products.find(x=>x.id===p.variantOf)?.listingGroup===root.id)});
  for (const p of snapshot.products) validateDocument({id:p.id,template:'single',products:[{...p,groupedDesigns:undefined,bundleOffers:undefined}],pickupPriceDifferenceCents:p.pickupPriceDifferenceCents ?? 1000});
  // Unfinished previews never enter production products, routes or merchant feeds.
  const blocked=new Set(snapshot.products.filter(p=>p.launchReady===false).map(p=>p.id));
  const products=snapshot.products.filter(p=>!blocked.has(p.id) && !blocked.has(p.listingGroup) && !blocked.has(p.variantOf));
  const liveIds=new Set(products.map(p=>p.id));
  const collections=snapshot.collections.map(c=>({...c,products:c.products.filter(id=>liveIds.has(id))})).filter(c=>c.products.length);
  await writeFile('commerce/products.json',JSON.stringify(products,null,2)+'\n');
  await writeFile('commerce/collections.json',JSON.stringify(collections,null,2)+'\n');
  await writeFile('commerce/admin-rows.json',JSON.stringify(snapshot.rows || [],null,2)+'\n');
  await mkdir('public',{recursive:true});
  await writeFile('public/catalog-revision.json',JSON.stringify({revision:snapshot.revision}));
  console.log(`Exported catalog revision ${snapshot.revision}: ${products.length} products.`);
}
