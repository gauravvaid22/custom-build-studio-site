import { allServices as services, serviceDetails } from "./landing";
import projects from "./projects.json";
import { business } from "./business";
import products from "../../commerce/products.json";
const publicProducts = products.filter((product) => !("variantOf" in product));
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
  const pages: Record<string, [string, string]> = {
    "/shop": [
      "3D-Printed Gifts in Edmonton",
      "Discover locally made 3D-printed gifts, creatures, dice towers, planters and seasonal pieces. Physical prints with Edmonton pickup and local delivery.",
    ],
    "/shop/cart": ["Your Cart", "Review your physical 3D-printed products."],
    "/shop/checkout": [
      "Checkout",
      "Place an order for physical prints with manual e-Transfer payment.",
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
    ? [`${product.name} | Edmonton Printed Gifts`, product.description]
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
    url: business.origin + (page === "/" ? "/" : page),
    image: business.origin + (product?.images[0]?.src || "/og-image.jpg"),
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
  if (product)
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: `${product.description} ${product.included} Finished physical print; no digital download.`,
      url: business.origin + page,
      image: product.images.map((image) => business.origin + image.src),
      // Provisional prices are intentionally omitted from merchant offers until reviewed.
    };
  if (page === "/shop")
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "3D-Printed Gifts in Edmonton",
      url: business.origin + page,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: publicProducts.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          url: business.origin + `/shop/${item.id}`,
        })),
      },
    };
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
