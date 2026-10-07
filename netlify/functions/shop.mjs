import { getStore } from "@netlify/blobs";
import { createShop } from "../../commerce/core.mjs";
import { handler } from "../../commerce/http.mjs";
import { resendMailer } from "../../commerce/notifications.mjs";
import pricing from "../../commerce/pricing.json" with { type: "json" };
import { createShopifyAdmin } from "../../commerce/shopify-admin.mjs";

const admin = createShopifyAdmin({
  legacyToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  clientId: process.env.SHOPIFY_CLIENT_ID || "",
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
});
const shopifyCatalogSync = (client, store) => client ? async ({id, name, priceCents}) => {
  const sale = await store.get("config/shop-sale");
  if (sale?.data?.status && sale.data.status !== "inactive")
    throw new Error("End or recover the active Shopify sale before changing this product's name or price.");
  const call = client.call;
  const lookup = await call(
    `query ProductForWebsite($handle: String!) { productByIdentifier(identifier: {handle: $handle}) { id variants(first: 100) { nodes { id sku } } } }`,
    { handle: id === "lithophane-table-lamp" ? "custom-cylindrical-lithophane-table-lamp" : id },
  );
  const product = lookup.productByIdentifier;
  if (!product?.id || !product.variants?.nodes?.[0]?.id)
    throw new Error("Create the Lithophane Table Lamp product in Shopify before changing its website name or price.");
  if (priceCents <= pricing.pickupPriceDifferenceCents) throw new Error("The delivered price must be more than the pickup price difference.");
  const delivered = product.variants.nodes.find(variant => variant.sku === id);
  const pickup = product.variants.nodes.find(variant => variant.sku === `${id}-pickup`);
  if (!delivered || !pickup) throw new Error("Both delivered and pickup variants must exist in Shopify before updating prices.");
  const update = await call(
    `mutation UpdateWebsiteProduct($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id } userErrors { message } } }`,
    { product: { id: product.id, title: name } },
  );
  const titleError = update.productUpdate.userErrors?.[0]?.message;
  if (titleError) throw new Error(titleError);
  const variants = await call(
    `mutation UpdateWebsitePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { productVariants { id } userErrors { message } } }`,
    { productId: product.id, variants: [{ id: delivered.id, price: (priceCents / 100).toFixed(2) }, { id: pickup.id, price: ((priceCents - pricing.pickupPriceDifferenceCents) / 100).toFixed(2) }] },
  );
  const priceError = variants.productVariantsBulkUpdate.userErrors?.[0]?.message;
  if (priceError) throw new Error(priceError);
} : null;
export default async (request, context) => {
  // Preview deploys never share orders or payment instructions with production.
  const deployContext = context?.deploy?.context || process.env.CONTEXT;
  const production = deployContext === "production";
  const testMode = ["deploy-preview", "branch-deploy", "dev"].includes(deployContext);
  const name = production
    ? "shop-orders-v1"
    : `shop-preview-${context?.deploy?.id || process.env.DEPLOY_ID || "local"}`;
  const blobs = getStore({ name, consistency: "strong" });
  const store = {
    get: (key) =>
      blobs.getWithMetadata(key, { type: "json", consistency: "strong" }),
    put: (key, data, conditions) => blobs.setJSON(key, data, conditions),
    list: async (prefix) =>
      (await blobs.list({ prefix })).blobs.map((blob) => blob.key),
  };
  return handler(
    createShop({
      store,
      testMode,
      enabled: production && process.env.SHOP_LIVE_ENABLED === "true",
      adminKey: process.env.SHOP_ADMIN_KEY || "",
      mailer: production ? resendMailer({apiKey: process.env.RESEND_API_KEY, from: process.env.SHOP_EMAIL_FROM}) : null,
      catalogSync: production ? shopifyCatalogSync(admin, store) : null,
    }),
  )(request);
};
