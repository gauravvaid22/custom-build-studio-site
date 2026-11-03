const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const origin = process.env.BASE_URL || "http://127.0.0.1:4186";
const products = JSON.parse(fs.readFileSync("commerce/products.json", "utf8"));
const collections = JSON.parse(fs.readFileSync("commerce/collections.json", "utf8"));
fs.mkdirSync("test-results", { recursive: true });

(async () => {
  process.env.VITE_SHOPIFY_STOREFRONT_TOKEN = "preview-token";
  const { createServer } = await import("vite");
  const server = await createServer({ server: { host: "127.0.0.1", port: 4186, strictPort: true } });
  let browser;
  try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/.netlify/functions/shop-sale?action=status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ sale: {
      status: "active", title: "October studio sale", percentage: 25, endAt: "2027-10-31T06:00:00.000Z", scope: "products",
      productIds: ["skeleton-chameleon"], collectionId: null,
      variants: {
        "skeleton-chameleon": { priceCents: 1500, compareAtCents: 2000 },
      },
    } }),
  }));
  await page.route("https://aqk73w-k2.myshopify.com/api/**", (route) => {
    const body = route.request().postDataJSON();
    const data = {};
    Object.entries(body.variables || {}).forEach(([key, handle]) => {
      const index = key.replace("handle", "");
      const product = products.find((item) => (item.shopifyHandle || item.id) === handle);
      const opts = product?.variants?.length ? product.variants : [{ id: product?.id || handle, priceCents: product?.priceCents || 3000 }];
      const special = handle === "skeleton-chameleon";
      data[`product${index}`] = { handle, title: product?.name || handle, variants: { nodes: opts.map((opt) => ({
        sku: opt.id,
        price: { amount: ((special ? 1500 : opt.priceCents) / 100).toFixed(2), currencyCode: "CAD" },
        compareAtPrice: special ? { amount: "20.00", currencyCode: "CAD" } : null,
      })) } };
    });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
  });
  await page.goto(`${origin}/shop/sale`);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  await page.getByText("Regular $20.00 CAD").waitFor();
  assert.equal(await page.locator(".shop-sale-badge").count(), 1);
  assert.match(await page.locator(".shop-sale-badge").innerText(), /25% OFF/);
  await page.getByText("25% OFF", { exact: true }).first().waitFor();
  await page.screenshot({ path: "test-results/sale-desktop.png", fullPage: true });
  await page.goto(`${origin}/shop/skeleton-chameleon`);
  await page.getByText("Regular $20.00 CAD").waitFor();
  assert.match(await page.locator(".shop-detail-info").innerText(), /\$15\.00/);
  await page.goto(`${origin}/shop`);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  await page.goto(origin);
  await page.getByRole("heading", { name: "October studio sale" }).waitFor();
  assert.equal(await page.getByRole("link", { name: /Shop 25% off/ }).count(), 1);
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
    fingerprint: "test-preview", config: { ...route.request().postDataJSON().config, productIds: ["skeleton-chameleon"] },
    rows: [{ productId: "skeleton-chameleon", name: "Skeleton Chameleon Figurine", sku: "skeleton-chameleon", regularDelivered: 4000, saleDelivered: 3600, regularPickup: 3000, salePickup: 2600 }],
  } }) }));
  await page.goto(`${origin}/shop/admin`);
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  assert.equal(await page.getByLabel("End date and time").count(), 1);
  await page.getByRole("button", { name: /Load Early Christmas Shopper/ }).click();
  assert.equal(await page.getByLabel("Sale name").inputValue(), "Early Christmas Shopper Event");
  assert.equal(await page.getByLabel("Sale percentage").inputValue(), "25");
  assert.equal(await page.getByLabel("One category").isChecked(), true);
  assert.equal(await page.locator(".sale-admin select").inputValue(), "christmas");
  await page.getByRole("button", { name: "Preview sale prices" }).click();
  await page.getByText("Review 1 priced option").waitFor();
  assert.equal(await page.getByRole("button", { name: "Turn on this sale" }).isDisabled(), true);
  await page.getByLabel(/I checked Shopify discounts/).check();
  assert.equal(await page.getByRole("button", { name: "Turn on this sale" }).isEnabled(), true);
  await page.getByLabel("Start later").check();
  await page.getByLabel("End date and time").fill("2027-10-31T12:00");
  await page.getByRole("button", { name: "Preview sale prices" }).click();
  await page.getByText("Review 1 priced option").waitFor();
  assert.equal(await page.getByRole("button", { name: "Schedule this sale" }).isDisabled(), true);
  await page.getByLabel(/I checked Shopify discounts/).check();
  assert.equal(await page.getByRole("button", { name: "Schedule this sale" }).isEnabled(), true);
  await page.screenshot({ path: "test-results/sale-admin.png", fullPage: true });

  // Verify 25% off Early Christmas Shopper Event across /shop/christmas-special, grouped designs, and Home
  const christmasRootIds = collections.find((c) => c.id === "christmas").products;
  const christmasProductIds = [...new Set(christmasRootIds.flatMap((id) => {
    const p = products.find((item) => item.id === id);
    return p?.groupedDesigns?.length ? p.groupedDesigns.flatMap((d) => d.optionIds) : [id];
  }))];
  const christmasVariants = {};
  for (const pid of christmasProductIds) {
    const p = products.find((item) => item.id === pid);
    const opts = p?.variants?.length ? p.variants : [{ id: p.id, priceCents: p.priceCents }];
    for (const opt of opts) {
      christmasVariants[opt.id] = {
        priceCents: Math.round(opt.priceCents * 0.75),
        compareAtCents: opt.priceCents,
      };
    }
  }
  await page.unroute("**/.netlify/functions/shop-sale?action=status");
  await page.route("**/.netlify/functions/shop-sale?action=status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ sale: {
      status: "active",
      title: "Early Christmas Shopper Event",
      percentage: 25,
      endAt: "2026-11-10T23:59:00.000Z",
      scope: "collection",
      collectionId: "christmas",
      productIds: christmasProductIds,
      variants: christmasVariants,
    } }),
  }));
  await page.unroute("https://aqk73w-k2.myshopify.com/api/**");
  await page.route("https://aqk73w-k2.myshopify.com/api/**", (route) => {
    const body = route.request().postDataJSON();
    const data = {};
    Object.entries(body.variables || {}).forEach(([key, handle]) => {
      const index = key.replace("handle", "");
      const product = products.find((item) => (item.shopifyHandle || item.id) === handle);
      const opts = product?.variants?.length ? product.variants : [{ id: product?.id || handle, priceCents: product?.priceCents || 3000 }];
      data[`product${index}`] = {
        handle,
        title: product?.name || handle,
        variants: {
          nodes: opts.map((opt) => {
            const saleEntry = christmasVariants[opt.id];
            return {
              sku: opt.id,
              price: { amount: ((saleEntry ? saleEntry.priceCents : opt.priceCents) / 100).toFixed(2), currencyCode: "CAD" },
              compareAtPrice: saleEntry ? { amount: (saleEntry.compareAtCents / 100).toFixed(2), currencyCode: "CAD" } : null,
            };
          }),
        },
      };
    });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${origin}/shop/christmas-special`);
  await page.locator(".xmas-sale-banner").waitFor();
  assert.match(await page.locator(".xmas-sale-banner").innerText(), /Early Christmas Shopper Event/);
  assert.match(await page.locator(".xmas-sale-banner").innerText(), /25% OFF/i);
  await page.locator(".xmas-hero-sale-callout").waitFor();
  assert.ok(await page.locator(".xmas-card-sale-badge").count() >= 20, "All Christmas showcase cards show 25% OFF badge");
  assert.match(await page.locator(".xmas-card-sale-badge").first().innerText(), /25% OFF/);
  assert.match(await page.locator(".xmas-page").innerText(), /\$22\.49/);
  assert.match(await page.locator(".xmas-page").innerText(), /\$29\.99/);
  await page.screenshot({ path: "test-results/christmas-sale-desktop.png", fullPage: true });

  await page.goto(`${origin}/shop/christmas-character-ornaments`);
  await page.getByText("Regular $24.99 CAD").waitFor();
  assert.match(await page.locator(".shop-detail-info").innerText(), /\$18\.74/);
  assert.ok(await page.locator(".shop-design-options small s").count() >= 8, "Grouped ornament picker buttons display struck-through regular prices");

  await page.goto(origin);
  await page.getByRole("heading", { name: "Early Christmas Shopper Event" }).waitFor();
  assert.equal(await page.getByRole("link", { name: /Shop 25% off/ }).getAttribute("href"), "/shop/christmas-special/");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/shop/christmas-special`);
  await page.locator(".xmas-sale-banner").waitFor();
  assert.equal(await page.locator(".xmas-card-sale-badge").first().isVisible(), true, "25% OFF card badge stays visible on 390px mobile");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "mobile Christmas sale page must not overflow");
  await page.screenshot({ path: "test-results/christmas-sale-mobile.png", fullPage: true });

  assert.deepEqual(errors, []);
  console.log("Sale desktop/mobile rendering, Christmas 25% off showcase, and product price assertions passed.");
  } finally {
    if (browser) await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
})().catch((error) => { console.error(error); process.exit(1); });
