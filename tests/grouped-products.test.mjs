import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../commerce/products.json' with { type: 'json' };
import collections from '../commerce/collections.json' with { type: 'json' };
import { discoveryProducts } from '../commerce/search-discovery.mjs';

test('grouped listings retain every real design, fit and production SKU', () => {
  const expected = { 'headphone-stand-designs': [6, 6], 'can-holder-designs': [6, 6], 'halloween-candy-holder-designs': [3, 3], 'ps5-console-stand-designs': [6, 12], 'personalized-photo-holder-designs': [13, 13] };
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
  const headphones = products.find(p => p.id === 'headphone-stand-designs');
  assert.equal(headphones.priceCents, 3999);
  assert.deepEqual(headphones.variants.map(v => v.priceCents), [3999, 4499, 4999, 4999, 4999, 5999]);
  for (const option of headphones.variants) assert.equal(option.priceCents, products.find(p => p.id === option.id).priceCents);
  assert.equal(discoveryProducts.filter(p => p.category === 'Headphone stands').length, 6);
  const canGroup = products.find(p => p.id === 'can-holder-designs');
  assert.equal(canGroup.priceCents, 2999);
  assert.deepEqual(canGroup.variants.map(v => v.priceCents), [2999, 3299, 3499, 3999, 3499, 2999]);
  for (const option of canGroup.variants) assert.equal(option.priceCents, products.find(p => p.id === option.id).priceCents);
  assert.equal(discoveryProducts.filter(p => p.category === 'Personalized photo holders').length, 13, 'All individual designs remain discoverable in the merchant feed');
  assert.equal(discoveryProducts.filter(p => p.category === 'PS5 console stands').length, 6);
});
