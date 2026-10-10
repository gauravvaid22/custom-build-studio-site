import products from "../../commerce/products.json";
import collections from "../../commerce/collections.json";
import defaults from "../../commerce/shop-merchandising.json";

export type Merchandising = typeof defaults;
export type ShopFeature = Merchandising["fallback"];
type Product = (typeof products)[number];
export const shopDepartments = collections.filter(collection => collection.kind === "department");
export const parentProducts = products.filter(product => !("variantOf" in product) && !("listingGroup" in product));
export const subcollections: Record<string, string[]> = {
  "gaming-desk": ["headphone-stands", "console-stands"],
  "personalized-gifts": ["photo-frames"],
  "home-decor": ["can-holders"],
  seasonal: ["halloween", "masks-costumes"],
};
export function edmontonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function activeShopFeature(config: Merchandising, now = new Date()): ShopFeature {
  const today = edmontonDate(now);
  return config.campaign.enabled && today >= config.campaign.startDate && today <= config.campaign.endDate ? config.campaign : config.fallback;
}
/** Collection cards and filters use the lowest available option, not a stale parent price. */
export function lowestProductPrice(product: Product, priceFor: (id: string, cents: number) => number) {
  const variants = "variants" in product ? product.variants : undefined;
  return variants?.length ? Math.min(...variants.map(variant => priceFor(variant.id, variant.priceCents))) : priceFor(product.id, product.priceCents);
}
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function matchesProductSearch(product: Product, query: string, displayName = product.name) {
  const family = collections.filter(collection => collection.products.includes(product.id)).map(collection => collection.name).join(" ");
  const searchable = normalize(`${displayName} ${product.name} ${product.category} ${product.description} ${"groupedDesigns" in product ? product.groupedDesigns?.map(design => design.label).join(" ") : ""} ${family}`);
  return normalize(query).trim().split(/\s+/).filter(Boolean).every(word => searchable.includes(word));
}
/** Never forward arbitrary search text (emails, phone numbers, etc.) to analytics. */
export function analyticsSearchTerm(query: string) {
  const vocabulary = new Set(normalize(parentProducts.map(product => `${product.name} ${product.category}`).join(" ")).split(/[^a-z0-9]+/).filter(word => word.length > 2));
  return normalize(query).split(/[^a-z0-9]+/).filter(word => vocabulary.has(word)).slice(0, 8).join(" ") || "other product search";
}
