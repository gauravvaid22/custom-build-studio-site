import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import {inventoryDefaults,inventoryUnits,readInventory,enforceStockPolicy,activateStock,setAvailable,initialQuantity} from './inventory.mjs';
// Called only for a new product or a restore, before it becomes available publicly.
export async function initializePublishedInventory(admin,product,dependencies={}){
 const store=dependencies.store || getStore({name:'shop-inventory-v1',consistency:'strong'});
 const settings={...inventoryDefaults(),...await store.get('settings',{type:'json'})};
 if(!settings.enabled)return;
 if(!settings.locationId)throw Error('Choose the inventory fulfillment location before publishing new products.');
 for(const unit of inventoryUnits([product])){
  const key=createHash('sha256').update(`initialize-v1:initialize:${unit.sku}:${settings.locationId}`).digest('hex'),path=`operations/${key}`;
  const previous=await store.get(path,{type:'json'});
  let [row]=await readInventory(admin,[unit],settings.locationId);
  if(row.missing)throw Error('The new product stock could not be found in Shopify.');
  if(row.otherAvailable>0)throw Error('This product has stock at another location. Review inventory before publishing.');
  if(previous?.status==='done'){await enforceStockPolicy(admin,row);continue;}
  const operation=previous || {status:'pending',action:'initialize',sku:unit.sku,locationId:settings.locationId,target:initialQuantity(unit.sku,settings),before:row.available??0,at:new Date().toISOString()};
  if(!previous){const claim=await store.setJSON(path,operation,{onlyIfNew:true});if(claim?.modified===false)throw Error('Stock initialization is already running. Retry publication shortly.');}
  await enforceStockPolicy(admin,row);await activateStock(admin,row,settings.locationId,key.slice(0,48)+'-activate');
  await setAvailable(admin,row,settings.locationId,operation.target,operation.before,key);
  [row]=await readInventory(admin,[unit],settings.locationId);
  if(!row.tracked||row.policy!=='DENY'||!Number.isInteger(row.available))throw Error('Shopify did not confirm the initial stock.');
  const receipt=await store.getWithMetadata('initialized',{type:'json'});
  const saved=await store.setJSON('initialized',{...(receipt?.data||{}),[unit.sku]:{locationId:settings.locationId,at:new Date().toISOString()}},receipt?.etag?{onlyIfMatch:receipt.etag}:{onlyIfNew:true});
  if(saved?.modified===false)throw Error('Stock was saved, but its receipt needs a publication retry.');
  await store.setJSON(path,{...operation,status:'done',result:{sku:unit.sku,available:row.available,tracked:true,policy:'DENY'}});
 }
}
