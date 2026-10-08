import test from "node:test";
import assert from "node:assert/strict";
import { discoveryProducts, fetchDiscoveryCatalog, merchantFeed, discoverySchema } from "../commerce/search-discovery.mjs";

test("only configured products with verified CAD delivery variants enter the feed", async () => {
  const data = Object.fromEntries(discoveryProducts.map((p, i) => [`p${i}`, {
    title: `${p.name} & updated`, variants: { nodes: [
      { sku: p.id + "-pickup", price: { amount: "29.99", currencyCode: "CAD" }, availableForSale: true },
      { sku: p.id, price: { amount: i === 1 ? "49.99" : "39.99", currencyCode: i === 2 ? "USD" : "CAD" }, availableForSale: i !== 1 },
    ] },
  }]));
  data.p3 = null;
  const items = await fetchDiscoveryCatalog("public-test-token", async () => Response.json({ data }));
  assert.equal(items.length, 4);
  assert.equal(items[0].livePrice, "39.99");
  const xml = merchantFeed(items);
  assert.match(xml, /&amp; updated/);
  assert.match(xml, /<g:availability>out_of_stock<\/g:availability>/);
  assert.match(xml, /<g:price>49.99 CAD<\/g:price>/);
  assert.doesNotMatch(xml, /-pickup|USD|public-test-token/);
  assert.match(xml, /fulfillment=delivered/);
  const offer = discoverySchema(items[1])["@graph"][0].offers;
  assert.equal(offer.price, "49.99");
  assert.equal(offer.availability, "https://schema.org/OutOfStock");
  assert.equal(offer.shippingDetails.shippingRate.value, "0.00");
});

test("missing connection or Shopify errors never invent purchasable offers", async () => {
  await assert.rejects(fetchDiscoveryCatalog(""));
  await assert.rejects(fetchDiscoveryCatalog("test", async () => Response.json({ errors: [{ message: "Failed" }] })));
});
