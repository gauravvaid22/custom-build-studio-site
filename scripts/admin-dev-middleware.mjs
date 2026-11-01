import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import baseline from '../commerce/catalog-baseline.json' with { type: 'json' };
import collections from '../commerce/collections.json' with { type: 'json' };
import siteContent from '../commerce/site-content.json' with { type: 'json' };
import { modelDiscoveryFor, validateModelDiscovery } from '../commerce/model-discovery.mjs';
import productContent from '../commerce/product-content.json' with { type: 'json' };
import deliveryPolicy from '../commerce/delivery-policy.json' with { type: 'json' };
import bakedRevision from '../commerce/catalog-revision.json' with { type: 'json' };
import { templates, seedDocuments, validateDocument, compileCatalog, mergeCollectionsWithBaseline } from '../commerce/catalog-management.mjs';
import { finalizePublicCatalog } from '../commerce/public-catalog.mjs';

const localDrafts = new Map();
const localPublished = new Map();
const localArchived = new Set();
let localRevision = bakedRevision.revision || 45;
let localJobs = [];
let localHistory = [
  {
    at: new Date().toISOString(),
    action: 'Connected Local Dev Catalog',
    id: 'catalog-connected',
  },
];

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

function enqueueLocalPublishJob(doc, action = 'publish', expected = {}) {
  for (const p of doc.products.filter(x => !x.variantOf && !x.groupedDesigns)) {
    const currentStamp = localPublished.get(doc.id)?.updatedAt || 'initial-dev-stamp';
    if (expected[p.id] && expected[p.id] !== currentStamp) {
      throw new Error(`${p.name} changed in Shopify. Reload the editor before publishing.`);
    }
  }
  const jobId = randomUUID();
  const job = {
    id: jobId,
    productId: doc.id,
    action,
    status: 'shopify',
    createdAt: new Date().toISOString(),
    document: doc,
  };
  localJobs = [job, ...localJobs].slice(0, 20);
  setTimeout(() => {
    const newStamp = new Date().toISOString();
    const publishedDoc = { ...doc, updatedAt: newStamp };
    localPublished.set(doc.id, publishedDoc);
    const existingDraft = localDrafts.get(doc.id);
    const cutoff = doc.updatedAt && doc.updatedAt > job.createdAt ? doc.updatedAt : job.createdAt;
    if (!existingDraft || !existingDraft.updatedAt || existingDraft.updatedAt <= cutoff) {
      localDrafts.delete(doc.id);
    }
    localRevision += 1;
    job.status = 'website';
    job.revision = localRevision;
    job.results = doc.products
      .filter(p => !p.variantOf && !p.groupedDesigns)
      .map(p => ({ id: p.id, shopifyId: `gid://shopify/Product/${p.id}`, updatedAt: newStamp }));
  }, 350);
  return job;
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
      const baseIds = new Set(baseline.products.map(p => p.id));
      const allProducts = [...baseline.products, ...christmas.filter(c => !baseIds.has(c.id))];
      const effectiveCollections = mergeCollectionsWithBaseline(
        collections,
        baseline.collections,
        Array.from(localPublished.values()),
        Array.from(localArchived),
      );

      if (action === 'availability') {
        return sendJson(res, { pricingUpdating: false, archived: Array.from(localArchived), revision: localRevision });
      }

      if (action === 'public' || action === 'snapshot') {
        const compiled = compileCatalog(
          allProducts,
          effectiveCollections,
          Array.from(localPublished.values()),
          Array.from(localArchived),
        );
        if (action === 'public') {
          const finalized = finalizePublicCatalog(
            { ...compiled, revision: localRevision, rows: [] },
            baseline,
            localArchived,
            { validate: false },
          );
          return sendJson(res, finalized);
        }
        return sendJson(res, { ...compiled, revision: localRevision, rows: [], deliveryPolicy });
      }

      if (action === 'list') {
        const seeded = seedDocuments(allProducts, effectiveCollections);
        const documentsMap = new Map(seeded.map(d => [d.id, d]));
        for (const [id, pub] of localPublished.entries()) {
          documentsMap.set(id, pub);
        }
        for (const [id, draft] of localDrafts.entries()) {
          documentsMap.set(id, draft);
        }

        return sendJson(res, {
          documents: Array.from(documentsMap.values()),
          draftIds: Array.from(localDrafts.keys()),
          publishedIds: Array.from(localPublished.keys()),
          templates,
          presets: [],
          archived: Array.from(localArchived),
          collections: effectiveCollections,
          rows: [],
          revision: localRevision,
          jobs: localJobs,
          history: localHistory,
          connection: {
            publicationId: 'gid://shopify/Publication/1',
            deliveryProfileId: 'gid://shopify/DeliveryProfile/1',
            pickupProfileId: 'gid://shopify/DeliveryProfile/2',
          },
          ready: {
            shopify: true,
            buildHook: true,
            catalogSource: true,
          },
        });
      }

      if (action === 'inspect') {
        const docId = body?.id || '';
        const doc =
          localDrafts.get(docId) ||
          localPublished.get(docId) ||
          seedDocuments(allProducts, effectiveCollections).find(d => d.id === docId);

        const prices = {};
        const expected = {};
        const currentStamp = localPublished.get(docId)?.updatedAt || 'initial-dev-stamp';
        if (doc) {
          doc.products.forEach(p => {
            if (!p.variantOf && !p.groupedDesigns) expected[p.id] = currentStamp;
            prices[p.id] = p.priceCents;
            p.variants?.forEach(v => {
              prices[v.id] = v.priceCents;
            });
          });
        }
        return sendJson(res, { prices, expected, hasDraft: localDrafts.has(docId) });
      }

      if (action === 'save-draft') {
        try {
          const doc = validateDocument(body.document);
          localDrafts.set(doc.id, doc);
          localRevision += 1;
          localHistory = [{ at: new Date().toISOString(), action: 'save-draft', id: doc.id, revision: localRevision }, ...localHistory].slice(0, 100);
          return sendJson(res, { saved: true, revision: localRevision, updatedAt: doc.updatedAt });
        } catch (e) {
          return sendJson(res, { error: e.message || 'Unable to save draft.' }, 400);
        }
      }

      if (action === 'save-and-publish') {
        try {
          const doc = validateDocument(body.document, { publish: true });
          localDrafts.set(doc.id, doc);
          localRevision += 1;
          const job = enqueueLocalPublishJob(doc, 'publish', body.expected || {});
          localHistory = [{ at: new Date().toISOString(), action: 'publish', id: doc.id, revision: localRevision }, ...localHistory].slice(0, 100);
          return sendJson(res, { saved: true, revision: localRevision, updatedAt: doc.updatedAt, job: { id: job.id, status: job.status } });
        } catch (e) {
          return sendJson(res, { error: e.message || 'Unable to publish listing.' }, 400);
        }
      }

      if (action === 'publish') {
        try {
          const docId = body?.id || '';
          const sourceDoc = localDrafts.get(docId) || localPublished.get(docId) || seedDocuments(allProducts, effectiveCollections).find(d => d.id === docId);
          if (!sourceDoc) return sendJson(res, { error: 'Product not found.' }, 400);
          const doc = validateDocument(sourceDoc, { publish: true });
          const job = enqueueLocalPublishJob(doc, 'publish', body.expected || {});
          localHistory = [{ at: new Date().toISOString(), action: 'publish', id: doc.id, revision: localRevision }, ...localHistory].slice(0, 100);
          return sendJson(res, { saved: true, revision: localRevision, job: { id: job.id, status: job.status } });
        } catch (e) {
          return sendJson(res, { error: e.message || 'Unable to publish listing.' }, 400);
        }
      }

      if (action === 'preview-search-names') {
        return sendJson(res, { changes: [], revision: localRevision, completed: true });
      }

      return sendJson(res, { ok: true, revision: localRevision });
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
            status: 'inactive',
          },
        },
      });
    }

    // 6. Shop Inventory
    if (fnName === 'shop-inventory') {
      return sendJson(res, { enabled: false, stock: {} });
    }

    return next();
  };
}
