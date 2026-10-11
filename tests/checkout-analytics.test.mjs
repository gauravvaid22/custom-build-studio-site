import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = (await readFile(new URL('../commerce/checkout-analytics.pixel.js', import.meta.url), 'utf8')).replace('__GA_MEASUREMENT_ID__', 'G-TEST123');
function setup() {
  const callbacks = {}, storage = new Map(), window = {};
  vm.runInNewContext(source, { window, document: { createElement: () => ({}), head: { appendChild() {} } }, analytics: { subscribe: (name, callback) => { callbacks[name] = callback; } }, browser: { localStorage: { getItem: async key => storage.get(key), setItem: async (key, value) => storage.set(key, value) } } });
  return { callbacks, calls: () => Array.from(window.dataLayer, args => Array.from(args)) };
}
function checkout(extra = {}) {
  return { currencyCode: 'CAD', totalPrice: { amount: '39' }, totalTax: { amount: '2' }, shippingLine: { price: { amount: '5' } }, attributes: [{ key: '_cbs_ga_client_id', value: '123.456' }, { key: '_cbs_ga_session_id', value: '123456' }, { key: '_cbs_utm_source', value: 'instagram' }, { key: 'Order handoff', value: 'Edmonton pickup by appointment' }], lineItems: [{ quantity: 2, title: 'Test stand', finalLinePrice: { amount: '32' }, variant: { sku: 'stand-blue-pickup', title: 'Blue', product: { title: 'Headphone stand', type: 'Gaming & desk' } } }], email: 'private@example.test', shippingAddress: { address1: 'Private address' }, ...extra };
}
test('checkout events retain anonymous attribution and correct item totals without personal data', () => {
  const pixel = setup();
  pixel.callbacks.checkout_started({ clientId: 'fallback', data: { checkout: checkout() } });
  const calls = pixel.calls();
  const config = calls.find(call => call[0] === 'config')[2];
  assert.equal(config.client_id, '123.456');
  const event = calls.find(call => call[0] === 'event');
  assert.equal(event[1], 'shopify_checkout_started');
  assert.equal(event[2].value, 32);
  assert.equal(event[2].items[0].price, 16);
  assert.equal(event[2].items[0].quantity, 2);
  assert.equal(event[2].items[0].item_id, 'stand-blue');
  assert.equal(event[2].session_id, '123456');
  assert.equal(event[2].campaign_source, 'instagram');
  assert.equal(event[2].fulfillment_method, 'pickup');
  assert.doesNotMatch(JSON.stringify(calls), /private@example|Private address|Personalization photo/);
});
test('purchase requires an order ID and duplicate completion fires once', async () => {
  const pixel = setup();
  await pixel.callbacks.checkout_completed({ data: { checkout: checkout() } });
  assert.equal(pixel.calls().filter(call => call[1] === 'purchase').length, 0);
  const event = { data: { checkout: checkout({ order: { id: 'gid://shopify/Order/123' } }) } };
  await pixel.callbacks.checkout_completed(event);
  await pixel.callbacks.checkout_completed(event);
  const purchases = pixel.calls().filter(call => call[1] === 'purchase');
  assert.equal(purchases.length, 1);
  assert.equal(purchases[0][2].shipping, 5);
  assert.equal(purchases[0][2].tax, 2);
});
test('owner test checkout produces no ecommerce events', async () => {
  const pixel = setup();
  const event = { data: { checkout: checkout({ attributes: [{ key: '_cbs_analytics_test', value: '1' }], order: { id: 'test' } }) } };
  for (const callback of Object.values(pixel.callbacks)) await callback(event);
  assert.equal(pixel.calls().filter(call => call[0] === 'event' || call[0] === 'config').length, 0);
});
test('malformed attribution is ignored and shipping/payment events remain distinct', () => {
  const pixel = setup();
  const event = { clientId: 'fallback', data: { checkout: checkout({ attributes: [{ key: '_cbs_ga_client_id', value: '<script>' }, { key: '_cbs_ga_session_id', value: 'bad' }] }) } };
  pixel.callbacks.checkout_shipping_info_submitted(event);
  pixel.callbacks.payment_info_submitted(event);
  assert.equal(pixel.calls().find(call => call[0] === 'config')[2].client_id, 'fallback');
  const events = pixel.calls().filter(call => call[0] === 'event');
  assert.deepEqual(events.map(call => call[1]), ['add_shipping_info', 'add_payment_info']);
  assert.equal(events[0][2].session_id, undefined);
});
