import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {finalizePublicCatalog} from '../commerce/public-catalog.mjs';
import baseline from '../commerce/catalog-baseline.json' with {type:'json'};
const source=process.env.SHOP_CATALOG_SOURCE_URL;
if (source || process.env.CONTEXT==='production') {
  let snapshot;
  let archivedIds = new Set();
  if(source) {
    const url=new URL(source);
    if (url.protocol!=='https:' || url.hostname!=='custombuildstudio.ca' || url.pathname!=='/.netlify/functions/shop-catalog') throw new Error('Invalid catalog source URL.');
    url.searchParams.set('action','snapshot');
    const availUrl=new URL(source);
    availUrl.searchParams.set('action','availability');
    const [response, availResponse] = await Promise.all([
      fetch(url,{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}}),
      fetch(availUrl,{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}}),
    ]);
    if (!response.ok) throw new Error('Catalog export failed. Keeping the previous live deploy.');
    snapshot=await response.json();
    if (!availResponse.ok) throw new Error('Availability export failed; refusing to restore potentially archived products.');
    if (availResponse.ok) {
      const avail = await availResponse.json();
      if (!Array.isArray(avail?.archived)) throw new Error('Invalid availability snapshot.');
      archivedIds = new Set(avail.archived);
    }
  } else snapshot={...JSON.parse(await readFile('commerce/catalog-baseline.json','utf8')),revision:0,rows:[]};
  if (!Array.isArray(snapshot.products) || !Array.isArray(snapshot.collections) || !Number.isSafeInteger(snapshot.revision)) throw new Error('Invalid catalog snapshot.');
  if(snapshot.deliveryPolicy)await writeFile('commerce/delivery-policy.json',JSON.stringify(snapshot.deliveryPolicy,null,2)+'\n');

  const finalized = finalizePublicCatalog(snapshot, baseline, archivedIds, { validate: true });
  await writeFile('commerce/products.json',JSON.stringify(finalized.products,null,2)+'\n');
  await writeFile('commerce/collections.json',JSON.stringify(finalized.collections,null,2)+'\n');
  await writeFile('commerce/admin-rows.json',JSON.stringify(finalized.rows,null,2)+'\n');
  const revPayload = JSON.stringify({revision:finalized.revision});
  await writeFile('commerce/catalog-revision.json',revPayload+'\n');
  await mkdir('public',{recursive:true});
  await writeFile('public/catalog-revision.json',revPayload);
  console.log(`Exported catalog revision ${finalized.revision}: ${finalized.products.length} products.`);
}
