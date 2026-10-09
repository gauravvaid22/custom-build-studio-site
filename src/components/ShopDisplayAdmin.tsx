import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import defaults from "../../commerce/shop-merchandising.json";
import collections from "../../commerce/collections.json";
import { activeShopFeature, parentProducts, shopDepartments, type Merchandising, type ShopFeature } from "../lib/shopDiscovery";

async function request(action: string, adminKey: string, merchandising?: Merchandising) {
  const response = await fetch(`/.netlify/functions/shop?action=${action}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminKey}` },
    body: JSON.stringify(merchandising ? { merchandising } : {}), signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to update the shop display.");
  return data.merchandising as Merchandising;
}
function FeatureFields({ value, onChange, label }: { value: ShopFeature; onChange: (value: ShopFeature) => void; label: string }) {
  const cover = parentProducts.find(product => product.id === value.coverProduct)!;
  const change = (field: keyof ShopFeature, next: string | number | string[]) => onChange({ ...value, [field]: next });
  return <fieldset className="shop-display-fields"><legend>{label}</legend>
    <div className="form-grid">
      <label>Small campaign label<input maxLength={80} required value={value.eyebrow} onChange={event => change("eyebrow", event.target.value)} /></label>
      <label>Headline<input maxLength={80} required value={value.title} onChange={event => change("title", event.target.value)} /></label>
      <label>Button text<input maxLength={45} required value={value.buttonLabel} onChange={event => change("buttonLabel", event.target.value)} /></label>
      <label>Button destination<select value={value.destination} onChange={event => change("destination", event.target.value)}><option value="all">All products</option>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
      <label>Cover product<select value={value.coverProduct} onChange={event => onChange({ ...value, coverProduct: event.target.value, imageIndex: 0 })}>{parentProducts.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label>Cover photo<select value={value.imageIndex} onChange={event => change("imageIndex", Number(event.target.value))}>{cover.images.map((image, index) => <option key={image.src} value={index}>Photo {index + 1} · {image.alt}</option>)}</select></label>
    </div>
    <label>Short introduction<textarea maxLength={240} rows={2} required value={value.description} onChange={event => change("description", event.target.value)} /></label>
    <label>Featured-products heading<input maxLength={100} required value={value.featuredTitle} onChange={event => change("featuredTitle", event.target.value)} /></label>
    <div className="form-grid">{Array.from({ length: 6 }, (_, index) => <label key={index}>Featured product {index + 1}<select value={value.featuredIds[index] || ""} onChange={event => {
      const selected = Array.from({ length: 6 }, (_, position) => position === index ? event.target.value : value.featuredIds[position] || "").filter(Boolean);
      change("featuredIds", selected);
    }}><option value="">None</option>{parentProducts.map(product => <option key={product.id} value={product.id} disabled={value.featuredIds.includes(product.id) && value.featuredIds[index] !== product.id}>{product.name}</option>)}</select></label>)}</div>
    <img className="shop-display-cover-preview" src={cover.images[value.imageIndex]?.thumb || cover.images[0].thumb} alt={`Selected cover: ${cover.name}`} width="480" height="480" />
  </fieldset>;
}
export function ShopDisplayAdmin({ adminKey }: { adminKey: string }) {
  const [value, setValue] = useState<Merchandising>(defaults);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadFailed(false); setError("");
    request("get-merchandising", adminKey).then(result => { if (active) setValue({ ...defaults, ...result }); })
      .catch(failure => { if (active) { setError(failure.message); setLoadFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adminKey, loadAttempt]);
  const feature = activeShopFeature(value);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSaved("");
    try {
      const result = await request("save-merchandising", adminKey, value);
      setValue(result);
      window.dispatchEvent(new CustomEvent("cbs-merchandising-updated", { detail: result }));
      setSaved("Shop display saved. The shop and homepage now use these settings.");
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Loading shop display…</p>;
  return <section className="shop-display-admin">
    <div className="section-heading"><div><p className="eyebrow">YOUR SHOP WINDOW</p><h2>Campaigns & featured products</h2></div><p>Control the shop cover, product order and category visibility. Prices continue to come from Shopify.</p></div>
    <div className="shop-display-status"><strong>Showing today: {feature.title}</strong><span>Dates use Edmonton time. The last day is included; the everyday display returns automatically afterward.</span><Link to="/shop" target="_blank">View shop ↗</Link></div>
    {error && <p role="alert" className="shop-checkout-error">{error}</p>}
    {loadFailed && <button type="button" className="button secondary" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry loading settings</button>}
    <form className="quote-form" onSubmit={save}>
      <fieldset disabled={busy || loadFailed} className="shop-display-form-body">
        <fieldset className="shop-display-fields"><legend>Shop sections</legend>
          <p className="small">Choose which departments appear in navigation and on the shop page. At least one must remain visible.</p>
          {shopDepartments.map(department => <label className="shop-display-check" key={department.id}><input type="checkbox" checked={value.departments.includes(department.id)} onChange={event => setValue({ ...value, departments: event.target.checked ? [...value.departments, department.id] : value.departments.filter(id => id !== department.id) })} />{department.name}</label>)}
          <label className="shop-display-check"><input type="checkbox" checked={value.showBudgetGifts} onChange={event => setValue({ ...value, showBudgetGifts: event.target.checked })} />Show gifts $25 & under</label>
          <label className="shop-display-check"><input type="checkbox" checked={value.showStudioProof} onChange={event => setValue({ ...value, showStudioProof: event.target.checked })} />Show studio work and review links</label>
          <label className="shop-display-check"><input type="checkbox" checked={value.decorativeMotion} onChange={event => setValue({ ...value, decorativeMotion: event.target.checked })} />Enable subtle seasonal atmosphere on desktop</label>
        </fieldset>
        <fieldset className="shop-display-fields"><legend>Scheduled campaign</legend>
          <label className="shop-display-check"><input type="checkbox" checked={value.campaign.enabled} onChange={event => setValue({ ...value, campaign: { ...value.campaign, enabled: event.target.checked } })} />Enable this campaign within its dates</label>
          <div className="form-grid"><label>First day (Edmonton)<input type="date" required value={value.campaign.startDate} onChange={event => setValue({ ...value, campaign: { ...value.campaign, startDate: event.target.value } })} /></label><label>Last day (inclusive)<input type="date" required min={value.campaign.startDate} value={value.campaign.endDate} onChange={event => setValue({ ...value, campaign: { ...value.campaign, endDate: event.target.value } })} /></label></div>
        </fieldset>
        <FeatureFields label="Campaign display" value={value.campaign} onChange={next => setValue({ ...value, campaign: { ...value.campaign, ...next } })} />
        <FeatureFields label="Everyday display (when no campaign is active)" value={value.fallback} onChange={next => setValue({ ...value, fallback: next })} />
        <button className="button" disabled={busy}>{busy ? "Saving…" : "Save shop display"}</button>
      </fieldset>
      {saved && <p role="status">{saved}</p>}
    </form>
  </section>;
}
