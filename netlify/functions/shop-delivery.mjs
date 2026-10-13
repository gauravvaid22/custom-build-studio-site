import {randomUUID,createHmac} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {catalogStore,readState,writeState} from '../../commerce/catalog-store.mjs';
import {requireAdmin} from '../../commerce/admin-session.mjs';
import {createShopifyAdmin} from '../../commerce/shopify-admin.mjs';
import {defaultDeliveryPolicy,validateDeliveryPolicy} from '../../commerce/delivery-pricing.mjs';
import {planDelivery,deliveryFingerprint} from '../../commerce/delivery-sync.mjs';
import {previewCleanup} from '../../commerce/fulfillment-cleanup.mjs';
const admin=createShopifyAdmin({legacyToken:process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,clientId:process.env.SHOPIFY_CLIENT_ID,clientSecret:process.env.SHOPIFY_CLIENT_SECRET});
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export default async(request,context)=>{
  try {
    const store=catalogStore(context),{state,etag}=await readState(store),action=new URL(request.url).searchParams.get('action') || 'status';
    const policy=state.deliveryPolicy || defaultDeliveryPolicy;
    if(request.method==='GET' && action==='public')return reply({policy,updating:state.jobs.some(j=>j.action==='delivery-pricing'&&['queued','shopify','website'].includes(j.status))});
    requireAdmin(request);
    const raw=await request.text();if(raw.length>10000)throw new Error('Request too large.');const body=raw?JSON.parse(raw):{};
    if(action==='status') {
      if(state.jobs.some(j=>['delivery-pricing','pickup-settings','fulfillment-cleanup'].includes(j.action)&&j.status==='website')){
        const response=await fetch(new URL('/catalog-revision.json',request.url),{cache:'no-store',signal:AbortSignal.timeout(5000)}),live=response.ok?await response.json():null;
        let changed=false;for(const j of state.jobs)if(['delivery-pricing','pickup-settings','fulfillment-cleanup'].includes(j.action)&&j.status==='website'&&live?.revision>=j.revision){j.status='live';changed=true;}
        if(changed)await writeState(store,state,etag);
      }
      const scopes=admin?await admin.call(`query DeliveryScopes{currentAppInstallation{accessScopes{handle}}}`):null;
      const list=scopes?.currentAppInstallation.accessScopes.map(s=>s.handle) || [];
      return reply({policy,revision:state.revision,jobs:state.jobs.filter(j=>['delivery-pricing','pickup-settings','fulfillment-cleanup'].includes(j.action)).map(j=>({id:j.id,status:j.status,error:j.error,completed:j.completed,total:j.plan?.groups.length || 0,revision:j.revision})),discountsConnected:list.includes('write_discounts'),rewards:state.pickupRewards || []});
    }
    if((context?.deploy?.context || process.env.CONTEXT)!=='production')throw new Error('Publishing is available only in production.');
    if(action==='save-reward-settings'){
      if(!policy.active)throw new Error('Apply the initial pricing migration first.');
      if(state.jobs.some(j=>['queued','shopify','website'].includes(j.status)))throw new Error('Wait for the current website update to finish.');
      if(!process.env.NETLIFY_CATALOG_BUILD_HOOK)throw new Error('Website publishing is not connected.');
      const next=validateDeliveryPolicy({...body.policy,active:true,defaultAllowanceCents:policy.defaultAllowanceCents});
      const jobId=randomUUID();state.deliveryPolicy=next;state.revision++;state.jobs=[{id:jobId,action:'pickup-settings',status:'website',createdAt:new Date().toISOString(),revision:state.revision},...state.jobs].slice(0,20);
      await writeState(store,state,etag);
      const response=await fetch(process.env.NETLIFY_CATALOG_BUILD_HOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.revision}),signal:AbortSignal.timeout(15000)});
      if(!response.ok){const fresh=await readState(store);const j=fresh.state.jobs.find(j=>j.id===jobId);j.status='error';j.error='Pickup settings saved, but website build failed. Resume the update.';await writeState(store,fresh.state,fresh.etag);throw new Error(j.error);}
      return reply({policy:next,saved:true});
    }
    if(action==='cleanup-preview'){
      if(state.jobs.some(j=>['queued','shopify','website','error'].includes(j.status)))throw new Error('Finish existing updates first.');
      const sale=await getStore({name:'shop-orders-v1',consistency:'strong'}).get('config/shop-sale',{type:'json'});if(sale&&sale.status!=='inactive')throw new Error('End the sale first.');
      const plan=await previewCleanup(admin,state),fingerprint=deliveryFingerprint(plan);await store.setJSON('cleanup-preview',{plan,fingerprint,createdAt:Date.now()});return reply({rows:plan.groups.map(g=>({name:g.name,count:g.remove.length})),count:plan.groups.reduce((n,g)=>n+g.remove.length,0),fingerprint});
    }
    if(action==='cleanup-apply'){
      if(body.confirmPermanentRemoval!==true)throw new Error('Confirm removal of the reviewed pickup variants.');
      if(state.jobs.some(j=>['queued','shopify','website','error'].includes(j.status)))throw new Error('Finish existing updates first.');
      const preview=await store.get('cleanup-preview',{type:'json'});if(!preview||preview.fingerprint!==body.fingerprint||preview.plan.sourceRevision!==state.revision||Date.now()-preview.createdAt>30*60000)throw new Error('Preview again before cleanup.');
      const job={id:randomUUID(),action:'fulfillment-cleanup',status:'queued',createdAt:new Date().toISOString(),completed:0,plan:preview.plan};
      await store.setJSON('delivery-backups/'+job.id,{state,plan:job.plan});state.jobs=[job,...state.jobs].slice(0,20);await writeState(store,state,etag);
      const token=createHmac('sha256',process.env.SHOP_ADMIN_KEY).update(job.id).digest('hex');const response=await fetch(new URL('/.netlify/functions/shop-delivery-background',request.url),{method:'POST',headers:{'Content-Type':'application/json','X-Delivery-Job':token},body:JSON.stringify({id:job.id}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Could not start cleanup.');return reply({queued:true,id:job.id});
    }
    if(action==='preview') {
      if(state.jobs.some(j=>j.action==='delivery-pricing'&&j.status==='error'))throw new Error('Resume the failed pricing update before making a new preview. This prevents applying the legacy adjustment twice.');
      if(state.jobs.some(j=>['queued','shopify','website'].includes(j.status)))throw new Error('Wait for the current website update to finish.');
      const sale=await getStore({name:'shop-orders-v1',consistency:'strong'}).get('config/shop-sale',{type:'json'});
      if(sale && sale.status!=='inactive')throw new Error('End or cancel the sale first.');
      const plan=await planDelivery(admin,state,body.policy),fingerprint=deliveryFingerprint(plan);
      await store.setJSON('delivery-preview',{plan,fingerprint,createdAt:Date.now()});
      return reply({rows:plan.rows,skipped:plan.skipped,fingerprint,revision:state.revision});
    }
    if(action==='apply'||action==='retry') {
      if(state.jobs.some(j=>['queued','shopify','website'].includes(j.status)))throw new Error('Another update is in progress.');
      if(action==='apply' && state.jobs.some(j=>j.action==='delivery-pricing'&&j.status==='error'))throw new Error('Resume the failed pricing update first.');
      let job;
      if(action==='retry'){job=state.jobs.find(j=>j.id===body.id&&['delivery-pricing','pickup-settings','fulfillment-cleanup'].includes(j.action)&&j.status==='error');if(!job)throw new Error('Failed update not found.');job.status='queued';delete job.error;}
      else {
        const preview=await store.get('delivery-preview',{type:'json'});
        if(!preview || preview.fingerprint!==body.fingerprint || preview.plan.sourceRevision!==state.revision || Date.now()-preview.createdAt>30*60000)throw new Error('Preview expired or catalog changed. Preview again.');
        if(!state.connection.deliveryProfileId||!state.connection.pickupProfileId||!process.env.NETLIFY_CATALOG_BUILD_HOOK)throw new Error('Shipping profiles and website build hook must be connected.');
        job={id:randomUUID(),action:'delivery-pricing',status:'queued',createdAt:new Date().toISOString(),completed:0,plan:preview.plan};
        await store.setJSON(`delivery-backups/${job.id}`,{state,groups:job.plan.groups,at:job.createdAt});state.jobs=[job,...state.jobs].slice(0,20);
      }
      await writeState(store,state,etag);
      const token=createHmac('sha256',process.env.SHOP_ADMIN_KEY).update(job.id).digest('hex');
      const response=await fetch(new URL('/.netlify/functions/shop-delivery-background',request.url),{method:'POST',headers:{'Content-Type':'application/json','X-Delivery-Job':token},body:JSON.stringify({id:job.id}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error('Could not start delivery update.');
      return reply({queued:true,id:job.id});
    }
    if(action==='reward') {
      if(!policy.active||!policy.pickupRewardEnabled)throw new Error('Pickup rewards are not enabled.');
      const reference=String(body.orderReference||'').trim().replace(/^#/,'').toUpperCase();
      if(!/^#?[A-Za-z0-9-]{3,40}$/.test(reference)||body.collected!==true)throw new Error('Enter the paid Shopify order reference and confirm collection.');
      const existing=(state.pickupRewards || []).find(r=>r.orderReference===reference);if(existing)return reply({reward:existing});
      const sale=await getStore({name:'shop-orders-v1',consistency:'strong'}).get('config/shop-sale',{type:'json'});
      if(sale && sale.status!=='inactive')throw new Error('Issue pickup rewards after the current sale ends. Existing reward codes pause during shop sales.');
      // Deterministic per order: retrying after a network interruption cannot create two rewards.
      const code='CBS-PICKUP-'+createHmac('sha256',process.env.SHOP_ADMIN_KEY).update(reference).digest('hex').slice(0,12).toUpperCase(),expiresAt=new Date(Date.now()+policy.rewardExpiryDays*86400000).toISOString();
      const prior=await admin.call(`query ExistingPickupReward($code:String!){codeDiscountNodeByCode(code:$code){id codeDiscount{... on DiscountCodeBasic{endsAt customerGets{value{... on DiscountPercentage{percentage}}}}}}}`,{code});
      if(prior.codeDiscountNodeByCode){const node=prior.codeDiscountNodeByCode;const reward={orderReference:reference,code,percentage:Math.round(node.codeDiscount.customerGets.value.percentage*100),expiresAt:node.codeDiscount.endsAt,shopifyId:node.id};state.pickupRewards=[reward,...(state.pickupRewards || [])];await writeState(store,state,etag);return reply({reward});}
      const result=await admin.call(`mutation PickupReward($input:DiscountCodeBasicInput!){discountCodeBasicCreate(basicCodeDiscount:$input){codeDiscountNode{id}userErrors{message}}}`,{input:{title:`Pickup thank you ${reference}`,code,startsAt:new Date().toISOString(),endsAt:expiresAt,usageLimit:1,appliesOncePerCustomer:true,customerSelection:{all:true},customerGets:{value:{percentage:policy.pickupRewardPercent/100},items:{all:true}},combinesWith:{orderDiscounts:false,productDiscounts:false,shippingDiscounts:false}}});
      if(result.discountCodeBasicCreate.userErrors.length)throw new Error(result.discountCodeBasicCreate.userErrors.map(e=>e.message).join('; '));
      const reward={orderReference:reference,code,percentage:policy.pickupRewardPercent,expiresAt,shopifyId:result.discountCodeBasicCreate.codeDiscountNode.id};
      state.pickupRewards=[reward,...(state.pickupRewards || [])];await writeState(store,state,etag);return reply({reward});
    }
    throw new Error('Unknown delivery action.');
  }catch(error){return reply({error:error.message},error.status || 400);}
};
