import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import source from "../commerce/photo-frames-source.json" with { type: "json" };
import products from "../commerce/products.json" with { type: "json" };
import collections from "../commerce/collections.json" with { type: "json" };
import pricing from "../commerce/pricing.json" with { type: "json" };
import { discoveryProducts, fetchDiscoveryCatalog, merchantFeed, discoverySchema } from "../commerce/search-discovery.mjs";

test("every drop design includes personalization and correctly mapped media and source dimensions", () => {
  assert.equal(source.products.length, 13);
  const personalized = collections.find(c => c.id === "personalized-gifts");
  const frames = collections.find(c => c.id === "photo-frames");
  for (const item of source.products) {
    const product = products.find(p => p.id === item.id);
    assert.ok(personalized.products.includes(product.listingGroup || item.id) && frames.products.includes(product.listingGroup || item.id));
    assert.equal(product.personalization.photoCount, 1);
    assert.equal(product.priceCents, item.priceCents);
    assert.ok(product.priceCents - pricing.pickupPriceDifferenceCents >= 1999);
    assert.ok(product.dimensions.includes(item.bodyMm.join(" × ")));
    assert.match(product.included, /photo printed, trimmed and fitted/);
    assert.equal(product.images.length, 4);
    for (const image of product.images) for (const path of [image.src, image.thumb]) assert.ok(existsSync("public" + path), path);
    assert.ok(existsSync("public" + product.video));
  }
});

test("photo frame search offers use verified Shopify delivered prices and exclude private photos and pickup SKUs", async () => {
  const frames = discoveryProducts.filter(p => p.personalization);
  assert.equal(frames.length, 13);
  const data = Object.fromEntries(frames.map(p => [`p${discoveryProducts.indexOf(p)}`, { title: p.name, variants: { nodes: [
    {sku: p.id, price: {amount: (p.priceCents / 100).toFixed(2), currencyCode: "CAD"}, availableForSale: true},
    {sku: `${p.id}-pickup`, price: {amount: "19.99", currencyCode: "CAD"}, availableForSale: true},
  ]}}]));
  const catalog = await fetchDiscoveryCatalog("test", async () => Response.json({data}));
  assert.equal(catalog.length, 13);
  const feed = merchantFeed(catalog);
  assert.doesNotMatch(feed, /-pickup|\/shop\/photo\?|token=/);
  assert.match(feed, /photo print|photo printed/i);
  for (const item of catalog) {
    assert.equal(discoverySchema(item)["@graph"][0].offers.price, (item.priceCents / 100).toFixed(2));
    assert.equal(discoverySchema(item)["@graph"][1].itemListElement[1].name, collections.find(c => c.id === "photo-frames").name);
  }
});
