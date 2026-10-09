import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMerchandising, merchandisingDefaults } from "../commerce/merchandising.mjs";
import { createShop } from "../commerce/core.mjs";
import { handler } from "../commerce/http.mjs";

const clone = () => structuredClone(merchandisingDefaults);
const key = "isolated-test-admin-key-not-a-real-credential";
function fixture() {
  const data = new Map();
  const store = {
    get: async id => data.has(id) ? { data: structuredClone(data.get(id)), etag: "1" } : null,
    put: async (id, value) => { data.set(id, structuredClone(value)); return { modified: true }; },
    list: async prefix => [...data.keys()].filter(id => id.startsWith(prefix)),
  };
  return { store, shop: createShop({ store, testMode: true, adminKey: key }) };
}
test("shop campaigns validate dates, catalog references and unique product choices", () => {
  assert.deepEqual(validateMerchandising(clone()), merchandisingDefaults);
  for (const change of [
    value => { value.campaign.endDate = "2026-02-30"; },
    value => { value.campaign.endDate = "2025-10-01"; },
    value => { value.campaign.featuredIds = ["mood-ghost", "mood-ghost"]; },
    value => { value.campaign.featuredIds = ["mood-ghost-design-a"]; },
    value => { value.campaign.imageIndex = 999; },
    value => { value.campaign.destination = "https://unrelated.example"; },
    value => { value.departments = []; },
    value => { value.decorativeMotion = "yes"; },
  ]) {
    const value = clone(); change(value); assert.throws(() => validateMerchandising(value));
  }
});
test("older shop settings receive the motion default without losing campaign details", () => {
  const value = clone(); delete value.decorativeMotion;
  assert.deepEqual(validateMerchandising(value), merchandisingDefaults);
});
test("saved shop display survives a new service instance and is exposed as public config", async () => {
  const { store, shop } = fixture();
  const value = clone(); value.campaign.enabled = false; value.fallback.title = "Your next favourite.";
  await shop.saveMerchandising(value);
  const restarted = createShop({ store, testMode: true, adminKey: key });
  assert.deepEqual(await restarted.getMerchandising(), value);
  const response = await handler(restarted)(new Request("https://preview.example/.netlify/functions/shop?action=config"));
  const config = await response.json();
  assert.equal(config.merchandising.fallback.title, value.fallback.title);
  assert.equal(JSON.stringify(config).includes(key), false);
});
test("shop display mutation requires administrator authentication and same origin", async () => {
  const { shop } = fixture(); const api = handler(shop);
  const request = (authorization, origin = "https://preview.example") => new Request("https://preview.example/.netlify/functions/shop?action=save-merchandising", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) },
    body: JSON.stringify({ merchandising: clone() }),
  });
  assert.equal((await api(request(""))).status, 401);
  assert.equal((await api(request(key, "https://other.example"))).status, 403);
  assert.equal((await api(request(key))).status, 200);
});
