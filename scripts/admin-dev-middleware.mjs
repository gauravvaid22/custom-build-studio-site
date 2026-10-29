import fs from 'node:fs';
import path from 'node:path';
import baseline from '../commerce/catalog-baseline.json' with { type: 'json' };
import collections from '../commerce/collections.json' with { type: 'json' };
import siteContent from '../commerce/site-content.json' with { type: 'json' };
import { modelDiscoveryFor, validateModelDiscovery } from '../commerce/model-discovery.mjs';
import productContent from '../commerce/product-content.json' with { type: 'json' };
import deliveryPolicy from '../commerce/delivery-policy.json' with { type: 'json' };
import { templates, seedDocuments, validateDocument, compileCatalog } from '../commerce/catalog-management.mjs';

const localDrafts = new Map();

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function getChristmasProducts() {
  try {
    const file = path.resolve('commerce/christmas-preview-products.json');
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {}
  return [];
}

export function createAdminDevMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url || '', 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith('/.netlify/functions/')) {
      return next();
    }

    const fnName = pathname.replace('/.netlify/functions/', '');
    const action = url.searchParams.get('action') || '';
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readJsonBody(req) : {};

    // 1. Admin Session Auth
    if (fnName === 'shop-admin-session') {
      return sendJson(res, { authenticated: true });
    }

    // 2. Shop Catalog & Product Manager
    if (fnName === 'shop-catalog') {
      const christmas = getChristmasProducts();
      const allProducts = [...baseline.products, ...christmas];

      if (action === 'availability') {
        return sendJson(res, { archived: [], revision: 1 });
      }

      if (action === 'list') {
        const seeded = seedDocuments(allProducts, collections);
        const documentsMap = new Map(seeded.map(d => [d.id, d]));
        for (const [id, draft] of localDrafts.entries()) {
          documentsMap.set(id, draft);
        }

        return sendJson(res, {
          documents: Array.from(documentsMap.values()),
          templates,
          presets: [],
          archived: [],
          collections: collections,
          rows: [],
          revision: 1,
          jobs: [],
          history: [
            {
              at: new Date().toISOString(),
              action: 'Connected Local Dev Catalog',
              id: 'catalog-connected'
            }
          ],
          connection: {
            publicationId: 'online-store',
            deliveryProfileId: 'standard-delivery'
          },
          ready: {
            shopify: true,
            buildHook: false,
            catalogSource: true
          }
        });
      }

      if (action === 'inspect') {
        const docId = body?.id || '';
        const christmas = getChristmasProducts();
        const allProducts = [...baseline.products, ...christmas];
        const doc = localDrafts.get(docId) || seedDocuments(allProducts, collections).find(d => d.id === docId);

        const prices = {};
        if (doc) {
          doc.products.forEach(p => {
            prices[p.id] = p.priceCents;
            p.variants?.forEach(v => {
              prices[v.id] = v.priceCents;
            });
          });
        }
        return sendJson(res, { prices, expected: {}, hasDraft: localDrafts.has(docId) });
      }

      if (action === 'save-draft') {
        if (body?.document) {
          try {
            const doc = body.document;
            localDrafts.set(doc.id, doc);

            // If it's a Christmas product, keep commerce/christmas-preview-products.json in sync
            const christmasFile = path.resolve('commerce/christmas-preview-products.json');
            if (fs.existsSync(christmasFile)) {
              const currentXmas = JSON.parse(fs.readFileSync(christmasFile, 'utf8'));
              const isXmas = doc.products.some(p => currentXmas.some(x => x.id === p.id)) || currentXmas.some(x => x.id === doc.id);
              if (isXmas) {
                const docProductIds = new Set(doc.products.map(p => p.id));
                const updatedXmas = currentXmas.map(p => {
                  const matching = doc.products.find(dp => dp.id === p.id);
                  return matching || p;
                });
                for (const p of doc.products) {
                  if (!updatedXmas.some(x => x.id === p.id)) {
                    updatedXmas.push(p);
                  }
                }
                fs.writeFileSync(christmasFile, JSON.stringify(updatedXmas, null, 2) + '\n', 'utf8');
              }
            }

            return sendJson(res, { ok: true, revision: 1 });
          } catch (e) {
            return sendJson(res, { error: e.message || 'Unable to save draft.' }, 400);
          }
        }
        return sendJson(res, { ok: true, revision: 1 });
      }

      if (action === 'preview-search-names') {
        return sendJson(res, { changes: [], revision: 1, completed: true });
      }

      return sendJson(res, { ok: true });
    }

    // 3. Shop Orders & Settings
    if (fnName === 'shop') {
      const discoveryPreview = () => modelDiscoveryFor({ modelDiscovery: JSON.parse(fs.readFileSync(path.resolve('commerce/model-discovery.json'), 'utf8')) });
      if (action === 'config') {
        return sendJson(res, { siteContent: { ...siteContent, modelDiscovery: discoveryPreview() }, productContent });
      }
      if (action === 'get-content') {
        return sendJson(res, { siteContent: { ...siteContent, modelDiscovery: discoveryPreview() } });
      }
      if (action === 'save-model-discovery') {
        try {
          const clean = validateModelDiscovery(body.modelDiscovery);
          fs.writeFileSync(path.resolve('commerce/model-discovery.json'), JSON.stringify(clean, null, 2) + '\n', 'utf8');
          return sendJson(res, { siteContent: { ...siteContent, modelDiscovery: clean } });
        } catch (error) { return sendJson(res, { error: error.message }, 400); }
      }
      if (action === 'get-product-content') {
        return sendJson(res, { productContent });
      }
      if (action === 'save-content') {
        if (body?.siteContent) {
          try {
            const file = path.resolve('commerce/site-content.json');
            fs.writeFileSync(file, JSON.stringify(body.siteContent, null, 2) + '\n', 'utf8');
          } catch {}
          return sendJson(res, { siteContent: body.siteContent });
        }
        return sendJson(res, { siteContent });
      }
      if (action === 'list') {
        return sendJson(res, { orders: [] });
      }
      if (action === 'get-display') {
        return sendJson(res, { departments: ['all', 'gifts-under-25'], highlights: [] });
      }
      return sendJson(res, { ok: true });
    }

    // 4. Shop Delivery Policy
    if (fnName === 'shop-delivery') {
      return sendJson(res, { policy: deliveryPolicy, active: true, jobs: [], discountsConnected: false });
    }

    // 5. Shop Sale Promotions
    if (fnName === 'shop-sale') {
      return sendJson(res, {
        configured: true,
        shopifyAdminConfigured: false,
        sale: {
          admin: {
            status: 'inactive'
          }
        }
      });
    }

    return next();
  };
}
