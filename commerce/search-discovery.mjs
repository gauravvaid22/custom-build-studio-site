import products from "./products.json" with { type: "json" };
import collections from "./collections.json" with { type: "json" };
import config from "./search-discovery.json" with { type: "json" };

const selected = new Set(collections.filter(c => config.collectionIds.includes(c.id)).flatMap(c => c.products));
export const discoveryProducts = products.filter(p => selected.has(p.id) && !p.variantOf);
export const xmlEscape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
export const productUrl = id => `${config.origin}/shop/${id}/?fulfillment=delivered`;

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
    const variant = live?.variants.nodes.find(v => v.sku === p.id);
    if (!variant || variant.price.currencyCode !== "CAD" || !Number.isFinite(Number(variant.price.amount))) return [];
    return [{ ...p, name: live.title, livePrice: Number(variant.price.amount).toFixed(2), available: variant.availableForSale }];
  });
}

export function discoverySchema(p) {
  const url = productUrl(p.id);
  return { "@context": "https://schema.org", "@graph": [
    { "@type": "Product", "@id": `${config.origin}/shop/${p.id}/#product`, name: p.name, sku: p.id,
      description: `${p.description} ${p.included}`, category: "Headphone stands", url,
      image: p.images.map(i => config.origin + i.src),
      offers: { "@type": "Offer", url, priceCurrency: "CAD", price: p.livePrice,
        availability: p.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: "Custom Build Studio" },
        shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: config.shippingCountry }, shippingRate: { "@type": "MonetaryAmount", value: config.shippingPrice, currency: "CAD" } },
      },
    },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: config.origin + "/shop/" },
      { "@type": "ListItem", position: 2, name: "Headphone Stands", item: config.origin + "/shop/headphone-stands/" },
      { "@type": "ListItem", position: 3, name: p.name, item: config.origin + `/shop/${p.id}/` },
    ] },
  ] };
}

export function merchantFeed(catalog) {
  const field = (name, value) => `<g:${name}>${xmlEscape(value)}</g:${name}>`;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Custom Build Studio Headphone Stands</title><link>${config.origin}/shop/headphone-stands/</link><description>Finished headphone stands made in Edmonton</description>${catalog.map(p => `<item>${field("id", p.id)}${field("title", p.name)}${field("description", `${p.description} ${p.included} ${p.dimensions}`)}${field("link", productUrl(p.id))}${field("image_link", config.origin + p.images[0].src)}${p.images.slice(1, 11).map(i => field("additional_image_link", config.origin + i.src)).join("")}${field("availability", p.available ? "in_stock" : "out_of_stock")}${field("price", `${p.livePrice} CAD`)}${field("condition", "new")}${field("identifier_exists", "no")}${field("product_type", "Shop > Gaming & Desk Accessories > Headphone Stands")}<g:shipping>${field("country", config.shippingCountry)}${field("price", `${config.shippingPrice} CAD`)}</g:shipping></item>`).join("")}</channel></rss>`;
}
