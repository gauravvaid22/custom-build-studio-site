import products from "../data/catalog";
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
  "home-decor": ["can-holders", "tumbler-accessories"],
  "pet-accessories": ["pet-hats-costumes"],
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

export interface SearchAutocompleteItem {
  id: string;
  name: string;
  category: string;
  isDesignOption: boolean;
  parentName?: string;
  priceCents: number;
  hasPriceRange: boolean;
  thumb: string;
  alt: string;
  url: string;
}

const searchablePublicCatalog = products.filter(
  product => !("variantOf" in product) && !product.purchaseOnly && product.launchReady !== false,
);

export function matchesProductSearch(product: Product, query: string, displayName = product.name) {
  const q = normalize(query).trim();
  if (!q) return true;
  const family = collections.filter(collection => collection.products.includes(product.id)).map(collection => collection.name).join(" ");
  const variantText = "variants" in product && product.variants ? product.variants.map(v => v.label).join(" ") : "";
  const groupedText = "groupedDesigns" in product && product.groupedDesigns ? product.groupedDesigns.map(d => d.label).join(" ") : "";
  const keywordsText = "searchKeywords" in product && Array.isArray(product.searchKeywords) ? product.searchKeywords.join(" ") : "";
  const searchable = normalize(
    [
      displayName,
      product.name,
      product.seoTitle || "",
      product.seoDescription || "",
      keywordsText,
      product.category,
      product.description,
      product.notes || "",
      product.included || "",
      product.dimensions || "",
      variantText,
      groupedText,
      family,
    ].join(" "),
  );
  return q.split(/\s+/).filter(Boolean).every(word => searchable.includes(word));
}

export function searchCatalogAutocomplete(
  query: string,
  priceFor?: (id: string, cents: number) => number,
  nameFor?: (id: string, fallback: string) => string,
  limit = 7,
): SearchAutocompleteItem[] {
  const q = normalize(query).trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored: { item: SearchAutocompleteItem; score: number }[] = [];

  for (const product of searchablePublicCatalog) {
    const displayName = nameFor ? nameFor(product.id, product.name) : product.name;
    if (!matchesProductSearch(product, q, displayName)) continue;

    const normName = normalize(displayName);
    const normSeo = normalize(product.seoTitle || "");
    const isDesignOption = Boolean("listingGroup" in product && product.listingGroup);
    const parentProduct = isDesignOption
      ? products.find(p => p.id === product.listingGroup)
      : undefined;

    let score = 0;
    if (normName === q) score += 120;
    else if (normName.startsWith(q)) score += 85;
    else if (normName.includes(q)) score += 60;
    else if (normSeo.includes(q)) score += 45;
    else if (tokens.every(t => normName.includes(t))) score += 50;
    else score += 20;

    if (!isDesignOption) score += 10;

    const basePrice = priceFor ? lowestProductPrice(product, priceFor) : product.priceCents;
    const hasPriceRange = Boolean(
      ("variants" in product && product.variants && product.variants.length > 1) ||
        ("groupedDesigns" in product && product.groupedDesigns && product.groupedDesigns.length > 1),
    );

    scored.push({
      score,
      item: {
        id: product.id,
        name: displayName,
        category: product.category,
        isDesignOption,
        parentName: parentProduct
          ? (nameFor ? nameFor(parentProduct.id, parentProduct.name) : parentProduct.name)
          : undefined,
        priceCents: basePrice,
        hasPriceRange,
        thumb: product.images[0]?.thumb || product.images[0]?.src || "",
        alt: product.images[0]?.alt || displayName,
        url: `/shop/${product.id}`,
      },
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(entry => entry.item);
}
/** Never forward arbitrary search text (emails, phone numbers, etc.) to analytics. */
export function analyticsSearchTerm(query: string) {
  const vocabulary = new Set(normalize(parentProducts.map(product => `${product.name} ${product.category}`).join(" ")).split(/[^a-z0-9]+/).filter(word => word.length > 2));
  return normalize(query).split(/[^a-z0-9]+/).filter(word => vocabulary.has(word)).slice(0, 8).join(" ") || "other product search";
}
