import {useEffect,useRef,useState} from 'react';
import './inventory.css';
type Settings={version:number;enabled:boolean;locationId:string;defaultQuantity:number;lowStockThreshold:number;overrides:Record<string,number>};
type Row={sku:string;name:string;option:string;category:string;available:number|null;committed:number;tracked:boolean;policy:string;missing?:boolean;initialized:boolean;initialQuantity:number;otherAvailable:number;status:string};
type Data={settings:Settings;locations:{id:string;name:string}[];missing:string[];rows?:Row[];history?:{at:string;action:string;sku:string;available:number;reason:string}[];checkedAt?:string};
export async function inventoryRequest(action:string,body:unknown={}) {
 const response=await fetch(`/.netlify/functions/shop-inventory?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const data=await response.json();if(!response.ok)throw Error(data.error || 'Unable to update stock.');return data;
}
export function InventoryAdmin(){
 const [data,setData]=useState<Data|null>(null),[settings,setSettings]=useState<Settings|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[amounts,setAmounts]=useState<Record<string,string>>({}),[reason,setReason]=useState('Stock received');
 const operations=useRef<Record<string,string>>({});
 async function load(){const connection:Data=await inventoryRequest('connection');setData(connection);setSettings({...connection.settings,locationId:connection.settings.locationId || (connection.locations.length===1?connection.locations[0].id:'')});if(connection.missing.length || (!connection.settings.locationId&&connection.locations.length!==1))return;const result:Data=await inventoryRequest('list');setData(result);setSettings(result.settings);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function saveSettings(){if(!settings)return;await inventoryRequest('settings',{settings});await load();setMessage('Inventory settings saved.');}
 async function change(row:Row,action:'adjust'|'correct'){
  const quantity=Number(amounts[row.sku] ?? '3');if(!Number.isInteger(quantity)||quantity<0||(action==='adjust'&&quantity===0))throw Error('Enter a valid whole-number quantity.');
  const signature=`${action}:${row.sku}:${quantity}:${row.available}`;
  const storageKey=`cbs-stock-operation:${signature}`;
  let operationId=operations.current[signature] || sessionStorage.getItem(storageKey) || crypto.randomUUID();operations.current[signature]=operationId;sessionStorage.setItem(storageKey,operationId);
  const result=await inventoryRequest(action,{sku:row.sku,quantity,expected:row.available,reason,operationId});
  if(result.results[0]?.error)throw Error(result.results[0].error);
  delete operations.current[signature];sessionStorage.removeItem(storageKey);await load();setMessage(`${row.name}${row.option?' — '+row.option:''}: stock saved in Shopify.`);
 }
 async function initialize(){
  if(!data?.rows)return;
  const rows=data.rows.filter(r=>!r.initialized&&!r.missing&&r.status==='ACTIVE');
  for(let i=0;i<rows.length;i+=5){setMessage(`Initializing ${Math.min(i+5,rows.length)} of ${rows.length} stock items…`);const result=await inventoryRequest('initialize',{skus:rows.slice(i,i+5).map(r=>r.sku),operationId:crypto.randomUUID(),reason:'Initial shop stock'});const errors=result.results.filter((r:{error?:string})=>r.error);if(errors.length){await load();throw Error(errors.map((r:{sku:string;error:string})=>`${r.sku}: ${r.error}`).join('; '));}}
  await load();setMessage('Initial quantities saved in Shopify. Enable stock controls below after reviewing the table.');
 }
 const rows=(data?.rows||[]).filter(r=>(`${r.name} ${r.option} ${r.sku} ${r.category}`).toLowerCase().includes(query.toLowerCase())).filter(r=>filter==='all'||filter==='sold'&&r.available===0||filter==='low'&&r.available!==null&&r.available>0&&r.available<=(settings?.lowStockThreshold??1)||filter==='attention'&&(r.missing||!r.tracked||r.policy!=='DENY'||!r.initialized||r.otherAvailable>0));
 return <section className="inventory-admin"><p className="eyebrow">SHOPIFY STOCK</p><h2>Inventory</h2><p>Each design and size has its own stock. Placed orders use Shopify’s stock automatically. Replenish when you are ready to accept more orders.</p>
 {error&&<p role="alert" className="shop-checkout-error">{error}</p>}{message&&<p role="status">{message}</p>}
 <button type="button" className="button button-dark" disabled={busy} onClick={()=>void run(load)}>Refresh stock</button>
 {!data&&<p>Loading Shopify inventory…</p>}
 {!!data?.missing.length&&<div className="note-panel"><strong>Shopify inventory permission needed</strong><p>The private app needs: {data.missing.join(', ')}. Stock has not been changed.</p></div>}
 {settings&&<fieldset disabled={busy||!!data?.missing.length}><legend>Stock defaults & connection</legend>
 <label>Fulfillment location<select value={settings.locationId} onChange={e=>setSettings({...settings,locationId:e.target.value})}><option value="">Select location…</option>{data?.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 <label>Default quantity for new products<input type="number" min="0" max="10000" value={settings.defaultQuantity} onChange={e=>setSettings({...settings,defaultQuantity:Number(e.target.value)})}/></label>
 <label>Low-stock threshold<input type="number" min="0" max="10000" value={settings.lowStockThreshold} onChange={e=>setSettings({...settings,lowStockThreshold:Number(e.target.value)})}/></label>
 <label><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/> Enable website stock controls</label>
 <p className="small">Default changes apply to new stock only. Photo, price and description edits never replenish inventory.</p>
 <details><summary>Product and pack exceptions</summary><p>Each pack is one stock unit. For example, 20 ten-packs can supply 200 individual animals. Pack purchases do not reduce singles stock.</p>
 {Object.entries(settings.overrides).map(([sku,value])=><div className="inventory-exception" key={sku}><label>{sku}<input aria-label={`Default stock for ${sku}`} type="number" min="0" max="10000" value={value} onChange={e=>setSettings({...settings,overrides:{...settings.overrides,[sku]:Number(e.target.value)}})}/></label><button type="button" onClick={()=>{const overrides={...settings.overrides};delete overrides[sku];setSettings({...settings,overrides});}}>Remove exception</button></div>)}
 <label>Add exception for a product<select value="" onChange={e=>e.target.value&&setSettings({...settings,overrides:{...settings.overrides,[e.target.value]:settings.defaultQuantity}})}><option value="">Choose a stock item…</option>{data?.rows?.filter(r=>settings.overrides[r.sku]===undefined).map(r=><option key={r.sku} value={r.sku}>{r.name} {r.option}</option>)}</select></label></details>
 <button type="button" className="button" onClick={()=>void run(saveSettings)}>Save inventory settings</button></fieldset>}
 {!!data?.rows?.length&&<><details className="note-panel"><summary>Initial stock setup — review before applying</summary><p>Set each uninitialized stock item to its proposed quantity below. Existing orders remain committed; these are additional units available to buy. Already initialized items are preserved on retries.</p><p>{data.rows.filter(r=>!r.initialized&&!r.missing&&r.status==='ACTIVE').length} items pending. Most start at {settings?.defaultQuantity}; exceptions use their saved quantities.</p><button type="button" className="button" disabled={busy} onClick={()=>void run(initialize)}>Initialize pending stock</button></details>
 <div className="inventory-filters"><label>Find stock<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All stock items</option><option value="sold">Sold out</option><option value="low">Low stock</option><option value="attention">Needs attention</option></select></label><label>Adjustment note<input maxLength={200} value={reason} onChange={e=>setReason(e.target.value)}/></label></div>
 <p className="small">Last checked: {data.checkedAt?new Date(data.checkedAt).toLocaleString():'—'}. Refresh before correcting an absolute quantity.</p>
 <div className="inventory-table-wrap"><table><thead><tr><th>Product / design</th><th>Available</th><th>Committed</th><th>Status / proposed start</th><th>Update stock</th></tr></thead><tbody>{rows.map(r=><tr key={r.sku}><td><strong>{r.name}</strong>{r.option&&<span>{r.option}</span>}<small>{r.sku}</small></td><td>{r.available??'—'}</td><td>{r.committed??'—'}</td><td>{r.missing?'Not connected':!r.tracked?'Tracking off':r.policy!=='DENY'?'Overselling enabled':r.otherAvailable>0?'Other location stock':r.available===0?'Sold out':'Tracked'}{!r.initialized&&<small>Proposed start: {r.initialQuantity}</small>}</td><td><div className="inventory-row-actions"><input aria-label={`Stock amount for ${r.sku}`} type="number" min="0" max="10000" value={amounts[r.sku]??'3'} onChange={e=>setAmounts({...amounts,[r.sku]:e.target.value})}/><button type="button" disabled={busy||!r.tracked||r.missing} onClick={()=>void run(()=>change(r,'adjust'))}>Add stock</button><button type="button" disabled={busy||!r.tracked||r.missing} onClick={()=>void run(()=>change(r,'correct'))}>Set available</button></div></td></tr>)}</tbody></table></div>
 <details><summary>Recent stock changes</summary>{data.history?.map((h,i)=><p key={i}>{new Date(h.at).toLocaleString()} · {h.sku} · {h.action} · available {h.available} · {h.reason}</p>)}</details></>}
 </section>;
}
