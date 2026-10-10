// One browsing card per design family; production SKUs and Shopify products stay intact.
import { readFile, writeFile } from 'node:fs/promises';
const products = JSON.parse(await readFile('commerce/products.json', 'utf8'));
const families = [
  { id: 'can-holder-designs', name: 'Can Holders — Choose Your Design', category: 'Can holders', description: 'Dress up your drink. Choose your favourite can-holder design and see its photos before adding it to your cart. One holder per order; drink not included.' },
  { id: 'halloween-candy-holder-designs', name: 'Halloween Candy Holders — Choose Your Design', category: 'Halloween candy holders', description: 'A spooky home for wrapped treats. Choose a ghost bowl, a walking pumpkin or a melting pumpkin dispenser. Each design has its own gallery, size and price. Candy is not included.' },
  { id: 'ps5-console-stand-designs', name: 'PS5 Console Stands — Choose Your Design', category: 'PS5 console stands', description: 'Choose a sculptural stand for your gaming setup, then select Original PS5 or PS5 Slim. The photos, dimensions and price update to match your choice. Console and controller are not included.' },
  { id: 'personalized-photo-holder-designs', name: 'Personalized Photo Holders — Choose Your Design', category: 'Personalized photo holders', description: 'Pick your favourite small photo holder, then upload your photo. One 2.5 × 2.5 inch photo print is included, trimmed and fitted for you. A personal keepsake for a desk, shelf or thoughtful gift.' },
];
const mapping = new Map();
for (const family of families) {
  if (products.some(p => p.id === family.id)) throw Error('Grouping already applied');
  const designs = products.filter(p => p.category === family.category && !p.variantOf);
  if (!designs.length) throw Error(`No designs for ${family.id}`);
  const choices = designs.map(p => ({ id: p.id, label: p.name.replace(/ Personalized Photo Holder| PS5 Console Stand| Can Holder/g, ''), optionIds: p.variants?.map(v => v.id) || [p.id] }));
  const options = designs.flatMap(p => p.variants?.map(v => ({ ...v, label: `${p.name.replace(' PS5 Console Stand', '')} — ${v.label}` })) || [{ id: p.id, label: p.name, priceCents: p.priceCents, dimensions: p.dimensions }]);
  for (const design of designs) {
    design.listingGroup = family.id;
    mapping.set(design.id, family.id);
  }
  for (const option of options) option.priceCents = products.find(p => p.id === option.id).priceCents;
  const parent = { ...designs[0], ...family, priceCents: Math.min(...options.map(v => v.priceCents)), variants: options, variantLabel: 'Design', groupedDesigns: choices, images: designs.map(p => p.images[0]) };
  delete parent.listingGroup;
  delete parent.video;
  delete parent.videos;
  products.push(parent);
}
await writeFile('commerce/products.json', JSON.stringify(products, null, 2) + '\n');
const collections = JSON.parse(await readFile('commerce/collections.json', 'utf8'));
for (const collection of collections) collection.products = [...new Set(collection.products.map(id => mapping.get(id) || id))];
await writeFile('commerce/collections.json', JSON.stringify(collections, null, 2) + '\n');
