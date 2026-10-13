import {createHash} from 'node:crypto';
import baseline from './catalog-baseline.json' with {type:'json'};
import {compileCatalog,seedDocuments} from './catalog-management.mjs';
import {lookupProduct} from './catalog-shopify.mjs';
import {groupRemainingDesigns} from './group-remaining-designs.mjs';
import {priceCatalog,validateDeliveryPolicy} from './delivery-pricing.mjs';
export const deliveryFingerprint = plan => createHash('sha256').update(JSON.stringify(plan)).digest('hex');
export async function planDelivery(admin,state,input) {
  if(!admin)throw new Error('Shopify is not connected.');
  const policy=validateDeliveryPolicy({...input,active:true});
  const catalog=groupRemainingDesigns(compileCatalog(baseline.products,state.collections || baseline.collections,Object.values(state.documents),state.archived));
  const records=catalog.products.filter(p=>!p.variantOf&&!p.groupedDesigns&&p.launchReady!==false);
  const groups=[],livePrices={},rows=[],skipped=[];
  const found=new Map();
  for(let start=0;start<records.length;start+=4){
    const batch=records.slice(start,start+4),variables=Object.fromEntries(batch.map((p,i)=>['h'+i,p.shopifyHandle || p.id]));
    const data=await admin.call(`query DeliveryCatalog(${batch.map((_,i)=>'$h'+i+':String!').join(',')}){${batch.map((_,i)=>`p${i}:productByIdentifier(identifier:{handle:$h${i}}){id handle updatedAt variants(first:100){nodes{id sku price compareAtPrice}}}`).join(' ')}}`,variables);
    batch.forEach((p,i)=>found.set(p.id,data['p'+i]));
  }
  for(const p of records) {
    const current=found.get(p.id);
    if(!current) {skipped.push(p.id);continue;}
    const choices=p.variants?.length?p.variants:[p];
    const old=[];
    for(const choice of choices) {
      const shipped=current.variants.nodes.find(v=>v.sku===choice.id),pickup=current.variants.nodes.find(v=>v.sku===choice.id+'-pickup');
      if(!shipped || (!pickup && !state.deliveryPolicy?.active))throw new Error(`${p.name}: delivery/pickup variant is missing. Fix this connection before migration.`);
      if([shipped,pickup].filter(Boolean).some(v=>v.compareAtPrice && Number(v.compareAtPrice)>Number(v.price)))throw new Error(`End the sale for ${p.name} before updating pricing.`);
      livePrices[choice.id]=Math.round(Number(shipped.price)*100);
      old.push({...shipped,oldPrice:shipped.price});if(pickup)old.push({...pickup,oldPrice:pickup.price});
    }
    groups.push({id:p.id,handle:p.shopifyHandle || p.id,productId:current.id,old,choiceIds:choices.map(c=>c.id)});
  }
  const next=priceCatalog(catalog.products,policy,livePrices),byId=new Map(next.map(p=>[p.id,p]));
  for(const group of groups) {
    const p=byId.get(group.id),options=p.variants?.length?p.variants:[p];
    group.updates=group.old.map(v=>{const option=options.find(c=>c.id===v.sku.replace(/-pickup$/,''));if(!option)throw new Error('Missing price option.');return {id:v.id,price:(option.priceCents/100).toFixed(2),compareAtPrice:null};});
    for(const option of options)rows.push({id:option.id,name:byId.get(option.id)?.name || p.name,oldCents:livePrices[option.id],baseCents:option.basePriceCents,extraCents:option.deliveryExtraCents,newCents:option.priceCents});
  }
  return {policy,groups,rows,skipped,products:next,sourceRevision:state.revision};
}
export async function applyDeliveryGroup(admin,group,connection) {
  const current=await lookupProduct(admin,{id:group.id,shopifyHandle:group.handle});
  if(!current)throw new Error(`${group.id} disappeared from Shopify.`);
  for(const old of group.old) {
    const live=current.variants.nodes.find(v=>v.id===old.id),next=group.updates.find(v=>v.id===old.id);
    if(!live || ![old.oldPrice,next.price].includes(live.price) || live.compareAtPrice && Number(live.compareAtPrice)>Number(live.price))throw new Error(`${group.id} was edited in Shopify. Review it before retrying.`);
  }
  const check=result=>{if(result.userErrors?.length)throw new Error(result.userErrors.map(e=>e.message).join('; '));};
  check((await admin.call(`mutation DeliveryPrices($id:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$id,variants:$variants){userErrors{message}}}`,{id:group.productId,variants:group.updates})).productVariantsBulkUpdate);
  for(const [pickup,profile] of [[false,connection.deliveryProfileId],[true,connection.pickupProfileId]]) {
    if(!group.old.some(v=>v.sku.endsWith('-pickup')===pickup))continue;
    if(!profile)throw new Error('Select both existing fulfillment profiles in Connections.');
    check((await admin.call(`mutation DeliveryAssignment($id:ID!,$profile:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$profile){userErrors{message}}}`,{id:profile,profile:{variantsToAssociate:group.old.filter(v=>v.sku.endsWith('-pickup')===pickup).map(v=>v.id)}})).deliveryProfileUpdate);
  }
  const verified=await lookupProduct(admin,{id:group.id,shopifyHandle:group.handle});
  if(group.updates.some(v=>verified.variants.nodes.find(x=>x.id===v.id)?.price!==v.price))throw new Error(`${group.id}: Shopify price verification failed.`);
}
export function installDeliveryCatalog(state,plan) {
  const byId=new Map(plan.products.map(p=>[p.id,p]));
  const documents=seedDocuments(plan.products,state.collections || baseline.collections);
  state.documents={...Object.fromEntries(Object.entries(state.documents).map(([id,doc])=>[id,{...doc,products:doc.products.map(p=>byId.get(p.id) || p)}])),...Object.fromEntries(documents.map(doc=>{
    const old=state.documents[doc.id];return [doc.id,{...doc,...old,products:doc.products,pickupPriceDifferenceCents:0,updatedAt:new Date().toISOString()}];
  }))};
  // Keep drafts, but migrate their own edited prices rather than overwriting them with live values.
  for(const doc of Object.values(state.drafts)) {
    doc.products=priceCatalog(doc.products,plan.policy);doc.pickupPriceDifferenceCents=0;
  }
  state.deliveryPolicy=plan.policy;state.revision++;
  return byId.size;
}
