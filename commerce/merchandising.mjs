import products from "./products.json" with { type: "json" };
import collections from "./collections.json" with { type: "json" };
import defaults from "./shop-merchandising.json" with { type: "json" };

export { defaults as merchandisingDefaults };
const parents = new Map(products.filter(product => !("variantOf" in product)).map(product => [product.id, product]));
const collectionIds = new Set(collections.map(collection => collection.id));
const departmentIds = new Set(collections.filter(collection => collection.kind === "department").map(collection => collection.id));
const specialDestinations = new Set(["all", "christmas-special", "halloween-special"]);

export const PURE_HALLOWEEN_PRODUCT_IDS = [
  "pumpkin-head-halloween-mask",
  "pumpkin-head-halloween-mask-small",
  "pumpkin-head-halloween-mask-medium",
  "pumpkin-head-halloween-mask-large",
  "carved-in-fear-halloween-mask",
  "carved-in-fear-halloween-mask-small",
  "carved-in-fear-halloween-mask-medium",
  "carved-in-fear-halloween-mask-large",
  "candlelight-pumpkins-table-lamp",
  "halloween-candy-holder-designs",
  "melting-pumpkin-candy-dispenser",
  "walkin-pumpkin-candy-holder",
  "spectral-candy-holder",
  "glutton-ghost-bowl",
  "ghost-duo-trinket-dish",
  "skull-web-trinket-dish",
  "ghost-arch-wreath",
  "ghost-on-a-swing",
  "mood-ghost"
];

export const PURE_CHRISTMAS_PRODUCT_IDS = [
  "endless-swirling-tree",
  "christmas-angel",
  "meowy-christmas-tree-topper",
  "christmas-character-figurines",
  "hooked-santa",
  "zou-christmas-baby-axolotl",
  "christmas-gnome-set",
  "snow-in-jumper",
  "bright-nativity-table-lamp",
  "village-on-the-moon-table-lamp",
  "santa-s-bonfire-table-lamp",
  "santa-s-snack-hat-bowl",
  "christmas-character-ornaments",
  "santa-claus-christmas-ornament",
  "sleeping-bear-christmas-ornament",
  "sleeping-dog-christmas-ornament",
  "reindeer-head-christmas-ornament",
  "snowman-christmas-ornament",
  "sleeping-cat-christmas-ornament",
  "lying-reindeer-christmas-ornament",
  "nutcracker-christmas-ornament",
  "holy-family-embrace",
  "heavenly-trio",
  "guiding-star-tree-topper",
  "evergreen-wreath",
  "luminous-tree",
  "luminous-tree-stars",
  "luminous-tree-lace",
  "luminous-tree-spiral",
  "village-lights",
  "christmas-trinket-trays",
  "stocking-tray",
  "snowflake-tray",
  "christmas-tree-tray",
  "kitten-ornament-table-lamp",
  "snowy-branch-table-lamp",
  "olive-branch-nativity-table-lamp",
  "guardian-angel-table-lamp",
  "glowing-gift-bag-table-lamp",
  "snowman-shine-table-lamp"
];

export const SEASONAL_PRESETS = {
  christmas: {
    activeSeason: "christmas",
    hideOffSeasonProducts: true,
    campaign: {
      enabled: true,
      startDate: "2026-10-31",
      endDate: "2026-12-31",
      eyebrow: "CHRISTMAS COLLECTION · CRAFTED IN EDMONTON",
      title: "Heirloom holiday warmth, made here in Canada.",
      description: "Illuminated table lamps, sculptural nativity pieces, kinetic trees and giftable ornaments—crafted in small batches at our Edmonton studio with free tracked Canadian shipping.",
      coverProduct: "endless-swirling-tree",
      imageIndex: 0,
      destination: "christmas-special",
      buttonLabel: "Explore Christmas Collection",
      featuredTitle: "Signature Christmas pieces, made in Edmonton.",
      featuredIds: [
        "endless-swirling-tree",
        "christmas-angel",
        "village-on-the-moon-table-lamp",
        "christmas-gnome-set",
        "santa-s-bonfire-table-lamp"
      ]
    }
  },
  halloween: {
    activeSeason: "halloween",
    hideOffSeasonProducts: true,
    campaign: {
      enabled: true,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      eyebrow: "HALLOWEEN / MADE IN EDMONTON",
      title: "Give spooky some character.",
      description: "Finished wearable masks, glowing lamps and little ghosts. Find your Halloween favourite.",
      coverProduct: "pumpkin-head-halloween-mask",
      imageIndex: 0,
      destination: "halloween-special",
      buttonLabel: "Explore Halloween",
      featuredTitle: "Halloween picks, made here.",
      featuredIds: [
        "pumpkin-head-halloween-mask",
        "carved-in-fear-halloween-mask",
        "candlelight-pumpkins-table-lamp",
        "mood-ghost",
        "ghost-on-a-swing",
        "figurine-fidget-designs"
      ]
    }
  },
  everyday: {
    activeSeason: "everyday",
    hideOffSeasonProducts: true,
    campaign: {
      enabled: false,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      eyebrow: "PERSONAL GIFTS / MADE IN EDMONTON",
      title: "A little more personal.",
      description: "Photo keepsakes, useful desk pieces and gifts with character. Find something that feels like them.",
      coverProduct: "lithophane-table-lamp",
      imageIndex: 0,
      destination: "personalized-gifts",
      buttonLabel: "Explore personalized gifts",
      featuredTitle: "Find your next favourite.",
      featuredIds: [
        "lithophane-table-lamp",
        "daisy-duo-photo-frame",
        "flow-stand-headphone-and-phone-holder",
        "dinosaur-skeleton-collection",
        "octopus-wine-bottle-holder",
        "night-owl-wall-light"
      ]
    }
  }
};

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
  if (!collectionIds.has(input.destination) && !specialDestinations.has(input.destination)) reject("Choose an existing campaign collection.");
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

  const activeSeason = input.activeSeason && ["christmas", "halloween", "everyday"].includes(input.activeSeason)
    ? input.activeSeason
    : defaults.activeSeason || "christmas";
  const hideOffSeasonProducts = typeof input.hideOffSeasonProducts === "boolean"
    ? input.hideOffSeasonProducts
    : defaults.hideOffSeasonProducts ?? true;

  return {
    schemaVersion: 2,
    activeSeason,
    hideOffSeasonProducts,
    departments: [...input.departments],
    showBudgetGifts: input.showBudgetGifts,
    showStudioProof: input.showStudioProof,
    decorativeMotion: input.decorativeMotion ?? true,
    fallback: validateFeature(input.fallback),
    campaign: { enabled: input.campaign.enabled, startDate: input.campaign.startDate, endDate: input.campaign.endDate, ...validateFeature(input.campaign) },
  };
}
