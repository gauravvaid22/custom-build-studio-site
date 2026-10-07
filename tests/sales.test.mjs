import assert from "node:assert/strict";
import { test } from "node:test";
import { createSaleService } from "../commerce/sales.mjs";
import products from "../commerce/products.json" with { type: "json" };
import collections from "../commerce/collections.json" with { type: "json" };

function fixture({ failProduct = "" } = {}) {
  const catalog = new Map([
    ["skeleton-chameleon", { id: "gid://shopify/Product/1", variants: { nodes: [
      { id: "v1", sku: "skeleton-chameleon", price: "40.00", compareAtPrice: null },
      { id: "v2", sku: "skeleton-chameleon-pickup", price: "30.00", compareAtPrice: null },
    ] } }],
    ["mood-ghost", { id: "gid://shopify/Product/2", variants: { nodes: [
      { id: "v3", sku: "mood-ghost-design-a", price: "30.00", compareAtPrice: null },
      { id: "v4", sku: "mood-ghost-design-a-pickup", price: "20.00", compareAtPrice: null },
      { id: "v5", sku: "mood-ghost-design-b", price: "30.00", compareAtPrice: null },
      { id: "v6", sku: "mood-ghost-design-b-pickup", price: "20.00", compareAtPrice: null },
    ] } }],
  ]);
  let saved = null, revision = 0;
  const store = {
    async get() { return saved ? { data: structuredClone(saved), etag: String(revision) } : null; },
    async put(_key, data, condition) {
      if (condition?.onlyIfNew && saved) return { modified: false };
      if (condition?.onlyIfMatch && condition.onlyIfMatch !== String(revision)) return { modified: false };
      saved = structuredClone(data); revision++; return { modified: true };
    },
  };
  const shopify = {
    async read(handles) { return new Map(handles.map((handle) => [handle, structuredClone(catalog.get(handle))])); },
    async update(productId, changes) {
      if (failProduct && productId.endsWith(failProduct)) throw Error("Simulated Shopify failure");
      const product = [...catalog.values()].find((p) => p.id === productId);
      for (const change of changes) {
        const variant = product.variants.nodes.find((v) => v.id === change.id);
        variant.price = change.price;
        variant.compareAtPrice = change.compareAtPrice;
      }
    },
  };
  return { catalog, store, shopify, sale: createSaleService({ store, shopify, production: true }) };
}

test("product sale previews, publishes, and restores both fulfillment prices", async () => {
  const { catalog, sale } = fixture();
  const config = { title: "October studio sale", percentage: 25, scope: "products", productIds: ["skeleton-chameleon"] };
  const preview = await sale.preview(config);
  assert.deepEqual(preview.rows.map((r) => [r.regularDelivered, r.saleDelivered, r.regularPickup, r.salePickup]), [[4000, 3000, 3000, 2000]]);
  await sale.publish(config, preview.fingerprint, true);
  assert.equal((await sale.status()).status, "active");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].price, "30.00");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].compareAtPrice, "40.00");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[1].price, "20.00");
  await sale.end();
  assert.equal((await sale.status()).status, "inactive");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].price, "40.00");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].compareAtPrice, null);
});

test("all options are included once and stale previews are rejected", async () => {
  const { sale, catalog } = fixture();
  const config = { title: "Ghost sale", percentage: 10, scope: "products", productIds: ["mood-ghost"] };
  const preview = await sale.preview(config);
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.rows[0].saleDelivered - preview.rows[0].salePickup, 1000);
  catalog.get("mood-ghost").variants.nodes[0].price = "31.00";
  catalog.get("mood-ghost").variants.nodes[1].price = "21.00";
  await assert.rejects(sale.publish(config, preview.fingerprint, true), /prices changed/i);
});

test("a partial Shopify failure restores already updated products", async () => {
  const { sale, catalog } = fixture({ failProduct: "/2" });
  const config = { title: "Two products", percentage: 10, scope: "products", productIds: ["skeleton-chameleon", "mood-ghost"] };
  const preview = await sale.preview(config);
  await assert.rejects(sale.publish(config, preview.fingerprint, true), /not fully activated/i);
  assert.equal((await sale.status()).status, "inactive");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].price, "40.00");
});

test("ending refuses to overwrite a manual Shopify price edit", async () => {
  const { sale, catalog } = fixture();
  const config = { title: "Sale", percentage: 10, scope: "products", productIds: ["skeleton-chameleon"] };
  const preview = await sale.preview(config);
  await sale.publish(config, preview.fingerprint, true);
  catalog.get("skeleton-chameleon").variants.nodes[0].price = "35.00";
  assert.match((await sale.adminStatus()).admin.warning, /no longer match/i);
  await assert.rejects(sale.end(), /needs attention/i);
  assert.equal((await sale.status()).admin.status, "needs-attention");
  assert.equal(catalog.get("skeleton-chameleon").variants.nodes[0].price, "35.00");
});

test("whole-shop and Halloween scopes include every size/design once", async () => {
  const bases = products.filter((p) => !("variantOf" in p));
  const byHandle = new Map(bases.map((base, index) => {
    const ids = base.variants?.length ? base.variants.map((v) => v.id) : [base.id];
    const variants = ids.flatMap((id, position) => {
      const source = products.find((p) => p.id === id) || base;
      const delivered = source.priceCents;
      return [
        { id: `${index}-${position}-d`, sku: id, price: (delivered / 100).toFixed(2), compareAtPrice: null },
        { id: `${index}-${position}-p`, sku: `${id}-pickup`, price: ((delivered - 1000) / 100).toFixed(2), compareAtPrice: null },
      ];
    });
    return [base.shopifyHandle || base.id, { id: `product-${index}`, variants: { nodes: variants } }];
  }));
  const mock = { read: async (handles) => new Map(handles.map((handle) => [handle, byHandle.get(handle)])), update: async () => {} };
  const store = { get: async () => null, put: async () => ({ modified: true }) };
  const sale = createSaleService({ store, shopify: mock, production: true });
  const all = await sale.preview({ title: "Shop sale", percentage: 10, scope: "all" });
  assert.equal(all.config.productIds.length, bases.length);
  assert.equal(all.rows.length, bases.reduce((sum, p) => sum + (p.variants?.length || 1), 0));
  const halloween = collections.find((c) => c.id === "halloween");
  const seasonal = await sale.preview({ title: "Halloween sale", percentage: 10, scope: "collection", collectionId: halloween.id });
  assert.deepEqual(new Set(seasonal.config.productIds), new Set(halloween.products));
  assert.equal(new Set(seasonal.rows.map((row) => row.sku)).size, seasonal.rows.length);
});
