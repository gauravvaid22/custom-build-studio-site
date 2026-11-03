import test from "node:test";
import assert from "node:assert/strict";
import products from "../commerce/products.json" with { type: "json" };
import collections from "../commerce/collections.json" with { type: "json" };
import { PURE_HALLOWEEN_PRODUCT_IDS } from "../commerce/merchandising.mjs";
import { matchesSearchQuery, scoreSearchQuery } from "../commerce/storefront-search.mjs";

const searchableChristmasSeason = products.filter(
  p => !p.variantOf && !p.purchaseOnly && p.launchReady !== false && !PURE_HALLOWEEN_PRODUCT_IDS.includes(p.id),
);

function rankQuery(query) {
  return searchableChristmasSeason
    .filter(p => matchesSearchQuery(p, query, p.name, collections))
    .sort((a, b) => scoreSearchQuery(b, query, b.name, collections) - scoreSearchQuery(a, query, a.name, collections));
}

test("word-boundary search ranks White Cat lamp #1 on cat lamp and cat christmas gift with zero delicate/catch-all false positives", () => {
  const catLamp = rankQuery("cat lamp");
  assert.ok(catLamp.length >= 1, "Expected at least 1 match for 'cat lamp'");
  assert.equal(catLamp[0].id, "kitten-ornament-table-lamp", `Expected kitten-ornament-table-lamp #1, got ${catLamp[0].id}`);
  for (const falsePositive of ["christmas-angel", "luminous-tree", "luminous-tree-lace", "christmas-trinket-trays", "stocking-tray", "snowflake-tray", "christmas-tree-tray"]) {
    assert.ok(!catLamp.some(p => p.id === falsePositive), `False positive ${falsePositive} matched 'cat lamp'`);
  }

  const catGift = rankQuery("cat christmas gift");
  const top2CatGifts = catGift.slice(0, 2).map(p => p.id);
  assert.ok(top2CatGifts.includes("kitten-ornament-table-lamp"), `Expected kitten-ornament-table-lamp in top 2, got ${top2CatGifts}`);
  assert.ok(top2CatGifts.includes("meowy-christmas-tree-topper"), `Expected meowy-christmas-tree-topper in top 2, got ${top2CatGifts}`);
  const catIds = catGift.map(p => p.id);
  assert.ok(catIds.includes("sleeping-cat-christmas-ornament"));
  assert.ok(!catIds.includes("christmas-trinket-trays"));
  assert.ok(!catIds.includes("luminous-tree-lace"));
});

test("high-intent Christmas queries surface Drop 378 lamps and holiday gifts in relevance order", () => {
  const drop378 = [
    "kitten-ornament-table-lamp",
    "snowy-branch-table-lamp",
    "olive-branch-nativity-table-lamp",
    "guardian-angel-table-lamp",
    "glowing-gift-bag-table-lamp",
    "snowman-shine-table-lamp",
  ];

  const nightLightIds = rankQuery("christmas night light").map(p => p.id);
  for (const id of drop378) {
    assert.ok(nightLightIds.includes(id), `Expected ${id} in 'christmas night light' results`);
  }
  // Non-lit ornaments that say "lightweight" in description must not match "christmas light"
  const xmasLightIds = rankQuery("christmas light").map(p => p.id);
  assert.ok(!xmasLightIds.includes("santa-claus-christmas-ornament"), "'lightweight' must not match 'light'");

  const nativityIds = rankQuery("nativity scene").map(p => p.id);
  assert.ok(nativityIds.includes("olive-branch-nativity-table-lamp"));
  assert.ok(nativityIds.includes("guardian-angel-table-lamp"));
  assert.ok(nativityIds.includes("bright-nativity-table-lamp"));
  assert.ok(nativityIds.includes("christmas-angel"));
  assert.ok(nativityIds.includes("holy-family-embrace"));

  const stockingIds = rankQuery("stocking stuffer").map(p => p.id);
  assert.ok(stockingIds.includes("snowman-shine-table-lamp"));
  assert.ok(stockingIds.includes("glowing-gift-bag-table-lamp"));
  assert.ok(stockingIds.includes("zou-christmas-baby-axolotl"));
  assert.ok(stockingIds.includes("christmas-character-ornaments"));

  const xmasGiftTop25 = rankQuery("christmas gift").slice(0, 25).map(p => p.id);
  for (const id of drop378) {
    assert.ok(xmasGiftTop25.includes(id), `Expected root Drop 378 product ${id} in top 25 of 'christmas gift'`);
  }
});
