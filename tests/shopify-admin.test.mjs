import assert from "node:assert/strict";
import { test } from "node:test";
import { createShopifyAdmin } from "../commerce/shopify-admin.mjs";

test("client credentials are exchanged server-side and cached until expiry", async () => {
  let time = 0, tokenRequests = 0, apiRequests = 0;
  const fetcher = async (url, options) => {
    if (url.endsWith("/admin/oauth/access_token")) {
      tokenRequests++;
      assert.match(String(options.body), /grant_type=client_credentials/);
      return { ok: true, json: async () => ({ access_token: `private-${tokenRequests}`, expires_in: 3600 }) };
    }
    apiRequests++;
    assert.equal(options.headers["X-Shopify-Access-Token"], `private-${tokenRequests}`);
    return { ok: true, status: 200, json: async () => ({ data: { shop: { currencyCode: "CAD" } } }) };
  };
  const admin = createShopifyAdmin({ clientId: "client-id", clientSecret: "secret", fetcher, now: () => time });
  assert.deepEqual(await admin.call("{ shop { currencyCode } }"), { shop: { currencyCode: "CAD" } });
  await admin.call("{ shop { currencyCode } }");
  assert.equal(tokenRequests, 1);
  time = 3600000;
  await admin.call("{ shop { currencyCode } }");
  assert.equal(tokenRequests, 2);
  assert.equal(apiRequests, 3);
});

test("unconfigured access cannot be used", () => {
  assert.equal(createShopifyAdmin({}), null);
});
