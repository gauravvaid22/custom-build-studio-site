import {createHmac,timingSafeEqual} from 'node:crypto';
import {catalogStore,readState,writeState} from '../../commerce/catalog-store.mjs';
import {createShopifyAdmin} from '../../commerce/shopify-admin.mjs';
import {applyDeliveryGroup,installDeliveryCatalog} from '../../commerce/delivery-sync.mjs';
export default async(request,context)=>{
  if((context?.deploy?.context || process.env.CONTEXT)!=='production')return new Response('',{status:403});
  const {id}=await request.json(),expected=createHmac('sha256',process.env.SHOP_ADMIN_KEY || '').update(String(id)).digest('hex'),token=request.headers.get('x-delivery-job') || '';
  if(token.length!==expected.length||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return new Response('',{status:403});
  const store=catalogStore(context);let found=await readState(store),job=found.state.jobs.find(j=>j.id===id);
  if(!job||job.status!=='queued')return;job.status='shopify';await writeState(store,found.state,found.etag);
  const admin=createShopifyAdmin({legacyToken:process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,clientId:process.env.SHOPIFY_CLIENT_ID,clientSecret:process.env.SHOPIFY_CLIENT_SECRET});
  try {
    for(let index=job.completed || 0;index<job.plan.groups.length;index++){
      await applyDeliveryGroup(admin,job.plan.groups[index],found.state.connection);
      found=await readState(store);job=found.state.jobs.find(j=>j.id===id);job.completed=index+1;await writeState(store,found.state,found.etag);
      await new Promise(resolve=>setTimeout(resolve,700));
    }
    found=await readState(store);job=found.state.jobs.find(j=>j.id===id);
    if(!job.installed){installDeliveryCatalog(found.state,job.plan);job.installed=true;job.revision=found.state.revision;}
    job.status='website';found.state.history=[{at:new Date().toISOString(),action:'delivery-pricing',id:job.id,revision:job.revision},...found.state.history].slice(0,100);
    await writeState(store,found.state,found.etag);
    const response=await fetch(process.env.NETLIFY_CATALOG_BUILD_HOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:job.revision}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Prices synced, but website build failed. Retry to publish the website.');
  }catch(error){found=await readState(store);job=found.state.jobs.find(j=>j.id===id);job.status='error';job.error=String(error.message).slice(0,600);await writeState(store,found.state,found.etag);}
};
