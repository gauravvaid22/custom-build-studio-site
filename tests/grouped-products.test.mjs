import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../commerce/products.json' with { type: 'json' };
import collections from '../commerce/collections.json' with { type: 'json' };
import { discoveryProducts } from '../commerce/search-discovery.mjs';

test('four grouped listings retain every real design, fit and production SKU', () => {
  const expected = { 'can-holder-designs': [6, 6], 'halloween-candy-holder-designs': [3, 3], 'ps5-console-stand-designs': [6, 12], 'personalized-photo-holder-designs': [13, 13] };
  for (const [id, counts] of Object.entries(expected)) {
    const group = products.find(p => p.id === id);
    assert.equal(group.groupedDesigns.length, counts[0]);
    const ids = group.groupedDesigns.flatMap(design => design.optionIds);
    assert.equal(new Set(ids).size, counts[1]);
    assert.deepEqual(new Set(group.variants.map(v => v.id)), new Set(ids));
    for (const design of group.groupedDesigns) {
      const item = products.find(p => p.id === design.id);
      assert.equal(item.listingGroup, id);
      assert.ok(item.images.length > 0);
      for (const sku of design.optionIds) assert.ok(products.find(p => p.id === sku));
      assert.ok(!collections.some(c => c.products.includes(design.id)), 'Only the grouped card is listed');
    }
  }
  assert.equal(products.filter(p => p.category === 'Can holders' && p.listingGroup).every(p => p.priceCents === 2500), true);
  assert.equal(discoveryProducts.filter(p => p.category === 'Personalized photo holders').length, 13, 'All individual designs remain discoverable in the merchant feed');
  assert.equal(discoveryProducts.filter(p => p.category === 'PS5 console stands').length, 6);
});
