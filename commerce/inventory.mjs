// Shopify is the stock ledger. These settings contain defaults, never a second stock count.
export const inventoryDefaults = () => ({version:1,enabled:false,locationId:'',defaultQuantity:3,lowStockThreshold:1,overrides:{'mini-safari-animal-figurines-mix-pack-10':20}});
export function validateInventorySettings(input) {
  const value={...inventoryDefaults(),...input};
  if(typeof value.enabled!=='boolean' || !/^$|^gid:\/\/shopify\/Location\/\d+$/.test(value.locationId))throw Error('Choose a Shopify inventory location.');
  for(const key of ['defaultQuantity','lowStockThreshold'])if(!Number.isInteger(value[key])||value[key]<0||value[key]>10000)throw Error('Stock defaults must be whole numbers from 0 to 10000.');
  if(!value.overrides || Array.isArray(value.overrides) || Object.entries(value.overrides).some(([sku,n])=>!/^[-a-zA-Z0-9_]{1,160}$/.test(sku)||!Number.isInteger(n)||n<0||n>10000))throw Error('Stock exceptions must use valid product IDs and whole-number quantities.');
  return {version:1,enabled:value.enabled,locationId:value.locationId,defaultQuantity:value.defaultQuantity,lowStockThreshold:value.lowStockThreshold,overrides:value.overrides};
}
export function inventoryUnits(products) {
  const units=new Map();
  for(const p of products.filter(p=>!p.variantOf&&!p.groupedDesigns&&p.launchReady!==false)) {
    for(const v of p.variants?.length?p.variants:[{id:p.id}]) {
      if(units.has(v.id))throw Error(`Duplicate stock SKU: ${v.id}`);
      units.set(v.id,{sku:v.id,name:p.name,option:v.label || '',category:p.category,handle:p.shopifyHandle || p.id,productId:p.id,listingId:p.listingGroup || p.id});
    }
  }
  return [...units.values()];
}
export const initialQuantity = (sku,settings) => settings.overrides[sku] ?? settings.defaultQuantity;
const checked = payload => {if(!payload)throw Error('Shopify returned no inventory result.');if(payload.userErrors?.length)throw Error(payload.userErrors.map(e=>e.message).join('; '));return payload;};
export async function inventoryConnection(admin) {
  if(!admin)throw Error('Shopify is not connected.');
  const {currentAppInstallation}=await admin.call(`query InventoryScopes {currentAppInstallation {accessScopes {handle}}}`);
  const scopes=currentAppInstallation.accessScopes.map(s=>s.handle);
  const missing=['read_inventory','write_inventory','read_locations'].filter(s=>!scopes.includes(s)&&!(s==='read_inventory'&&scopes.includes('write_inventory')));
  if(missing.length)return {scopes,missing,locations:[]};
  const data=await admin.call(`query InventoryLocations {locations(first:50,includeInactive:false){nodes{id name isActive fulfillsOnlineOrders} pageInfo{hasNextPage}}}`);
  if(data.locations.pageInfo.hasNextPage)throw Error('More than 50 Shopify locations found. Choose inventory locations in Shopify first.');
  return {scopes,missing,locations:data.locations.nodes.filter(l=>l.isActive&&l.fulfillsOnlineOrders)};
}
export async function readInventory(admin,units,locationId) {
  if(!locationId)throw Error('Select the fulfillment location in Inventory settings first.');
  const found=new Map();
  for(let offset=0;offset<units.length;offset+=50) {
    const batch=units.slice(offset,offset+50);
    const query=batch.map(u=>`sku:'${u.sku}'`).join(' OR ');
    let after=null;
    do {
      const data=await admin.call(`query StudioStock($query:String!,$location:ID!,$after:String) {productVariants(first:100,query:$query,after:$after){nodes{id sku inventoryPolicy inventoryQuantity product{id handle status} inventoryItem{id tracked inventoryLevel(locationId:$location){id quantities(names:["available","committed","on_hand"]){name quantity}}}} pageInfo{hasNextPage endCursor}}}`,{query,location:locationId,after});
      for(const v of data.productVariants.nodes) {
        const expected=batch.find(u=>u.sku===v.sku);
        if(!expected)continue;
        if(found.has(v.sku))throw Error(`More than one Shopify variant uses ${v.sku}. Fix the duplicate SKU before changing stock.`);
        if(v.product.handle!==expected.handle)throw Error(`Shopify handle mismatch for ${v.sku}. Reload the catalog before changing stock.`);
        const level=v.inventoryItem.inventoryLevel,q=Object.fromEntries((level?.quantities || []).map(q=>[q.name,q.quantity]));
        found.set(v.sku,{...expected,variantId:v.id,shopifyProductId:v.product.id,inventoryItemId:v.inventoryItem.id,tracked:v.inventoryItem.tracked,policy:v.inventoryPolicy,status:v.product.status,available:q.available ?? null,committed:q.committed ?? 0,onHand:q.on_hand ?? null,levelId:level?.id || null,otherAvailable:v.inventoryQuantity-(q.available || 0)});
      }
      after=data.productVariants.pageInfo.hasNextPage?data.productVariants.pageInfo.endCursor:null;
    }while(after);
  }
  return units.map(u=>found.get(u.sku)||{...u,missing:true});
}
export async function setAvailable(admin,row,locationId,quantity,expected,key) {
  if(!Number.isInteger(quantity)||quantity<0||quantity>10000||!Number.isInteger(expected))throw Error('Refresh stock and enter a whole-number quantity from 0 to 10000.');
  return checked((await admin.call(`mutation SetStudioStock($input:InventorySetQuantitiesInput!,$key:String!){inventorySetQuantities(input:$input) @idempotent(key:$key){inventoryAdjustmentGroup{createdAt} userErrors{message code}}}`,{key,input:{name:'available',reason:'correction',referenceDocumentUri:`gid://custom-build-studio/InventoryChange/${key}`,quantities:[{inventoryItemId:row.inventoryItemId,locationId,quantity,changeFromQuantity:expected}]}})).inventorySetQuantities);
}
export async function addAvailable(admin,row,locationId,delta,key,expected=row.available) {
  if(!Number.isInteger(delta)||delta<1||delta>10000)throw Error('Enter a stock addition from 1 to 10000.');
  if(!Number.isInteger(expected))throw Error('Refresh stock before replenishing this item.');
  // Version the key: the previous request shape was rejected before applying a delta.
  return checked((await admin.call(`mutation AddStudioStock($input:InventoryAdjustQuantitiesInput!,$key:String!){inventoryAdjustQuantities(input:$input) @idempotent(key:$key){inventoryAdjustmentGroup{createdAt} userErrors{message code}}}`,{key:`add-v2-${key}`,input:{name:'available',reason:'received',referenceDocumentUri:`gid://custom-build-studio/InventoryChange/${key}`,changes:[{inventoryItemId:row.inventoryItemId,locationId,delta,changeFromQuantity:expected}]}})).inventoryAdjustQuantities);
}
export async function enforceStockPolicy(admin,row) {
  if(!row.tracked)checked((await admin.call(`mutation TrackStudioStock($id:ID!){inventoryItemUpdate(id:$id,input:{tracked:true}){inventoryItem{id tracked} userErrors{message}}}`,{id:row.inventoryItemId})).inventoryItemUpdate);
  if(row.policy!=='DENY')checked((await admin.call(`mutation StopStudioOverselling($id:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$id,variants:$variants){productVariants{id inventoryPolicy} userErrors{message}}}`,{id:row.shopifyProductId,variants:[{id:row.variantId,inventoryPolicy:'DENY'}]})).productVariantsBulkUpdate);
}
export async function activateStock(admin,row,locationId,key) {
  if(!row.levelId)checked((await admin.call(`mutation ActivateStudioStock($item:ID!,$location:ID!,$key:String!){inventoryActivate(inventoryItemId:$item,locationId:$location,available:0) @idempotent(key:$key){inventoryLevel{id} userErrors{message}}}`,{item:row.inventoryItemId,location:locationId,key})).inventoryActivate);
}
export function publicStock(rows) {
  return Object.fromEntries(rows.map(r=>[r.sku,r.missing||!r.tracked||r.policy!=='DENY'||r.status!=='ACTIVE'||!Number.isInteger(r.available)||r.otherAvailable>0 ? {available:null,sellable:false,unknown:true} : {available:Math.max(0,r.available),sellable:r.available>0,unknown:false}]));
}
