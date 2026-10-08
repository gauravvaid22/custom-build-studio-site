import { createContext, useContext, useEffect, useState } from "react";
import pricing from "../../commerce/pricing.json";

export type FulfillmentMode = "delivered" | "pickup";
export const PICKUP_PRICE_DIFFERENCE = pricing.pickupPriceDifferenceCents;
const Context = createContext({ mode: "delivered" as FulfillmentMode, chosen: false, locked: false, choose: (_mode: FulfillmentMode) => {}, lock: (_value: boolean) => {} });

export function FulfillmentProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<FulfillmentMode>("delivered");
  const [chosen, setChosen] = useState(false);
  const [locked, lock] = useState(false);
  useEffect(() => {
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
    setMode(next); setChosen(true);
    try { localStorage.setItem("cbs-fulfillment-v1", next); } catch {}
  }
  return <Context.Provider value={{ mode, chosen, locked, choose, lock }}>{children}</Context.Provider>;
}

export const useFulfillment = () => useContext(Context);
export function FulfillmentIcon({ pickup }: { pickup: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
    {pickup ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></> : <><path d="M3 5h11v12H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>}
  </svg>;
}
export function FulfillmentSelector({ welcome = false }: { welcome?: boolean }) {
  const { mode, chosen, choose, locked } = useFulfillment();
  const expanded = welcome && !chosen;
  return <section className={`container fulfillment-selector ${expanded ? "fulfillment-welcome" : ""}`} aria-label="Choose pickup or delivery">
    {expanded && <div><span className="eyebrow">YOUR GIFTS. YOUR WAY.</span><h2>How will you get yours?</h2></div>}
    <div className="fulfillment-choices" role="group" aria-label="Order handoff">
      <button type="button" aria-pressed={mode === "pickup"} disabled={locked} onClick={() => choose("pickup")}>
        <FulfillmentIcon pickup/><span><strong>Edmonton pickup</strong><small>Southeast Edmonton · by appointment</small></span><span className="fulfillment-check" aria-hidden="true">{mode === "pickup" ? "✓" : ""}</span>
      </button>
      <button type="button" aria-pressed={mode === "delivered"} disabled={locked} onClick={() => choose("delivered")}>
        <FulfillmentIcon pickup={false}/><span><strong>Delivered to you</strong><small>Free tracked shipping across Canada</small></span><span className="fulfillment-check" aria-hidden="true">{mode === "delivered" ? "✓" : ""}</span>
      </button>
    </div>
    <p className="fulfillment-help" role="status">{mode === "pickup" ? "Pickup prices shown. We’ll arrange your time and send the private address after you order. No delivery included." : "Delivered prices shown. Shipping is included."} {expanded ? "You can switch anytime before checkout." : "Changing this updates every item in your cart."}</p>
  </section>;
}
