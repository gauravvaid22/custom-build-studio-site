const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const origin = process.env.BASE_URL || "http://127.0.0.1:4186";
const products = JSON.parse(fs.readFileSync("commerce/products.json", "utf8"));
fs.mkdirSync("test-results", { recursive: true });

(async () => {
  process.env.VITE_SHOPIFY_STOREFRONT_TOKEN = "preview-token";
  const { createServer } = await import("vite");
  const server = await createServer({ server: { host: "127.0.0.1", port: 4186, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/.netlify/functions/shop-sale?action=status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ sale: {
      status: "active", title: "October studio sale", percentage: 25, scope: "products",
      productIds: ["skeleton-chameleon"], collectionId: null,
      variants: {
        "skeleton-chameleon": { priceCents: 3000, compareAtCents: 4000 },
        "skeleton-chameleon-pickup": { priceCents: 2000, compareAtCents: 3000 },
      },
    } }),
  }));
  await page.route("https://aqk73w-k2.myshopify.com/api/**", (route) => {
    const body = route.request().postDataJSON();
    const data = {};
    Object.entries(body.variables || {}).forEach(([key, handle]) => {
      const index = key.replace("handle", "");
      const product = products.find((item) => (item.shopifyHandle || item.id) === handle);
      const regular = product?.priceCents || 3000;
      const special = handle === "skeleton-chameleon";
      data[`product${index}`] = { handle, title: product?.name || handle, variants: { nodes: [
        { sku: product?.id || handle, price: { amount: ((special ? 3000 : regular) / 100).toFixed(2), currencyCode: "CAD" }, compareAtPrice: special ? { amount: "40.00", currencyCode: "CAD" } : null },
        { sku: `${product?.id || handle}-pickup`, price: { amount: ((special ? 2000 : Math.max(100, regular - 1000)) / 100).toFixed(2), currencyCode: "CAD" }, compareAtPrice: special ? { amount: "30.00", currencyCode: "CAD" } : null },
      ] } };
    });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
  });
  await page.goto(`${origin}/shop/sale`);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  await page.getByText("Regular $40.00 CAD").waitFor();
  assert.equal(await page.locator(".shop-sale-badge").count(), 1);
  await page.screenshot({ path: "test-results/sale-desktop.png", fullPage: true });
  await page.goto(`${origin}/shop/skeleton-chameleon`);
  await page.getByText("Regular $40.00 CAD").waitFor();
  assert.match(await page.locator(".shop-detail-info").innerText(), /\$30\.00/);
  await page.goto(`${origin}/shop`);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  await page.goto(origin);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  assert.equal(await page.getByRole("link", { name: /Shop the sale/ }).count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/shop/sale`);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  await page.screenshot({ path: "test-results/sale-mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "mobile page must not overflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/.netlify/functions/shop?action=*", (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const payload = action === "list" ? { orders: [] } : action === "get-content" ? { siteContent: JSON.parse(fs.readFileSync("commerce/site-content.json", "utf8")) } : { productContent: JSON.parse(fs.readFileSync("commerce/product-content.json", "utf8")) };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
  });
  await page.route("**/.netlify/functions/shop-sale?action=admin-status", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ sale: { status: "inactive", admin: { status: "inactive" } }, shopifyAdminConfigured: true }) }));
  await page.route("**/.netlify/functions/shop-sale?action=preview", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ preview: {
    fingerprint: "test-preview", config: { title: "Studio sale", percentage: 10, productIds: ["skeleton-chameleon"] },
    rows: [{ productId: "skeleton-chameleon", name: "Skeleton Chameleon Figurine", sku: "skeleton-chameleon", regularDelivered: 4000, saleDelivered: 3600, regularPickup: 3000, salePickup: 2600 }],
  } }) }));
  await page.goto(`${origin}/shop/admin`);
  await page.getByLabel("Administrator key").fill("test-admin-key");
  await page.getByRole("button", { name: "Open orders" }).click();
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  await page.getByRole("button", { name: "Preview sale prices" }).click();
  await page.getByText("Review 1 priced option").waitFor();
  assert.equal(await page.getByRole("button", { name: "Turn on this sale" }).isDisabled(), true);
  await page.getByLabel(/I checked Shopify discounts/).check();
  assert.equal(await page.getByRole("button", { name: "Turn on this sale" }).isEnabled(), true);
  await page.screenshot({ path: "test-results/sale-admin.png", fullPage: true });
  assert.deepEqual(errors, []);
  await browser.close();
  await server.close();
  console.log("Sale desktop/mobile rendering and product price assertions passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
