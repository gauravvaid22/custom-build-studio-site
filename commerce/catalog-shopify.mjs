import deliveryPolicy from './delivery-policy.json' with {type:'json'};
import { managedVariantInput } from './managed-product-input.mjs';
import {deliveryProfileFor,verifyFlatShippingProfile} from './order-shipping.mjs';
import {brandedSearchTitle,searchDescription} from './product-search.mjs';
const check = payload => { if (payload?.userErrors?.length) throw new Error(payload.userErrors.map(e => e.message).join('; ')); return payload; };
const html = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function lookupProduct(admin, product) {
  const handle = product.shopifyHandle || product.variantOf || product.id;
  const data = await admin.call(`query ManagedProduct($handle: String!) { productByIdentifier(identifier: {handle: $handle}) { id handle title updatedAt status variants(first: 100) { nodes { id sku price compareAtPrice } } } }`, { handle });
  return data.productByIdentifier;
}
export async function syncDocument(admin, doc, config, expected = {}) {
  const policy=config.pricingPolicy || deliveryPolicy;
  if (!admin) throw new Error('Shopify credentials are missing.');
  if (!doc.fulfillmentConfirmed) throw new Error('Confirm the fulfillment settings before publishing.');
  const records = doc.products.filter(p => !p.variantOf && !p.groupedDesigns);
  const results = [];
  const flatChecks=new Set();
  for (const p of records) {
    const deliveryProfileId=p.shippingPriceMode==='per-order'?deliveryProfileFor(p,config):config.deliveryProfileId;
    if(p.shippingPriceMode==='per-order' && !flatChecks.has(deliveryProfileId+':'+p.shippingFeeCents)){await verifyFlatShippingProfile(admin,deliveryProfileId,p.shippingFeeCents);flatChecks.add(deliveryProfileId+':'+p.shippingFeeCents);}
    const current = await lookupProduct(admin, p);
    if (expected[p.id] && current?.updatedAt !== expected[p.id]) throw new Error(`${p.name} changed in Shopify. Reload the editor before publishing.`);
    if (current?.variants.nodes.some(v => v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price))) throw new Error(`End the sale for ${p.name} before changing its base price.`);
    const input = { title: p.name, descriptionHtml: [p.description,...(p.shippingPriceMode==='per-order'?[`Mix and match: CAD${(p.priceCents/100).toFixed(2)} per item, plus CAD${(p.shippingFeeCents/100).toFixed(2)} tracked Canadian delivery once per order. Add more designs without another delivery charge. The same flat fee applies when these items are ordered with other products.`]:[]),p.included,p.dimensions,p.notes].filter(Boolean).map(x => `<p>${html(x)}</p>`).join(''),
      productType: p.category, metafields: [ {namespace:'cbs',key:'dimensions',type:'single_line_text_field',value:p.dimensions || 'Not specified'},
        {namespace:'cbs',key:'included',type:'multi_line_text_field',value:p.included}, {namespace:'cbs',key:'care',type:'multi_line_text_field',value:p.notes || 'Not specified'} ],
      seo: { title: brandedSearchTitle(p), description: searchDescription(p) } };
    let product;
    const choices = p.variants?.length ? p.variants : [{id:p.id,priceCents:p.priceCents}];
    if (!current) {
      if (!config.publicationId || !config.pickupProfileId || !config.deliveryProfileId) throw new Error('Choose the website sales channel and delivery/pickup profiles in Connection settings first.');
      const variantInput = managedVariantInput({id:p.id, optionName:p.variantLabel || 'Size', options: p.variants?.length ? p.variants : undefined, priceCents:p.priceCents, unifiedFulfillment:policy.active,pickupPriceDifferenceCents:policy.active?0:p.pickupPriceDifferenceCents}, 1000);
      const created = await admin.call(`mutation CreateManaged($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { id handle updatedAt variants(first: 100) { nodes { id sku price } } } userErrors { message } } }`,
        { input: {...input, handle:p.shopifyHandle || p.id, status:'DRAFT',vendor:'Custom Build Studio',tags:['cbs-managed'], ...variantInput,
          files: p.images.map((image,i) => image.mediaId ? {id:image.mediaId} : ({originalSource:new URL(image.src,'https://custombuildstudio.ca').href,contentType:'IMAGE',alt:image.alt,filename:`${p.id}-${i}.webp`}))} });
      product = check(created.productSet).product;
      if (!product?.id) throw new Error('Shopify did not return the new product.');
    } else {
      product = current;
      const wanted = new Set(choices.flatMap(c => policy.active?[c.id]:[c.id,c.id+'-pickup']));
      if ([...wanted].some(sku => !product.variants.nodes.some(v => v.sku === sku))) throw new Error('This edit adds new options to an existing Shopify product. Save it as a new design/product or configure those options in Shopify before publishing.');
      const updated = await admin.call(`mutation ManagedDetails($product: ProductUpdateInput!) { productUpdate(product:$product) { product { id } userErrors { message } } }`, {product:{...input,id:product.id}});
      check(updated.productUpdate);
    }
    const media=[...p.images.filter(image=>image.mediaId).map(image=>({id:image.mediaId,alt:image.alt,referencesToAdd:[product.id]})),...(p.videoMediaId?[{id:p.videoMediaId,alt:p.name,referencesToAdd:[product.id]}]:[])];
    if(media.length) check((await admin.call(`mutation AttachManagedMedia($files:[FileUpdateInput!]!) { fileUpdate(files:$files) { files { id } userErrors {message} } }`,{files:media})).fileUpdate);
    const variantUpdates = choices.flatMap(c => [false,...(product.variants.nodes.some(v=>v.sku===c.id+'-pickup')?[true]:[])].map(pickup => {
      const variant = product.variants.nodes.find(v => v.sku === c.id + (pickup ? '-pickup' : ''));
      if (!variant) throw new Error('Delivery and pickup options were not created correctly.');
      return {id:variant.id,price:((c.priceCents - (pickup && !policy.active ? p.pickupPriceDifferenceCents : 0))/100).toFixed(2)};
    }));
    check((await admin.call(`mutation ManagedPrices($id:ID!,$variants:[ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId:$id,variants:$variants) { productVariants { id } userErrors { message } } }`,{id:product.id,variants:variantUpdates})).productVariantsBulkUpdate);
    if(policy.active && current && current.status!=='DRAFT'){
      for(const [pickup,profileId] of [[false,deliveryProfileId],[true,config.pickupProfileId]]){
        if(!product.variants.nodes.some(v=>v.sku.endsWith('-pickup')===pickup))continue;
        if(!profileId)throw new Error('Select the shipping profiles in Connections.');
        check((await admin.call(`mutation ManagedShippingUpdate($id:ID!,$profile:DeliveryProfileInput!){deliveryProfileUpdate(id:$id,profile:$profile){userErrors{message}}}`,{id:profileId,profile:{variantsToAssociate:product.variants.nodes.filter(v=>v.sku.endsWith('-pickup')===pickup).map(v=>v.id)}})).deliveryProfileUpdate);
      }
    }
    if (!current || current.status === 'DRAFT') {
      if(config.initializeInventory)await config.initializeInventory(admin,p);
      for (const [pickup, profileId] of [[false,deliveryProfileId],[true,config.pickupProfileId]]) {
        const ids = product.variants.nodes.filter(v => v.sku.endsWith('-pickup') === pickup).map(v => v.id);
        if(!ids.length)continue;
        check((await admin.call(`mutation ManagedShipping($id:ID!,$profile:DeliveryProfileInput!) { deliveryProfileUpdate(id:$id,profile:$profile) { profile { id } userErrors { message } } }`,{id:profileId,profile:{variantsToAssociate:ids}})).deliveryProfileUpdate);
      }
      check((await admin.call(`mutation ActivateManaged($product:ProductUpdateInput!) { productUpdate(product:$product) { product {id} userErrors {message} } }`,{product:{id:product.id,status:'ACTIVE'}})).productUpdate);
      check((await admin.call(`mutation PublishManaged($id:ID!,$input:[PublicationInput!]!) { publishablePublish(id:$id,input:$input) { userErrors {message} } }`,{id:product.id,input:[{publicationId:config.publicationId}]})).publishablePublish);
    }
    const verified = await lookupProduct(admin,p);
    if (variantUpdates.some(v => Number(verified.variants.nodes.find(x => x.id === v.id)?.price).toFixed(2) !== v.price)) throw new Error('Shopify price verification failed.');
    results.push({id:p.id,shopifyId:product.id,updatedAt:verified.updatedAt});
  }
  return results;
}
export async function withdrawDocument(admin, doc, publicationId, restore = false) {
  if (!publicationId) throw new Error('Set the website sales channel in Connection settings before withdrawing a product.');
  for (const p of doc.products.filter(p => !p.variantOf && !p.groupedDesigns)) {
    const product = await lookupProduct(admin,p); if (!product) continue;
    const operation = restore ? 'publishablePublish' : 'publishableUnpublish';
    check((await admin.call(`mutation Visibility($id:ID!,$input:[PublicationInput!]!) { ${operation}(id:$id,input:$input) { userErrors {message} } }`,{id:product.id,input:[{publicationId}]}))[operation]);
  }
}
