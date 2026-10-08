import { fetchDiscoveryCatalog, merchantFeed, discoverySchema } from "../../commerce/search-discovery.mjs";

let cached;
let expires = 0;
let pending;
async function catalog() {
  if (cached && expires > Date.now()) return cached;
  if (!pending) pending = fetchDiscoveryCatalog(process.env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim()).then(data => {
    cached = data; expires = Date.now() + 60000; return data;
  }).finally(() => { pending = null; });
  return pending;
}
export default async request => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(request.url);
  try {
    const data = await catalog();
    const headers = { "Cache-Control": "public, max-age=60, must-revalidate", "X-Content-Type-Options": "nosniff" };
    if (["/google-headphones.xml", "/google-products.xml"].includes(url.pathname) || url.searchParams.get("format") === "xml") return new Response(merchantFeed(data), { headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" } });
    const product = data.find(p => p.id === url.searchParams.get("id"));
    if (!product) return new Response("Not found", { status: 404 });
    const selected = product.liveVariants.find(v => v.id === url.searchParams.get("variant")) || product.liveVariants[0];
    return Response.json({ schema: discoverySchema(product), price: selected.livePrice }, { headers });
  } catch {
    return new Response("Product data temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};
