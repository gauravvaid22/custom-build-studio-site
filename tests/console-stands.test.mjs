import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import products from "../commerce/products.json" with { type: "json" };
import source from "../commerce/console-stands-source.json" with { type: "json" };
import collections from "../commerce/collections.json" with { type: "json" };
import { managedVariantInput } from "../commerce/managed-product-input.mjs";

test("all six console stands have fitting choices, real media and collection links", () => {
  assert.equal(source.products.length, 6);
  const collection = collections.find(c => c.id === "console-stands");
  const gaming = collections.find(c => c.id === "gaming-desk");
  for (const item of source.products) {
    const parent = products.find(p => p.id === item.id);
    assert.ok(collection.products.includes(item.id) && gaming.products.includes(item.id));
    assert.equal(parent.variantLabel, "Console model");
    assert.deepEqual(parent.variants.map(v => v.label), ["Original PS5", "PS5 Slim"]);
    assert.ok(parent.images.length >= 3);
    assert.ok(existsSync(new URL("../public" + parent.video, import.meta.url)));
    for (const image of parent.images) {
      assert.ok(existsSync(new URL("../public" + image.src, import.meta.url)));
      assert.ok(existsSync(new URL("../public" + image.thumb, import.meta.url)));
    }
    for (const choice of parent.variants) {
      const child = products.find(p => p.id === choice.id);
      assert.equal(child.variantOf, parent.id);
      assert.equal(child.priceCents, choice.priceCents);
      assert.equal(child.dimensions, choice.dimensions);
    }
  }
});

test("Shopify maps both fits and fulfillment choices without multiplying the pickup allowance", () => {
  for (const item of source.products) {
    const input = managedVariantInput(item, 1000);
    assert.equal(input.productOptions.length, 2);
    assert.equal(input.variants.length, 4);
    assert.equal(new Set(input.variants.map(v => v.sku)).size, 4);
    for (const choice of item.options) {
      const delivered = input.variants.find(v => v.sku === choice.id);
      const pickup = input.variants.find(v => v.sku === choice.id + "-pickup");
      assert.equal(Math.round(Number(delivered.price) * 100), choice.priceCents);
      assert.equal(Math.round(Number(pickup.price) * 100), choice.priceCents - 1000);
      assert.equal(Math.round(Number(delivered.price) * 300), choice.priceCents * 3);
      assert.equal(delivered.inventoryItem.requiresShipping, true);
      assert.equal(delivered.optionValues[0].name, choice.label);
    }
  }
});

test("existing single-option products retain their two fulfillment variants", () => {
  const input = managedVariantInput({ id: "example", priceCents: 2999 }, 1000);
  assert.equal(input.productOptions.length, 1);
  assert.deepEqual(input.variants.map(v => [v.sku, v.price]), [["example", "29.99"], ["example-pickup", "19.99"]]);
  assert.throws(() => managedVariantInput({ id: "invalid", priceCents: 999 }, 1000));
});
