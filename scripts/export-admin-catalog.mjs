import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {validateDocument} from '../commerce/catalog-management.mjs';
import {groupRemainingDesigns} from '../commerce/group-remaining-designs.mjs';
import {applyDefaultListingCovers} from '../commerce/listing-covers.mjs';
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
  snapshot=groupRemainingDesigns(snapshot);
  snapshot.products=applyDefaultListingCovers(snapshot.products,baseline.products);
  const ids=new Set(snapshot.products.map(p=>p.id));
  if (ids.size!==snapshot.products.length) throw new Error('Duplicate catalog IDs.');
  for (const p of snapshot.products) validateDocument({id:p.id,template:'single',products:[{...p,groupedDesigns:undefined}],pickupPriceDifferenceCents:p.pickupPriceDifferenceCents ?? 1000});
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
