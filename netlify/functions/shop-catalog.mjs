import {lightingIds,updateLightingDocument} from '../../commerce/lighting-inclusions.mjs';
import { randomUUID, createHmac } from 'node:crypto';
import baseline from '../../commerce/catalog-baseline.json' with {type:'json'};
const {products,collections}=baseline;
import { templates, seedDocuments, validateDocument, compileCatalog, mergeCollectionsWithBaseline } from '../../commerce/catalog-management.mjs';
import { finalizePublicCatalog } from '../../commerce/public-catalog.mjs';
import { catalogStore, readState, writeState } from '../../commerce/catalog-store.mjs';
import { requireAdmin } from '../../commerce/admin-session.mjs';
import { createShopifyAdmin } from '../../commerce/shopify-admin.mjs';
import { lookupProduct } from '../../commerce/catalog-shopify.mjs';
import { applyDefaultListingCovers } from '../../commerce/listing-covers.mjs';
import {prepareSearchNaming} from '../../commerce/search-naming.mjs';

const admin = createShopifyAdmin({legacyToken:process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,clientId:process.env.SHOPIFY_CLIENT_ID,clientSecret:process.env.SHOPIFY_CLIENT_SECRET});
const reply = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});

function validateOwnership(doc, productsList, collectionsList, state) {
  const owners = [...seedDocuments(productsList,collectionsList),...Object.values(state.documents),...Object.values(state.drafts)].filter(d=>d.id!==doc.id);
  const parent = doc.products.find(p=>p.id===doc.id);
  const groupedIds = new Set([...(parent?.groupedDesigns || []).map(d=>d.id),...doc.products.filter(p=>p.listingGroup===doc.id).map(p=>p.id)]);
  // Older single-product admin records can remain after those products are
  // consolidated into a grouped listing. Permit that intentional ownership
  // overlap only when the product is explicitly a child of this group.
  const owner = owners.find(d=>d.products.some(p=>doc.products.some(x=>x.id===p.id && !(groupedIds.has(x.id) && x.listingGroup===doc.id && p.id===d.id && d.products.length===1))));
  if (owner) throw new Error(`An ID in this draft belongs to ${owner.id}. Duplicate with new IDs instead.`);
}

async function reconcileJobs(store, state, etag, requestUrl) {
  let changed = false;
  const now = Date.now();
  for (const job of state.jobs) {
    const ageMs = now - Date.parse(job.createdAt);
    if (['queued', 'shopify'].includes(job.status) && ageMs > 5 * 60000) {
      job.status = 'error';
      job.error = 'Sync worker timed out. Please retry.';
      changed = true;
    } else if (job.status === 'website' && ageMs > 30 * 60000) {
      job.status = 'live';
      changed = true;
    }
  }
  if (state.jobs.some(j => j.status === 'website')) {
    try {
      const response = await fetch(new URL('/catalog-revision.json', requestUrl), { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      const live = response.ok ? await response.json() : null;
      for (const job of state.jobs) {
        if (job.status === 'website' && Number.isFinite(live?.revision) && live.revision >= job.revision) {
          job.status = 'live';
          changed = true;
        }
      }
    } catch {
      /* Static deploy check is best-effort; LiveCatalogProvider already serves the new revision. */
    }
  }
  if (changed) {
    try {
      await writeState(store, state, etag);
      return await readState(store);
    } catch {
      return await readState(store);
    }
  }
  return { state, etag };
}

function isWorkerBusyForProduct(state, targetProductId = '') {
  const now = Date.now();
  return state.jobs.some(j => {
    if (!['queued', 'shopify'].includes(j.status)) return false;
    if (now - Date.parse(j.createdAt) >= 5 * 60000) return false;
    if (!targetProductId || ['batch-publish', 'publish-search-names', 'publish-lighting-inclusions', 'delivery-pricing'].includes(j.action)) return true;
    return j.productId === targetProductId;
  });
}

async function startBackgroundJob(jobId, requestUrl, store) {
  const token = createHmac('sha256', process.env.SHOP_ADMIN_KEY).update(jobId).digest('hex');
  const response = await fetch(new URL('/.netlify/functions/shop-catalog-publish-background', requestUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Catalog-Job': token },
    body: JSON.stringify({ id: jobId }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const fresh = await readState(store);
    const failed = fresh.state.jobs.find(j => j.id === jobId);
    if (failed) {
      failed.status = 'error';
      failed.error = 'Publishing worker could not start.';
      await writeState(store, fresh.state, fresh.etag);
    }
    throw new Error('The publishing worker could not start. Retry the update.');
  }
}

export default async (request,context) => {
  try {
    const action = new URL(request.url).searchParams.get('action') || 'list';
    const store = catalogStore(context);
    let {state,etag} = await readState(store);
    let effectiveCollections = mergeCollectionsWithBaseline(state.collections, collections, Object.values(state.documents), state.archived);
    if (request.method === 'GET' && ['snapshot','availability','public'].includes(action)) {
      const current=compileCatalog(products,effectiveCollections,Object.values(state.documents),state.archived);
      const ids=new Set(current.products.map(p=>p.id));
      const archivedList=[...new Set([...state.archived,...(state.unavailableIds || []),...products.filter(p=>!ids.has(p.id)).map(p=>p.id)])];
      if (action === 'availability') {
        const latestPublishing=state.jobs.filter(j=>j.action==='publish').filter((j,i,all)=>all.findIndex(x=>x.productId===j.productId)===i);
        const shippingUpdate=latestPublishing.some(j=>['queued','shopify','website','error'].includes(j.status)&&[...(j.document?.products || []),...(j.previousDocument?.products || [])].some(p=>p.shippingPriceMode==='per-order'));
        return reply({pricingUpdating:shippingUpdate || state.jobs.some(j=>j.action==='delivery-pricing' && ['queued','shopify','website','error'].includes(j.status)),archived:archivedList,revision:state.revision});
      }
      if (action === 'public') {
        // Public live storefront snapshot: finalized identically to static build output; never exposes drafts or credentials.
        const finalized = finalizePublicCatalog({...current, revision: state.revision, rows: state.rows}, baseline, archivedList, { validate: false });
        return reply(finalized);
      }
      // Raw snapshot for export-admin-catalog.mjs during Netlify builds.
      return reply({...current,revision:state.revision,rows:state.rows,deliveryPolicy:state.deliveryPolicy});
    }
    requireAdmin(request);
    const raw = await request.text(); if (raw.length > 800000) return reply({error:'Product data is too large.'},413);
    const body = raw ? JSON.parse(raw) : {};
    const production=(context?.deploy?.context || process.env.CONTEXT)==='production';
    if(!production && ['publish','save-and-publish','batch-publish','publish-lighting-inclusions','archive','restore','publish-layout','publish-search-names','upload-start','upload-finish'].includes(action)) throw new Error('Shopify writes and publishing are only available in the production admin.');
    if(action==='preview-search-names') {
      const compiled=compileCatalog(products,effectiveCollections,Object.values(state.documents),state.archived);
      const prepared=prepareSearchNaming(compiled);
      return reply({changes:prepared.changes,revision:state.revision,completed:state.searchNamingVersion===prepared.version});
    }
    if(action==='inspect') {
      const doc=state.drafts[body.id] || state.documents[body.id] || seedDocuments(products,collections).find(d=>d.id===body.id);
      if(!doc || !admin) throw new Error('This listing is not connected to Shopify.');
      const prices={},expected={};
      for(const p of doc.products.filter(p=>!p.variantOf&&!p.groupedDesigns)) {
        const current=await lookupProduct(admin,p);if(!current)continue;expected[p.id]=current.updatedAt;
        for(const v of current.variants.nodes) if(!v.sku.endsWith('-pickup')) prices[v.sku]=Math.round(Number(v.compareAtPrice && Number(v.compareAtPrice)>Number(v.price)?v.compareAtPrice:v.price)*100);
      }
      return reply({prices,expected,hasDraft:Boolean(state.drafts[body.id])});
    }

    ({ state, etag } = await reconcileJobs(store, state, etag, request.url));
    effectiveCollections = mergeCollectionsWithBaseline(state.collections, collections, Object.values(state.documents), state.archived);

    if (action === 'list') {
      const seed = seedDocuments(products,collections);
      const documents = [...new Map([...seed,...Object.values(state.documents),...Object.values(state.drafts)].map(d => [d.id,d])).values()].map(doc=>({...doc,products:applyDefaultListingCovers(doc.products,products)}));
      return reply({
        documents,
        draftIds: Object.keys(state.drafts),
        publishedIds: Object.keys(state.documents),
        templates,
        presets: state.presets || [],
        archived: state.archived,
        collections: state.layoutDraft?.collections || effectiveCollections,
        rows: state.layoutDraft?.rows || state.rows,
        revision: state.revision,
        jobs: state.jobs,
        history: state.history,
        connection: state.connection,
        ready: {shopify:Boolean(admin),buildHook:Boolean(process.env.NETLIFY_CATALOG_BUILD_HOOK),catalogSource:Boolean(process.env.SHOP_CATALOG_SOURCE_URL)},
      });
    }

    if (action.startsWith('upload-')) {
      if(!admin) throw new Error('Shopify media uploads are not connected.');
      if(action==='upload-start') {
        if(!['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(body.type) || !Number.isSafeInteger(body.size) || body.size<1 || body.size>(body.type.startsWith('video/')?100:20)*1024*1024) throw new Error('Use an image under 20 MB or an MP4/MOV video under 100 MB.');
        const result=await admin.call(`mutation StageCatalogMedia($input:[StagedUploadInput!]!) { stagedUploadsCreate(input:$input) { stagedTargets { url resourceUrl parameters {name value} } userErrors {message} } }`,{input:[{filename:String(body.name).replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,120),mimeType:body.type,fileSize:String(body.size),resource:body.type.startsWith('video/')?'VIDEO':'IMAGE',httpMethod:'POST'}]});
        if(result.stagedUploadsCreate.userErrors.length)throw new Error(result.stagedUploadsCreate.userErrors.map(e=>e.message).join('; '));
        const target=result.stagedUploadsCreate.stagedTargets[0];
        await store.setJSON(`uploads/${createHmac('sha256',process.env.SHOP_ADMIN_KEY).update(target.resourceUrl).digest('hex')}`,{type:body.type,createdAt:Date.now()});
        return reply({target});
      }
      if(action==='upload-finish') {
        const path=`uploads/${createHmac('sha256',process.env.SHOP_ADMIN_KEY).update(String(body.resourceUrl)).digest('hex')}`;
        const staged=await store.get(path,{type:'json'});if(staged?.fileId)return reply({id:staged.fileId,status:'PROCESSING'});if(!staged || staged.type!==body.type || Date.now()-staged.createdAt>3600000)throw new Error('Upload authorization expired. Please retry.');
        const result=await admin.call(`mutation FinishCatalogMedia($files:[FileCreateInput!]!) { fileCreate(files:$files) { files { id fileStatus } userErrors {message} } }`,{files:[{originalSource:body.resourceUrl,contentType:body.type.startsWith('video/')?'VIDEO':'IMAGE',alt:String(body.alt || '').slice(0,240)}]});
        if(result.fileCreate.userErrors.length)throw new Error(result.fileCreate.userErrors.map(e=>e.message).join('; '));
        const file=result.fileCreate.files[0];await store.setJSON(path,{...staged,fileId:file.id});await store.setJSON(`media/${file.id.split('/').pop()}`,{id:file.id});return reply({id:file.id,status:file.fileStatus});
      }
      if(action==='upload-status') {
        if(!/^gid:\/\/shopify\/(MediaImage|Video)\/\d+$/.test(body.id || '') || !await store.get(`media/${body.id.split('/').pop()}`,{type:'json'}))throw new Error('Unknown media upload.');
        const result=await admin.call(`query CatalogMedia($id:ID!) { node(id:$id) { ... on MediaImage { id fileStatus image {url} } ... on Video { id fileStatus sources {url mimeType} } } }`,{id:body.id});
        return reply({id:body.id,status:result.node?.fileStatus,url:result.node?.image?.url || result.node?.sources?.find(s=>s.mimeType==='video/mp4')?.url});
      }
      throw new Error('Unknown media action.');
    }

    const targetProductId = body.document?.id || body.id || '';
    if (isWorkerBusyForProduct(state, targetProductId)) {
      throw new Error('Shopify sync is finishing for this listing (usually 2–3 seconds). Try again in a moment.');
    }

    if(action==='publish-search-names') {
      if(body.revision!==state.revision)throw Error('The catalog changed. Review names again.');
      if(!admin || !process.env.NETLIFY_CATALOG_BUILD_HOOK || !process.env.SHOP_CATALOG_SOURCE_URL)throw Error('Connect Shopify and website publishing first.');
      const compiled=compileCatalog(products,effectiveCollections,Object.values(state.documents),state.archived);
      const prepared=prepareSearchNaming(compiled);
      if(state.searchNamingVersion===prepared.version && !state.jobs.some(j=>j.action===action&&j.status==='error'))return reply({alreadyLive:true});
      const job={id:randomUUID(),productId:'catalog-search-names',action,status:'queued',createdAt:new Date().toISOString(),documents:seedDocuments(prepared.catalog.products,prepared.catalog.collections),collections:prepared.catalog.collections,changes:prepared.changes,namingVersion:prepared.version};
      state.jobs=[job,...state.jobs].slice(0,20);
      await writeState(store,state,etag);
      await startBackgroundJob(job.id, request.url, store);
      return reply({job:{id:job.id,status:'queued'}});
    }

    // Helper for resilient Blob writes that retries once if a background job bumped etag concurrently
    const writeWithRetry = async (mutator) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          ({ state, etag } = await readState(store));
          if (isWorkerBusyForProduct(state, targetProductId)) {
            throw new Error('Shopify sync is finishing for this listing (usually 2–3 seconds). Try again in a moment.');
          }
        }
        const result = await mutator();
        try {
          await writeState(store, state, etag);
          return result;
        } catch (err) {
          if (attempt === 0 && (err.status === 409 || /condition|etag|changed/i.test(err.message))) continue;
          throw err;
        }
      }
    };

    if(action==='save-preset') {
      const doc=validateDocument(body.document);const name=String(body.name || '').trim().slice(0,120);if(!name)throw new Error('Name the template.');
      await writeWithRetry(async () => {
        state.presets=[...(state.presets || []).filter(p=>p.name!==name),{name,document:doc}].slice(-20);
        state.history=[{at:new Date().toISOString(),action,id:doc.id,revision:state.revision},...state.history].slice(0,100);
      });
      return reply({saved:true,revision:state.revision});
    } else if(action==='restore-revision') {
      const previous=await store.get(`revisions/${body.id}/${Number(body.savedRevision)}`,{type:'json'});if(!previous)throw new Error('Revision not found.');
      const doc=validateDocument(previous);
      await writeWithRetry(async () => {
        state.drafts[body.id]=doc;state.revision++;
        state.history=[{at:new Date().toISOString(),action,id:body.id,revision:state.revision},...state.history].slice(0,100);
      });
      return reply({saved:true,revision:state.revision});
    } else if (action === 'save-draft') {
      const doc = validateDocument(body.document);
      await writeWithRetry(async () => {
        validateOwnership(doc, products, collections, state);
        if(state.drafts[doc.id] || state.documents[doc.id]) await store.setJSON(`revisions/${doc.id}/${state.revision}`,state.drafts[doc.id] || state.documents[doc.id]);
        state.drafts[doc.id]=doc; state.revision++;
        state.history=[{at:new Date().toISOString(),action,id:doc.id,revision:state.revision,savedRevision:state.revision-1},...state.history].slice(0,100);
      });
      return reply({saved:true,revision:state.revision,updatedAt:doc.updatedAt});
    } else if (action === 'save-and-publish') {
      if (!process.env.NETLIFY_CATALOG_BUILD_HOOK || !process.env.SHOP_CATALOG_SOURCE_URL) throw new Error('Automatic website publishing is not connected. Save a draft; configure the Netlify catalog build hook first.');
      if (!admin) throw new Error('Shopify is not connected.');
      const doc = validateDocument(body.document, { publish: true });
      const queuedJob = await writeWithRetry(async () => {
        validateOwnership(doc, products, collections, state);
        if (state.drafts[doc.id] || state.documents[doc.id]) {
          await store.setJSON(`revisions/${doc.id}/${state.revision}`, state.drafts[doc.id] || state.documents[doc.id]);
        }
        const original = state.documents[doc.id]
          ? { ...state.documents[doc.id], _fromPublishedState: true }
          : seedDocuments(products, collections).find(d => d.id === doc.id) || null;
        state.drafts[doc.id] = doc;
        state.revision++;
        const job = {
          id: randomUUID(),
          productId: doc.id,
          action: 'publish',
          status: 'queued',
          createdAt: new Date().toISOString(),
          document: doc,
          previousDocument: original,
          expected: body.expected || {},
        };
        state.jobs = [job, ...state.jobs].slice(0, 20);
        state.history = [{ at: new Date().toISOString(), action: 'publish', id: doc.id, revision: state.revision, savedRevision: state.revision - 1 }, ...state.history].slice(0, 100);
        return job;
      });
      await startBackgroundJob(queuedJob.id, request.url, store);
      return reply({ saved: true, revision: state.revision, updatedAt: doc.updatedAt, job: { id: queuedJob.id, status: 'queued' } });
    } else if (action === 'batch-save-drafts') {
      const documents = body.documents;
      if (!Array.isArray(documents) || !documents.length) throw new Error('No documents provided.');
      const validated = documents.map(docInput => validateDocument(docInput));
      await writeWithRetry(async () => {
        for (const doc of validated) {
          if (state.drafts[doc.id] || state.documents[doc.id]) {
            await store.setJSON(`revisions/${doc.id}/${state.revision}`, state.drafts[doc.id] || state.documents[doc.id]);
          }
          state.drafts[doc.id] = doc;
          state.revision++;
        }
      });
      return reply({ saved: validated.length, revision: state.revision });
    } else if (action === 'batch-publish' || action === 'publish-lighting-inclusions') {
      if (!process.env.NETLIFY_CATALOG_BUILD_HOOK || !process.env.SHOP_CATALOG_SOURCE_URL) throw new Error('Automatic website publishing is not connected.');
      if (!admin) throw new Error('Shopify is not connected.');
      const ids = action==='publish-lighting-inclusions' ? seedDocuments(products,collections).filter(d=>d.products.some(p=>lightingIds.has(p.id))).map(d=>d.id) : Array.isArray(body.ids) ? body.ids : [];
      if (!ids.length) throw new Error('Choose at least one product to publish.');
      const queuedJob = await writeWithRetry(async () => {
        const docsToPublish = [];
        for (const id of ids) {
          const original = state.documents[id] || seedDocuments(products, collections).find(d => d.id === id);
          const sourceDoc = action==='publish-lighting-inclusions' ? updateLightingDocument(original) : state.drafts[id] || original;
          if (!sourceDoc) continue;
          validateDocument(sourceDoc, { publish: true });
          docsToPublish.push(sourceDoc);
        }
        if (!docsToPublish.length) throw new Error('No valid documents found to publish.');
        const job = {
          id: randomUUID(),
          productId: 'batch-publish',
          action,
          status: 'queued',
          createdAt: new Date().toISOString(),
          documents: docsToPublish,
        };
        state.jobs = [job, ...state.jobs].slice(0, 20);
        return job;
      });
      await startBackgroundJob(queuedJob.id, request.url, store);
      return reply({ job: { id: queuedJob.id, status: 'queued', count: queuedJob.documents.length } });
    } else if (action === 'connection') {
      const fields = ['publicationId','deliveryProfileId','pickupProfileId','perOrderDeliveryProfileId'];
      if (fields.some(key=>body.connection[key] && !/^gid:\/\/shopify\/(Publication|DeliveryProfile)\/\d+$/.test(body.connection[key]))) throw new Error('Choose valid Shopify connection IDs.');
      await writeWithRetry(async () => {
        state.connection=Object.fromEntries(fields.map(key=>[key,body.connection[key] || '']));
        state.history=[{at:new Date().toISOString(),action,id:'',revision:state.revision},...state.history].slice(0,100);
      });
      return reply({saved:true,revision:state.revision});
    } else if (action === 'choices') {
      if (!admin) throw new Error('Shopify is not connected.');
      return reply(await admin.call(`query AdminChoices { publications(first:50) { nodes { id name } } deliveryProfiles(first:50) { nodes { id name } } }`));
    } else if (action === 'publish' || action === 'archive' || action === 'restore' || action === 'publish-layout') {
      if (!process.env.NETLIFY_CATALOG_BUILD_HOOK || !process.env.SHOP_CATALOG_SOURCE_URL) throw new Error('Automatic website publishing is not connected. Save a draft; configure the Netlify catalog build hook first.');
      if (!admin && action!=='publish-layout') throw new Error('Shopify is not connected.');
      let alreadyLive = false;
      const queuedJob = await writeWithRetry(async () => {
        const originalRaw = state.documents[body.id] || seedDocuments(products,collections).find(d=>d.id===body.id);
        const original = state.documents[body.id] ? { ...state.documents[body.id], _fromPublishedState: true } : originalRaw;
        const sourceDoc = action==='publish' ? state.drafts[body.id] || originalRaw : originalRaw || state.drafts[body.id];
        const doc = action==='restore' && sourceDoc ? validateDocument(sourceDoc,{publish:true}) : sourceDoc;
        if (action!=='publish-layout' && !doc) throw new Error('Product not found.');
        if (action==='publish') {
          validateDocument(doc,{publish:true});
          if(!state.drafts[body.id]&&state.documents[body.id]&&state.jobs.some(j=>j.action==='publish'&&j.productId===body.id&&['website','live'].includes(j.status)&&j.document?.updatedAt===doc.updatedAt)){
            alreadyLive = true;
            return null;
          }
        }
        const job={id:randomUUID(),productId:body.id || '',action,status:'queued',createdAt:new Date().toISOString(),document:doc || null,previousDocument:original || null,expected:body.expected || {}};
        state.jobs=[job,...state.jobs].slice(0,20);
        return job;
      });
      if (alreadyLive) return reply({alreadyLive:true});
      await startBackgroundJob(queuedJob.id, request.url, store);
      return reply({job:{id:queuedJob.id,status:'queued'}});
    } else if (action==='save-layout') {
      if (!Array.isArray(body.collections) || body.collections.length>50 || !Array.isArray(body.rows) || body.rows.length>20) throw new Error('Invalid collections or rows.');
      await writeWithRetry(async () => {
        const compiled=compileCatalog(products,collections,Object.values(state.documents));
        const ids=new Set(compiled.products.map(p=>p.id));
        const layoutCollections=body.collections.map(c=>{
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) || !c.name || !['department','collection','seasonal','curated'].includes(c.kind)) throw new Error('Each category needs a valid link and name.');
          if (!Array.isArray(c.products) || c.products.some(id=>!ids.has(id))) throw new Error('Choose existing products for this category.');
          return {id:c.id,kind:c.kind,name:String(c.name).slice(0,120),shortName:String(c.shortName || c.name).slice(0,120),eyebrow:String(c.eyebrow || '').slice(0,120),heading:String(c.heading || c.name).slice(0,120),description:String(c.description || '').slice(0,1200),seoTitle:String(c.seoTitle || '').slice(0,150),seoDescription:String(c.seoDescription || c.description || '').slice(0,300),...(c.seoEdited?{seoEdited:true}:{}),coverProduct:c.coverProduct || c.products[0] || '',products:c.products};
        });
        const layoutRows=body.rows.map(r=>{
          if (!r.title || !Array.isArray(r.productIds) || r.productIds.some(id=>!ids.has(id))) throw new Error('Rows need a title and existing products.');
          if(r.startAt && !Number.isFinite(Date.parse(r.startAt)) || r.endAt && !Number.isFinite(Date.parse(r.endAt)) || r.startAt && r.endAt && Date.parse(r.endAt)<=Date.parse(r.startAt))throw new Error('Choose a valid row date range.');
          return {kind:['grid','information','collection'].includes(r.kind)?r.kind:'grid',startAt:r.startAt || '',endAt:r.endAt || '',id:String(r.id).slice(0,100),title:String(r.title).slice(0,120),description:String(r.description || '').slice(0,240),productIds:r.productIds.slice(0,24),enabled:r.enabled===true};
        });
        state.layoutDraft={collections:layoutCollections,rows:layoutRows};
        state.revision++;
        state.history=[{at:new Date().toISOString(),action,id:'',revision:state.revision},...state.history].slice(0,100);
      });
      return reply({saved:true,revision:state.revision});
    } else throw new Error('Unknown catalog action.');
  } catch(error) { return reply({error:error.message},error.status || (/condition|etag/i.test(error.message)?409:400)); }
};
