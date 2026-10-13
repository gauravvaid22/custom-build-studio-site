import { createContext, useContext, useEffect, useState } from "react";
import { trackShopInteraction } from "./Analytics";
import deliveryDefaults from "../../commerce/delivery-policy.json" with {type:"json"};
import pricing from "../../commerce/pricing.json";

export type FulfillmentMode = "delivered" | "pickup";
export const PICKUP_PRICE_DIFFERENCE = pricing.pickupPriceDifferenceCents;
const Context = createContext({ mode: "delivered" as FulfillmentMode, chosen: false, locked: false, policy: deliveryDefaults, pickupRequested: false, choose: (_mode: FulfillmentMode) => {}, lock: (_value: boolean) => {} });

export function FulfillmentProvider({ children }: { children: React.ReactNode }) {
  const [policy,setPolicy]=useState(deliveryDefaults);
  const [pickupRequested,setPickupRequested]=useState(false);
  useEffect(()=>{try{setPickupRequested(sessionStorage.getItem('cbs-pickup-request-v2')==='yes');}catch{}},[]);
  useEffect(()=>{if(policy.active && !policy.pickupRewardEnabled){setPickupRequested(false);try{sessionStorage.removeItem('cbs-pickup-request-v2');}catch{}}},[policy.active,policy.pickupRewardEnabled]);
  useEffect(()=>{void fetch("/.netlify/functions/shop-delivery?action=public",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(data?.policy){setPolicy(data.policy);if(data.policy.active){setMode("delivered");try{localStorage.removeItem("cbs-fulfillment-v1");}catch{}}}}).catch(()=>{});},[]);
  const [mode, setMode] = useState<FulfillmentMode>("delivered");
  const [chosen, setChosen] = useState(false);
  const [locked, lock] = useState(false);
  useEffect(() => {
    if(deliveryDefaults.active)return;
    try {
      const requested = new URLSearchParams(window.location.search).get("fulfillment");
      if (requested === "delivered" || requested === "pickup") {
        setMode(requested); setChosen(true);
        localStorage.setItem("cbs-fulfillment-v1", requested);
        return;
      }
      const saved = localStorage.getItem("cbs-fulfillment-v1");
      if (saved === "pickup" || saved === "delivered") { setMode(saved); setChosen(true); }
    } catch { /* Browsing still works without device storage. */ }
  }, []);
  function choose(next: FulfillmentMode) {
    if (locked) return;
    if(policy.active){setPickupRequested(next==="pickup");try{sessionStorage.setItem('cbs-pickup-request-v2',next==="pickup"?'yes':'no');}catch{}trackShopInteraction('select_fulfillment',{fulfillment_method:next});return;}
    if (next !== mode) trackShopInteraction("select_fulfillment", { fulfillment_method: next });
    setMode(next); setChosen(true);
    try { localStorage.setItem("cbs-fulfillment-v1", next); } catch {}
  }
  return <Context.Provider value={{ mode:policy.active?"delivered":mode, chosen, locked, policy, pickupRequested, choose, lock }}>{children}</Context.Provider>;
}

export const useFulfillment = () => useContext(Context);
export function FulfillmentIcon({ pickup }: { pickup: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
    {pickup ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></> : <><path d="M3 5h11v12H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>}
  </svg>;
}
export function FulfillmentSelector({ welcome = false, compact = false }: { welcome?: boolean; compact?: boolean }) {
  const { mode, chosen, choose, locked, policy } = useFulfillment();
  if(policy.active)return <div className="container delivery-assurance"><FulfillmentIcon pickup={false}/><span><strong>Free tracked shipping in Canada</strong>{policy.pickupRewardEnabled&&<small>Collect locally in {policy.pickupRegion} and get {policy.pickupRewardPercent}% off your next order. Select pickup in your cart.</small>}</span></div>;
  const expanded = welcome && !chosen;
  return <section className={`container fulfillment-selector ${expanded ? "fulfillment-welcome" : ""} ${compact ? "fulfillment-compact" : ""}`} aria-label="Choose pickup or delivery">
    {expanded && <div><span className="eyebrow">YOUR GIFTS. YOUR WAY.</span><h2>How will you get yours?</h2></div>}
    <div className="fulfillment-choices" role="group" aria-label="Order handoff">
      <button type="button" aria-pressed={mode === "pickup"} disabled={locked} onClick={() => choose("pickup")}>
        <FulfillmentIcon pickup/><span><strong>Edmonton pickup</strong><small>Southeast Edmonton · by appointment</small></span><span className="fulfillment-check" aria-hidden="true">✓</span>
      </button>
      <button type="button" aria-pressed={mode === "delivered"} disabled={locked} onClick={() => choose("delivered")}>
        <FulfillmentIcon pickup={false}/><span><strong>Delivered to you</strong><small>Canadian tracked shipping · rate shown in cart</small></span><span className="fulfillment-check" aria-hidden="true">✓</span>
      </button>
    </div>
    <p className="fulfillment-help" role="status">{compact ? (mode === "pickup" ? "Pickup prices · Southeast Edmonton · address sent after ordering." : "Delivered prices · shipping shown in cart.") : mode === "pickup" ? "Pickup prices shown. We’ll arrange your time and send the private address after you order. No delivery included." : "Delivered prices shown. Most items include shipping; accessory-set shipping is shown in your cart."} {compact ? "" : expanded ? "You can switch anytime before checkout." : "Changing this updates every item in your cart."}</p>
  </section>;
}

export function PickupPreference(){
 const {policy,pickupRequested,choose,locked}=useFulfillment();
 if(!policy.active || !policy.pickupRewardEnabled)return null;
 return <div className="pickup-preference"><label><input type="checkbox" checked={pickupRequested} disabled={locked} onChange={e=>choose(e.target.checked?"pickup":"delivered")}/><span><strong>I’ll collect in {policy.pickupRegion}</strong><small>Get {policy.pickupRewardPercent}% off your next order. Your promo code comes in the package after collection.</small></span></label><p>{pickupRequested?"We’ll contact you to arrange a time and send the private pickup address. This order is marked for collection, not shipping.":"Prefer local pickup? Check the box and we’ll arrange it after ordering."} Today’s price stays the same.</p></div>;
}
