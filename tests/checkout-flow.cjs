const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://127.0.0.1:4173';
const products = JSON.parse(fs.readFileSync('commerce/products.json', 'utf8'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let releaseCatalog, cartInput;
      const pending = new Promise(resolve => { releaseCatalog = resolve; });
      await page.route('**/.netlify/functions/**', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await page.route('https://aqk73w-k2.myshopify.com/api/**', async route => {
        const payload = route.request().postDataJSON();
        if (payload.query.includes('CreateCart')) {
          cartInput = payload.variables.input;
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { cartCreate: { cart: { checkoutUrl: origin + '/checkout-test' }, userErrors: [], warnings: [] } } }) });
        }
        if (payload.query.includes('CatalogPrices')) await pending;
        const data = {};
        for (const [key, handle] of Object.entries(payload.variables)) {
          const matching = handle === 'mood-ghost' ? ['mood-ghost-design-a', 'mood-ghost-design-b'] : [handle];
          const nodes = matching.flatMap(sku => [sku, sku + '-pickup']).map(sku => ({ sku, id: 'gid://shopify/ProductVariant/' + sku, availableForSale: true, price: { amount: sku.endsWith('-pickup') ? '12.80' : '20.80', currencyCode: 'CAD' } }));
          data['product' + key.replace('handle', '')] = { handle, title: products.find(product => product.id === handle)?.name || handle, variants: { nodes } };
        }
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
      });
      await page.goto(origin + '/shop/mood-ghost?analytics_test=1');
      await page.getByRole('button', { name: /Delivered to you/ }).click();
      await page.getByLabel('Design for Mood Ghost Figurine').selectOption('mood-ghost-design-b');
      await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
      await page.getByRole('link', { name: 'View cart & checkout ↗', exact: true }).click();
      const checkout = page.getByRole('button', { name: 'Secure checkout ↗', exact: true });
      assert.equal(await checkout.isEnabled(), false, 'checkout must wait for verified prices');
      releaseCatalog();
      await checkout.waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('.shopify-checkout-button').disabled);
      await page.getByLabel('Quantity for Mood Ghost Figurine — design B').fill('2');
      await page.getByLabel('Quantity for Mood Ghost Figurine — design B').press('Tab');
      await page.reload();
      await page.waitForFunction(() => !document.querySelector('.shopify-checkout-button').disabled);
      assert.equal(await page.getByLabel('Quantity for Mood Ghost Figurine — design B').inputValue(), '2');
      assert(await page.getByText('$41.60', { exact: false }).count() > 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      fs.mkdirSync('test-results', { recursive: true });
      await page.screenshot({ path: `test-results/checkout-cart-${width}.png`, fullPage: true });
      await checkout.click();
      await page.waitForURL(origin + '/checkout-test');
      assert.equal(cartInput.lines[0].merchandiseId, 'gid://shopify/ProductVariant/mood-ghost-design-b');
      assert.equal(cartInput.lines[0].quantity, 2);
      assert(cartInput.attributes.some(attribute => attribute.key === '_cbs_analytics_test' && attribute.value === '1'));
      await page.goto(origin + '/shop/cart');
      await page.getByRole('button', { name: /Edmonton pickup/ }).click();
      await page.getByRole('button', { name: 'Secure checkout ↗', exact: true }).click();
      await page.waitForURL(origin + '/checkout-test');
      assert.equal(cartInput.lines[0].merchandiseId, 'gid://shopify/ProductVariant/mood-ghost-design-b-pickup');
      assert.equal(cartInput.buyerIdentity.countryCode, 'CA');
      assert.equal(errors.length, 0, errors.join('\n'));
      await context.close();
      console.log(`PASS ${width}px: price-loading guard, selected design, quantity, persistence, totals, delivery/pickup variants and owner analytics exclusion`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
