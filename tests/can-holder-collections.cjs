const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://127.0.0.1:4173';
const products = JSON.parse(fs.readFileSync('commerce/products.json', 'utf8'));
const group = products.find(product => product.id === 'can-holder-designs-ii');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      let cartInput;
      await page.route('**/.netlify/functions/**', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await page.route('https://aqk73w-k2.myshopify.com/api/**', route => {
        const payload = route.request().postDataJSON();
        if (payload.query.includes('CreateCart')) {
          cartInput = payload.variables.input;
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { cartCreate: { cart: { checkoutUrl: origin + '/checkout-test' }, userErrors: [], warnings: [] } } }) });
        }
        const data = {};
        for (const [key, handle] of Object.entries(payload.variables)) {
          const product = products.find(product => product.id === handle);
          data['product' + key.replace('handle', '')] = { handle, title: product?.name || handle, variants: { nodes: [handle, handle + '-pickup'].map(sku => ({ sku, id: 'gid://shopify/ProductVariant/' + sku, availableForSale: true, price: { amount: ((product?.priceCents || 2999) / 100 - (sku.endsWith('-pickup') ? 10 : 0)).toFixed(2), currencyCode: 'CAD' } })) } };
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
      });
      await page.goto(origin + '/shop/can-holders?analytics_test=1');
      assert.equal(await page.locator('.shop-card').count(), 2, 'two browsing cards');
      for (const id of ['can-holder-designs', group.id]) {
        assert((await page.locator(`.shop-card-image[href="/shop/${id}"] img`).first().getAttribute('src')).includes('/cover-'), 'owner-supplied cover');
      }
      await page.goto(origin + '/shop/' + group.id + '?analytics_test=1');
      await page.getByRole('button', { name: /Delivered to you/ }).click();
      assert((await page.locator('.shop-main-image img').last().getAttribute('src')).includes('/cover-'));
      for (let i = 0; i < group.groupedDesigns.length; i++) {
        const id = group.groupedDesigns[i].id;
        const product = products.find(product => product.id === id);
        await page.locator('.shop-design-options button').nth(i).click();
        assert((await page.locator('.shop-detail').innerText()).includes('$' + (product.priceCents / 100).toFixed(2)), 'delivered price');
        await page.getByRole('button', { name: /Edmonton pickup/ }).click();
        assert((await page.locator('.shop-detail').innerText()).includes('$' + ((product.priceCents - 1000) / 100).toFixed(2)), 'pickup price');
        await page.getByRole('button', { name: /Delivered to you/ }).click();
        await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Show all designs', exact: true }).click();
      await page.locator('.gallery-previous').waitFor({ state: 'hidden' });
      await page.locator('.gallery-pending').waitFor({ state: 'hidden' });
      await page.screenshot({ path: `test-results/can-holder-ii-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('link', { name: 'View cart & checkout ↗', exact: true }).click();
      await page.getByRole('button', { name: 'Secure checkout ↗', exact: true }).click();
      await page.waitForURL(origin + '/checkout-test');
      assert.deepEqual(cartInput.lines.map(line => line.merchandiseId).sort(), group.groupedDesigns.map(design => 'gid://shopify/ProductVariant/' + design.id).sort());
      assert(cartInput.lines.every(line => line.quantity === 1));
      await page.close();
      console.log(`PASS ${width}px: two covers, all six designs, delivery/pickup prices, cart and Shopify SKU mapping.`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
