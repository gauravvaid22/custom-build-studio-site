import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  render,
  publicRoutes,
  getSeo,
  getStructuredData,
} from "../.prerender/entry-server.js";

const template = await readFile("dist/index.html", "utf8");
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const preview = process.env.CONTEXT && process.env.CONTEXT !== "production";
for (const route of [...publicRoutes, "/thank-you", "/404", "/shop/cart", "/shop/checkout", "/shop/order", "/shop/admin"]) {
  const seo = getSeo(route);
  const head = `<title>${escape(seo.title)}</title>
<meta name="build-context" content="${preview ? "preview" : "production"}" />
<meta name="description" content="${escape(seo.description)}" />
<meta name="robots" content="${preview || seo.noindex ? "noindex,follow" : "index,follow"}" />
<link rel="canonical" href="${escape(seo.url)}" />
<meta property="og:type" content="website" /><meta property="og:site_name" content="Custom Build Studio" /><meta property="og:locale" content="en_CA" />
<meta property="og:title" content="${escape(seo.title)}" /><meta property="og:description" content="${escape(seo.description)}" /><meta property="og:url" content="${escape(seo.url)}" />
<meta property="og:image" content="${escape(seo.image)}" /><meta property="og:image:alt" content="${escape(seo.imageAlt)}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escape(seo.title)}" /><meta name="twitter:description" content="${escape(seo.description)}" /><meta name="twitter:image" content="${escape(seo.image)}" />
<script id="structured-data" type="application/ld+json">${JSON.stringify(getStructuredData(route)).replace(/</g, "\\u003c")}</script>`;
  const path =
    route === "/"
      ? "dist/index.html"
      : route === "/404"
        ? "dist/404.html"
        : `dist${route}/index.html`;
  await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await writeFile(
    path,
    template
      .replace(/<title>.*?<\/title>/, head)
      .replace("<!--app-html-->", render(route)),
  );
}
const routes = publicRoutes.filter((route) => !getSeo(route).noindex);
const catalog = JSON.parse(await readFile("commerce/products.json", "utf8"));
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${routes.map((route) => {
    const product = catalog.find(p => route === `/shop/${p.id}`);
    const images = (product?.images || []).map(image => `<image:image><image:loc>${escape(new URL(image.src, getSeo(route).url).href)}</image:loc></image:image>`).join("");
    return `<url><loc>${escape(getSeo(route).url)}</loc>${images}</url>`;
  }).join("")}</urlset>\n`,
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\n${preview ? "Disallow: /" : "Allow: /\nSitemap: https://custombuildstudio.ca/sitemap.xml"}\n`,
);
// Only client assets and generated HTML are deployed; the SSR intermediate is never published.
console.log(
  `Prerendered ${publicRoutes.length + 6} pages with route-specific metadata and a crawlable sitemap.`,
);
