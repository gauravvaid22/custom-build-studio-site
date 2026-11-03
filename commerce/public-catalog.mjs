import { validateDocument, mergeCollectionsWithBaseline } from './catalog-management.mjs';
import { groupRemainingDesigns } from './group-remaining-designs.mjs';
import { applyDefaultListingCovers } from './listing-covers.mjs';
import { prepareSearchNaming } from './search-naming.mjs';
import defaultBaseline from './catalog-baseline.json' with { type: 'json' };

export function finalizePublicCatalog(rawSnapshot, baseline = defaultBaseline, archivedInput = [], { validate = true } = {}) {
  const archivedIds = archivedInput instanceof Set ? archivedInput : new Set(archivedInput || []);
  let snapshot = structuredClone(rawSnapshot);

  // Merge newly added baseline products without resurrecting archived items
  const existingIds = new Set(snapshot.products.map(p => p.id));
  for (const baseProd of baseline.products) {
    if (
      !existingIds.has(baseProd.id) &&
      !archivedIds.has(baseProd.id) &&
      !(baseProd.listingGroup && archivedIds.has(baseProd.listingGroup)) &&
      !(baseProd.variantOf && archivedIds.has(baseProd.variantOf))
    ) {
      snapshot.products.push(structuredClone(baseProd));
      existingIds.add(baseProd.id);
    }
  }
  snapshot.collections = mergeCollectionsWithBaseline(snapshot.collections, baseline.collections, [], [...archivedIds]);

  snapshot = groupRemainingDesigns(snapshot);
  snapshot = prepareSearchNaming(snapshot).catalog;
  snapshot.products = applyDefaultListingCovers(snapshot.products, baseline.products);

  const baselineMap = new Map(baseline.products.map(p => [p.id, p]));
  const baselineAltBySrc = new Map(
    baseline.products.flatMap(p => (p.images || []).filter(i => i?.src && i?.alt && !/reference view/i.test(i.alt)).map(i => [i.src, i.alt]))
  );
  for (const p of snapshot.products) {
    const base = baselineMap.get(p.id);
    if (base) {
      if (base.name && !p.name) p.name = base.name;
      if (!p.seoEdited) {
        if (base.seoTitle && (!p.seoTitle || p.seoTitle === p.name || p.seoTitle.startsWith('Luminous Christmas Tree LED Lantern —') || p.seoTitle.includes('Green & White Holiday Mantel'))) {
          p.seoTitle = base.seoTitle;
        }
        if (base.seoDescription && (!p.seoDescription || p.seoDescription.startsWith('A character bauble with festive colour and sculpted detail.') || base.seoDescription.length > p.seoDescription.length + 25)) {
          p.seoDescription = base.seoDescription;
        }
      }
      if (Array.isArray(base.searchKeywords) && (!Array.isArray(p.searchKeywords) || !p.searchKeywords.length)) {
        p.searchKeywords = base.searchKeywords;
      }
    }
    if (p.id === 'endless-swirling-tree' && p.dimensions === 'Approximately 22 cm tall') {
      p.dimensions = 'Approximately 19 cm tall';
    }
    if (p.id === 'christmas-angel' && typeof p.seoDescription === 'string' && p.seoDescription.startsWith('Warm LED angel nativity table lamp')) {
      p.seoDescription = p.seoDescription.replace(/^Warm LED angel nativity table lamp/, 'Starry night-blue backlit LED angel nativity table lamp');
    }
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img?.src && /reference view/i.test(img.alt || '') && baselineAltBySrc.has(img.src)) {
          img.alt = baselineAltBySrc.get(img.src);
        }
      }
    }
  }

  const baselineColls = new Map((baseline.collections || []).map(c => [c.id, c]));
  for (const c of snapshot.collections) {
    const base = baselineColls.get(c.id);
    if (base) {
      if (base.seoTitle && !c.seoEdited) c.seoTitle = base.seoTitle;
      if (base.seoDescription && !c.seoEdited) c.seoDescription = base.seoDescription;
    }
  }

  const ids = new Set(snapshot.products.map(p => p.id));
  if (ids.size !== snapshot.products.length) throw new Error('Duplicate catalog IDs.');

  if (validate) {
    for (const root of snapshot.products.filter(p => p.bundleOffers?.length)) {
      validateDocument({
        id: root.id,
        template: 'design',
        products: snapshot.products.filter(p => p.id === root.id || p.listingGroup === root.id || snapshot.products.find(x => x.id === p.variantOf)?.listingGroup === root.id),
      });
    }
    for (const p of snapshot.products) {
      validateDocument({
        id: p.id,
        template: 'single',
        products: [{ ...p, groupedDesigns: undefined, bundleOffers: undefined }],
        pickupPriceDifferenceCents: p.pickupPriceDifferenceCents ?? 1000,
      });
    }
  }

  // Unfinished previews never enter production products, routes or merchant feeds.
  const blocked = new Set(snapshot.products.filter(p => p.launchReady === false).map(p => p.id));
  const products = snapshot.products.filter(p => !blocked.has(p.id) && !blocked.has(p.listingGroup) && !blocked.has(p.variantOf));
  const liveIds = new Set(products.map(p => p.id));
  const collections = snapshot.collections.map(c => ({ ...c, products: c.products.filter(id => liveIds.has(id)) })).filter(c => c.products.length);

  return {
    revision: snapshot.revision ?? 0,
    products,
    collections,
    rows: snapshot.rows || [],
    ...(snapshot.deliveryPolicy ? { deliveryPolicy: snapshot.deliveryPolicy } : {}),
  };
}
