import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {catalogStore,readState,writeState} from '../../commerce/catalog-store.mjs';
import {syncDocument,withdrawDocument} from '../../commerce/catalog-shopify.mjs';
import {createShopifyAdmin} from '../../commerce/shopify-admin.mjs';
export default async (request,context) => {
  if((context?.deploy?.context || process.env.CONTEXT)!=='production')return new Response('',{status:403});
  const {id}=await request.json();
  const expected=createHmac('sha256',process.env.SHOP_ADMIN_KEY || '').update(String(id)).digest('hex');
  const token=request.headers.get('x-catalog-job') || '';
  if (token.length!==expected.length || !timingSafeEqual(Buffer.from(token),Buffer.from(expected))) return new Response('',{status:403});
  const store=catalogStore(context); let found=await readState(store); let job=found.state.jobs.find(j=>j.id===id);
  if (!job || job.status!=='queued') return;
  job.status='shopify';await writeState(store,found.state,found.etag);
  const admin=createShopifyAdmin({legacyToken:process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,clientId:process.env.SHOPIFY_CLIENT_ID,clientSecret:process.env.SHOPIFY_CLIENT_SECRET});
  try {
    let results;
    if (job.action==='publish') {
      const sale=await getStore({name:'shop-orders-v1',consistency:'strong'}).get('config/shop-sale',{type:'json'});
      if(sale && sale.status!=='inactive')throw new Error('End or cancel the current sale before publishing base-price changes.');
      results=await syncDocument(admin,job.document,found.state.connection,job.expected);
      const removed=job.previousDocument?.products.filter(p=>!job.document.products.some(x=>x.id===p.id)) || [];
      if(removed.length)await withdrawDocument(admin,{products:removed},found.state.connection.publicationId);
    }
    else if (['archive','restore'].includes(job.action)) await withdrawDocument(admin,job.document,found.state.connection.publicationId,job.action==='restore');
    found=await readState(store); job=found.state.jobs.find(j=>j.id===id);if(results)job.results=results;
    if (job.action==='publish') {found.state.documents[job.productId]=job.document;delete found.state.drafts[job.productId];const currentIds=new Set(job.document.products.map(p=>p.id));found.state.unavailableIds=[...new Set([...(found.state.unavailableIds || []).filter(id=>!currentIds.has(id)),...(job.previousDocument?.products || []).filter(p=>!currentIds.has(p.id)).map(p=>p.id)])];}
    if (job.action==='publish-layout' && found.state.layoutDraft) {found.state.collections=found.state.layoutDraft.collections;found.state.rows=found.state.layoutDraft.rows;delete found.state.layoutDraft;}
    if (job.action==='archive') {found.state.unavailableIds=[...new Set([...(found.state.unavailableIds || []),...job.document.products.map(p=>p.id)])];found.state.documents[job.productId]=job.document;found.state.archived=[...new Set([...found.state.archived,job.productId])];}
    if (job.action==='restore') {found.state.archived=found.state.archived.filter(x=>x!==job.productId);const ids=new Set(job.document.products.map(p=>p.id));found.state.unavailableIds=(found.state.unavailableIds || []).filter(id=>!ids.has(id));}
    found.state.revision++;job.status='website';job.revision=found.state.revision;
    await writeState(store,found.state,found.etag);
    const hook=await fetch(process.env.NETLIFY_CATALOG_BUILD_HOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:job.revision}),signal:AbortSignal.timeout(15000)});
    if (!hook.ok) throw new Error('Netlify did not accept the website build. Shopify may already be updated; retry the website update.');
  } catch(error) {
    found=await readState(store);job=found.state.jobs.find(j=>j.id===id);job.status='error';job.error=String(error.message).slice(0,600);await writeState(store,found.state,found.etag);
  }
};
