import { useEffect, useState } from "react";
import products from "../../commerce/products.json";
import collections from "../../commerce/collections.json";
import { money } from "./Cart";
import { PICKUP_PRICE_DIFFERENCE } from "./Fulfillment";

type Config = { title: string; percentage: number; minimumPickupPriceCents: number; scope: "all" | "collection" | "products"; collectionId: string; productIds: string[]; startAt: string; endAt: string };
type Row = { productId: string; name: string; sku: string; regularDelivered: number; saleDelivered: number; regularPickup: number; salePickup: number };
type Preview = { config: Config; rows: Row[]; fingerprint: string };
type Status = { status: string; admin?: { status: string; config?: Config; lastError?: string; warning?: string; updatedAt?: string; count?: number } };
const baseProducts = products.filter((product) => !("variantOf" in product));
const saleCollections = collections.filter((collection) => collection.kind !== "curated");
const localInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const initialConfig = (): Config => ({ title: "Studio sale", percentage: 10, minimumPickupPriceCents: 100, scope: "all", collectionId: saleCollections[0].id, productIds: [], startAt: "", endAt: localInput(new Date(Date.now() + 7 * 86400000)) });
const toApiConfig = (config: Config) => ({ ...config, startAt: config.startAt ? new Date(config.startAt).toISOString() : null, endAt: new Date(config.endAt).toISOString() });
const fromApiConfig = (config: Config): Config => ({ ...config, startAt: config.startAt ? localInput(new Date(config.startAt)) : "", endAt: config.endAt ? localInput(new Date(config.endAt)) : initialConfig().endAt });
const editableConfig = (config: Config): Config => {
  const local = fromApiConfig(config);
  return new Date(local.endAt).getTime() > Date.now() ? local : { ...local, startAt: "", endAt: initialConfig().endAt };
};
const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

async function saleApi(action: string, key: string, body: object = {}) {
  const response = await fetch(`/.netlify/functions/shop-sale?action=${action}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Sale settings could not be updated.");
  return result;
}

export function SaleAdmin({ adminKey }: { adminKey: string }) {
  const [config, setConfig] = useState<Config>(initialConfig);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [discountsChecked, setDiscountsChecked] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    saleApi("admin-status", adminKey).then((result) => {
      if (!active) return;
      setStatus(result.sale);
      setConfigured(result.shopifyAdminConfigured === true);
      if (result.sale.admin?.config) setConfig(editableConfig({ ...result.sale.admin.config, collectionId: result.sale.admin.config.collectionId || saleCollections[0].id }));
    }).catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [adminKey]);
  const change = (next: Config) => { setConfig(next); setPreview(null); setDiscountsChecked(false); setNotice(""); };
  async function run(action: "preview" | "publish" | "schedule" | "end" | "cancel-schedule") {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await saleApi(action, adminKey, action === "preview" ? { config: toApiConfig(config) } : ["publish", "schedule"].includes(action) ? { config: preview?.config, fingerprint: preview?.fingerprint, discountsChecked } : {});
      if (action === "preview") { setPreview(result.preview); setNotice("Review the prices below before turning on the sale."); }
      else { setStatus(result.sale); setPreview(null); if (["end", "cancel-schedule"].includes(action)) setConfig((old) => ({ ...old, startAt: "", endAt: initialConfig().endAt })); setNotice(action === "publish" ? "Sale prices verified in Shopify. The public sale is now active." : action === "schedule" ? "Sale scheduled. Shopify prices will change after the selected start time." : action === "cancel-schedule" ? "Scheduled sale cancelled. Shopify prices were not changed." : "Original Shopify prices restored. The public sale is off."); }
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const active = status?.admin?.status === "active";
  const scheduled = status?.admin?.status === "scheduled";
  const scheduleError = status?.admin?.status === "schedule-error";
  const attention = ["needs-attention", "publishing", "ending"].includes(status?.admin?.status || "");
  return <section className="sale-admin">
    <div className="section-heading"><div><p className="eyebrow">SHOPIFY-CONNECTED PROMOTIONS</p><h2>Sales</h2></div><p>One sale at a time. Prices change in Shopify before the website shows sale artwork.</p></div>
    <div className="sale-admin-status" role="status">
      <strong>{active ? "Sale active" : scheduled ? "Sale scheduled" : scheduleError || attention ? "Sale needs attention" : "No active sale"}</strong>
      {status?.admin?.config && <span>{status.admin.config.title} · {status.admin.config.percentage}% · {status.admin.count} products</span>}
      {status?.admin?.config?.startAt && scheduled && <span>Starts {dateLabel(status.admin.config.startAt)}</span>}
      {status?.admin?.config?.endAt && (active || scheduled) && <span>Ends {dateLabel(status.admin.config.endAt)}</span>}
      {status?.admin?.lastError && <span>{status.admin.lastError}</span>}
      {status?.admin?.warning && <span role="alert">{status.admin.warning}</span>}
    </div>
    {configured === false && <p className="sale-admin-error" role="alert">Shopify Admin access is not connected yet. Add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET as private Netlify environment variables after installing a Shopify app with product read/write access. This sale cannot be turned on until then.</p>}
    <button type="button" className="text-link" onClick={() => void saleApi("admin-status", adminKey).then((result) => { setStatus(result.sale); setConfigured(result.shopifyAdminConfigured === true); }).catch((err) => setError(err.message))}>Refresh Shopify sale status ↗</button>
    {scheduled || scheduleError ? <div className="sale-admin-actions"><p>{scheduleError ? "Shopify prices changed or the scheduled start could not be completed. Cancel and preview again." : "The sale will begin automatically after the selected start time. You can cancel before it starts."}</p><button className="button" type="button" disabled={busy} onClick={() => void run("cancel-schedule")}>{busy ? "Working…" : "Cancel scheduled sale"}</button></div> : active || attention ? <div className="sale-admin-actions">
      <p>{attention ? "Recovery will restore variants that still match the sale prices. A manual Shopify edit will be flagged instead of overwritten." : "Ending restores the saved regular prices and removes the sale display."}</p>
      <button className="button" type="button" disabled={busy} onClick={() => void run("end")}>{busy ? "Working with Shopify…" : attention ? "Recover original prices" : "End sale & restore prices"}</button>
    </div> : <>
      <div className="sale-admin-grid">
        <form className="quote-form shop-admin-settings" onSubmit={(event) => { event.preventDefault(); void run("preview"); }}>
          <label>Sale name<input required maxLength={70} value={config.title} onChange={(e) => change({ ...config, title: e.target.value })} /></label>
          <label>Sale percentage<input required type="number" min="1" max="50" step="1" value={config.percentage} onChange={(e) => change({ ...config, percentage: Number(e.target.value) })} /></label>
          <fieldset><legend>When should it start?</legend><label className="sale-admin-radio"><input type="radio" name="sale-start" checked={!config.startAt} onChange={() => change({ ...config, startAt: "" })}/>Start when I turn it on</label><label className="sale-admin-radio"><input type="radio" name="sale-start" checked={Boolean(config.startAt)} onChange={() => change({ ...config, startAt: localInput(new Date(Date.now() + 3600000)) })}/>Start later</label>{config.startAt && <label>Start date and time<input required type="datetime-local" value={config.startAt} onChange={(e) => change({ ...config, startAt: e.target.value })}/></label>}</fieldset>
          <label>End date and time<input required type="datetime-local" value={config.endAt} onChange={(e) => change({ ...config, endAt: e.target.value })}/></label>
          <p className="small">Times use your device’s timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Scheduled starts and automatic endings usually run within 10 minutes of the selected time.</p>
          <label>Lowest allowed pickup sale price (CAD)<input required type="number" min="1" max="10000" step="0.01" value={config.minimumPickupPriceCents / 100} onChange={(e) => change({ ...config, minimumPickupPriceCents: Math.round(Number(e.target.value) * 100) })} /></label>
          <fieldset><legend>Apply sale to</legend>
            {(["all", "collection", "products"] as const).map((scope) => <label key={scope} className="sale-admin-radio"><input type="radio" name="sale-scope" checked={config.scope === scope} onChange={() => change({ ...config, scope })}/>{scope === "all" ? "Whole shop" : scope === "collection" ? "One category" : "Selected products"}</label>)}
          </fieldset>
          {config.scope === "collection" && <label>Category<select value={config.collectionId} onChange={(e) => change({ ...config, collectionId: e.target.value })}>{saleCollections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>}
          {config.scope === "products" && <fieldset className="sale-admin-products"><legend>Products</legend>{baseProducts.map((product) => <label key={product.id}><input type="checkbox" checked={config.productIds.includes(product.id)} onChange={(e) => change({ ...config, productIds: e.target.checked ? [...config.productIds, product.id] : config.productIds.filter((id) => id !== product.id) })}/>{product.name}</label>)}</fieldset>}
          <p className="small">The delivered sale price is discounted first. Edmonton pickup stays exactly {money(PICKUP_PRICE_DIFFERENCE)} below the delivered sale price. Sale checkout prices are set in Shopify.</p>
          <button className="button" type="submit" disabled={busy || configured === false}>{busy ? "Checking Shopify…" : "Preview sale prices"}</button>
        </form>
        <div className="sale-admin-art"><img src="/images/brand/sale-industrial-bg.jpg" alt="Abstract dark slate and copper sale artwork"/><div><span>SALE ARTWORK</span><strong>Ready when you are.</strong><p>This image and the sale page appear only after Shopify prices have been verified.</p></div></div>
      </div>
      {preview && <div className="sale-admin-preview"><h3>Review {preview.rows.length} priced {preview.rows.length === 1 ? "option" : "options"} across {preview.config.productIds.length} {preview.config.productIds.length === 1 ? "product" : "products"}</h3><p>Check your margin before activating. Shopify discount codes may stack with these sale prices.</p>
        <div className="sale-admin-table-wrap"><table><thead><tr><th>Product / option</th><th>Delivered</th><th>Sale</th><th>Pickup</th><th>Sale pickup</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.sku}><th>{row.name}<small>{row.sku}</small></th><td>{money(row.regularDelivered)}</td><td>{money(row.saleDelivered)}</td><td>{money(row.regularPickup)}</td><td>{money(row.salePickup)}</td></tr>)}</tbody></table></div>
        <label className="sale-admin-radio"><input type="checkbox" checked={discountsChecked} onChange={(event) => setDiscountsChecked(event.target.checked)}/>I checked <a href="https://admin.shopify.com/store/aqk73w-k2/discounts" target="_blank" rel="noreferrer">Shopify discounts ↗</a> for offers that could stack with this sale.</label>
        <button className="button" type="button" disabled={busy || !discountsChecked} onClick={() => void run(preview.config.startAt ? "schedule" : "publish")}>{busy ? "Updating Shopify…" : preview.config.startAt ? "Schedule this sale" : "Turn on this sale"}</button>
      </div>}
    </>}
    {error && <p role="alert" className="sale-admin-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
