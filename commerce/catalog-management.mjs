import deliveryPolicy from './delivery-policy.json' with {type:'json'};
import {priceRecord} from './delivery-pricing.mjs';
import { applyDefaultListingCovers } from './listing-covers.mjs';
export const templates = [
  { id: 'single', name: 'Single product' }, { id: 'design', name: 'Choose a design' },
  { id: 'size', name: 'Choose a size' }, { id: 'personalized', name: 'Personalized gift' },
  { id: 'bundle', name: 'Set or bundle' }, { id: 'light', name: 'Lamp / light' }, { id: 'mask', name: 'Wearable mask' },
];
export const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
const text = (value, max = 2000) => String(value || '').trim().slice(0, max);
const amount = value => { if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) throw new Error('Enter a valid CAD amount.'); return value; };
export function safeMediaUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/media\/shop\/[a-zA-Z0-9/_ .-]+$/.test(value)) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (['cdn.shopify.com', 'videos.shopifycdn.com'].includes(u.hostname) || (u.hostname==='custombuildstudio.ca' && u.pathname.startsWith('/media/shop/'))); } catch { return false; }
}
export function validateDocument(input, { publish = false, policy = deliveryPolicy } = {}) {
  if (!input || typeof input !== 'object') throw new Error('Product details are required.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id || '')) throw new Error('Use a unique product link with letters, numbers and hyphens.');
  if (!templates.some(t => t.id === input.template)) throw new Error('Choose a product template.');
  if (!Array.isArray(input.products) || input.products.length < 1 || input.products.length > 40) throw new Error('A listing needs 1–40 product records.');
  const products = input.products.map(original => {
    let p = structuredClone(original);
    if(policy.active && !p.groupedDesigns) p=priceRecord(p,policy);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id || '')) throw new Error('Invalid product ID.');
    if (p.id.length > 120) throw new Error('Product link is too long.');
    for (const key of ['name','category','description','included','dimensions','notes']) p[key] = text(p[key], key === 'name' ? 120 : 4000);
    p.priceCents = amount(p.priceCents);
    p.pickupPriceDifferenceCents = policy.active?0:amount(p.pickupPriceDifferenceCents ?? input.pickupPriceDifferenceCents ?? 1000);
    if (p.priceCents < p.pickupPriceDifferenceCents) throw new Error('Pickup reduction cannot exceed the product price.');
    p.images = (p.images || []).map(image => {
      if (!safeMediaUrl(image.src) || !safeMediaUrl(image.thumb || image.src)) throw new Error('Use uploaded product images or existing website media.');
      return { src: image.src, thumb: image.thumb || image.src, alt: text(image.alt, 240), ...(image.mediaId && /^gid:\/\/shopify\/MediaImage\/\d+$/.test(image.mediaId) ? {mediaId:image.mediaId} : {}), ...(image.mediaId && /^gid:\/\/shopify\/MediaImage\/\d+$/.test(image.mediaId) ? {mediaId:image.mediaId} : {}), ...(image.sourceFile ? { sourceFile: text(image.sourceFile, 180) } : {}) };
    });
    if (p.images.length > 100) throw new Error('Use no more than 100 photos per design.');
    if (p.video && !safeMediaUrl(p.video)) throw new Error('Use an uploaded product video.');
    if (p.variants) p.variants = p.variants.map(v => ({ id: v.id, label: text(v.label, 120), dimensions: text(v.dimensions), priceCents: policy.active && v.basePriceCents!==undefined ? priceRecord({...v,shippingPriceMode:p.shippingPriceMode,shippingFeeCents:p.shippingFeeCents,pricingSchemaVersion:2},policy).priceCents : amount(v.priceCents),...(v.basePriceCents!==undefined?{basePriceCents:amount(v.basePriceCents),deliveryExtraCents:amount(v.deliveryExtraCents ?? 0),pricingSchemaVersion:2}:{}) }));
    if(p.variants?.length)p.priceCents=Math.min(...p.variants.map(v=>v.priceCents));
    if (publish && (!p.name || !p.description || !p.included || !p.images.length || p.priceCents <= p.pickupPriceDifferenceCents)) throw new Error('Before publishing, add a name, description, included items, photo and a positive product price.');
    if (publish && p.launchReady === false) throw new Error('This product has unresolved launch requirements. Confirm them before publishing.');
    if (publish && p.variants?.some(v => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.id) || !v.label || v.priceCents <= p.pickupPriceDifferenceCents)) throw new Error('Every option needs a label and valid prices.');
    return p;
  });
  if (!products.some(p => p.id === input.id)) throw new Error('Listing product is missing.');
  const ids = new Set(products.map(p => p.id));
  if (ids.size !== products.length) throw new Error('Product IDs must be unique.');
  for (const p of products) if (p.groupedDesigns?.some(d => !ids.has(d.id))) throw new Error('Every grouped design must have its own product record.');
  return { id: input.id, template: input.template, categoryIds: [...new Set((input.categoryIds || []).map(x => text(x, 90)))], products,
    shippingPreset: text(input.shippingPreset || 'existing', 100), pickupPriceDifferenceCents: policy.active?0:amount(input.pickupPriceDifferenceCents ?? 1000),
    fulfillmentConfirmed: input.fulfillmentConfirmed === true, updatedAt: new Date().toISOString() };
}
export function seedDocuments(products, collections) {
  return products.filter(p => !p.variantOf && !p.listingGroup).map(p => ({
    id: p.id, template: p.groupedDesigns ? 'design' : p.personalization ? 'personalized' : p.variants?.length ? 'size' : 'single',
    categoryIds: collections.filter(c => c.products.includes(p.id)).map(c => c.id),
    products: products.filter(x => x.id === p.id || x.listingGroup === p.id || x.variantOf === p.id || products.some(child=>child.listingGroup===p.id && x.variantOf===child.id)),
    pickupPriceDifferenceCents: p.pickupPriceDifferenceCents ?? 1000, shippingPreset: 'existing', fulfillmentConfirmed: p.launchReady !== false,
  }));
}
export function compileCatalog(baseProducts, baseCollections, documents, archived = []) {
  const all = new Map(structuredClone(baseProducts).map(p => [p.id, p]));
  const blocked = new Set(archived);
  const collections = structuredClone(baseCollections);
  for (const doc of documents) {
    const family=new Set([...all.values()].filter(p=>p.id===doc.id || p.listingGroup===doc.id).map(p=>p.id));
    for (const p of [...all.values()]) if (family.has(p.id) || family.has(p.variantOf)) all.delete(p.id);
    for (const p of doc.products) all.set(p.id, p);
    for (const c of collections) {
      c.products = c.products.filter(id => id !== doc.id);
      if (doc.categoryIds.includes(c.id)) c.products.push(doc.id);
    }
  }
  let added=true;
  while(added) {added=false;for(const p of all.values()) if(!blocked.has(p.id) && (blocked.has(p.listingGroup)||blocked.has(p.variantOf))) {blocked.add(p.id);added=true;}}
  for (const p of [...all.values()]) if (blocked.has(p.id)) all.delete(p.id);
  for (const p of [...all.values()]) if (p.groupedDesigns) {
    const valid = p.groupedDesigns.filter(d => all.has(d.id));
    for (const design of valid) all.get(design.id).listingGroup = p.id;
    const optionIds = new Set(valid.flatMap(d => d.optionIds));
    p.groupedDesigns = valid; p.variants = p.variants.filter(v => optionIds.has(v.id));
    if (!p.variants.length) all.delete(p.id); else p.priceCents = Math.min(...p.variants.map(v => v.priceCents));
  }
  for (const c of collections) { c.products = [...new Set(c.products.filter(id => all.has(id)).map(id=>all.get(id).listingGroup || id))]; c.coverProduct=all.get(c.coverProduct)?.listingGroup || c.coverProduct; if (!all.has(c.coverProduct)) c.coverProduct = c.products[0] || ''; }
  return { products: applyDefaultListingCovers([...all.values()], baseProducts), collections };
}
export function draftDescription(product) {
  return [product.description, product.included && `Includes: ${product.included}`, product.dimensions && `Size: ${product.dimensions}`, product.notes].filter(Boolean).join('\n\n');
}
