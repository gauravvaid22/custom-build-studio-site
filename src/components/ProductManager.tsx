import { useEffect, useRef, useState, useMemo, KeyboardEvent } from 'react';
import { configureMixPacks } from '../../commerce/mix-packs.mjs';
import { priceRecord } from '../../commerce/delivery-pricing.mjs';
import deliveryPolicy from '../../commerce/delivery-policy.json' with { type: "json" };
import { money } from './Cart';
import { useShopifyCatalog } from './ShopifyCatalog';
import { draftDescription, slug } from '../../commerce/catalog-management.mjs';
import { PURE_CHRISTMAS_PRODUCT_IDS, PURE_HALLOWEEN_PRODUCT_IDS } from '../../commerce/merchandising.mjs';
import './product-manager.css';

type Image = { src: string; thumb: string; alt: string; mediaId?: string };
type Option = { basePriceCents?: number; deliveryExtraCents?: number; pricingSchemaVersion?: number; id: string; label: string; priceCents: number; dimensions: string };
type Product = {
  seoTitle?: string;
  seoDescription?: string;
  titleSource?: string;
  shippingPriceMode?: "included" | "per-order";
  shippingFeeCents?: number;
  basePriceCents?: number;
  deliveryExtraCents?: number;
  pricingSchemaVersion?: number;
  searchKeywords?: string[];
  id: string;
  name: string;
  category: string;
  description: string;
  included: string;
  dimensions: string;
  notes: string;
  priceCents: number;
  images: Image[];
  video?: string;
  videoMediaId?: string;
  variants?: Option[];
  groupedDesigns?: { id: string; label: string; optionIds: string[] }[];
  variantOf?: string;
  listingGroup?: string;
  launchReady?: boolean;
  pickupPriceDifferenceCents?: number;
  [key: string]: unknown;
};

type Document = {
  id: string;
  template: string;
  products: Product[];
  categoryIds: string[];
  pickupPriceDifferenceCents: number;
  shippingPreset: string;
  fulfillmentConfirmed: boolean;
  updatedAt?: string;
};

type Collection = { id: string; name: string; kind: string; description: string; coverProduct: string; products: string[]; [key: string]: unknown };
type Row = { kind?: string; startAt?: string; endAt?: string; id: string; title: string; description: string; productIds: string[]; enabled: boolean };
type Data = {
  presets?: { name: string; document: Document }[];
  documents: Document[];
  templates: { id: string; name: string }[];
  archived: string[];
  collections: Collection[];
  rows: Row[];
  revision: number;
  jobs: { id: string; status: string; action: string; productId: string; revision?: number; error?: string }[];
  history: { at: string; action: string; id: string; savedRevision?: number }[];
  connection: Record<string, string>;
  ready: { shopify: boolean; buildHook: boolean; catalogSource: boolean };
};

export async function catalogRequest(action: string, body: unknown = {}) {
  const response = await fetch(`/.netlify/functions/shop-catalog?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to update the catalog.');
  return data;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const pricingAllowance = (p?: { shippingPriceMode?: string }) =>
  p?.shippingPriceMode === 'per-order' ? 0 : deliveryPolicy.defaultAllowanceCents;
const dollarInput = (value: number) => Number.isFinite(value) ? (value / 100).toFixed(2) : '';
const cents = (value: string | number) => Math.round(Number(value) * 100);

function freshDocument(template = 'single'): Document {
  const id = `new-product-${Date.now()}`;
  return {
    id,
    template,
    categoryIds: [],
    pickupPriceDifferenceCents: deliveryPolicy.active ? 0 : 1000,
    shippingPreset: 'existing',
    fulfillmentConfirmed: false,
    products: [{
      id,
      name: '',
      category: '',
      priceCents: 2500,
      ...(deliveryPolicy.active ? { basePriceCents: 2500 - deliveryPolicy.defaultAllowanceCents, deliveryExtraCents: 0, pricingSchemaVersion: 2 } : {}),
      description: '',
      included: '',
      dimensions: '',
      notes: '',
      images: [],
      seasonal: false,
      productionReviewed: false,
      searchKeywords: [],
    }],
  };
}

function duplicateDocument(source: Document): Document {
  const next = clone(source);
  const suffix = `-${Date.now().toString(36)}`;
  const mapping = new Map(next.products.map(p => [p.id, p.id.slice(0, 65) + suffix]));
  next.id = mapping.get(next.id)!;
  next.fulfillmentConfirmed = false;
  next.products = next.products.map(p => {
    delete p.shopifyHandle;
    delete p.source;
    delete p.inventory;
    delete p.stock;
    return {
      ...p,
      id: mapping.get(p.id)!,
      name: p.name + ' — copy',
      ...(p.variantOf ? { variantOf: mapping.get(p.variantOf) } : {}),
      ...(p.listingGroup ? { listingGroup: mapping.get(p.listingGroup) } : {}),
      ...(p.variants ? { variants: p.variants.map(v => ({ ...v, id: mapping.get(v.id) || v.id + suffix })) } : {}),
      ...(p.groupedDesigns ? { groupedDesigns: p.groupedDesigns.map(d => ({ ...d, id: mapping.get(d.id)!, optionIds: d.optionIds.map(id => mapping.get(id) || id + suffix) })) } : {}),
    };
  });
  return next;
}

function rebuildGroup(doc: Document): Document {
  const next = clone(doc);
  const parent = next.products.find(p => p.id === next.id)!;
  const optionParents = next.products.filter(p => !p.variantOf && !p.groupedDesigns && p.variants?.length);
  for (const p of optionParents) {
    for (const v of p.variants!) {
      const previous = next.products.find(x => x.id === v.id);
      const child = {
        ...p,
        ...previous,
        id: v.id,
        name: `${p.name} — ${v.label}`,
        seoTitle: p.seoTitle ? `${p.seoTitle} — ${v.label}` : undefined,
        variantOf: p.id,
        priceCents: v.priceCents,
        ...(deliveryPolicy.active ? { basePriceCents: v.basePriceCents ?? v.priceCents - pricingAllowance(p), deliveryExtraCents: v.deliveryExtraCents ?? 0, pricingSchemaVersion: 2 } : {}),
        dimensions: v.dimensions,
        pickupPriceDifferenceCents: next.pickupPriceDifferenceCents,
      };
      delete child.variants;
      delete child.groupedDesigns;
      delete child.listingGroup;
      next.products = next.products.filter(x => x.id !== v.id);
      next.products.push(child);
    }
  }
  next.products.forEach(p => { p.pickupPriceDifferenceCents = next.pickupPriceDifferenceCents; });
  if (!parent.groupedDesigns) return next;
  const children = next.products.filter(p => p.listingGroup === next.id && !p.purchaseOnly);
  parent.groupedDesigns = children.map(p => ({ id: p.id, label: p.name, optionIds: p.variants?.map(v => v.id) || [p.id] }));
  parent.variants = children.flatMap(p => p.variants?.length ? p.variants : [{
    id: p.id,
    label: p.name,
    priceCents: p.priceCents,
    basePriceCents: p.basePriceCents,
    deliveryExtraCents: p.deliveryExtraCents,
    pricingSchemaVersion: p.pricingSchemaVersion,
    dimensions: p.dimensions,
  }]);
  parent.priceCents = Math.min(...parent.variants.map(v => v.priceCents));
  parent.images = [...parent.images, ...children.flatMap(p => p.images)].filter((image, index, array) => array.findIndex(x => x.src === image.src) === index);
  next.products.forEach(p => { p.pickupPriceDifferenceCents = next.pickupPriceDifferenceCents; });
  return next;
}

export function ProductManager() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState<'products' | 'quickprice' | 'collections' | 'rows' | 'connection' | 'history'>('products');
  const [draft, setDraft] = useState<Document | null>(null);
  const [selected, setSelected] = useState('');
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [choices, setChoices] = useState<{ publications: { nodes: { id: string; name: string }[] }; deliveryProfiles: { nodes: { id: string; name: string }[] } } | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Quick Price Sheet State
  const [quickSearch, setQuickSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'christmas' | 'halloween' | 'yearround' | 'drafts'>('all');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [quickEdits, setQuickEdits] = useState<Map<string, Document>>(new Map());

  const { deliveredPriceFor, refresh } = useShopifyCatalog();
  const dialog = useRef<HTMLDialogElement>(null);

  const load = async () => {
    try {
      setData(await catalogRequest('list'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!data?.jobs.some(j => ['queued', 'shopify', 'website'].includes(j.status))) return;
    const timer = window.setInterval(() => { void load(); }, 6000);
    return () => window.clearInterval(timer);
  }, [data?.jobs]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || quickEdits.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, quickEdits]);

  useEffect(() => {
    if (draft && !dialog.current?.open) dialog.current?.showModal();
  }, [draft]);

  const [publishReview, setPublishReview] = useState(false);
  const [nameReview, setNameReview] = useState<{ changes: { id: string; before: string; after: string; seoTitle: string }[]; revision: number; completed: boolean } | null>(null);
  const [bulkBase, setBulkBase] = useState('4.99');
  const [singlePackPrice, setSinglePackPrice] = useState('7.99');
  const [fivePackPrice, setFivePackPrice] = useState('29.99');
  const [tenPackPrice, setTenPackPrice] = useState('54.99');
  const [expected, setExpected] = useState<Record<string, string>>({});

  const open = (doc: Document) => {
    setPublishReview(false);
    setExpected({});
    setMessage('');
    setDraft(clone(doc));
    setSelected(doc.id);
    setDirty(false);
    setPreview(false);
    setError('');
    setTagInput('');
  };

  const edit = async (doc: Document) => {
    setBusy(true);
    try {
      const live = await catalogRequest('inspect', { id: doc.id });
      const next = clone(doc);
      if (!live.hasDraft) {
        next.products.forEach(p => {
          if (live.prices[p.id] !== undefined) p.priceCents = live.prices[p.id];
          p.variants?.forEach(v => {
            if (live.prices[v.id] !== undefined) v.priceCents = live.prices[v.id];
          });
        });
      }
      open(next);
      setExpected(live.expected);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    dialog.current?.close();
    setDraft(null);
    setDirty(false);
  };

  const change = (patch: Partial<Document>) => {
    setPublishReview(false);
    setDraft(current => current ? { ...current, ...patch } : null);
    setDirty(true);
  };

  const product = draft?.products.find(p => p.id === selected);

  const updateProduct = (patch: Partial<Product>) => {
    if (!draft) return;
    if (product?.groupedDesigns && (patch.shippingPriceMode !== undefined || patch.shippingFeeCents !== undefined)) {
      change({
        products: draft.products.map(p => ({
          ...priceRecord({
            ...p,
            shippingPriceMode: patch.shippingPriceMode ?? product.shippingPriceMode,
            shippingFeeCents: patch.shippingFeeCents ?? product.shippingFeeCents ?? 500
          }, deliveryPolicy),
        })),
      });
      return;
    }

    const allowance = (patch.shippingPriceMode ?? product?.shippingPriceMode) === 'per-order' ? 0 : deliveryPolicy.defaultAllowanceCents;

    if (deliveryPolicy.active && product?.variants?.length && !product.groupedDesigns && patch.deliveryExtraCents !== undefined) {
      patch.variants = product.variants.map(v => ({
        ...v,
        basePriceCents: v.basePriceCents ?? v.priceCents - pricingAllowance(product) - (v.deliveryExtraCents ?? 0),
        deliveryExtraCents: patch.deliveryExtraCents,
        pricingSchemaVersion: 2,
        priceCents: (v.basePriceCents ?? v.priceCents - pricingAllowance(product) - (v.deliveryExtraCents ?? 0)) + patch.deliveryExtraCents! + pricingAllowance(product),
      }));
    }

    if (deliveryPolicy.active && product && !product.groupedDesigns) {
      const extra = patch.deliveryExtraCents ?? product.deliveryExtraCents ?? 0;
      let base = patch.basePriceCents ?? product.basePriceCents;
      let price = patch.priceCents ?? product.priceCents;

      // If priceCents was explicitly modified, derive basePriceCents
      if (patch.priceCents !== undefined && patch.basePriceCents === undefined) {
        base = Math.max(100, patch.priceCents - allowance - extra);
      } else if (patch.basePriceCents !== undefined && patch.priceCents === undefined) {
        price = patch.basePriceCents + extra + allowance;
      }

      patch = {
        ...patch,
        basePriceCents: base,
        deliveryExtraCents: extra,
        pricingSchemaVersion: 2,
        priceCents: price,
      };
    }

    change({ products: draft.products.map(p => p.id === selected ? { ...p, ...patch } : p) });
  };

  const act = async (action: string, body: unknown, success: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await catalogRequest(action, body);
      setMessage(success);
      await load();
      await refresh().catch(() => {});
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyBulkPrice = () => {
    if (!draft) return;
    change({
      products: draft.products.map(p => ({
        ...priceRecord({ ...p, basePriceCents: cents(bulkBase), deliveryExtraCents: 0, pricingSchemaVersion: 2 }, deliveryPolicy),
        ...(p.variants?.length ? {
          variants: p.variants.map(v => ({
            ...v,
            basePriceCents: cents(bulkBase),
            deliveryExtraCents: 0,
            pricingSchemaVersion: 2,
            priceCents: cents(bulkBase) + (p.shippingPriceMode === 'per-order' ? 0 : deliveryPolicy.defaultAllowanceCents),
          }))
        } : {})
      }))
    });
  };

  const save = async () => {
    if (!draft || !data) return false;
    const next = rebuildGroup(draft);
    const ok = await act('save-draft', { document: next, revision: data.revision }, 'Draft saved. It has not been published.');
    if (ok) {
      setDraft(next);
      setDirty(false);
    }
    return ok;
  };

  const publish = async () => {
    if (!draft || !data) return;
    if (dirty) {
      setError('Save your draft before publishing.');
      return;
    }
    if (!publishReview) {
      setPublishReview(true);
      return;
    }
    if (await act('publish', { id: draft.id, revision: data.revision, expected }, 'Update queued. The status below will show when it is live.')) {
      setPublishReview(false);
    }
  };

  // Quick Price Sheet Helpers
  const handleQuickPriceChange = (docId: string, productId: string, newRetailCents: number) => {
    if (!data) return;
    const existingDoc = quickEdits.get(docId) || data.documents.find(d => d.id === docId);
    if (!existingDoc) return;
    const next = clone(existingDoc);
    const allowance = deliveryPolicy.defaultAllowanceCents;

    for (const p of next.products) {
      if (p.id === productId) {
        const extra = p.deliveryExtraCents || 0;
        p.priceCents = newRetailCents;
        p.basePriceCents = Math.max(100, newRetailCents - allowance - extra);
        p.pricingSchemaVersion = 2;
      }
      if (p.variants) {
        for (const v of p.variants) {
          if (v.id === productId) {
            const extra = v.deliveryExtraCents || 0;
            v.priceCents = newRetailCents;
            v.basePriceCents = Math.max(100, newRetailCents - allowance - extra);
            v.pricingSchemaVersion = 2;
          }
        }
      }
    }

    const updated = rebuildGroup(next);
    setQuickEdits(new Map(quickEdits.set(docId, updated)));
  };

  const handleQuickTitleChange = (docId: string, productId: string, newTitle: string) => {
    if (!data) return;
    const existingDoc = quickEdits.get(docId) || data.documents.find(d => d.id === docId);
    if (!existingDoc) return;
    const next = clone(existingDoc);
    for (const p of next.products) {
      if (p.id === productId) p.name = newTitle;
      if (p.variants) {
        for (const v of p.variants) {
          if (v.id === productId) v.label = newTitle;
        }
      }
    }
    const updated = rebuildGroup(next);
    setQuickEdits(new Map(quickEdits.set(docId, updated)));
  };

  const handleQuickKeywordsChange = (docId: string, productId: string, keywordsText: string) => {
    if (!data) return;
    const existingDoc = quickEdits.get(docId) || data.documents.find(d => d.id === docId);
    if (!existingDoc) return;
    const next = clone(existingDoc);
    const keywords = keywordsText.split(/[,#]/).map(k => k.trim()).filter(Boolean);
    for (const p of next.products) {
      if (p.id === productId) p.searchKeywords = keywords;
    }
    const updated = rebuildGroup(next);
    setQuickEdits(new Map(quickEdits.set(docId, updated)));
  };

  const saveAllQuickDrafts = async () => {
    if (!data || !quickEdits.size) return;
    const docs = Array.from(quickEdits.values()).map(rebuildGroup);
    const ok = await act('batch-save-drafts', { documents: docs }, `Saved ${docs.length} drafts successfully.`);
    if (ok) setQuickEdits(new Map());
  };

  const saveAndPublishQuick = async (ids: string[]) => {
    if (!data) return;
    // Save any pending drafts first
    if (quickEdits.size > 0) {
      const docs = Array.from(quickEdits.values()).map(rebuildGroup);
      await catalogRequest('batch-save-drafts', { documents: docs });
      setQuickEdits(new Map());
    }
    await act('batch-publish', { ids }, `Batch publishing queued for ${ids.length} listings. Shopify and Netlify will sync.`);
  };

  const syncAllChristmas = async () => {
    if (!data) return;
    const christmasDocs = data.documents.filter(d => PURE_CHRISTMAS_PRODUCT_IDS.includes(d.id));
    const ids = christmasDocs.map(d => d.id);
    if (!ids.length) {
      setError('No Christmas listings found.');
      return;
    }
    await saveAndPublishQuick(ids);
  };

  const addTag = (tag: string) => {
    if (!product) return;
    const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
    if (!cleanTag) return;
    const current = product.searchKeywords || [];
    if (!current.includes(cleanTag)) {
      updateProduct({ searchKeywords: [...current, cleanTag] });
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    if (!product) return;
    const current = product.searchKeywords || [];
    updateProduct({ searchKeywords: current.filter(t => t !== tagToRemove) });
  };

  const addRecommendedHolidayTags = () => {
    if (!product) return;
    const current = product.searchKeywords || [];
    const recommended = [
      'canadian christmas gift',
      'edmonton studio craft',
      'holiday home decor',
      'christmas gift ideas',
      'handmade holiday gift',
      product.category.toLowerCase(),
    ];
    const combined = [...new Set([...current, ...recommended])];
    updateProduct({ searchKeywords: combined });
  };

  if (!data) {
    return (
      <section className="manager">
        <p role="status">Loading product manager…</p>
        {error && <p role="alert">{error}</p>}
        <button className="button" onClick={() => void load()}>Retry</button>
      </section>
    );
  }

  // Quick Price sheet items list
  const quickList = data.documents.filter(doc => {
    const root = doc.products.find(p => p.id === doc.id) || doc.products[0];
    if (quickFilter === 'christmas') {
      return PURE_CHRISTMAS_PRODUCT_IDS.includes(doc.id) || root.category === 'Christmas décor';
    }
    if (quickFilter === 'halloween') {
      return PURE_HALLOWEEN_PRODUCT_IDS.includes(doc.id) || root.category === 'Halloween';
    }
    if (quickFilter === 'yearround') {
      return !PURE_CHRISTMAS_PRODUCT_IDS.includes(doc.id) && !PURE_HALLOWEEN_PRODUCT_IDS.includes(doc.id);
    }
    if (quickFilter === 'drafts') {
      return quickEdits.has(doc.id) || doc.products.some(p => p.launchReady === false);
    }
    return true;
  }).filter(doc => {
    if (!quickSearch.trim()) return true;
    const q = quickSearch.toLowerCase();
    return doc.products.some(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.searchKeywords && p.searchKeywords.some(k => k.toLowerCase().includes(q)))
    );
  });

  const filtered = data.documents.filter(d => {
    const p = d.products.find(p => p.id === d.id)!;
    return `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || (filter === 'archived' ? data.archived.includes(d.id) : !data.archived.includes(d.id)));
  });

  return (
    <section className="manager">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR CATALOG</p>
          <h2>Products &amp; collections</h2>
        </div>
        <button className="button" onClick={() => open(freshDocument())}>+ Add product</button>
      </div>

      <div className="button-row">
        {data.presets?.map(p => (
          <button className="button button-dark" key={p.name} onClick={() => { open(duplicateDocument(p.document)); setDirty(true); }}>
            + {p.name}
          </button>
        ))}
      </div>

      <nav className="manager-nav" aria-label="Catalog sections">
        {(['products', 'quickprice', 'collections', 'rows', 'connection', 'history'] as const).map(id => (
          <button key={id} className={section === id ? 'button' : 'button button-dark'} onClick={() => setSection(id)}>
            {id === 'quickprice' ? '⚡ Quick Price Sheet' : id === 'rows' ? 'Shop rows' : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </nav>

      {error && <p className="shop-checkout-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {data.jobs.slice(0, 3).map(job => (
        <div className="manager-job" key={job.id}>
          <strong>{job.status === 'website' ? 'Updating website' : job.status === 'shopify' ? 'Updating Shopify' : job.status === 'live' ? 'Live' : job.status === 'error' ? 'Needs attention' : 'Queued'}</strong>
          <span>{job.productId} {job.error}</span>
          {job.status === 'error' && (
            <button className="text-link" disabled={busy} onClick={() => void act(job.action, { id: job.productId, revision: data.revision }, 'Retry queued.')}>
              Retry
            </button>
          )}
        </div>
      ))}

      {/* QUICK PRICE SHEET SECTION */}
      {section === 'quickprice' && (
        <div className="quick-price-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DIRECT RETAIL PRICING &amp; BATCH SYNC</p>
              <h3>Quick Price &amp; Listing Sheet</h3>
            </div>
            <p>
              Edit customer retail CAD prices directly (shipping is handled automatically without base-price subtraction). Update names and #hashtag search keywords. Changes are saved as drafts until you batch publish them to Shopify.
            </p>
          </div>

          <div className="quick-price-toolbar">
            <button type="button" className={`filter-btn button ${quickFilter === 'all' ? '' : 'button-dark'}`} onClick={() => setQuickFilter('all')}>
              All ({data.documents.length})
            </button>
            <button type="button" className={`filter-btn button ${quickFilter === 'christmas' ? '' : 'button-dark'}`} style={{ borderColor: '#d4af37' }} onClick={() => setQuickFilter('christmas')}>
              🎄 Christmas ({data.documents.filter(d => PURE_CHRISTMAS_PRODUCT_IDS.includes(d.id)).length})
            </button>
            <button type="button" className={`filter-btn button ${quickFilter === 'halloween' ? '' : 'button-dark'}`} onClick={() => setQuickFilter('halloween')}>
              🎃 Halloween ({data.documents.filter(d => PURE_HALLOWEEN_PRODUCT_IDS.includes(d.id)).length})
            </button>
            <button type="button" className={`filter-btn button ${quickFilter === 'yearround' ? '' : 'button-dark'}`} onClick={() => setQuickFilter('yearround')}>
              🏠 Year-Round
            </button>
            <button type="button" className={`filter-btn button ${quickFilter === 'drafts' ? '' : 'button-dark'}`} onClick={() => setQuickFilter('drafts')}>
              Pending ({quickEdits.size})
            </button>

            <input
              type="search"
              placeholder="Search by name, SKU or keyword…"
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
              style={{ maxWidth: 280, marginLeft: 'auto' }}
            />

            <button
              type="button"
              className="button"
              style={{ background: '#15803d', borderColor: '#22c55e' }}
              disabled={busy}
              onClick={syncAllChristmas}
            >
              ⚡ Sync All 17 Christmas Listings to Shopify
            </button>
          </div>

          <div className="quick-price-wrap">
            <table className="quick-price-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Cover</th>
                  <th style={{ minWidth: 220 }}>Product / Option Title</th>
                  <th style={{ minWidth: 140 }}>Customer Retail (CAD)</th>
                  <th style={{ minWidth: 130 }}>Shipping Mode</th>
                  <th style={{ minWidth: 240 }}>Search Hashtags / Keywords</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quickList.map(doc => {
                  const activeDoc = quickEdits.get(doc.id) || doc;
                  const root = activeDoc.products.find(p => p.id === activeDoc.id) || activeDoc.products[0];
                  const hasChildren = activeDoc.products.length > 1;
                  const isExpanded = expandedDocs.has(doc.id);
                  const isChristmas = PURE_CHRISTMAS_PRODUCT_IDS.includes(doc.id);

                  return (
                    <>
                      <tr key={doc.id} style={{ background: isChristmas ? 'rgba(212, 175, 55, 0.05)' : undefined }}>
                        <td>
                          {root.images[0] && (
                            <img src={root.images[0].thumb} alt="" width="48" height="48" style={{ borderRadius: 6, objectFit: 'cover' }} />
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {hasChildren && (
                              <button
                                type="button"
                                className="button button-dark"
                                style={{ padding: '2px 8px', fontSize: 11 }}
                                onClick={() => {
                                  const nextSet = new Set(expandedDocs);
                                  if (isExpanded) nextSet.delete(doc.id);
                                  else nextSet.add(doc.id);
                                  setExpandedDocs(nextSet);
                                }}
                              >
                                {isExpanded ? '▼ Hide designs' : `▶ ${activeDoc.products.filter(p => p.id !== activeDoc.id).length} options`}
                              </button>
                            )}
                            <input
                              type="text"
                              value={root.name}
                              onChange={e => handleQuickTitleChange(doc.id, root.id, e.target.value)}
                              style={{ fontWeight: 600 }}
                            />
                          </div>
                          <small style={{ color: '#94a3b8' }}>ID: {root.id} · {root.category}</small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              value={dollarInput(root.priceCents)}
                              onChange={e => handleQuickPriceChange(doc.id, root.id, cents(e.target.value))}
                            />
                          </div>
                          <small style={{ color: '#94a3b8' }}>Base: ${dollarInput(root.basePriceCents || 0)}</small>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, padding: '3px 8px', background: root.shippingPriceMode === 'per-order' ? '#334155' : '#065f46', borderRadius: 4, color: '#fff' }}>
                            {root.shippingPriceMode === 'per-order' ? 'Flat rate' : 'Free shipping'}
                          </span>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Tags, e.g. tree, decor, gift"
                            value={(root.searchKeywords || []).join(', ')}
                            onChange={e => handleQuickKeywordsChange(doc.id, root.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="button button-dark" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => edit(doc)}>
                              Full Edit
                            </button>
                            <button
                              type="button"
                              className="button"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                              disabled={busy}
                              onClick={() => saveAndPublishQuick([doc.id])}
                            >
                              Sync
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* CHILD ROWS (Designs & Variants) */}
                      {hasChildren && isExpanded && activeDoc.products.filter(p => p.id !== activeDoc.id).map(child => (
                        <tr key={child.id} className="child-row">
                          <td>
                            {child.images[0] && (
                              <img src={child.images[0].thumb} alt="" width="36" height="36" style={{ borderRadius: 4, objectFit: 'cover' }} />
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={child.name}
                              onChange={e => handleQuickTitleChange(doc.id, child.id, e.target.value)}
                            />
                            <small style={{ color: '#94a3b8' }}>Child ID: {child.id}</small>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={dollarInput(child.priceCents)}
                                onChange={e => handleQuickPriceChange(doc.id, child.id, cents(e.target.value))}
                              />
                            </div>
                          </td>
                          <td>
                            <small style={{ color: '#94a3b8' }}>Follows parent</small>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Child design keywords"
                              value={(child.searchKeywords || []).join(', ')}
                              onChange={e => handleQuickKeywordsChange(doc.id, child.id, e.target.value)}
                            />
                          </td>
                          <td></td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sticky Actions Bar for Quick Price Sheet */}
          {quickEdits.size > 0 && (
            <div className="quick-price-actions-bar">
              <div>
                <strong>You have unsaved changes in {quickEdits.size} listing(s).</strong>
                <div className="small" style={{ color: '#94a3b8' }}>Save as drafts to preview, or publish directly to sync Shopify and Netlify.</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="button button-dark" disabled={busy} onClick={saveAllQuickDrafts}>
                  Save All Drafts ({quickEdits.size})
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => saveAndPublishQuick(Array.from(quickEdits.keys()))}
                >
                  Save &amp; Publish Selected to Shopify ({quickEdits.size})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCTS TAB (EXISTING CARD VIEW) */}
      {section === 'products' && (
        <>
          <div className="manager-toolbar">
            <label>Open saved product
              <select value="" disabled={busy} onChange={e => { const doc = data.documents.find(d => d.id === e.target.value); if (doc) void edit(doc); }}>
                <option value="">Choose a listing…</option>
                {data.documents.map(d => <option key={d.id} value={d.id}>{d.products.find(p => p.id === d.id)?.name || d.id}</option>)}
              </select>
            </label>
            <label>Find a product
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or category" type="search" />
            </label>
            <label>Status
              <select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All products</option>
                <option value="available">Available listings</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <div className="manager-list">
            {filtered.map(doc => {
              const p = doc.products.find(p => p.id === doc.id)!;
              const archived = data.archived.includes(doc.id);
              const isChristmas = PURE_CHRISTMAS_PRODUCT_IDS.includes(doc.id);

              return (
                <article key={doc.id} style={{ borderLeft: isChristmas ? '4px solid #d4af37' : undefined }}>
                  {p.images[0] && <img src={p.images[0].thumb} alt="" loading="lazy" width="100" height="100" />}
                  <div>
                    <h3>{p.name || 'Untitled draft'} {isChristmas && <span style={{ fontSize: 13, color: '#d4af37' }}>🎄 Christmas</span>}</h3>
                    <p>{p.category} · {money(deliveredPriceFor(p.id, p.priceCents))} CAD</p>
                    <small>
                      {archived ? 'Archived' : p.launchReady === false ? 'Launch details pending' : doc.updatedAt ? 'Saved editor revision' : 'Existing listing'} · {doc.products.filter(p => !p.variantOf).length > 1 ? `${doc.products.filter(p => p.listingGroup).length} designs` : 'Single listing'}
                    </small>
                  </div>
                  <div className="manager-actions">
                    <button className="button button-dark" disabled={busy} onClick={() => void edit(doc)}>Edit</button>
                    <button className="text-link" onClick={() => { open(duplicateDocument(doc)); setDirty(true); }}>Duplicate</button>
                    <button className="text-link" disabled={busy} onClick={() => {
                      if (window.confirm(`${archived ? 'Restore' : 'Remove'} “${p.name}” ${archived ? 'to' : 'from'} the website? This ${doc.products.length > 1 ? 'includes its designs and options.' : 'preserves past orders.'}`)) {
                        void act(archived ? 'restore' : 'archive', { id: doc.id, revision: data.revision }, 'Visibility update queued.');
                      }
                    }}>
                      {archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* CONNECTIONS TAB */}
      {section === 'connection' && (
        <div className="quote-form">
          <fieldset>
            <legend>Product names &amp; search visibility</legend>
            <p>Review the approved naming cleanup, then synchronize the website and existing Shopify products. Prices and purchase options stay intact. Search titles and descriptions remain editable in each product.</p>
            <label>Naming action
              <select value="" disabled={busy} onChange={async e => {
                if (e.target.value === 'review') {
                  try { setNameReview(await catalogRequest('preview-search-names')); }
                  catch (err) { setError((err as Error).message); }
                } else if (e.target.value === 'publish' && nameReview) {
                  if (await act('publish-search-names', { revision: nameReview.revision }, 'Naming update queued. Wait for Live below.')) setNameReview(null);
                }
              }}>
                <option value="">Choose action…</option>
                <option value="review">Review approved name updates</option>
                <option value="publish" disabled={!nameReview || nameReview.completed}>Apply names to website &amp; Shopify</option>
              </select>
            </label>
            {nameReview && (
              <>
                <p>{nameReview.completed ? 'Approved naming update has already been applied.' : nameReview.changes.length + ' catalog records reviewed. Check the changes, then choose Apply names to website & Shopify.'}</p>
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {nameReview.changes.filter(c => c.before !== c.after).map(c => (
                    <p key={c.id}><small>{c.before}</small><br /><strong>{c.after}</strong></p>
                  ))}
                </div>
              </>
            )}
          </fieldset>

          <h3>Shopify &amp; website connection</h3>
          <p>Shopify: {data.ready.shopify ? 'Connected' : 'Missing credentials'} · Automatic publishing: {data.ready.buildHook && data.ready.catalogSource ? 'Configured' : 'Needs Netlify configuration'}</p>
          <button className="button button-dark" disabled={busy} onClick={async () => {
            try { setChoices(await catalogRequest('choices')); }
            catch (e) { setError((e as Error).message); }
          }}>
            Load Shopify channels &amp; shipping profiles
          </button>

          {(['publicationId', 'deliveryProfileId', 'pickupProfileId', 'perOrderDeliveryProfileId'] as const).map(key => (
            <label key={key}>
              {key === 'publicationId' ? 'Website sales channel' : key === 'deliveryProfileId' ? 'Included-delivery shipping profile' : key === 'perOrderDeliveryProfileId' ? 'Once-per-order delivery profile' : 'Legacy pickup profile'}
              <select value={data.connection[key] || ''} onChange={e => setData({ ...data, connection: { ...data.connection, [key]: e.target.value } })}>
                <option value="">Choose…</option>
                {(key === 'publicationId' ? choices?.publications.nodes : choices?.deliveryProfiles.nodes)?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {!choices && data.connection[key] && <option value={data.connection[key]}>{data.connection[key]}</option>}
              </select>
            </label>
          ))}
          <p className="small">These are your existing Shopify profiles. This editor does not invent or change their rates.</p>
          <button className="button" disabled={busy} onClick={() => void act('connection', { connection: data.connection }, 'Connection saved.')}>Save connection</button>
        </div>
      )}

      {/* COLLECTIONS & ROWS TABS */}
      {(section === 'collections' || section === 'rows') && (
        <div className="quote-form">
          <h3>{section === 'collections' ? 'Categories' : 'Product rows on the shop page'}</h3>
          <p>Save your changes, then publish the layout to update the website.</p>
          {section === 'collections' ? data.collections.map((c, i) => (
            <fieldset key={c.id}>
              <legend>{c.name}</legend>
              <div className="form-grid">
                <label>Name<input value={c.name} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, name: e.target.value } : x) })} /></label>
                <label>Link<input readOnly value={c.id} /></label>
                <label>Placement
                  <select value={c.kind} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, kind: e.target.value } : x) })}>
                    <option value="collection">Collection</option>
                    <option value="department">Shop department</option>
                  </select>
                </label>
              </div>
              <label>Description<textarea value={c.description} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, description: e.target.value } : x) })} /></label>
              <label>Page heading<input value={String(c.heading || c.name)} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, heading: e.target.value } : x) })} /></label>
              <label>Search title<input maxLength={150} value={String(c.seoTitle || '')} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, seoTitle: e.target.value } : x) })} /></label>
              <label>Search description<textarea maxLength={300} value={String(c.seoDescription || '')} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, seoDescription: e.target.value } : x) })} /></label>
              <label>Products
                <select multiple size={5} value={c.products} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, products: Array.from(e.target.selectedOptions).map(o => o.value) } : x) })}>
                  {data.documents.map(d => <option value={d.id} key={d.id}>{d.products[0].name}</option>)}
                </select>
              </label>
              <label>Cover product
                <select value={c.coverProduct} onChange={e => setData({ ...data, collections: data.collections.map((x, n) => n === i ? { ...x, coverProduct: e.target.value } : x) })}>
                  <option value="">First available product</option>
                  {data.documents.map(d => <option key={d.id} value={d.id}>{d.products[0].name}</option>)}
                </select>
              </label>
              <button className="text-link" disabled={i === 0} onClick={() => { const categories = [...data.collections];[categories[i - 1], categories[i]] = [categories[i], categories[i - 1]]; setData({ ...data, collections: categories }); }}>Move up</button>
              <button className="text-link" onClick={() => { if (window.confirm('Remove this category? Products remain in your catalog.')) setData({ ...data, collections: data.collections.filter((_, n) => n !== i) }); }}>Remove category</button>
            </fieldset>
          )) : data.rows.map((r, i) => (
            <fieldset key={r.id}>
              <legend>Row {i + 1}</legend>
              <label>Layout
                <select value={r.kind || "grid"} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, kind: e.target.value } : x) })}>
                  <option value="grid">Product grid</option>
                  <option value="collection">Featured selection</option>
                  <option value="information">Information strip</option>
                </select>
              </label>
              <div className="form-grid">
                {(["startAt", "endAt"] as const).map(key => (
                  <label key={key}>
                    {key === "startAt" ? "Show from (your local time)" : "Hide after (your local time)"}
                    <input type="datetime-local" value={r[key] ? new Date(new Date(r[key]!).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, [key]: e.target.value ? new Date(e.target.value).toISOString() : "" } : x) })} />
                  </label>
                ))}
              </div>
              <label>Heading<input value={r.title} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, title: e.target.value } : x) })} /></label>
              <label>Introduction<input value={r.description} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, description: e.target.value } : x) })} /></label>
              <label>Products
                <select multiple size={5} value={r.productIds} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, productIds: Array.from(e.target.selectedOptions).map(o => o.value) } : x) })}>
                  {data.documents.map(d => <option value={d.id} key={d.id}>{d.products[0].name}</option>)}
                </select>
              </label>
              <label><input type="checkbox" checked={r.enabled} onChange={e => setData({ ...data, rows: data.rows.map((x, n) => n === i ? { ...x, enabled: e.target.checked } : x) })} /> Show row</label>
              <div className="button-row">
                <button className="text-link" disabled={i === 0} onClick={() => { const rows = [...data.rows];[rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; setData({ ...data, rows }); }}>Move up ↑</button>
                <button className="text-link" onClick={() => setData({ ...data, rows: data.rows.filter((_, n) => n !== i) })}>Remove row</button>
              </div>
            </fieldset>
          ))}
          <div className="button-row">
            <button className="button button-dark" onClick={() => section === 'collections' ? setData({ ...data, collections: [...data.collections, { id: `category-${Date.now()}`, name: 'New category', kind: 'collection', description: '', coverProduct: '', products: [] }] }) : setData({ ...data, rows: [...data.rows, { id: `row-${Date.now()}`, title: 'Featured products', description: '', productIds: [], enabled: true }] })}>
              + Add {section === 'collections' ? 'category' : 'row'}
            </button>
            <button className="button" disabled={busy} onClick={() => void act('save-layout', { collections: data.collections, rows: data.rows, revision: data.revision }, 'Layout draft saved.')}>Save layout</button>
            <button className="button" disabled={busy} onClick={() => void act('publish-layout', { revision: data.revision }, 'Website update queued.')}>Publish saved layout</button>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {section === 'history' && (
        <div className="manager-history">
          {data.history.map((h, i) => (
            <p key={i}>
              <time>{new Date(h.at).toLocaleString('en-CA', { timeZone: 'America/Edmonton' })}</time> · {h.action} · {h.id}
              {h.savedRevision !== undefined && (
                <button className="text-link" disabled={busy} onClick={() => {
                  if (window.confirm("Restore the previous editor revision as a draft?")) {
                    void act("restore-revision", { id: h.id, savedRevision: h.savedRevision }, "Previous revision restored as a draft.");
                  }
                }}>
                  Restore previous draft
                </button>
              )}
            </p>
          ))}
        </div>
      )}

      {/* PRODUCT EDIT MODAL DIALOG */}
      <dialog ref={dialog} className="manager-dialog" onCancel={e => { e.preventDefault(); close(); }}>
        {draft && product && (
          <>
            <header>
              <div>
                <small>{data.templates.find(t => t.id === draft.template)?.name} · {dirty ? 'Unsaved changes' : 'Draft editor'}</small>
                <h2>{draft.products.find(p => p.id === draft.id)?.name || 'New product'}</h2>
              </div>
              <button className="button button-dark" onClick={close} aria-label="Close editor">×</button>
            </header>

            {error && <p role="alert" className="shop-checkout-error">{error}</p>}
            {message && <p role="status">{message}</p>}

            <div className="manager-editor">
              <aside>
                <label>Template
                  <select value={draft.template} onChange={e => change({ template: e.target.value, products: draft.products.map(p => p.id === selected && e.target.value === 'personalized' ? { ...p, personalization: { kind: 'photo-print', photoCount: 1 } } : p) })}>
                    {data.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <h3>Listing &amp; designs</h3>
                {draft.products.filter(p => !p.variantOf).map(p => (
                  <button key={p.id} className={p.id === selected ? 'button' : 'button button-dark'} onClick={() => { setSelected(p.id); setPreview(false); }}>
                    {p.id === draft.id ? 'Collection / listing' : p.name}
                  </button>
                ))}
                {draft.template === 'design' && (
                  <button className="text-link" onClick={() => {
                    const id = `${draft.id}-design-${Date.now().toString(36)}`;
                    const p: Product = { id, name: 'New design', category: draft.products[0].category, priceCents: 2500, description: '', included: '', dimensions: '', notes: '', images: [], listingGroup: draft.id, pickupPriceDifferenceCents: draft.pickupPriceDifferenceCents, searchKeywords: [] };
                    const parent = { ...draft.products.find(p => p.id === draft.id)!, groupedDesigns: draft.products[0].groupedDesigns || [], variantLabel: 'Design', galleryOverviewCover: true };
                    change({ products: [...draft.products.map(p => p.id === draft.id ? parent : p), p] });
                    setSelected(id);
                  }}>
                    + Add design
                  </button>
                )}
              </aside>

              <div className="manager-fields">
                {preview ? (
                  <div className="manager-preview">
                    <h3>{product.name}</h3>
                    <p>{money(product.priceCents)} CAD · {deliveryPolicy.active ? (product.shippingPriceMode === 'per-order' ? `${money(product.shippingFeeCents || 0)} delivery once per order` : "Shipping included") : `Pickup ${money(product.priceCents - draft.pickupPriceDifferenceCents)} CAD`}</p>
                    {product.images.map(image => <img key={image.src} src={image.src} alt={image.alt} />)}
                    {product.video && <video src={product.video} controls preload="metadata" />}
                    <p style={{ whiteSpace: 'pre-line' }}>{draftDescription(product)}</p>
                    {product.variants?.map(v => <p key={v.id}>{v.label} · {money(v.priceCents)} · {v.dimensions}</p>)}
                  </div>
                ) : (
                  <>
                    <div className="form-grid">
                      <label>Product name
                        <input maxLength={120} value={product.name} onChange={e => updateProduct({ name: e.target.value })} />
                      </label>
                      <label>Product link
                        <input value={product.id} readOnly={data.documents.some(d => d.id === draft.id) || selected !== draft.id} onChange={e => {
                          if (!draft || data?.documents.some(d => d.id === draft.id)) return;
                          const id = slug(e.target.value);
                          const old = draft.id;
                          change({ id, products: draft.products.map(p => p.id === old ? { ...p, id } : p) });
                          setSelected(id);
                        }} />
                        <small>Existing links remain stable when you rename products.</small>
                      </label>
                      <label>Product category
                        <input value={product.category} onChange={e => updateProduct({ category: e.target.value })} />
                      </label>
                      <label>
                        Customer Price on Website (CAD, shipping included)
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          disabled={Boolean(product.groupedDesigns || (deliveryPolicy.active && product.variants?.length))}
                          value={dollarInput(product.priceCents)}
                          onChange={e => {
                            const newRetail = cents(e.target.value);
                            const allowance = pricingAllowance(product);
                            const extra = product.deliveryExtraCents || 0;
                            const base = Math.max(100, newRetail - allowance - extra);
                            updateProduct({
                              priceCents: newRetail,
                              basePriceCents: base,
                              deliveryExtraCents: extra,
                              pricingSchemaVersion: 2,
                            });
                          }}
                        />
                        {deliveryPolicy.active && !product.groupedDesigns && (
                          <small>Customer sees {money(product.priceCents)} CAD (includes {money(pricingAllowance(product))} standard shipping allowance → {money(product.basePriceCents ?? product.priceCents - pricingAllowance(product))} base merchandise)</small>
                        )}
                      </label>
                    </div>

                    {/* SEARCH HASHTAGS & KEYWORDS CHIP EDITOR */}
                    <fieldset>
                      <legend>Search Hashtags &amp; Google Keywords (#tags)</legend>
                      <p className="small">These keywords power customer search discovery and Google Shopping feed indexing. Enter tags and press Enter.</p>

                      <div className="tag-chips">
                        {(product.searchKeywords || []).map(tag => (
                          <span key={tag} className="tag-chip">
                            #{tag}
                            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>×</button>
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <input
                          type="text"
                          placeholder="Type a tag (e.g. christmas decor, tree ornament) and press Enter"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                        />
                        <button type="button" className="button button-dark" onClick={() => addTag(tagInput)}>Add Tag</button>
                        <button type="button" className="button button-dark" onClick={addRecommendedHolidayTags}>+ Suggest Holiday Tags</button>
                      </div>
                    </fieldset>

                    {/* GOOGLE SEARCH APPEARANCE */}
                    <fieldset>
                      <legend>Google search appearance &amp; SEO (optional)</legend>
                      <p className="small">Leave fields blank to use the product name and description automatically. The studio name is added automatically.</p>
                      <label>Search title (SEO Title)
                        <input maxLength={150} value={product.seoTitle || ''} placeholder={product.name} onChange={e => updateProduct({ seoTitle: e.target.value })} />
                      </label>
                      <label>Search description (Meta Description)
                        <textarea rows={2} maxLength={300} value={product.seoDescription || ''} placeholder={product.description} onChange={e => updateProduct({ seoDescription: e.target.value })} />
                      </label>
                      <label>Product title source
                        <select value={product.titleSource || 'default'} onChange={e => updateProduct({ titleSource: e.target.value })}>
                          <option value="default">Written without AI</option>
                          <option value="trained_algorithmic_media">Created with AI assistance</option>
                        </select>
                      </label>
                    </fieldset>

                    <label>Description
                      <textarea rows={3} maxLength={4000} value={product.description} onChange={e => updateProduct({ description: e.target.value })} />
                    </label>

                    <label>What is included
                      <textarea rows={2} value={product.included} onChange={e => updateProduct({ included: e.target.value })} />
                    </label>

                    <label>Product dimensions / size guidance
                      <input value={product.dimensions} onChange={e => updateProduct({ dimensions: e.target.value })} />
                    </label>

                    <label>Care, materials, exclusions &amp; colour notes
                      <textarea rows={3} value={product.notes} onChange={e => updateProduct({ notes: e.target.value })} />
                    </label>

                    {/* MEDIA */}
                    <fieldset>
                      <legend>Photos &amp; video</legend>
                      <label className="manager-upload">Upload product media
                        <input
                          disabled={busy}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                          onChange={async e => {
                            const files = e.target.files;
                            if (!files || !product) return;
                            setBusy(true);
                            setError('');
                            try {
                              const added: Image[] = [];
                              let video = product.video;
                              let videoMediaId = product.videoMediaId;
                              for (const file of Array.from(files)) {
                                setMessage(`Uploading ${file.name}…`);
                                const type = file.type;
                                if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'].includes(type)) {
                                  throw new Error('Upload JPG, PNG, WebP, MP4 or MOV.');
                                }
                                const staged = await catalogRequest('upload-start', { name: file.name, type, size: file.size });
                                const form = new FormData();
                                for (const parameter of staged.target.parameters) form.append(parameter.name, parameter.value);
                                form.append('file', file);
                                const sent = await fetch(staged.target.url, { method: 'POST', body: form });
                                if (!sent.ok) throw new Error('Upload failed. Please retry.');
                                let media = await catalogRequest('upload-finish', { resourceUrl: staged.target.resourceUrl, type, alt: product.name });
                                for (let attempt = 0; media.status !== 'READY' && attempt < 30; attempt++) {
                                  if (media.status === 'FAILED') throw new Error('Shopify could not process this file.');
                                  await new Promise(resolve => window.setTimeout(resolve, 2000));
                                  media = await catalogRequest('upload-status', { id: media.id });
                                }
                                if (media.status !== 'READY' || !media.url) throw new Error('Media is still processing.');
                                if (type.startsWith('video/')) {
                                  video = media.url;
                                  videoMediaId = media.id;
                                } else {
                                  added.push({ src: media.url, thumb: media.url, alt: product.name, mediaId: media.id });
                                }
                              }
                              updateProduct({ images: [...product.images, ...added], ...(video ? { video, videoMediaId } : {}) });
                              setMessage('Media uploaded. Save the draft to attach it.');
                            } catch (err) {
                              setError((err as Error).message);
                            } finally {
                              setBusy(false);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <div className="manager-media">
                        {product.images.map((image, index) => (
                          <div key={image.src}>
                            <img src={image.thumb} alt={image.alt} />
                            <label>Image description
                              <input value={image.alt} onChange={e => updateProduct({ images: product.images.map((x, i) => i === index ? { ...x, alt: e.target.value } : x) })} />
                            </label>
                            <small>{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</small>
                            <div className="button-row">
                              <button className="text-link" disabled={!index} onClick={() => { const images = [...product.images];[images[index - 1], images[index]] = [images[index], images[index - 1]]; updateProduct({ images }); }}>Move up</button>
                              <button className="text-link" disabled={!index} onClick={() => updateProduct({ images: [image, ...product.images.filter((_, i) => i !== index)] })}>Make cover</button>
                              <button className="text-link" onClick={() => updateProduct({ images: product.images.filter((_, i) => i !== index) })}>Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {product.video && (
                        <>
                          <video src={product.video} controls preload="metadata" />
                          <button className="text-link" onClick={() => updateProduct({ video: undefined })}>Remove video</button>
                        </>
                      )}
                    </fieldset>

                    {/* SIZES / OPTIONS */}
                    {(draft.template === 'size' || draft.template === 'mask' || product.variants?.length) && !product.groupedDesigns && (
                      <fieldset>
                        <legend>Sizes / options</legend>
                        {product.variants?.map((v, i) => (
                          <div key={v.id} className="manager-option">
                            <label>Label
                              <input value={v.label} onChange={e => updateProduct({ variants: product.variants!.map((x, n) => n === i ? { ...x, label: e.target.value } : x) })} />
                            </label>
                            <label>
                              Size Customer Price (CAD, shipping included)
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={dollarInput(v.priceCents)}
                                onChange={e => {
                                  const newRetail = cents(e.target.value);
                                  const allowance = pricingAllowance(product);
                                  const extra = v.deliveryExtraCents || 0;
                                  const base = Math.max(100, newRetail - allowance - extra);
                                  updateProduct({
                                    variants: product.variants!.map((x, n) => n === i ? {
                                      ...x,
                                      priceCents: newRetail,
                                      basePriceCents: base,
                                      deliveryExtraCents: extra,
                                      pricingSchemaVersion: 2,
                                    } : x),
                                  });
                                }}
                              />
                            </label>
                            {deliveryPolicy.active && (
                              <label>Size delivery extra (CAD)
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={dollarInput(v.deliveryExtraCents ?? 0)}
                                  onChange={e => {
                                    const extra = cents(e.target.value);
                                    const allowance = pricingAllowance(product);
                                    const base = v.basePriceCents ?? v.priceCents - allowance;
                                    updateProduct({
                                      variants: product.variants!.map((x, n) => n === i ? {
                                        ...x,
                                        deliveryExtraCents: extra,
                                        pricingSchemaVersion: 2,
                                        priceCents: base + extra + allowance,
                                      } : x),
                                    });
                                  }}
                                />
                                <small>Customer sees {money(v.priceCents)} CAD</small>
                              </label>
                            )}
                            <label>Dimensions
                              <input value={v.dimensions} onChange={e => updateProduct({ variants: product.variants!.map((x, n) => n === i ? { ...x, dimensions: e.target.value } : x) })} />
                            </label>
                          </div>
                        ))}
                        <button className="text-link" onClick={() => {
                          const id = `${product.id}-option-${Date.now().toString(36)}`;
                          updateProduct({
                            variants: [
                              ...(product.variants || []),
                              { id, label: 'New size', priceCents: product.priceCents, basePriceCents: product.basePriceCents, deliveryExtraCents: product.deliveryExtraCents, pricingSchemaVersion: product.pricingSchemaVersion, dimensions: '' },
                            ],
                          });
                        }}>
                          + Add size / option
                        </button>
                      </fieldset>
                    )}

                    {/* MIX PACKS */}
                    {product.groupedDesigns && (
                      <fieldset>
                        <legend>Mix &amp; match packs</legend>
                        <p className="small">Create fixed-price packs using this collection’s designs. Pack prices include shipping.</p>
                        <label>Single item price (CAD)<input type="number" step="0.01" value={singlePackPrice} onChange={e => setSinglePackPrice(e.target.value)} /></label>
                        <label>Five item pack (CAD)<input type="number" step="0.01" value={fivePackPrice} onChange={e => setFivePackPrice(e.target.value)} /></label>
                        <label>Ten item pack (CAD)<input type="number" step="0.01" value={tenPackPrice} onChange={e => setTenPackPrice(e.target.value)} /></label>
                        <label>Pack setup action
                          <select value="" onChange={e => {
                            if (e.target.value === 'apply') {
                              try {
                                change(configureMixPacks(draft, [{ quantity: 5, priceCents: cents(fivePackPrice) }, { quantity: 10, priceCents: cents(tenPackPrice) }], cents(singlePackPrice), deliveryPolicy.defaultAllowanceCents));
                              } catch (err) {
                                setError((err as Error).message);
                              }
                            }
                          }}>
                            <option value="">Choose action…</option>
                            <option value="apply">Apply single and pack prices</option>
                          </select>
                        </label>
                      </fieldset>
                    )}

                    {/* DELIVERY PRICING RULE */}
                    <fieldset>
                      <legend>Delivery pricing rule</legend>
                      <label>Delivery pricing
                        <select value={product.shippingPriceMode || 'included'} onChange={e => updateProduct({ shippingPriceMode: e.target.value as 'included' | 'per-order', shippingFeeCents: e.target.value === 'per-order' ? 500 : 0 })}>
                          <option value="included">Delivery included in every item price (Standard)</option>
                          <option value="per-order">Item price + delivery once per order (Flat Rate)</option>
                        </select>
                      </label>
                      {product.shippingPriceMode === 'per-order' && (
                        <>
                          <label>Once-per-order delivery fee (CAD)
                            <input type="number" min="0" max="100" step="0.01" value={dollarInput(product.shippingFeeCents || 0)} onChange={e => updateProduct({ shippingFeeCents: cents(e.target.value) })} />
                          </label>
                        </>
                      )}
                      {product.groupedDesigns && (
                        <>
                          <label>Base merchandise price for every design (CAD)
                            <input type="number" min="1" step="0.01" value={bulkBase} onChange={e => setBulkBase(e.target.value)} />
                          </label>
                          <button type="button" className="button button-dark" onClick={applyBulkPrice}>Apply base price to all designs</button>
                        </>
                      )}
                    </fieldset>

                    {/* CATEGORIES & FULFILLMENT */}
                    <fieldset>
                      <legend>Categories &amp; fulfillment review</legend>
                      <div className="manager-categories">
                        {data.collections.map(c => (
                          <label key={c.id}>
                            <input type="checkbox" checked={draft.categoryIds.includes(c.id)} onChange={e => change({ categoryIds: e.target.checked ? [...draft.categoryIds, c.id] : draft.categoryIds.filter(id => id !== c.id) })} />
                            {c.name}
                          </label>
                        ))}
                      </div>

                      <label style={{ marginTop: 12 }}>
                        <input type="checkbox" checked={draft.fulfillmentConfirmed} onChange={e => change({ fulfillmentConfirmed: e.target.checked })} />
                        I have confirmed the item's fulfillment, included components and dimensions.
                      </label>

                      {typeof product.launchReady === 'boolean' && (
                        <label>
                          <input type="checkbox" checked={product.launchReady} onChange={e => updateProduct({ launchReady: e.target.checked })} />
                          I have reviewed the details, photos and pricing for {product.name}; this listing is ready to sell publicly.
                        </label>
                      )}
                    </fieldset>

                    {selected !== draft.id && product.listingGroup && (
                      <button className="text-link" onClick={() => {
                        if (window.confirm(`Remove ${product.name} from this collection draft?`)) {
                          change({ products: draft.products.filter(p => p.id !== selected) });
                          setSelected(draft.id);
                        }
                      }}>
                        Remove this design from draft
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <footer>
              <button className="text-link" disabled={busy} onClick={() => {
                const name = window.prompt("Name this reusable template");
                if (name) void act("save-preset", { name, document: rebuildGroup(draft) }, "Reusable template saved.");
              }}>
                Save as template
              </button>
              <button className="button button-dark" onClick={() => setPreview(!preview)}>
                {preview ? 'Back to editing' : 'Preview'}
              </button>
              <button className="button button-dark" disabled={busy} onClick={() => void save()}>
                Save draft
              </button>
              <button className="button" disabled={busy || dirty || draft.products.some(p => p.launchReady === false)} onClick={() => void publish()}>
                {publishReview ? "Confirm & publish" : "Publish saved draft"}
              </button>
              {publishReview && (
                <p role="status">Ready to update Shopify and the website with this saved draft. Review the prices and delivery rule, then choose Confirm &amp; publish.</p>
              )}
            </footer>
          </>
        )}
      </dialog>
    </section>
  );
}
