import { createHash } from "node:crypto";
import products from "./products.json" with { type: "json" };
import collections from "./collections.json" with { type: "json" };
import pricing from "./pricing.json" with { type: "json" };

export const PICKUP_DIFFERENCE_CENTS = pricing.pickupPriceDifferenceCents;
const recordKey = "config/shop-sale";
const baseProducts = products.filter((product) => !("variantOf" in product));
const baseById = new Map(baseProducts.map((product) => [product.id, product]));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const money = (cents) => (cents / 100).toFixed(2);

export class SaleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function validateConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SaleError("Enter sale details.");
  const percentage = Number(input.percentage);
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 50)
    throw new SaleError("Choose a whole-number sale percentage from 1% to 50%.");
  const scope = input.scope;
  if (!["all", "collection", "products"].includes(scope)) throw new SaleError("Choose a sale scope.");
  const title = String(input.title || "Studio sale").trim();
  if (!title || title.length > 70) throw new SaleError("Use a sale title under 70 characters.");
  const minimumPickupPriceCents = Number(input.minimumPickupPriceCents ?? 100);
  if (!Number.isInteger(minimumPickupPriceCents) || minimumPickupPriceCents < 100 || minimumPickupPriceCents > 1000000)
    throw new SaleError("Choose a minimum pickup sale price between CA$1 and CA$10,000.");
  const collection = scope === "collection" ? collections.find((item) => item.id === input.collectionId && item.kind !== "curated") : null;
  if (scope === "collection" && !collection) throw new SaleError("Choose an existing shop category.");
  const requested = scope === "all" ? baseProducts.map((p) => p.id) :
    scope === "collection" ? collection.products : input.productIds;
  if (!Array.isArray(requested) || !requested.length || requested.length > baseProducts.length)
    throw new SaleError("Choose at least one valid product.");
  const productIds = [...new Set(requested)];
  if (productIds.some((id) => !baseById.has(id))) throw new SaleError("The sale includes an unknown product.");
  return { title, percentage, minimumPickupPriceCents, scope, collectionId: collection?.id || null, productIds };
}

function cents(value) {
  if (typeof value !== "string" || !/^\d+\.\d{2}$/.test(value)) throw new SaleError("A Shopify price could not be read safely.", 502);
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result)) throw new SaleError("A Shopify price is invalid.", 502);
  return result;
}

function variantIds(product) {
  return product.variants?.length ? product.variants.map((variant) => variant.id) : [product.id];
}

function planFromCatalog(config, catalog) {
  const rows = [];
  const groups = [];
  for (const productId of config.productIds) {
    const product = baseById.get(productId);
    const handle = product.shopifyHandle || product.id;
    const shopify = catalog.get(handle);
    if (!shopify?.id) throw new SaleError(`${product.name} was not found in Shopify.`, 409);
    const bySku = new Map(shopify.variants.nodes.map((variant) => [variant.sku, variant]));
    const variants = [];
    for (const sku of variantIds(product)) {
      const delivered = bySku.get(sku);
      const pickup = bySku.get(`${sku}-pickup`);
      if (!delivered?.id || !pickup?.id) throw new SaleError(`${product.name} is missing a delivered or pickup Shopify variant.`, 409);
      const regularDelivered = cents(delivered.price);
      const regularPickup = cents(pickup.price);
      if ([delivered, pickup].some((variant) => variant.compareAtPrice && cents(variant.compareAtPrice) > cents(variant.price)))
        throw new SaleError(`${product.name} already has a Shopify compare-at sale price. End that sale before applying a new one.`, 409);
      if (regularDelivered - regularPickup !== PICKUP_DIFFERENCE_CENTS)
        throw new SaleError(`${product.name} has a pickup price that is not CA$${money(PICKUP_DIFFERENCE_CENTS)} below delivery. Fix it in Shopify before running a sale.`, 409);
      const saleDelivered = Math.round(regularDelivered * (100 - config.percentage) / 100);
      const salePickup = saleDelivered - PICKUP_DIFFERENCE_CENTS;
      if (salePickup < config.minimumPickupPriceCents)
        throw new SaleError(`${product.name} would fall below your minimum pickup sale price of CA$${money(config.minimumPickupPriceCents)}. Exclude it, lower the percentage, or change the minimum.`, 409);
      for (const [variant, regular, sale] of [[delivered, regularDelivered, saleDelivered], [pickup, regularPickup, salePickup]]) {
        variants.push({ id: variant.id, sku: variant.sku, regular, originalCompareAt: variant.compareAtPrice, sale });
      }
      rows.push({ productId, name: shopify.title || product.name, sku, regularDelivered, saleDelivered, regularPickup, salePickup });
    }
    groups.push({ productId, productGraphqlId: shopify.id, handle, variants });
  }
  return { rows, groups };
}

function publicSale(record) {
  if (record?.status !== "active") return { status: "inactive" };
  return {
    status: "active", title: record.config.title, percentage: record.config.percentage,
    scope: record.config.scope, productIds: record.config.productIds,
    collectionId: record.config.collectionId,
    variants: Object.fromEntries(record.groups.flatMap((group) => group.variants.map((variant) =>
      [variant.sku, { priceCents: variant.sale, compareAtCents: variant.regular }]))),
  };
}

export function createSaleService({ store, shopify, production = false, clock = () => new Date() }) {
  async function current() { return await store.get(recordKey); }
  async function status() {
    const found = await current();
    return { ...publicSale(found?.data), admin: found?.data ? {
      status: found.data.status, config: found.data.config, lastError: found.data.lastError || "",
      updatedAt: found.data.updatedAt, count: found.data.groups?.length || 0,
    } : { status: "inactive" } };
  }
  async function adminStatus() {
    const result = await status();
    const found = await current();
    if (found?.data?.status === "active" && shopify) {
      try { await verify(found.data.groups, true); }
      catch (error) { result.admin.warning = `Shopify prices no longer match this sale: ${error.message}`; }
    }
    return result;
  }
  async function preview(input) {
    if (!shopify) throw new SaleError("Shopify Admin access is not configured for this deploy.", 503);
    const config = validateConfig(input);
    const catalog = await shopify.read(config.productIds.map((id) => baseById.get(id).shopifyHandle || id));
    const plan = planFromCatalog(config, catalog);
    return { config, rows: plan.rows, fingerprint: hash({ config, groups: plan.groups }) };
  }
  async function publish(input, fingerprint, discountsChecked = false) {
    if (!production || !shopify) throw new SaleError("Sale activation is available only on the configured production site.", 503);
    if (discountsChecked !== true) throw new SaleError("Review existing Shopify discounts before activating this sale.", 409);
    const found = await current();
    if (found?.data?.status && found.data.status !== "inactive")
      throw new SaleError("A sale or recovery operation is already in progress. Refresh the sale dashboard.", 409);
    const config = validateConfig(input);
    const catalog = await shopify.read(config.productIds.map((id) => baseById.get(id).shopifyHandle || id));
    const plan = planFromCatalog(config, catalog);
    if (fingerprint !== hash({ config, groups: plan.groups })) throw new SaleError("Shopify prices changed since the preview. Review the sale again.", 409);
    const record = { status: "publishing", config, groups: plan.groups, updatedAt: clock().toISOString() };
    const claim = await store.put(recordKey, record, found ? { onlyIfMatch: found.etag } : { onlyIfNew: true });
    if (!claim.modified) throw new SaleError("Sale settings changed. Refresh and try again.", 409);
    try {
      for (const group of plan.groups) await shopify.update(group.productGraphqlId, group.variants.map((v) => ({ id: v.id, price: money(v.sale), compareAtPrice: money(v.regular) })));
      await verify(plan.groups, true);
      await store.put(recordKey, { ...record, status: "active", updatedAt: clock().toISOString() }, {});
      return status();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopify could not activate the sale.";
      try {
        await restore(plan.groups);
        await store.put(recordKey, { ...record, status: "inactive", lastError: message, updatedAt: clock().toISOString() }, {});
      } catch (recoveryError) {
        await store.put(recordKey, { ...record, status: "needs-attention", lastError: `${message} Recovery: ${recoveryError.message}`, updatedAt: clock().toISOString() }, {});
      }
      throw new SaleError(`Sale was not fully activated. ${message} Check the sale dashboard before retrying.`, 502);
    }
  }
  async function verify(groups, sale) {
    const catalog = await shopify.read(groups.map((g) => g.handle));
    for (const group of groups) {
      const byId = new Map((catalog.get(group.handle)?.variants.nodes || []).map((v) => [v.id, v]));
      for (const original of group.variants) {
        const live = byId.get(original.id);
        const expected = sale ? original.sale : original.regular;
        const compare = sale ? money(original.regular) : original.originalCompareAt;
        if (!live || cents(live.price) !== expected || (live.compareAtPrice || null) !== (compare || null))
          throw new SaleError(`${group.productId} / ${original.sku} did not match the expected Shopify price.`, 409);
      }
    }
  }
  async function restore(groups) {
    const catalog = await shopify.read(groups.map((g) => g.handle));
    for (const group of groups) {
      const byId = new Map((catalog.get(group.handle)?.variants.nodes || []).map((v) => [v.id, v]));
      const changes = [];
      for (const original of group.variants) {
        const live = byId.get(original.id);
        if (!live) throw new SaleError(`${original.sku} disappeared from Shopify.`, 409);
        const price = cents(live.price);
        if (price === original.regular && (live.compareAtPrice || null) === (original.originalCompareAt || null)) continue;
        if (price !== original.sale || live.compareAtPrice !== money(original.regular))
          throw new SaleError(`${original.sku} was edited manually in Shopify. Review its price before restoring the sale.`, 409);
        changes.push({ id: original.id, price: money(original.regular), compareAtPrice: original.originalCompareAt });
      }
      if (changes.length) await shopify.update(group.productGraphqlId, changes);
    }
    await verify(groups, false);
  }
  async function end() {
    if (!production || !shopify) throw new SaleError("Sale changes are available only on the configured production site.", 503);
    const found = await current();
    if (!found?.data || !["active", "publishing", "ending", "needs-attention"].includes(found.data.status))
      throw new SaleError("There is no active sale to end.", 409);
    const ending = { ...found.data, status: "ending", updatedAt: clock().toISOString() };
    const claim = await store.put(recordKey, ending, { onlyIfMatch: found.etag });
    if (!claim.modified) throw new SaleError("Sale status changed. Refresh and try again.", 409);
    try {
      await restore(ending.groups);
      await store.put(recordKey, { ...ending, status: "inactive", lastError: "", updatedAt: clock().toISOString() }, {});
      return status();
    } catch (error) {
      await store.put(recordKey, { ...ending, status: "needs-attention", lastError: error.message, updatedAt: clock().toISOString() }, {});
      throw new SaleError(`Sale recovery needs attention: ${error.message}`, 502);
    }
  }
  return { status, adminStatus, preview, publish, end };
}
