import baseline from './catalog-baseline.json' with {type:'json'};
import {compileCatalog} from './catalog-management.mjs';
const query='query CleanupProduct($handle:String!){productByIdentifier(identifier:{handle:$handle}){id title options{id name} variants(first:100){nodes{id sku price compareAtPrice}}}}';
const check=p=>{if(p.userErrors?.length)throw new Error(p.userErrors.map(e=>e.message).join('; '));};
export function removablePickupVariants(product){
  const variants=product.variants.nodes,duplicates=variants.filter(v=>v.sku?.endsWith('-pickup'));
  for(const duplicate of duplicates){const keep=variants.find(v=>v.sku===duplicate.sku.slice(0,-7));if(!keep || keep.price!==duplicate.price || (keep.compareAtPrice || null)!==(duplicate.compareAtPrice || null))throw new Error(product.title+': pickup counterpart or matching price is missing.');}
  return duplicates;
}
export async function previewCleanup(admin,state){
  if(!state.deliveryPolicy?.active)throw new Error('Apply unified pricing first.');
  const catalog=compileCatalog(baseline.products,state.collections || baseline.collections,Object.values(state.documents),state.archived),groups=[];
  for(const p of catalog.products.filter(p=>!p.variantOf&&!p.groupedDesigns&&p.launchReady!==false)){
    const handle=p.shopifyHandle || p.id,current=(await admin.call(query,{handle})).productByIdentifier;if(!current)continue;
    const remove=removablePickupVariants(current);if(!remove.length)continue;
    groups.push({handle,productId:current.id,name:current.title,remove:remove.map(v=>v.id),keep:current.variants.nodes.filter(v=>!remove.includes(v)),snapshot:current});
  }
  return {groups,sourceRevision:state.revision};
}
export async function cleanupGroup(admin,group){
  const current=(await admin.call(query,{handle:group.handle})).productByIdentifier;if(!current || current.id!==group.productId)throw new Error('Product changed during cleanup.');
  for(const keep of group.keep){const live=current.variants.nodes.find(v=>v.id===keep.id);if(!live || live.sku!==keep.sku || live.price!==keep.price || (live.compareAtPrice || null)!==(keep.compareAtPrice || null))throw new Error(group.name+': retained option changed.');}
  const remove=removablePickupVariants(current);if(remove.some(v=>!group.remove.includes(v.id)))throw new Error('New pickup options appeared; preview again.');
  if(remove.length)check((await admin.call('mutation CleanupVariants($id:ID!,$ids:[ID!]!){productVariantsBulkDelete(productId:$id,variantsIds:$ids){userErrors{message}}}',{id:current.id,ids:remove.map(v=>v.id)})).productVariantsBulkDelete);
  const option=current.options.find(o=>o.name==='Fulfillment');
  if(option)check((await admin.call('mutation CleanupOption($id:ID!,$options:[ID!]!){productOptionsDelete(productId:$id,options:$options,strategy:NON_DESTRUCTIVE){userErrors{message}}}',{id:current.id,options:[option.id]})).productOptionsDelete);
  const verified=(await admin.call(query,{handle:group.handle})).productByIdentifier;
  if(verified.variants.nodes.some(v=>v.sku?.endsWith('-pickup'))||verified.options.some(o=>o.name==='Fulfillment'))throw new Error('Cleanup verification failed.');
  for(const keep of group.keep){const v=verified.variants.nodes.find(v=>v.id===keep.id);if(!v || v.sku!==keep.sku || v.price!==keep.price)throw new Error('Retained option verification failed.');}
}
