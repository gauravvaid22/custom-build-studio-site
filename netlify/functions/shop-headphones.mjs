import { getStore } from "@netlify/blobs";
import { equal } from "../../commerce/core.mjs";
import products from "../../commerce/products.json" with { type: "json" };
import source from "../../commerce/headphone-stands-source.json" with { type: "json" };
import pricing from "../../commerce/pricing.json" with { type: "json" };
import { createShopifyAdmin } from "../../commerce/shopify-admin.mjs";

const ids = new Set(source.products.map((item) => item.id));
const admin = createShopifyAdmin({
  legacyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  clientId: process.env.SHOPIFY_CLIENT_ID || "",
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
});
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = (cents) => (cents / 100).toFixed(2);

async function productByHandle(id) {
  const data = await admin.call(
    `query HeadphoneProduct($handle: String!) { productByIdentifier(identifier: {handle: $handle}) { id title variants(first: 10) { nodes { id sku price compareAtPrice } } } }`,
    { handle: id },
  );
  return data.productByIdentifier;
}

async function checkSale(id) {
  const store = getStore({ name: "shop-orders-v1", consistency: "strong" });
  const sale = (await store.getWithMetadata("config/shop-sale", { type: "json", consistency: "strong" }))?.data;
  if (sale?.status && sale.status !== "inactive" && sale?.config?.productIds?.includes(id))
    throw new Error("This product is included in an active or scheduled sale. End or update that sale first.");
}

async function createMissing(item) {
  const current = await productByHandle(item.id);
  if (current) return { id: item.id, status: "already-exists" };
  const product = products.find((entry) => entry.id === item.id);
  if (!product) throw new Error("The website product is missing.");
  const imageUrl = `https://custombuildstudio.ca${product.images[0].src}`;
  const result = await admin.call(
    `mutation CreateHeadphoneProduct($input: ProductSetInput!) {
      productSet(input: $input, synchronous: true) {
        product { id handle status variants(first: 5) { nodes { sku price } } }
        userErrors { message }
      }
    }`,
    { input: {
      handle: item.id,
      title: item.name,
      descriptionHtml: `<p>${escapeHtml(item.description)}</p><p>${escapeHtml(product.included)}</p><p>Approximately ${item.heightMm} mm high. Colours are similar to the reference photos and may vary slightly. Finished physical product; no digital files.</p>`,
      productType: "Headphone Stands",
      vendor: "Custom Build Studio",
      tags: ["headphone stand", "desk accessory", "Edmonton made", "headset holder"],
      status: "ACTIVE",
      seo: { title: `${item.name} | Custom Build Studio`, description: `${item.description} Made in Edmonton. Free tracked shipping in Canada or local pickup.` },
      productOptions: [{ name: "Fulfillment", position: 1, values: [{ name: "Delivery" }, { name: "Edmonton Pickup" }] }],
      variants: [
        { optionValues: [{ optionName: "Fulfillment", name: "Delivery" }], sku: item.id, price: money(item.priceCents), taxable: false, inventoryItem: { tracked: false, requiresShipping: true, countryCodeOfOrigin: "CA" } },
        { optionValues: [{ optionName: "Fulfillment", name: "Edmonton Pickup" }], sku: `${item.id}-pickup`, price: money(item.priceCents - pricing.pickupPriceDifferenceCents), taxable: false, inventoryItem: { tracked: false, requiresShipping: true, countryCodeOfOrigin: "CA" } },
      ],
      files: [{ originalSource: imageUrl, filename: `${item.id}.webp`, alt: product.images[0].alt, contentType: "IMAGE" }],
    } },
  );
  const errors = result.productSet?.userErrors || [];
  if (errors.length || !result.productSet?.product?.id)
    throw new Error(errors.map((error) => error.message).join("; ") || "Shopify did not create the product.");
  return { id: item.id, status: "created", shopifyId: result.productSet.product.id };
}

async function updatePrice(id, cents) {
  if (!Number.isInteger(cents) || cents < 1500 || cents > 100000)
    throw new Error("Enter a delivered price from CA$15 to CA$1,000.");
  await checkSale(id);
  const product = await productByHandle(id);
  if (!product) throw new Error("Create this product in Shopify before editing its price.");
  const delivered = product.variants.nodes.find((variant) => variant.sku === id);
  const pickup = product.variants.nodes.find((variant) => variant.sku === `${id}-pickup`);
  if (!delivered?.id || !pickup?.id) throw new Error("Both delivery and pickup Shopify variants are required.");
  if ([delivered, pickup].some((variant) => variant.compareAtPrice && Number(variant.compareAtPrice) > Number(variant.price)))
    throw new Error("End the existing Shopify discount before changing this price.");
  const result = await admin.call(
    `mutation UpdateHeadphonePrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants, allowPartialUpdates: false) {
        productVariants { id sku price }
        userErrors { message }
      }
    }`,
    { productId: product.id, variants: [
      { id: delivered.id, price: money(cents) },
      { id: pickup.id, price: money(cents - pricing.pickupPriceDifferenceCents) },
    ] },
  );
  const errors = result.productVariantsBulkUpdate?.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join("; "));
  const updated = await productByHandle(id);
  if (updated?.variants?.nodes?.find((variant) => variant.sku === id)?.price !== money(cents))
    throw new Error("Shopify did not confirm the new price. Refresh and check this product before retrying.");
  return { id, priceCents: cents, pickupPriceCents: cents - pricing.pickupPriceDifferenceCents };
}

export default async function shopHeadphones(request, context) {
  const url = new URL(request.url);
  const production = (context?.deploy?.context || process.env.CONTEXT) === "production";
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (request.headers.get("origin") !== url.origin) return json({ error: "Request origin not allowed" }, 403);
  if (!production || !admin) return json({ error: "Shopify administration is unavailable here." }, 503);
  const key = process.env.SHOP_ADMIN_KEY || "";
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (key.length < 32 || !equal(bearer, key)) return json({ error: "Administrator authentication required" }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required" }, 415);
  if (Number(request.headers.get("content-length")) > 2000) return json({ error: "Request too large" }, 413);
  try {
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw || "{}");
    if (!ids.has(body.id)) return json({ error: "Unknown headphone stand" }, 400);
    const item = source.products.find((entry) => entry.id === body.id);
    if (body.action === "create-missing") return json(await createMissing(item));
    if (body.action === "update-price") return json(await updatePrice(body.id, body.priceCents));
    return json({ error: "Unknown action" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to update Shopify." }, 409);
  }
}
