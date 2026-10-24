import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShop } from '../commerce/core.mjs';
import { handler } from '../commerce/http.mjs';
import defaults from '../commerce/model-discovery.json' with { type: 'json' };
import { modelDiscoveryFor, validateModelDiscovery } from '../commerce/model-discovery.mjs';

function fixture() {
  const values = new Map();
  const store = { get: async key => values.get(key) || null, put: async (key, data) => { values.set(key, { data, etag: 'test' }); return { modified: true }; }, list: async () => [] };
  const shop = createShop({ store, adminKey: 'test-only-model-discovery-admin' });
  return { shop, handle: handler(shop) };
}

test('older website settings receive discovery defaults without losing administrator prices', async () => {
  const { shop } = fixture();
  const content = await shop.getSiteContent();
  const saved = await shop.saveSiteContent({ ...content, fdmStartingPriceCents: 2700 });
  assert.equal(saved.fdmStartingPriceCents, 2700);
  assert.deepEqual(saved.modelDiscovery, defaults);
  const changed = { ...defaults, headline: 'Find your next project', libraries: [...defaults.libraries].reverse(), placements: { ...defaults.placements, home: false } };
  await shop.saveModelDiscovery(changed);
  const after = await shop.getSiteContent();
  assert.equal(after.fdmStartingPriceCents, 2700);
  assert.deepEqual(after.modelDiscovery, changed);
  // A stale/legacy general settings editor must not reset new discovery choices.
  await shop.saveSiteContent({ ...content, modelDiscovery: undefined, fdmStartingPriceCents: 2800 });
  assert.deepEqual((await shop.getSiteContent()).modelDiscovery, changed);
});

test('library validation rejects executable links, credentials, duplicates and invalid visibility', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://person:password@example.com']) {
    assert.throws(() => validateModelDiscovery({ ...defaults, libraries: [{ ...defaults.libraries[0], url }] }));
  }
  assert.throws(() => validateModelDiscovery({ ...defaults, libraries: [defaults.libraries[0], defaults.libraries[0]] }), /unique/);
  assert.throws(() => validateModelDiscovery({ ...defaults, libraries: defaults.libraries.map(item => ({ ...item, enabled: false })) }), /at least one/);
  assert.throws(() => validateModelDiscovery({ ...defaults, placements: { ...defaults.placements, home: 'true' } }), /placements/);
  assert.equal(validateModelDiscovery({ ...defaults, enabled: false, libraries: defaults.libraries.map(item => ({ ...item, enabled: false })) }).enabled, false);
  assert.deepEqual(modelDiscoveryFor({ modelDiscovery: { headline: 'Updated title' } }).headline, 'Updated title');
});

test('discovery saves require existing admin authentication and reject foreign origins', async () => {
  const { handle, shop } = fixture();
  const request = (headers = {}, modelDiscovery = defaults) => new Request('https://shop.example/.netlify/functions/shop?action=save-model-discovery', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://shop.example', ...headers }, body: JSON.stringify({ modelDiscovery }) });
  assert.equal((await handle(request())).status, 401);
  assert.equal((await handle(request({ Authorization: 'Bearer test-only-model-discovery-admin', Origin: 'https://other.example' }))).status, 403);
  const response = await handle(request({ Authorization: 'Bearer test-only-model-discovery-admin' }, { ...defaults, enabled: false }));
  assert.equal(response.status, 200);
  assert.equal((await shop.getSiteContent()).modelDiscovery.enabled, false);
  const invalid = await handle(request({ Authorization: 'Bearer test-only-model-discovery-admin' }, { ...defaults, headline: '' }));
  assert.equal(invalid.status, 400);
});
