import { FormEvent, useEffect, useState } from "react";
import source from "../../commerce/headphone-stands-source.json";
import { useShopifyCatalog } from "./ShopifyCatalog";
import { money } from "./Cart";

export function HeadphonePricingAdmin({ adminKey, items = source.products, heading = "HEADPHONE STANDS" }: { adminKey: string; items?: {id: string; name: string; priceCents: number}[]; heading?: string }) {
  const { prices, refresh } = useShopifyCatalog();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDrafts((current) => Object.fromEntries(items.map((item) => [
      item.id, current[item.id] ?? ((prices[item.id] ?? item.priceCents) / 100).toFixed(2),
    ])));
  }, [prices, items]);

  async function action(id: string, task: "create-missing" | "update-price", priceCents?: number) {
    setBusy(id); setError(""); setMessage("");
    try {
      const response = await fetch("/.netlify/functions/shop-headphones", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ action: task, id, ...(priceCents === undefined ? {} : { priceCents }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Shopify could not save the product.");
      await refresh();
      setMessage(task === "create-missing" ? `${id}: ${result.status === "created" ? "created in Shopify" : "already in Shopify"}. Check its sales-channel availability before selling.` : "Delivery and pickup prices updated in Shopify. Refresh the product page to see the new prices.");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const value = drafts[id] || "";
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) { setError("Enter a valid CAD price."); return; }
    await action(id, "update-price", Math.round(Number(value) * 100));
  }

  return <section className="shop-admin-headphones" aria-label={`${heading} prices`}>
    <div className="section-heading"><div><p className="eyebrow">{heading}</p><h3>Edit delivered prices here</h3></div><p>Pickup is always CA$10 lower. Saving changes both Shopify variants and the live website price.</p></div>
    <div className="shop-admin-headphone-grid">
      {items.map((item) => <form key={item.id} onSubmit={(event) => void save(event, item.id)}>
        <strong>{item.name}</strong>
        <label>Delivered price (CAD)
          <input type="number" inputMode="decimal" min="15" max="1000" step="0.01" required value={drafts[item.id] || ""} onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })} />
        </label>
        <small>Current Shopify: {prices[item.id] ? money(prices[item.id]) : "not yet available"} CAD delivered · {prices[`${item.id}-pickup`] ? money(prices[`${item.id}-pickup`]) : "—"} CAD pickup</small>
        <div className="shop-admin-headphone-actions">
          <button className="button" disabled={Boolean(busy)}>{busy === item.id ? "Working…" : "Save price"}</button>
          {!prices[item.id] && <button type="button" className="button button-dark" disabled={Boolean(busy)} onClick={() => void action(item.id, "create-missing")}>Create in Shopify</button>}
        </div>
      </form>)}
    </div>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
