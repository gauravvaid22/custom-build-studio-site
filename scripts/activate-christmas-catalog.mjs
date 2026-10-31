import { readFile, writeFile } from 'node:fs/promises';

const previewRaw = JSON.parse(await readFile('commerce/christmas-preview-products.json', 'utf8'));
const baseline = JSON.parse(await readFile('commerce/catalog-baseline.json', 'utf8'));
const products = JSON.parse(await readFile('commerce/products.json', 'utf8'));
const collections = JSON.parse(await readFile('commerce/collections.json', 'utf8'));

// Specific rich search keywords for child items that currently have none
const childKeywords = {
  'santa-claus-christmas-ornament': ['santa ornament', 'santa claus tree ornament', 'christmas tree ornament', 'canadian holiday decor', 'edmonton crafted ornament'],
  'sleeping-bear-christmas-ornament': ['sleeping bear ornament', 'animal christmas ornament', 'cute tree ornament', 'holiday gift', 'canadian made ornament'],
  'sleeping-dog-christmas-ornament': ['dog christmas ornament', 'sleeping dog holiday decor', 'pet lover christmas gift', 'tree ornament', 'edmonton made'],
  'reindeer-head-christmas-ornament': ['reindeer ornament', 'reindeer head tree decoration', 'woodland christmas ornament', 'canadian holiday decor'],
  'snowman-christmas-ornament': ['snowman ornament', 'classic snowman tree ornament', 'winter holiday decor', 'canadian christmas gift'],
  'sleeping-cat-christmas-ornament': ['cat christmas ornament', 'sleeping cat tree ornament', 'cat lover holiday gift', 'canadian crafted gift'],
  'lying-reindeer-christmas-ornament': ['reindeer christmas ornament', 'resting reindeer tree decoration', 'holiday tree decor', 'canadian craft'],
  'nutcracker-christmas-ornament': ['nutcracker ornament', 'traditional nutcracker tree decor', 'holiday keepsake', 'canadian made christmas'],
  'luminous-tree-stars': ['stars luminous tree', 'illuminated star tree', 'tabletop light tree', 'holiday ambient light', 'canadian holiday decor'],
  'luminous-tree-lace': ['lace luminous tree', 'delicate pattern christmas tree', 'illuminated holiday lamp', 'mantel holiday decor'],
  'luminous-tree-spiral': ['spiral luminous tree', 'modern illuminated tree', 'holiday tabletop lighting', 'canadian studio decor'],
  'stocking-tray': ['stocking trinket tray', 'christmas stocking dish', 'holiday candy dish', 'festive table decor', 'small holiday gift'],
  'snowflake-tray': ['snowflake trinket tray', 'snowflake jewelry dish', 'holiday table accent', 'winter decor', 'canadian made gift'],
  'christmas-tree-tray': ['christmas tree trinket tray', 'tree shaped dish', 'holiday table decor', 'festive organizer tray', 'edmonton made gift']
};

const cleanDimensionText = (raw = '') =>
  String(raw)
    .replace(/^Source model:\s*approximately\s+/i, 'Approximately ')
    .replace(/^Source model bounds approximately\s+([0-9.×x\s]+\s*cm)\s*\([^)]*\)\.\s*Printed size to confirm before launch\.?/i, 'Approximately $1')
    .replace(/\s*\(source reference\)/gi, '')
    .replace(/\.?\s*Final printed dimensions require production review\.?/i, '')
    .replace(/\.?\s*Printed size to confirm before launch\.?/i, '')
    .trim();

const customSeoTitles = {
  'luminous-tree-stars': 'Luminous Christmas Tree LED Lantern — Starry Tiers',
  'luminous-tree-lace': 'Luminous Christmas Tree LED Lantern — Lace Tiers',
  'luminous-tree-spiral': 'Luminous Christmas Tree LED Lantern — Spiral Stars',
};

const normalizedChristmas = previewRaw.map(item => {
  const isLamp = [
    'christmas-angel',
    'bright-nativity-table-lamp',
    'village-on-the-moon-table-lamp',
    'santa-s-bonfire-table-lamp',
    'luminous-tree',
    'luminous-tree-stars',
    'luminous-tree-lace',
    'luminous-tree-spiral',
    'village-lights',
  ].includes(item.id);

  let included = item.included || '';
  if (item.id === 'guiding-star-tree-topper') {
    included = 'One finished gold and white star tree topper. Finished physical piece crafted in Edmonton — not a digital file.';
  } else if (isLamp) {
    included = 'One assembled display piece, ready for a standard battery LED tealight (LED tealight not included). Finished physical piece crafted in Edmonton — not a digital file.';
  } else if (!included.includes('not a digital file') && !included.includes('No STL')) {
    included = `${included.trim()} Finished physical piece crafted in Edmonton — not a digital file.`;
  }

  const dimensions = cleanDimensionText(item.dimensions || '');
  const variants = Array.isArray(item.variants)
    ? item.variants.map(v => ({
        ...v,
        ...(v.dimensions ? { dimensions: cleanDimensionText(v.dimensions) } : {}),
      }))
    : undefined;

  let keywords = Array.isArray(item.searchKeywords) && item.searchKeywords.length > 0
    ? [...item.searchKeywords]
    : (childKeywords[item.id] || ['christmas decor', 'canadian holiday gift', 'edmonton studio craft']);

  const genericKeywords = ['holiday gifts canada', 'edmonton made gifts', 'christmas home decor'];
  for (const kw of genericKeywords) {
    if (!keywords.includes(kw) && keywords.length < 8) {
      keywords.push(kw);
    }
  }

  return {
    ...item,
    ...(variants ? { variants } : {}),
    ...(customSeoTitles[item.id] ? { seoTitle: customSeoTitles[item.id] } : {}),
    launchReady: true,
    productionReviewed: true,
    seasonal: true,
    pricingSchemaVersion: 2,
    shippingPriceMode: 'included',
    shippingFeeCents: 0,
    deliveryExtraCents: 0,
    pickupPriceDifferenceCents: 0,
    basePriceCents: item.priceCents - 500,
    included,
    dimensions,
    searchKeywords: keywords,
    notes: 'Crafted to order in our Edmonton studio. Colours will be similar to the reference photos; minor shade variations may occur between material batches. For indoor decorative display. Keep away from direct heat.'
  };
});

console.log(`Normalized ${normalizedChristmas.length} Christmas products.`);

// Helper to upsert into an array of products by id
function upsertProducts(targetList, sourceList) {
  const map = new Map(targetList.map(p => [p.id, p]));
  for (const p of sourceList) {
    map.set(p.id, p);
  }
  return [...map.values()];
}

// 1. Update baseline.products
baseline.products = upsertProducts(baseline.products, normalizedChristmas);

// 2. Define the Christmas collection
const christmasCollection = {
  id: 'christmas',
  kind: 'seasonal',
  name: 'Christmas Gifts & Holiday Décor',
  shortName: 'Christmas',
  eyebrow: 'CHRISTMAS COLLECTION · EDMONTON STUDIO',
  heading: 'Holiday warmth, crafted in small batches.',
  description: 'Illuminated table lamps, sculptural nativity pieces, kinetic trees, ornaments and festive table accents crafted in Edmonton.',
  seoDescription: 'Shop Canadian-made Christmas gifts, illuminated holiday table lamps, nativity sculptures, ornaments and festive home décor crafted in Edmonton with free tracked shipping.',
  coverProduct: 'endless-swirling-tree',
  products: normalizedChristmas.filter(p => !p.variantOf && !p.listingGroup).map(p => p.id),
  seoTitle: 'Christmas Gifts, Holiday Décor & Illuminated Table Lamps — Made in Edmonton'
};

const rootChristmasIds = christmasCollection.products;

// Upsert christmas collection in baseline.collections
const baselineCollMap = new Map((baseline.collections || []).map(c => [c.id, c]));
baselineCollMap.set('christmas', christmasCollection);

// Update 'seasonal' in baseline to feature Christmas at the top
const baselineSeasonal = baselineCollMap.get('seasonal');
if (baselineSeasonal) {
  const nonXmas = baselineSeasonal.products.filter(id => !rootChristmasIds.includes(id));
  baselineSeasonal.products = [...rootChristmasIds, ...nonXmas];
}

baseline.collections = [...baselineCollMap.values()];

// 3. Update products.json
const updatedProducts = upsertProducts(products, normalizedChristmas);

// 4. Update collections.json
const collMap = new Map(collections.map(c => [c.id, c]));
collMap.set('christmas', christmasCollection);

const liveSeasonal = collMap.get('seasonal');
if (liveSeasonal) {
  const nonXmas = liveSeasonal.products.filter(id => !rootChristmasIds.includes(id));
  liveSeasonal.products = [...rootChristmasIds, ...nonXmas];
  liveSeasonal.coverProduct = 'endless-swirling-tree';
  liveSeasonal.eyebrow = 'HOLIDAY SEASON / CRAFTED IN EDMONTON';
  liveSeasonal.heading = 'Holiday warmth, crafted locally.';
  liveSeasonal.description = 'Explore illuminated table lamps, kinetic trees, nativity pieces, character figurines and festive home accents made in Edmonton.';
}

const liveHomeDecor = collMap.get('home-decor');
if (liveHomeDecor) {
  const homeDecorChristmas = [
    'christmas-angel',
    'bright-nativity-table-lamp',
    'village-on-the-moon-table-lamp',
    'santa-s-bonfire-table-lamp',
    'luminous-tree',
    'village-lights',
    'endless-swirling-tree',
    'christmas-trinket-trays',
    'evergreen-wreath'
  ];
  for (const id of homeDecorChristmas) {
    if (!liveHomeDecor.products.includes(id)) {
      liveHomeDecor.products.push(id);
    }
  }
}

const liveCollectibles = collMap.get('collectibles');
if (liveCollectibles) {
  const collectibleChristmas = ['christmas-character-figurines', 'christmas-gnome-set'];
  for (const id of collectibleChristmas) {
    if (!liveCollectibles.products.includes(id)) {
      liveCollectibles.products.push(id);
    }
  }
}

const updatedCollections = [...collMap.values()];

baseline.collections = structuredClone(updatedCollections);

// Save all updated files
await writeFile('commerce/catalog-baseline.json', JSON.stringify(baseline, null, 2) + '\n');
await writeFile('commerce/products.json', JSON.stringify(updatedProducts, null, 2) + '\n');
await writeFile('commerce/collections.json', JSON.stringify(updatedCollections, null, 2) + '\n');

console.log(`Successfully updated:`);
console.log(`- commerce/catalog-baseline.json: ${baseline.products.length} products, ${baseline.collections.length} collections`);
console.log(`- commerce/products.json: ${updatedProducts.length} products`);
console.log(`- commerce/collections.json: ${updatedCollections.length} collections`);
