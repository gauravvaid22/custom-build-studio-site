import { getStore } from "@netlify/blobs";
import { createSaleService, SaleError } from "../../commerce/sales.mjs";
import { equal } from "../../commerce/core.mjs";
import { createShopifyAdmin } from "../../commerce/shopify-admin.mjs";

const admin = createShopifyAdmin({
  legacyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  clientId: process.env.SHOPIFY_CLIENT_ID || "",
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
});
function shopifyClient(client) {
  if (!client) return null;
  const call = client.call;
  return {
    async read(handles) {
      const unique = [...new Set(handles)];
      const result = new Map();
      // Keep requested GraphQL cost comfortably below Shopify's per-query limit.
      for (let start = 0; start < unique.length; start += 4) {
        const batch = unique.slice(start, start + 4);
        const vars = Object.fromEntries(batch.map((handle, index) => [`handle${index}`, handle]));
        const args = batch.map((_, index) => `$handle${index}: String!`).join(", ");
        const fields = batch.map((_, index) => `p${index}: productByIdentifier(identifier: {handle: $handle${index}}) { id title variants(first: 50) { nodes { id sku price compareAtPrice } } }`).join("\n");
        const data = await call(`query SaleCatalog(${args}) { shop { currencyCode } ${fields} }`, vars);
        if (data.shop?.currencyCode !== "CAD") throw new SaleError("Shopify shop currency must be CAD before activating a sale.", 409);
        batch.forEach((handle, index) => result.set(handle, data[`p${index}`]));
      }
      return result;
    },
    async update(productId, variants) {
      const data = await call(
        `mutation SetSalePrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants, allowPartialUpdates: false) { productVariants { id } userErrors { field message } } }`,
        { productId, variants },
      );
      const errors = data.productVariantsBulkUpdate?.userErrors || [];
      if (errors.length) throw new SaleError(errors.map((e) => e.message).join("; "), 502);
    },
  };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export function createService(context) {
  const deployContext = context?.deploy?.context || process.env.CONTEXT;
  const production = deployContext === "production";
  const name = production ? "shop-orders-v1" : `shop-preview-${context?.deploy?.id || process.env.DEPLOY_ID || "local"}`;
  const blobs = getStore({ name, consistency: "strong" });
  const store = {
    get: (key) => blobs.getWithMetadata(key, { type: "json", consistency: "strong" }),
    put: (key, data, conditions) => blobs.setJSON(key, data, conditions),
  };
  return createSaleService({ store, shopify: shopifyClient(admin), production });
}

export default async function shopSale(request, context) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "status";
  const service = createService(context);
  try {
    if (request.method === "GET" && action === "status") {
      const sale = await service.status();
      return json({ sale: { status: sale.status, ...(sale.status === "active" ? {
        title: sale.title, percentage: sale.percentage, endAt: sale.endAt, scope: sale.scope, productIds: sale.productIds,
        collectionId: sale.collectionId, variants: sale.variants,
      } : {}) } });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (request.headers.get("origin") !== url.origin) return json({ error: "Request origin not allowed" }, 403);
    const adminKey = process.env.SHOP_ADMIN_KEY || "";
    const bearer = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
    if (adminKey.length < 32 || !equal(bearer, adminKey)) return json({ error: "Administrator authentication required" }, 401);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required" }, 415);
    if (Number(request.headers.get("content-length")) > 12000) return json({ error: "Request too large" }, 413);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw || "{}");
    if (action === "admin-status") return json({ sale: await service.adminStatus(), shopifyAdminConfigured: Boolean(admin) });
    if (action === "preview") return json({ preview: await service.preview(body.config) });
    if (action === "publish") return json({ sale: await service.publish(body.config, body.fingerprint, body.discountsChecked) });
    if (action === "schedule") return json({ sale: await service.schedule(body.config, body.fingerprint, body.discountsChecked) });
    if (action === "cancel-schedule") return json({ sale: await service.cancelSchedule() });
    if (action === "end") return json({ sale: await service.end() });
    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: error instanceof SaleError ? error.message : "The sale service is temporarily unavailable." }, error instanceof SaleError ? error.status : 503);
  }
}
