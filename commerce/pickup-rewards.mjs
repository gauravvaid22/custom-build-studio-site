import {getStore} from '@netlify/blobs';
export async function setPickupRewardsPaused(admin,paused){
  const store=getStore({name:'shop-catalog-v1',consistency:'strong'});
  const state=await store.get('state',{type:'json'});
  for(const reward of state?.pickupRewards || []) {
    if(Date.parse(reward.expiresAt)<=Date.now())continue;
    const result=await admin.call(`mutation PickupRewardSale($id:ID!,$input:DiscountCodeBasicInput!){discountCodeBasicUpdate(id:$id,basicCodeDiscount:$input){userErrors{message}}}`,{id:reward.shopifyId,input:{endsAt:paused?new Date().toISOString():reward.expiresAt}});
    if(result.discountCodeBasicUpdate.userErrors.length)throw new Error('Pickup reward update: '+result.discountCodeBasicUpdate.userErrors.map(e=>e.message).join('; '));
  }
}
