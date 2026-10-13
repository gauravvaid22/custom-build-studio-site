export function orderShippingFee(items,products,{active=true,mode='delivered'}={}){
  if(!active&&mode==='pickup')return 0;
  return items.reduce((fee,item)=>{const p=products.find(p=>p.id===item.id);const amount=p && (!active || p.shippingPriceMode==='per-order')?p.shippingFeeCents || 0:0;return Math.max(fee,amount);},0);
}
export function deliveryProfileFor(product,connection){const id=product.shippingPriceMode==='per-order'?connection.perOrderDeliveryProfileId:connection.deliveryProfileId;if(!id)throw new Error('Choose the once-per-order shipping profile in Connections before publishing.');return id;}
export async function verifyFlatShippingProfile(admin,id,cents){
 const data=await admin.call('query FlatShippingProfile($id:ID!){node(id:$id){... on DeliveryProfile{id profileLocationGroups{locationGroupZones(first:50){nodes{zone{countries{code{countryCode restOfWorld}}}methodDefinitions(first:50){nodes{active methodConditions{field}rateProvider{... on DeliveryRateDefinition{price{amount currencyCode}}}}}}}}}}}',{id});
 const groups=data.node?.profileLocationGroups || [];if(groups.length!==1)throw new Error('Use one shipping location group for the flat delivery profile.');
 const zones=groups.flatMap(g=>g.locationGroupZones.nodes),canada=zones.filter(z=>z.zone.countries.some(c=>c.code.countryCode==='CA'));
 if(canada.length!==1 || zones.some(z=>z.zone.countries.some(c=>c.code.countryCode!=='CA'||c.code.restOfWorld)))throw new Error('The flat profile must serve Canada only.');
 const rates=canada[0].methodDefinitions.nodes.filter(r=>r.active);
 if(!rates.length || rates.some(r=>r.methodConditions.length || r.rateProvider?.price?.currencyCode!=='CAD'||Math.round(Number(r.rateProvider?.price?.amount)*100)!==cents))throw new Error('The Shopify flat rate must match the listing delivery fee without quantity, price or weight conditions. Update Shopify shipping first.');
}
