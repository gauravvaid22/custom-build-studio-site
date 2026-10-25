import {getStore} from '@netlify/blobs';
import {createHash} from 'node:crypto';
import baseline from '../../commerce/catalog-baseline.json' with {type:'json'};
import {catalogStore,readState} from '../../commerce/catalog-store.mjs';
import {compileCatalog} from '../../commerce/catalog-management.mjs';
import {requireAdmin} from '../../commerce/admin-session.mjs';
import {createShopifyAdmin} from '../../commerce/shopify-admin.mjs';
import {inventoryDefaults,validateInventorySettings,inventoryUnits,initialQuantity,inventoryConnection,readInventory,setAvailable,addAvailable,enforceStockPolicy,activateStock,publicStock} from '../../commerce/inventory.mjs';
const admin=createShopifyAdmin({legacyToken:process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,clientId:process.env.SHOPIFY_CLIENT_ID,clientSecret:process.env.SHOPIFY_CLIENT_SECRET});
const reply=(data,status=200,cache='no-store')=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':cache,'X-Robots-Tag':'noindex'}});
let cached=null;
export default async(request,context)=>{
 try {
  const action=new URL(request.url).searchParams.get('action') || 'list';
  const production=(context?.deploy?.context || process.env.CONTEXT)==='production';
  const store=getStore({name:production?'shop-inventory-v1':`shop-inventory-preview-${context?.deploy?.id || 'local'}`,consistency:'strong'});
  const settings=validateInventorySettings({...inventoryDefaults(),...await store.get('settings',{type:'json'})});
  if(action==='status'&&request.method==='GET') {
   if(!settings.enabled)return reply({enabled:false,stock:{}});
   if(!new URL(request.url).searchParams.has('fresh')&&cached&&Date.now()-cached.at<15000)return reply(cached.data);
   const {state}=await readState(catalogStore(context)),catalog=compileCatalog(baseline.products,state.collections||baseline.collections,Object.values(state.documents),state.archived);
   const rows=await readInventory(admin,inventoryUnits(catalog.products),settings.locationId);
   const data={enabled:true,stock:publicStock(rows),lowStockThreshold:settings.lowStockThreshold,checkedAt:new Date().toISOString()};cached={at:Date.now(),data};return reply(data);
  }
  requireAdmin(request);
  if(request.method!=='POST')return reply({error:'Use POST.'},405);
  const raw=await request.text();if(raw.length>50000)throw Error('Inventory request is too large.');const body=raw?JSON.parse(raw):{};
  const connection=await inventoryConnection(admin);
  if(action==='connection')return reply({settings,...connection});
  if(connection.missing.length)throw Error(`The Shopify app needs these inventory permissions: ${connection.missing.join(', ')}. No stock has been changed.`);
  const locationId=settings.locationId || (connection.locations.length===1?connection.locations[0].id:'');
  if(action!=='settings'&&!connection.locations.some(l=>l.id===locationId))throw Error('Choose an active Shopify location that fulfills online orders.');
  const {state}=await readState(catalogStore(context)),catalog=compileCatalog(baseline.products,state.collections||baseline.collections,Object.values(state.documents),state.archived),units=inventoryUnits(catalog.products);
  if(action==='list') {
   const rows=await readInventory(admin,units,locationId);
   const initialized=await store.get('initialized',{type:'json'}) || {};
   return reply({settings:{...settings,locationId},...connection,rows:rows.map(r=>({...r,initialQuantity:initialQuantity(r.sku,settings),initialized:initialized[r.sku]?.locationId===locationId})),history:(await store.get('history',{type:'json'}))||[],checkedAt:new Date().toISOString()});
  }
  if(!production)throw Error('Inventory writes are only available in the production admin.');
  if(action==='settings') {
   const next=validateInventorySettings(body.settings);
   if(next.locationId!==locationId&&settings.enabled)throw Error('Inventory is already active. Reconcile stock in Shopify before changing location.');
   if(!connection.locations.some(l=>l.id===next.locationId))throw Error('Choose an eligible location.');
   if(next.enabled&&!settings.enabled){const rows=await readInventory(admin,units,next.locationId);if(rows.some(r=>r.missing||!r.tracked||r.policy!=='DENY'||!r.levelId||r.otherAvailable>0))throw Error('Initialize all connected stock rows before enabling shop stock controls.');}
   await store.setJSON('settings',next);cached=null;return reply({saved:true,settings:next});
  }
  if(!['initialize','adjust','correct','policy'].includes(action))throw Error('Unknown inventory action.');
  if(!/^[a-zA-Z0-9-]{16,100}$/.test(body.operationId || ''))throw Error('A valid stock operation ID is required.');
  const selections=action==='initialize'?body.skus:[body.sku];
  if(!Array.isArray(selections)||selections.length<1||selections.length>5||new Set(selections).size!==selections.length||selections.some(s=>!units.some(u=>u.sku===s)))throw Error('Choose one to five current shop stock items.');
  const results=[];
  for(const sku of selections) {
   const key=createHash('sha256').update(`${action==='initialize'?'initialize-v1':body.operationId}:${action}:${sku}:${locationId}`).digest('hex'),path=`operations/${key}`;
   const previous=await store.get(path,{type:'json'});
   if(previous?.status==='done'){results.push(previous.result);continue;}
   const claimed=previous || {status:'pending',action,sku,locationId,at:new Date().toISOString(),quantity:body.quantity,expected:body.expected};
   if(!previous){const claim=await store.setJSON(path,claimed,{onlyIfNew:true});if(claim?.modified===false)throw Error('This stock change is already running. Refresh before retrying.');}
   else if(previous.action!==action||previous.quantity!==body.quantity||previous.expected!==body.expected)throw Error('This operation ID belongs to a different stock change.');
   try {
    const unit=units.find(u=>u.sku===sku);let [row]=await readInventory(admin,[unit],locationId);
    if(row.missing||row.status!=='ACTIVE')throw Error('This product is missing or inactive in Shopify.');
    if(row.otherAvailable>0)throw Error('This SKU also has stock at another location. Reconcile those quantities in Shopify first.');
    if(action==='initialize') {
     const initialized=await store.get('initialized',{type:'json'}) || {};
     if(initialized[sku]?.locationId===locationId){const result={sku,skipped:true,message:'Already initialized; current stock preserved.'};await store.setJSON(path,{...claimed,status:'done',result});results.push(result);continue;}
     // Persist the original target and CAS quantity before any write. Retries must never replenish a sold unit.
     if(!previous){claimed.target=initialQuantity(sku,settings);claimed.before=row.available ?? 0;claimed.snapshot=row;await store.setJSON(path,claimed);}
     if(!Number.isInteger(claimed.target)||!Number.isInteger(claimed.before))throw Error('Initialization needs review. Refresh before retrying.');
     await enforceStockPolicy(admin,row);await activateStock(admin,row,locationId,key.slice(0,48)+'-activate');
     await setAvailable(admin,row,locationId,claimed.target,claimed.before,key);
    } else {
     if(!row.tracked||!row.levelId)throw Error('Initialize stock before editing the quantity.');
     await enforceStockPolicy(admin,row);
     if(action==='adjust')await addAvailable(admin,row,locationId,claimed.quantity,key,claimed.expected);
     if(action==='correct')await setAvailable(admin,row,locationId,claimed.quantity,claimed.expected,key);
    }
    [row]=await readInventory(admin,[unit],locationId);
    if(!row.tracked||row.policy!=='DENY'||!Number.isInteger(row.available))throw Error('Shopify did not confirm the stock settings. Refresh and review this item.');
    const result={sku,available:row.available,committed:row.committed,tracked:row.tracked,policy:row.policy};
    if(action==='initialize'){const initialized=await store.getWithMetadata('initialized',{type:'json'});const updated=await store.setJSON('initialized',{...(initialized?.data||{}),[sku]:{locationId,at:new Date().toISOString()}},initialized?.etag?{onlyIfMatch:initialized.etag}:{onlyIfNew:true});if(updated?.modified===false)throw Error('Stock was initialized, but its receipt needs a retry.');}
    await store.setJSON(path,{...claimed,status:'done',result});
    const history=await store.get('history',{type:'json'})||[];await store.setJSON('history',[{at:new Date().toISOString(),action,sku,available:row.available,reason:String(body.reason || 'Owner stock update').slice(0,200)},...history].slice(0,150));
    results.push(result);
   }catch(error){results.push({sku,error:error.message});}
  }
  cached=null;return reply({results});
 }catch(error){return reply({error:error.message},error.status||400);}
};
