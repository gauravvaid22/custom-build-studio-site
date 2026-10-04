const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const products = JSON.parse(fs.readFileSync('commerce/products.json', 'utf8'));
const origin = process.env.BASE_URL || 'http://127.0.0.1:4173';
const handleFor = p => p.shopifyHandle || p.variantOf || p.id;
const skuFor = p => p.variants?.[0]?.id || p.id;
const money = cents => '$' + (cents / 100).toFixed(2);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let cartInput, unavailable = false, priceChanged = false;
    await page.route('https://aqk73w-k2.myshopify.com/api/**', async route => {
      const { query, variables } = route.request().postDataJSON();
      const data = {};
      if (query.includes('Catalog')) {
        for (const [key, handle] of Object.entries(variables)) {
          const parent = products.find(p => handleFor(p) === handle && !p.variantOf);
          const choices = parent.variants?.length ? parent.variants.map(v => products.find(p => p.id === v.id)) : [parent];
          data['product' + key.replace('handle', '')] = { handle, title: parent.name, variants: { nodes: choices.flatMap(p => ['delivered', 'pickup'].map(mode => {
            const sku = p.id + (mode === 'pickup' ? '-pickup' : '');
            const cents = p.priceCents - (mode === 'pickup' ? 1000 : 0) + (priceChanged && query.includes('ForCheckout') ? 100 : 0);
            return { id: 'gid://shopify/ProductVariant/' + sku, sku, availableForSale: !unavailable, price: { amount: (cents / 100).toFixed(2), currencyCode: 'CAD' } };
          })) } };
        }
      } else {
        cartInput = variables.input;
        data.cartCreate = { cart: { checkoutUrl: origin + '/shopify-checkout-test' }, userErrors: [], warnings: [] };
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
    });
    await page.route('**/shopify-checkout-test', route => route.fulfill({ contentType: 'text/html', body: '<h1>Checkout test</h1>' }));
    await page.goto(origin + '/shop/');
    await page.getByRole('button', { name: /^Edmonton pickup/ }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('cbs-fulfillment-v1')), 'pickup');
    // Every product and every size/design retain the correct mode-specific price.
    for (const product of products.filter(p => !p.variantOf)) {
      await page.goto(origin + '/shop/' + product.id);
      const choices = product.variants?.length ? product.variants : [{ id: product.id, priceCents: product.priceCents }];
      for (const choice of choices) {
        if (product.variants?.length) await page.locator('.shop-variant-select select').selectOption(choice.id);
        assert.ok((await page.locator('.shop-price').first().innerText()).includes(money(choice.priceCents - 1000)), choice.id + ' pickup price');
      }
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/shop/pumpkin-fidget-keychain');
      await page.evaluate(() => localStorage.setItem('cbs-cart-v1', '[]'));
      await page.reload();
      await page.getByRole('spinbutton', { name: /Quantity/ }).fill('2');
      await page.getByRole('button', { name: 'Add to Cart' }).click();
      await page.goto(origin + '/shop/mood-ghost');
      await page.locator('.shop-variant-select select').selectOption('mood-ghost-design-b');
      await page.getByRole('button', { name: 'Add to Cart' }).click();
      await page.goto(origin + '/shop/cart');
      assert.ok((await page.locator('.shop-cart-total').innerText()).includes('$30.00'));
      const original = await page.evaluate(() => JSON.parse(localStorage.getItem('cbs-cart-v1')));
      await page.getByRole('button', { name: /^Delivered to you/ }).click();
      assert.ok((await page.locator('.shop-cart-total').innerText()).includes('$60.00'));
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('cbs-cart-v1'))), original);
      await page.getByRole('button', { name: /^Edmonton pickup/ }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const accessibility = await new AxeBuilder({ page }).include('.fulfillment-selector').analyze();
      assert.equal(accessibility.violations.length, 0, JSON.stringify(accessibility.violations));
      await page.screenshot({ path: `test-results/pickup-cart-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Secure checkout' }).click();
      await page.waitForURL(origin + '/shopify-checkout-test');
      assert.deepEqual(cartInput.lines.map(l => [l.merchandiseId, l.quantity]), [
        ['gid://shopify/ProductVariant/pumpkin-fidget-keychain-pickup', 2],
        ['gid://shopify/ProductVariant/mood-ghost-design-b-pickup', 1],
      ]);
      assert.ok(cartInput.note.includes('PICKUP ONLY'));
    }
    // Existing personalized carts survive quantity edits and handoff changes.
    const oldLine = { id: 'lithophane-table-lamp', quantity: 1, attributes: [{ key: 'Personalization photo', value: 'private-test-photo' }, { key: 'Photo instructions', value: 'Keep faces' }] };
    await page.evaluate(line => localStorage.setItem('cbs-cart-v1', JSON.stringify([line])), oldLine);
    await page.goto(origin + '/shop/cart');
    await page.getByRole('spinbutton', { name: /Quantity/ }).fill('2');
    await page.getByRole('button', { name: /^Delivered to you/ }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cbs-cart-v1')));
    assert.equal(saved[0].quantity, 2);
    assert.deepEqual(saved[0].attributes, oldLine.attributes);
    unavailable = true;
    await page.getByRole('button', { name: 'Secure checkout' }).click();
    await page.getByRole('alert').waitFor();
    assert.ok((await page.getByRole('alert').innerText()).includes('not available'));
    unavailable = false; priceChanged = true;
    await page.getByRole('button', { name: 'Secure checkout' }).click();
    await page.getByText('A product price has changed.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: /^Edmonton pickup/ }).isEnabled(), true);
    assert.deepEqual(errors, []);
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/pickup-mobile.png' });
    console.log('PASS: 20 products, 23 size/design choices, bundle quantities, both modes, persistence, private photo attributes, price/stock failure guards, desktop/mobile and accessible controls.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
