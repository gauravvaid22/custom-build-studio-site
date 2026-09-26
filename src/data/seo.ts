import { allServices as services, serviceDetails } from "./landing";
import projects from "./projects.json";
import { business } from "./business";
import products from "../../commerce/products.json";
import collections from "../../commerce/collections.json";
const publicProducts = products.filter((product) => !("variantOf" in product));
const halloweenSpecialIds = ["candlelight-pumpkins-table-lamp", "ghost-on-a-swing", "skull-web-trinket-dish", "ghost-duo-trinket-dish"];
const canonical = (path: string) => business.origin + (path === "/" ? "/" : path.replace(/\/$/, "") + "/");
export const publicRoutes = [
  "/",
  "/services",
  ...services.map((s) => `/services/${s.id}`),
  "/work",
  ...projects.map((p) => `/work/${p.id}`),
  "/about",
  "/pricing",
  "/products",
  "/shop",
  "/shop/halloween-special",
  ...collections.map((collection) => `/shop/${collection.id}`),
  ...publicProducts.map((product) => `/shop/${product.id}`),
  "/reviews",
  "/contact",
  "/privacy",
];
export function getSeo(path: string) {
  const page = path.replace(/\/$/, "") || "/";
  const service = services.find((s) => page === `/services/${s.id}`);
  const project = projects.find((p) => page === `/work/${p.id}`);
  const product = products.find((p) => page === `/shop/${p.id}`);
  const collection = collections.find((item) => page === `/shop/${item.id}`);
  const pages: Record<string, [string, string]> = {
    "/shop": [
      "Unique Gifts & Décor, Made in Edmonton",
      "Discover locally made 3D-printed gifts, creatures, dice towers, planters and seasonal pieces with secure Shopify checkout and tracked Canadian shipping.",
    ],
    "/shop/halloween-special": [
      "Halloween Special: 3D-Printed Décor in Edmonton",
      "Shop four new locally made Halloween pieces: a pumpkin table lamp, swinging ghost and sculptural trinket dishes. Secure Shopify checkout and Canadian shipping.",
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
    "/": [
      "3D Printing, CAD & CNC Woodworking Edmonton",
      "FDM and resin 3D printing, CAD design, 3D scanning and CNC woodworking in Edmonton. One-off projects, prototypes and small runs. Request a quote.",
    ],
    "/services": [
      "Design & Fabrication Services in Edmonton",
      "Explore custom FDM and resin 3D printing, CAD modeling, 3D scanning, reverse engineering and CNC router services in Edmonton, Alberta.",
    ],
    "/work": [
      "Custom Fabrication Project Portfolio",
      "Explore real 3D printed parts, CAD-to-part projects and 3D scanning examples from Custom Build Studio in Edmonton.",
    ],
    "/about": [
      "An Edmonton Design & Fabrication Studio",
      "Meet Custom Build Studio: an owner-operated Edmonton studio connecting CAD design, 3D printing, scanning and CNC woodworking.",
    ],
    "/pricing": [
      "Custom 3D Printing & CNC Project Pricing",
      "FDM printing from $20 CAD and resin printing from $30 CAD. Explore CAD, scanning and CNC woodworking rates in Edmonton. Final pricing confirmed per project.",
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
      "Send a sketch, photo, CAD file or idea for custom 3D printing, modeling, scanning or CNC woodworking in Edmonton. One-off projects welcome.",
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
  const entry = product
    ? [product.name, `${product.description} Made in Edmonton with tracked Canadian shipping.`]
    : collection
      ? [collection.name === "Gifts Under $25" ? "3D-Printed Gifts Under $25 in Edmonton" : `${collection.name} Made in Edmonton`, collection.seoDescription]
    : service
      ? [serviceDetails[service.id].heading, service.description]
      : project
        ? [`${project.title} | Project Portfolio`, project.description]
        : pages[page] || [
            "Page Not Found",
            "Find design and fabrication services at Custom Build Studio.",
          ];
  return {
    title: `${entry[0]} | Custom Build Studio`,
    description: entry[1],
    url: canonical(page),
    image: business.origin + (product?.images[0]?.src || (collection ? products.find((item) => item.id === collection.coverProduct)?.images[0]?.src : undefined) || (page === "/shop/halloween-special" ? "/media/shop/candlelight-pumpkins-table-lamp/1-1200.webp" : "/og-image.jpg")),
    imageAlt: product?.images[0]?.alt || (collection ? `${collection.name} from Custom Build Studio` : page === "/shop/halloween-special" ? "Candlelight Pumpkins Table Lamp from the Halloween Special" : "Custom Build Studio design and fabrication project"),
    noindex: !publicRoutes.includes(page) || page === "/privacy",
  };
}
export const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": business.origin + "/#business",
  name: business.name,
  url: business.origin,
  description:
    "Custom FDM and resin 3D printing, CAD design, 3D scanning, reverse engineering and CNC woodworking in Edmonton, Alberta.",
  telephone: business.telephone,
  email: business.email,
  image: business.origin + "/og-image.jpg",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Edmonton",
    addressRegion: "AB",
    addressCountry: "CA",
  },
  areaServed: { "@type": "City", name: "Edmonton" },
  sameAs: [business.instagram, business.facebook, business.googleProfile],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Design and fabrication services",
    itemListElement: services.map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.name,
        url: business.origin + `/services/${s.id}`,
      },
    })),
  },
};

export function getStructuredData(path: string) {
  const page = path.replace(/\/$/, "") || "/";
  const product = products.find((item) => page === `/shop/${item.id}`);
  const collection = collections.find((item) => page === `/shop/${item.id}`);
  const halloweenSpecial = page === "/shop/halloween-special";
  if (product) {
    const variants = "variants" in product ? product.variants || [] : [];
    const item = (p: typeof product, url: string) => ({
      "@type": "Product", name: p.name, sku: p.id,
      description: `${p.description} ${p.included} Made to order in Edmonton.`,
      image: p.images.map(image => business.origin + image.src),
      url,
      offers: { "@type": "Offer", url, priceCurrency: "CAD", price: (p.priceCents / 100).toFixed(2),
        // Available to order; production starts after manual payment verification.
        availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: business.name } },
    });
    return { "@context": "https://schema.org", "@graph": [
      variants.length ? {
        "@type": "ProductGroup", name: product.name, description: product.description,
        productGroupID: product.id, url: canonical(page),
        variesBy: [product.id === "mood-ghost" ? "https://schema.org/pattern" : "https://schema.org/size"],
        hasVariant: variants.map(variant => ({
          ...item(products.find(p => p.id === variant.id)!, canonical(page) + "?variant=" + variant.id),
          [product.id === "mood-ghost" ? "pattern" : "size"]: variant.label,
        })),
      } : item(product, canonical(page)),
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
        { "@type": "ListItem", position: 2, name: "Gifts & Décor", item: canonical("/shop") },
        { "@type": "ListItem", position: 3, name: product.name, item: canonical(page) },
      ] },
    ] };
  }
  if (page === "/shop" || collection || halloweenSpecial) {
    const listedProducts = halloweenSpecial
      ? halloweenSpecialIds.map((id) => publicProducts.find((product) => product.id === id)).filter(Boolean)
      : collection
      ? collection.products.map((id) => publicProducts.find((product) => product.id === id)).filter(Boolean)
      : publicProducts;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: halloweenSpecial ? "Halloween Special" : collection?.name || "Unique Gifts & Décor, Made in Edmonton",
          description: halloweenSpecial ? getSeo(page).description : collection?.seoDescription || getSeo("/shop").description,
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
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
            { "@type": "ListItem", position: 2, name: "Gifts & Décor", item: canonical("/shop") },
            ...(collection || halloweenSpecial ? [{ "@type": "ListItem", position: 3, name: halloweenSpecial ? "Halloween Special" : collection!.name, item: canonical(page) }] : []),
          ],
        },
      ],
    };
  }
  const service = services.find((s) => page === `/services/${s.id}`);
  if (!service) return localBusiness;
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
