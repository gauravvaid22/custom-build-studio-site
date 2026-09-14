import { services } from "./services";
import projects from "./projects.json";
import { business } from "./business";
export const publicRoutes = [
  "/",
  "/services",
  ...services.map((s) => `/services/${s.id}`),
  "/work",
  ...projects.map((p) => `/work/${p.id}`),
  "/about",
  "/pricing",
  "/products",
  "/reviews",
  "/contact",
  "/privacy",
];
export function getSeo(path: string) {
  const page = path.replace(/\/$/, "") || "/";
  const service = services.find((s) => page === `/services/${s.id}`);
  const project = projects.find((p) => page === `/work/${p.id}`);
  const pages: Record<string, [string, string]> = {
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
  const entry = service
    ? [`${service.name} in Edmonton`, service.intro]
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
    image: business.origin + "/og-image.jpg",
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
