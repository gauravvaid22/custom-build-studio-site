import test from "node:test";
import assert from "node:assert/strict";
import { discoveryProducts, fetchDiscoveryCatalog, merchantFeed, discoverySchema, getCustomLabel0, getCustomLabel1 } from "../commerce/search-discovery.mjs";

test("only configured products with verified CAD delivery variants enter the feed", async () => {
  const simple = discoveryProducts.filter(p => p.category === "Headphone stands");
  const data = Object.fromEntries(simple.map((p, i) => [`p${discoveryProducts.indexOf(p)}`, {
    title: `${p.name} & updated`, variants: { nodes: [
      { sku: p.id + "-pickup", price: { amount: "29.99", currencyCode: "CAD" }, availableForSale: true },
      { sku: p.id, price: { amount: i === 1 ? "49.99" : "39.99", currencyCode: i === 2 ? "USD" : "CAD" }, availableForSale: i !== 1 },
    ] },
  }]));
  data[`p${discoveryProducts.indexOf(simple[3])}`] = null;
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

test("mask sizes and ghost designs keep their own Shopify prices, links and photos", async () => {
  const mask = discoveryProducts.find(p => p.id === "carved-in-fear-halloween-mask");
  const ghost = discoveryProducts.find(p => p.id === "mood-ghost");
  const data = Object.fromEntries([mask, ghost].map(p => [`p${discoveryProducts.indexOf(p)}`, {
    title: p.name, variants: { nodes: p.variants.flatMap((v, i) => [
      { sku: v.id + "-pickup", price: { amount: "10.00", currencyCode: "CAD" }, availableForSale: true },
      { sku: v.id, price: { amount: String(60 + i * 10), currencyCode: "CAD" }, availableForSale: i !== 2 },
    ]) },
  }]));
  const items = await fetchDiscoveryCatalog("test", async () => Response.json({ data }));
  const liveMask = items.find(p => p.id === mask.id);
  const group = discoverySchema(liveMask)["@graph"][0];
  assert.equal(group["@type"], "ProductGroup");
  assert.deepEqual(group.hasVariant.map(v => [v.size, v.offers.price]), [["Small", "60.00"], ["Medium", "70.00"], ["Large", "80.00"]]);
  assert.match(group.hasVariant[1].url, /variant=carved-in-fear-halloween-mask-medium/);
  assert.equal(group.hasVariant[2].offers.availability, "https://schema.org/OutOfStock");
  const liveGhost = items.find(p => p.id === ghost.id);
  assert.ok(liveGhost.liveVariants[1].images.every(i => i.design === "Design B"));
  const feed = merchantFeed(items);
  assert.match(feed, /<g:item_group_id>carved-in-fear-halloween-mask<\/g:item_group_id>/);
  assert.match(feed, /<g:pattern>Design B<\/g:pattern>/);
  assert.match(feed, /&amp;variant=/);
  assert.doesNotMatch(feed, /-pickup/);
});

test("missing connection or Shopify errors never invent purchasable offers", async () => {
  await assert.rejects(fetchDiscoveryCatalog(""));
  await assert.rejects(fetchDiscoveryCatalog("test", async () => Response.json({ errors: [{ message: "Failed" }] })));
});

test("google shopping custom labels correctly segment christmas hero items, general decor, and price tiers", () => {
  assert.equal(getCustomLabel0({ id: "endless-swirling-tree" }, { id: "endless-swirling-tree" }), "christmas_tree_hero");
  assert.equal(getCustomLabel0({ id: "meowy-christmas-tree-topper" }, { id: "meowy-christmas-tree-topper" }), "christmas_tree_hero");
  assert.equal(getCustomLabel0({ id: "christmas-character-ornaments" }, { id: "santa-claus-christmas-ornament" }), "christmas_tree_hero");
  assert.equal(getCustomLabel0({ id: "christmas-trinket-trays" }, { id: "christmas-tree-tray" }), "christmas_tree_hero");
  assert.equal(getCustomLabel0({ id: "bright-nativity-table-lamp", category: "Christmas décor" }, { id: "bright-nativity-table-lamp" }), "christmas_decor_general");
  assert.equal(getCustomLabel0({ id: "headphone-stand-classic", category: "Headphone stands" }, { id: "headphone-stand-classic" }), "core_catalog");

  assert.equal(getCustomLabel1({ livePrice: "24.99" }), "under_30_cad");
  assert.equal(getCustomLabel1({ livePrice: "39.99" }), "30_to_50_cad");
  assert.equal(getCustomLabel1({ livePrice: "65.00" }), "over_50_cad");

  const sample = [{
    id: "party-hat-pet-costume",
    name: "Birthday Hat for Cats & Dogs — Party Hat",
    category: "Pet hats & costumes",
    description: "Sample",
    livePrice: "18.00",
    available: true,
    images: [{ src: "/sample.webp" }],
  }];
  const xml = merchantFeed(sample);
  assert.match(xml, /<g:custom_label_0>core_catalog<\/g:custom_label_0>/);
  assert.match(xml, /<g:custom_label_1>under_30_cad<\/g:custom_label_1>/);
});
