import {useEffect,useState} from 'react';
import defaults from '../../commerce/delivery-policy.json' with {type:"json"};
import {money} from './Cart';
type Policy=typeof defaults;
type Row={id:string;name:string;oldCents:number;baseCents:number;extraCents:number;newCents:number};
type Job={id:string;status:string;completed:number;total:number;error?:string;revision?:number};
async function request(action:string,body:unknown={}) {
  const response=await fetch(`/.netlify/functions/shop-delivery?action=${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error || 'Delivery settings could not be saved.');return result;
}
export function DeliveryAdmin(){
  const [policy,setPolicy]=useState<Policy>(defaults),[preview,setPreview]=useState<{rows:Row[];skipped:string[];fingerprint:string}|null>(null),[jobs,setJobs]=useState<Job[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[connected,setConnected]=useState(false);
  const [order,setOrder]=useState(''),[collected,setCollected]=useState(false),[reward,setReward]=useState<{code:string;percentage:number;expiresAt:string}|null>(null);
  const load=async(initial=false)=>{try{const result=await request('status');if(initial)setPolicy(result.policy);setJobs(result.jobs);setConnected(result.discountsConnected);}catch(e){setError((e as Error).message);}};
  useEffect(()=>{void load(true);const timer=window.setInterval(()=>{void load();},15000);return()=>window.clearInterval(timer);},[]);
  const updating=jobs.some(j=>['queued','shopify','website'].includes(j.status));
  const change=(next:Policy)=>{setPolicy(next);setPreview(null);setMessage('');};
  async function act(action:string,body:unknown){setBusy(true);setError('');try{const result=await request(action,body);if(action==='preview')setPreview(result);else if(action==='reward')setReward(result.reward);else {setPreview(null);if(result.policy)setPolicy(result.policy);setMessage(action==='save-reward-settings'?'Pickup reward settings saved. The delivery allowance and product prices stay the same. Website update queued.':'Update queued. Shopify prices are verified before the website is published.');await load();}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="delivery-admin"><p className="eyebrow">ONE PRICE. SHIPPING INCLUDED.</p><h2>Pricing, delivery & pickup rewards</h2><p>Each item price includes the standard delivery allowance plus any extra set in its product editor. Pickup uses the same price and earns a code for the next order.</p>
    {error&&<p role="alert" className="shop-checkout-error">{error}</p>}{message&&<p role="status">{message}</p>}
    <fieldset disabled={busy||updating}><legend>Shop-wide settings</legend><div className="form-grid">
      <label>Included delivery allowance per item (CAD)<input type="number" min="0" max="100" step="0.01" value={policy.defaultAllowanceCents/100} onChange={e=>change({...policy,defaultAllowanceCents:Math.round(Number(e.target.value)*100)})}/><small>A bundle is one item. Checkout shipping stays free.</small></label>
      <label>Pickup reward for the next order (%)<input type="number" min="1" max="50" step="1" value={policy.pickupRewardPercent} onChange={e=>change({...policy,pickupRewardPercent:Number(e.target.value)})}/></label>
      <label>Public pickup area<input maxLength={80} value={policy.pickupRegion} onChange={e=>change({...policy,pickupRegion:e.target.value})}/><small>The private address is sent after ordering.</small></label>
      <label>Reward validity (days)<input type="number" min="1" max="365" value={policy.rewardExpiryDays} onChange={e=>change({...policy,rewardExpiryDays:Number(e.target.value)})}/></label>
    </div><label><input type="checkbox" checked={policy.pickupRewardEnabled} onChange={e=>change({...policy,pickupRewardEnabled:e.target.checked})}/> Offer pickup with a next-order reward</label>
    <div className="note-panel"><strong>Customer preview</strong><p>Free tracked shipping in Canada.</p>{policy.pickupRewardEnabled&&<p>Collect in {policy.pickupRegion} and get {policy.pickupRewardPercent}% off your next order. Your code comes in the package.</p>}</div>
    <div className="button-row"><button className="button" onClick={()=>void act('preview',{policy})}>Preview all price changes</button>{policy.active&&<button className="button button-dark" onClick={()=>void act('save-reward-settings',{policy})}>Save pickup reward settings only</button>}</div></fieldset>
    {preview&&<><h3>Review before publishing</h3><p>{preview.rows.length} purchasable options. Base prices are preserved on future updates. Items without a Shopify connection are not made purchasable.</p>{preview.skipped.length>0&&<details><summary>{preview.skipped.length} unconnected items</summary><p>{preview.skipped.join(', ')}</p></details>}
      <div className="delivery-table"><table><thead><tr><th>Product / option</th><th>Current</th><th>Base</th><th>Extra</th><th>New displayed price</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.id}><th>{row.name}<small>{row.id}</small></th><td>{money(row.oldCents)}</td><td>{money(row.baseCents)}</td><td>{money(row.extraCents)}</td><td><strong>{money(row.newCents)}</strong></td></tr>)}</tbody></table></div>
      <button className="button" disabled={busy||updating} onClick={()=>void act('apply',{fingerprint:preview.fingerprint})}>Apply reviewed prices & publish website</button></>}
    {jobs.map(job=><div className="note-panel" key={job.id}><strong>{job.status==='website'?'Publishing website':job.status==='live'?'Live':job.status}</strong>{job.total>0?<p>{job.completed || 0} / {job.total} Shopify products verified.</p>:<p>Pickup reward settings.</p>}{job.error&&<><p role="alert">{job.error}</p><button className="button" disabled={busy||updating} onClick={()=>void act('retry',{id:job.id})}>Resume update</button></>}</div>)}
    <fieldset><legend>Pickup reward cards</legend><p>After confirming payment and handing over the order, issue a unique single-use code. It applies to the customer's next order, not today's purchase.</p>{!connected&&<p role="status">Shopify discount permission is not connected yet. Rewards cannot be issued until it is connected.</p>}
      <label>Paid Shopify order number<input placeholder="e.g. #1001" value={order} onChange={e=>{setOrder(e.target.value);setCollected(false);setReward(null);}}/></label>
      <label><input type="checkbox" checked={collected} onChange={e=>setCollected(e.target.checked)}/> I checked this order in Shopify: payment received and customer has collected it.</label>
      <a className="text-link" href="https://admin.shopify.com/store/aqk73w-k2/orders" target="_blank" rel="noopener noreferrer">Check Shopify orders ↗</a>
      <button className="button" disabled={busy||!connected||!collected||!order} onClick={()=>void act('reward',{orderReference:order,collected})}>Create / retrieve package coupon</button>
      {reward&&<div className="pickup-reward-card"><h3>Thank you for collecting locally</h3><p>{reward.percentage}% off your next order</p><strong>{reward.code}</strong><p>Use at checkout before {new Date(reward.expiresAt).toLocaleDateString('en-CA')}. Single use.</p><button className="text-link" onClick={()=>window.print()}>Print card</button></div>}
    </fieldset>
  </section>;
}
