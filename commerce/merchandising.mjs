import products from "./products.json" with { type: "json" };
import collections from "./collections.json" with { type: "json" };
import defaults from "./shop-merchandising.json" with { type: "json" };

export { defaults as merchandisingDefaults };
const parents = new Map(products.filter(product => !("variantOf" in product)).map(product => [product.id, product]));
const collectionIds = new Set(collections.map(collection => collection.id));
const departmentIds = new Set(collections.filter(collection => collection.kind === "department").map(collection => collection.id));
function reject(message) { throw new Error(message); }
function shortText(value, label, maximum = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maximum || /[\x00-\x1f]/.test(value))
    reject(`Enter ${label} (1–${maximum} characters).`);
  return value.trim();
}
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function validateFeature(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) reject("Enter valid campaign settings.");
  const cover = parents.get(input.coverProduct);
  if (!cover) reject("Choose an existing product for the campaign image.");
  if (!Number.isInteger(input.imageIndex) || input.imageIndex < 0 || input.imageIndex >= cover.images.length)
    reject("Choose an available photo for the campaign.");
  if (!collectionIds.has(input.destination) && input.destination !== "all") reject("Choose an existing campaign collection.");
  if (!Array.isArray(input.featuredIds) || input.featuredIds.length < 1 || input.featuredIds.length > 6 ||
      input.featuredIds.some(id => !parents.has(id)) || new Set(input.featuredIds).size !== input.featuredIds.length)
    reject("Choose one to six different featured products.");
  return {
    eyebrow: shortText(input.eyebrow, "a campaign label", 80),
    title: shortText(input.title, "a headline", 80),
    description: shortText(input.description, "a short introduction", 240),
    coverProduct: cover.id, imageIndex: input.imageIndex, destination: input.destination,
    buttonLabel: shortText(input.buttonLabel, "a button label", 45),
    featuredTitle: shortText(input.featuredTitle, "a featured-products heading", 100),
    featuredIds: [...input.featuredIds],
  };
}
export function validateMerchandising(input) {
  if (input?.decorativeMotion !== undefined && typeof input.decorativeMotion !== "boolean") reject("Enter valid animation settings.");
  if (!input || typeof input !== "object" || Array.isArray(input)) reject("Enter valid shop display settings.");
  if (!Array.isArray(input.departments) || !input.departments.length || input.departments.length > departmentIds.size ||
      input.departments.some(id => !departmentIds.has(id)) || new Set(input.departments).size !== input.departments.length)
    reject("Choose different, existing shop departments.");
  if (typeof input.showBudgetGifts !== "boolean" || typeof input.showStudioProof !== "boolean" || typeof input.campaign?.enabled !== "boolean")
    reject("Enter valid section settings.");
  if (!validDate(input.campaign.startDate) || !validDate(input.campaign.endDate) || input.campaign.endDate < input.campaign.startDate)
    reject("Choose valid campaign dates, with the last day on or after the first day.");
  return {
    departments: [...input.departments], showBudgetGifts: input.showBudgetGifts, showStudioProof: input.showStudioProof,
    decorativeMotion: input.decorativeMotion ?? true,
    fallback: validateFeature(input.fallback),
    campaign: { enabled: input.campaign.enabled, startDate: input.campaign.startDate, endDate: input.campaign.endDate, ...validateFeature(input.campaign) },
  };
}
