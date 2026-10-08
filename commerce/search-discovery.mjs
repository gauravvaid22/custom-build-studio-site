import products from "./products.json" with { type: "json" };
import collections from "./collections.json" with { type: "json" };
import config from "./search-discovery.json" with { type: "json" };

const selected = new Set(collections.filter(c => config.collectionIds.includes(c.id)).flatMap(c => c.products));
export const discoveryProducts = products.filter(p => selected.has(p.id) && !p.variantOf);
export const xmlEscape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
export const productUrl = (id, variant) => `${config.origin}/shop/${id}/?fulfillment=delivered${variant ? "&variant=" + encodeURIComponent(variant) : ""}`;

export async function fetchDiscoveryCatalog(token, fetcher = fetch) {
  if (!token) throw new Error("Storefront catalog connection is unavailable.");
  const fields = discoveryProducts.map((p, i) => `p${i}: product(handle: ${JSON.stringify(p.shopifyHandle || p.id)}) { title variants(first: 100) { nodes { sku availableForSale price { amount currencyCode } } } }`).join("\n");
  const response = await fetcher(`https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query: `{ ${fields} }` }), signal: AbortSignal.timeout(8000),
  });
  const result = await response.json();
  if (!response.ok || result.errors || !result.data) throw new Error("Could not verify Shopify product data.");
  return discoveryProducts.flatMap((p, i) => {
    const live = result.data[`p${i}`];
    const options = p.variants?.length ? p.variants : [{ id: p.id }];
    const verified = options.flatMap(option => {
      const variant = live?.variants.nodes.find(v => v.sku === option.id);
      if (!variant || variant.price.currencyCode !== "CAD" || !Number.isFinite(Number(variant.price.amount)) || Number(variant.price.amount) < 0) return [];
      const detail = products.find(item => item.id === option.id) || p;
      const images = p.variantLabel === "Design" ? p.images.filter(image => image.design === option.label) : p.images;
      return [{ ...detail, images: images.length ? images : detail.images, name: live.title + (option.label ? ` — ${option.label}` : ""), parentId: p.id,
        optionLabel: option.label, variantKind: p.variantLabel === "Design" ? "pattern" : "size",
        dimensions: option.dimensions || detail.dimensions, livePrice: Number(variant.price.amount).toFixed(2), available: variant.availableForSale }];
    });
    return verified.length ? [{ ...p, name: live.title, liveVariants: verified, livePrice: verified[0].livePrice, available: verified.some(v => v.available) }] : [];
  });
}

export function discoverySchema(p) {
  const collection = collections.find(c => config.collectionIds.includes(c.id) && c.products.includes(p.id));
  const item = variant => {
    const url = productUrl(p.id, variant.id === p.id ? undefined : variant.id);
    return { "@type": "Product", "@id": `${config.origin}/shop/${p.id}/#${variant.id}`, name: variant.name, sku: variant.id,
      description: `${p.description} ${p.included} ${variant.dimensions || ""}`, category: p.category, url,
      image: variant.images.map(i => config.origin + i.src),
      ...(variant.optionLabel ? { [variant.variantKind]: variant.optionLabel } : {}),
      offers: { "@type": "Offer", url, priceCurrency: "CAD", price: variant.livePrice,
        availability: variant.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: "Custom Build Studio" },
        shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: config.shippingCountry }, shippingRate: { "@type": "MonetaryAmount", value: config.shippingPrice, currency: "CAD" } },
      },
    };
  };
  const variants = p.liveVariants || [p];
  return { "@context": "https://schema.org", "@graph": [
    p.variants?.length ? { "@type": "ProductGroup", productGroupID: p.id, name: p.name, description: p.description,
      url: `${config.origin}/shop/${p.id}/`, image: p.images.map(i => config.origin + i.src),
      variesBy: ["https://schema.org/" + variants[0].variantKind], hasVariant: variants.map(item) } : item(variants[0]),
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: config.origin + "/shop/" },
      { "@type": "ListItem", position: 2, name: collection.name, item: config.origin + `/shop/${collection.id}/` },
      { "@type": "ListItem", position: 3, name: p.name, item: config.origin + `/shop/${p.id}/` },
    ] },
  ] };
}

export function merchantFeed(catalog) {
  const field = (name, value) => `<g:${name}>${xmlEscape(value)}</g:${name}>`;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Custom Build Studio Products</title><link>${config.origin}/shop/</link><description>Finished gifts, accessories and Halloween products made in Edmonton</description>${catalog.flatMap(parent => (parent.liveVariants || [parent]).map(p => `<item>${field("id", p.id)}${field("title", p.name)}${field("description", `${parent.description} ${p.included} ${p.dimensions || ""}`)}${field("link", productUrl(parent.id, p.id === parent.id ? undefined : p.id))}${field("image_link", config.origin + p.images[0].src)}${p.images.slice(1, 11).map(i => field("additional_image_link", config.origin + i.src)).join("")}${p.optionLabel ? field("item_group_id", parent.id) + field(p.variantKind, p.optionLabel) : ""}${field("availability", p.available ? "in_stock" : "out_of_stock")}${field("price", `${p.livePrice} CAD`)}${field("condition", "new")}${field("identifier_exists", "no")}${field("product_type", `Shop > ${parent.category}`)}<g:shipping>${field("country", config.shippingCountry)}${field("price", `${config.shippingPrice} CAD`)}</g:shipping></item>`)).join("")}</channel></rss>`;
}
