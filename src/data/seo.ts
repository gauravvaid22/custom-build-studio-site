import type {StockRecord} from "../../commerce/stock-limits.mjs";
import { allServices as services, serviceDetails } from "./landing";
import projects from "./projects.json";
import { business } from "./business";
import products from "./catalog";
import collections from "../../commerce/collections.json";
import headphoneSearch from "../../commerce/headphone-search.json";
import maskSearch from "../../commerce/mask-search.json";
import christmasFaqs from "../../commerce/christmas-faqs.json";
import {searchTitle,searchDescription} from "../../commerce/product-search.mjs";
import merchandising from "../../commerce/shop-merchandising.json";
import { PURE_HALLOWEEN_PRODUCT_IDS, PURE_CHRISTMAS_PRODUCT_IDS } from "../../commerce/merchandising.mjs";

export const CHRISTMAS_PUBLIC_ENABLED = merchandising.activeSeason === "christmas" || merchandising.hideOffSeasonProducts !== true;
export const HALLOWEEN_PUBLIC_ENABLED = merchandising.activeSeason === "halloween" || merchandising.hideOffSeasonProducts !== true;

function isSeasonallyPublicProduct(product: (typeof products)[number]) {
  if (!merchandising.hideOffSeasonProducts) return true;
  const groupId = "listingGroup" in product ? product.listingGroup : undefined;
  const checkIds = [product.id, groupId].filter(Boolean) as string[];
  if (merchandising.activeSeason === "christmas") {
    return !checkIds.some((id) => PURE_HALLOWEEN_PRODUCT_IDS.includes(id));
  }
  if (merchandising.activeSeason === "halloween") {
    return !checkIds.some((id) => PURE_CHRISTMAS_PRODUCT_IDS.includes(id));
  }
  return !checkIds.some((id) => PURE_HALLOWEEN_PRODUCT_IDS.includes(id) || PURE_CHRISTMAS_PRODUCT_IDS.includes(id));
}

const publicProducts = products.filter((product) => !("variantOf" in product) && !product.purchaseOnly && isSeasonallyPublicProduct(product));
const browsingProducts = publicProducts.filter(product => !("listingGroup" in product));
const halloweenSpecialIds = collections.find((collection) => collection.id === "halloween")?.products || [];
const canonical = (path: string) => business.origin + (path === "/" ? "/" : path.replace(/\/$/, "") + "/");
export const publicRoutes = [
  "/",
  "/services",
  "/find-a-3d-model",
  ...services.map((s) => `/services/${s.id}`),
  "/work",
  ...projects.map((p) => `/work/${p.id}`),
  "/about",
  "/pricing",
  "/products",
  "/shop",
  "/shop/all",
  ...(HALLOWEEN_PUBLIC_ENABLED ? ["/shop/halloween-special"] : []),
  ...(CHRISTMAS_PUBLIC_ENABLED ? ["/shop/christmas-special"] : []),
  ...collections
    .filter(c => merchandising.hideOffSeasonProducts !== true || (CHRISTMAS_PUBLIC_ENABLED ? !["halloween", "masks-costumes"].includes(c.id) : HALLOWEEN_PUBLIC_ENABLED ? c.id !== "christmas" : !["halloween", "masks-costumes", "christmas"].includes(c.id)))
    .map((collection) => `/shop/${collection.id}`),
  ...publicProducts.map((product) => `/shop/${product.id}`),
  "/reviews",
  "/contact",
  "/privacy",
  "/shipping-returns",
];
export function getSeo(
  path: string,
  customProducts: typeof products = products,
  customCollections: typeof collections = collections,
) {
  const page = path.replace(/\/$/, "") || "/";
  const activePublicProducts = customProducts.filter(
    (product) => !("variantOf" in product) && !product.purchaseOnly && isSeasonallyPublicProduct(product),
  );
  const service = services.find((s) => page === `/services/${s.id}`);
  const project = projects.find((p) => page === `/work/${p.id}`);
  const product = customProducts.find((p) => page === `/shop/${p.id}`);
  const collection = customCollections.find((item) => page === `/shop/${item.id}`);
  const pages: Record<string, [string, string]> = {
    "/find-a-3d-model": ["Find a 3D Model to Print | Edmonton Printing Quotes", "Explore MakerWorld, Printables, Thingiverse and Cults3D, then send a model link to Custom Build Studio for a custom 3D printing quote in Edmonton."],
    "/shipping-returns": ["Shipping & Returns", "Canadian shipping rates shown before checkout, Edmonton pickup by appointment and 30-day unused standard-product returns. Read Custom Build Studio shop policies."],
    "/shop": [
      "Unique Gifts & Décor, Made in Edmonton",
      "Shop personalized photo gifts, collectible figurines, headphone stands, gaming accessories and seasonal décor made in Edmonton. Secure checkout and Canadian shipping.",
    ],
    "/shop/all": [
      "Shop All Gifts, Décor & Accessories Made in Edmonton",
      CHRISTMAS_PUBLIC_ENABLED
        ? "Browse every finished product from Custom Build Studio, including personalized photo gifts, holiday table lamps, Christmas décor, figurines and gaming accessories. Made in Edmonton."
        : HALLOWEEN_PUBLIC_ENABLED
          ? "Browse every finished product from Custom Build Studio, including personalized gifts, figurines, gaming accessories, home décor and wearable masks. Made in Edmonton."
          : "Browse every finished product from Custom Build Studio, including personalized photo gifts, figurines, gaming accessories and home décor. Made in Edmonton.",
    ],
    "/shop/sale": [
      "Current Shop Sale",
      "Explore current Custom Build Studio sale prices on finished gifts and décor made in Edmonton.",
    ],
    "/shop/halloween-special": [
      "Halloween Masks, Candy Bowls & Décor Made in Edmonton",
      "Shop locally made Halloween décor and wearable masks in Edmonton, including ghosts, pumpkin lighting and seasonal gifts, with free tracked Canadian shipping.",
    ],
    "/shop/christmas-special": [
      "Christmas Gifts Made in Edmonton — Holiday Table Lamps, Nativity Scenes & Ornaments",
      "Shop small-batch Christmas gifts made in Edmonton: glowing nativity table lamps, Christmas villages, spiral holiday trees, white-and-gold trinket trays and cute ornaments with free tracked Canadian shipping.",
    ],
    "/shop/cart": ["Your Cart", "Review your physical 3D-printed products."],
    "/shop/checkout": [
      "Checkout",
      "Continue your Gift & Decor order from Custom Build Studio.",
    ],
    "/shop/order": [
      "Private Order Confirmation",
      "Your private order status and payment instructions.",
    ],
    "/shop/admin": [
      "Order Administration",
      "Private studio order administration.",
    ],
    "/shop/photo": [
      "Private Personalization Photo",
      "Private customer-supplied production reference.",
    ],
    "/": [
      "3D Printing, CAD & 3D Scanning Edmonton",
      CHRISTMAS_PUBLIC_ENABLED
        ? "FDM and resin 3D printing, CAD design, 3D scanning, plus locally crafted Christmas gifts, personalized photo lamps and holiday décor made in Edmonton."
        : "FDM and resin 3D printing, CAD design, 3D scanning and locally crafted gifts and home décor made in Edmonton. Request a quote or shop online.",
    ],
    "/services": [
      "Design & Fabrication Services in Edmonton",
      "Explore custom FDM and resin 3D printing, CAD modeling, 3D scanning and reverse engineering services in Edmonton, Alberta.",
    ],
    "/work": [
      "Custom Fabrication Project Portfolio",
      "Explore real 3D printed parts, CAD-to-part projects and 3D scanning examples from Custom Build Studio in Edmonton.",
    ],
    "/about": [
      "An Edmonton Design & Fabrication Studio",
      "Meet Custom Build Studio: an owner-operated Edmonton studio connecting CAD design, 3D printing and scanning.",
    ],
    "/pricing": [
      "Custom 3D Printing, CAD & Scanning Pricing",
      "FDM printing from $20 CAD and resin printing from $30 CAD. Explore CAD and scanning rates in Edmonton. Final pricing confirmed per project.",
    ],
    "/products": [
      "Studio-Designed Products",
      "Explore studio-designed 3D printed accessories, including a MagSafe and Apple Watch charging stand. Contact us for availability and colours.",
    ],
    "/reviews": [
      "Customer Feedback",
      "Explore real work from Custom Build Studio and contact the Edmonton studio directly to discuss your project or share feedback.",
    ],
    "/contact": [
      "Request a Quote for Your Custom Project",
      "Send a sketch, photo, CAD file or idea for custom 3D printing, modeling or scanning in Edmonton. One-off projects welcome.",
    ],
    "/privacy": [
      "Privacy Information",
      "How Custom Build Studio uses project enquiries, contact details, file uploads and website analytics.",
    ],
    "/thank-you": [
      "Thank You",
      "Thank you for contacting Custom Build Studio about your custom project.",
    ],
  };
  const headphoneSeo = product && headphoneSearch.products[product.id as keyof typeof headphoneSearch.products];
  const maskSeo = product && maskSearch[product.id as keyof typeof maskSearch];
  const entry = product
    ? [product.seoTitle || product.titleSource ? searchTitle(product) : maskSeo?.title || headphoneSeo?.title || product.name, product.seoDescription || product.titleSource ? searchDescription(product) : maskSeo?.description || headphoneSeo?.description || searchDescription(product)]
    : collection
      ? [String(('seoTitle' in collection && collection.seoTitle) || (collection.id === "gifts-under-25" ? "Gifts $25 & Under Made in Edmonton" : `${collection.name} Made in Edmonton`)), collection.seoDescription]
    : service
      ? [serviceDetails[service.id].heading, service.description]
      : project
        ? [`${project.title} | Project Portfolio`, project.description]
        : (page.startsWith("/preview/christmas") ? ["The Christmas Edit · Owner Preview", "Review the unpublished Christmas collection from Custom Build Studio. Proposed prices; ordering is closed."] : pages[page]) || [
            "Page Not Found",
            "Find design and fabrication services at Custom Build Studio.",
          ];
  const collectionCoverProduct = collection
    ? activePublicProducts.find((item) => item.id === collection.coverProduct) ||
      collection.products.map((id) => activePublicProducts.find((item) => item.id === id)).find(Boolean) ||
      customProducts.find((item) => item.id === collection.coverProduct)
    : undefined;
  const isDynamicallyPublic = Boolean(
    (product && isSeasonallyPublicProduct(product)) ||
    (collection && (merchandising.hideOffSeasonProducts !== true || (CHRISTMAS_PUBLIC_ENABLED ? !["halloween", "masks-costumes"].includes(collection.id) : HALLOWEEN_PUBLIC_ENABLED ? collection.id !== "christmas" : !["halloween", "masks-costumes", "christmas"].includes(collection.id)))),
  );
  return {
    title: `${entry[0]} | Custom Build Studio`,
    description: entry[1],
    url: canonical(page),
    image: new URL((product?.images[0]?.src || collectionCoverProduct?.images[0]?.src || (page === "/shop/christmas-special" ? "/media/shop/endless-swirling-tree/owner-green-v3-0-1200.webp" : page === "/shop/halloween-special" ? "/media/shop/candlelight-pumpkins-table-lamp/1-1200.webp" : "/og-image.jpg")), business.origin).href,
    imageAlt: product?.images[0]?.alt || (collection ? `${collection.name} from Custom Build Studio` : page === "/shop/christmas-special" ? "Spiral Tabletop Christmas Tree from the Christmas Collection" : page === "/shop/halloween-special" ? "Candlelight Pumpkins Table Lamp from the Halloween Special" : "Custom Build Studio design and fabrication project"),
    noindex: (!publicRoutes.includes(page) && !isDynamicallyPublic) || page === "/privacy",
  };
}
export const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": business.origin + "/#business",
  name: business.name,
  url: business.origin,
  description:
    "Custom FDM and resin 3D printing, CAD design, 3D scanning, personalized photo lamps, Christmas gifts and finished home décor crafted in Edmonton, Alberta.",
  telephone: business.telephone,
  email: business.email,
  image: business.origin + "/og-image.jpg",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Edmonton",
    addressRegion: "AB",
    addressCountry: "CA",
  },
  areaServed: [
    { "@type": "City", name: "Edmonton" },
    { "@type": "Country", name: "Canada" },
  ],
  sameAs: [business.instagram, business.facebook, business.googleProfile],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Design, fabrication services & studio-crafted gifts",
    itemListElement: [
      ...services.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          url: business.origin + `/services/${s.id}/`,
        },
      })),
      ...(CHRISTMAS_PUBLIC_ENABLED
        ? [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "ProductCollection",
                name: "Christmas Gifts, Holiday Table Lamps & Ornaments Made in Edmonton",
                url: business.origin + "/shop/christmas-special/",
              },
            },
          ]
        : []),
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "ProductCollection",
          name: "Personalized Photo Lamps & Custom Gifts Made in Edmonton",
          url: business.origin + "/shop/personalized-gifts/",
        },
      },
    ],
  },
};

export function getStructuredData(
  path: string,
  livePrices: Record<string, number> = {},
  stock: StockRecord = {},
  inventoryEnabled = false,
  customProducts: typeof products = products,
  customCollections: typeof collections = collections,
) {
  const page = path.replace(/\/$/, "") || "/";
  const activePublicProducts = customProducts.filter(
    (product) => !("variantOf" in product) && !product.purchaseOnly && isSeasonallyPublicProduct(product),
  );
  const activeBrowsingProducts = activePublicProducts.filter(product => !("listingGroup" in product));
  const activeHalloweenIds = customCollections.find((collection) => collection.id === "halloween")?.products || [];
  const product = customProducts.find((item) => page === `/shop/${item.id}`);
  const collection = customCollections.find((item) => page === `/shop/${item.id}`);
  const halloweenSpecial = page === "/shop/halloween-special";
  if (product) {
    const variants = "variants" in product ? product.variants || [] : [];
    const item = (p: typeof product, url: string) => {
      const priceCents = Number.isInteger(livePrices[p.id])
        ? livePrices[p.id]
        : p.launchReady !== false && Number.isInteger(p.priceCents)
          ? p.priceCents
          : undefined;
      const availability = inventoryEnabled
        ? (stock[p.id] && !stock[p.id].unknown ? (stock[p.id].sellable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock") : "https://schema.org/InStock")
        : "https://schema.org/InStock";
      const offers = Number.isInteger(priceCents)
        ? {
            "@type": "Offer",
            url,
            priceCurrency: "CAD",
            price: (((priceCents as number)) / 100).toFixed(2),
            availability,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: business.name },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "CA",
              },
              shippingRate: {
                "@type": "MonetaryAmount",
                value: p.shippingPriceMode === "per-order" ? "5.00" : "0.00",
                currency: "CAD",
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 3,
                  unitCode: "DAY",
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 2,
                  maxValue: 7,
                  unitCode: "DAY",
                },
              },
            },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "CA",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 30,
              returnMethod: "https://schema.org/ReturnByMail",
            },
          }
        : undefined;
      return {
        "@type": "Product",
        name: p.name,
        sku: p.id,
        description: `${p.description} ${p.included} Made to order in Edmonton.`,
        brand: {
          "@type": "Brand",
          name: business.name,
        },
        image: p.images.map(image => new URL(image.src, business.origin).href),
        url,
        ...(p.searchKeywords?.length ? { keywords: p.searchKeywords.join(", ") } : {}),
        ...(offers ? { offers } : {}),
      };
    };
    return { "@context": "https://schema.org", "@graph": [
      variants.length ? {
        "@type": "ProductGroup", name: product.name, description: product.description,
        productGroupID: product.id, url: canonical(page),
        variesBy: [product.variantLabel === "Design" ? "https://schema.org/pattern" : "https://schema.org/size"],
        hasVariant: variants
          .map(variant => {
            const variantProduct = customProducts.find(p => p.id === variant.id);
            if (!variantProduct || !isSeasonallyPublicProduct(variantProduct)) return null;
            const variantUrl = "variantOf" in variantProduct && variantProduct.variantOf
              ? canonical(`/shop/${variantProduct.variantOf}`) + "?variant=" + variant.id
              : canonical(`/shop/${variantProduct.id}`);
            return {
              ...item(variantProduct, variantUrl),
              [product.variantLabel === "Design" ? "pattern" : "size"]: variant.label,
            };
          })
          .filter(Boolean),
      } : item(product, canonical(page)),
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
        { "@type": "ListItem", position: 2, name: "Shop", item: canonical("/shop") },
        { "@type": "ListItem", position: 3, name: product.name, item: canonical(page) },
      ] },
    ] };
  }
  const christmasSpecial = page === "/shop/christmas-special";
  if (page === "/shop" || page === "/shop/all" || collection || halloweenSpecial || christmasSpecial) {
    const baseListed = christmasSpecial
      ? (customCollections.find(c => c.id === "christmas")?.products.map((id) => activePublicProducts.find((product) => product.id === id)).filter(Boolean) || [])
      : halloweenSpecial
      ? activeHalloweenIds.map((id) => activePublicProducts.find((product) => product.id === id)).filter(Boolean)
      : collection
      ? collection.products.map((id) => activePublicProducts.find((product) => product.id === id)).filter(Boolean)
      : activeBrowsingProducts;
    const isChristmasHub = christmasSpecial || collection?.id === "christmas";
    const listedProducts = isChristmasHub
      ? [...new Map(
          baseListed.flatMap(entry => {
            if (!entry) return [];
            const childEntries = ("groupedDesigns" in entry && Array.isArray(entry.groupedDesigns))
              ? entry.groupedDesigns.map(d => activePublicProducts.find(p => p.id === d.id)).filter(Boolean)
              : [];
            return childEntries.length ? childEntries : [entry];
          }).map(entry => [entry!.id, entry!])
        ).values()]
      : baseListed;
    const faqEntries = isChristmasHub
      ? christmasFaqs
      : collection?.id === "headphone-stands"
        ? headphoneSearch.faqs
        : null;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: christmasSpecial ? "Christmas Gifts & Holiday Décor Made in Edmonton" : halloweenSpecial ? "Halloween Special" : collection?.name || (page === "/shop/all" ? "Shop All Products" : "Unique Gifts & Décor, Made in Edmonton"),
          description: (christmasSpecial || halloweenSpecial) ? getSeo(page).description : collection?.seoDescription || getSeo("/shop").description,
          url: canonical(page),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: listedProducts.length,
            itemListElement: listedProducts.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item!.name,
              url: canonical(`/shop/${item!.id}`),
            })),
          },
        },
        ...(faqEntries?.length
          ? [
              {
                "@type": "FAQPage",
                mainEntity: faqEntries.map(([question, answer]) => ({
                  "@type": "Question",
                  name: question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: answer,
                  },
                })),
              },
            ]
          : []),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
            { "@type": "ListItem", position: 2, name: "Shop", item: canonical("/shop") },
            ...(collection || halloweenSpecial || christmasSpecial || page === "/shop/all" ? [{ "@type": "ListItem", position: 3, name: christmasSpecial ? "Christmas Special" : halloweenSpecial ? "Halloween Special" : collection?.name || "Shop All Products", item: canonical(page) }] : []),
          ],
        },
      ],
    };
  }
  const service = services.find((s) => page === `/services/${s.id}`);
  if (!service) {
    if (page === "/") {
      return {
        "@context": "https://schema.org",
        "@graph": [
          localBusiness,
          {
            "@type": "WebSite",
            "@id": business.origin + "/#website",
            url: business.origin,
            name: business.name,
            potentialAction: {
              "@type": "SearchAction",
              target: `${business.origin}/shop/all?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ],
      };
    }
    return localBusiness;
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      localBusiness,
      {
        "@type": "Service",
        "@id": business.origin + page + "#service",
        name: serviceDetails[service.id].heading,
        description: service.intro,
        url: business.origin + page,
        provider: { "@id": business.origin + "/#business" },
        areaServed: { "@type": "City", name: "Edmonton" },
        serviceType: service.name,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: business.origin + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Services",
            item: business.origin + "/services",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: service.name,
            item: business.origin + page,
          },
        ],
      },
    ],
  };
}
