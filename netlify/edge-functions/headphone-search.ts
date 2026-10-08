// Enrich the same page served to shoppers and search engines with verified Shopify offers.
export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const response = await context.next();
  if (request.method !== "GET" || !response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
  const url = new URL(request.url);
  const id = url.pathname.split("/").filter(Boolean).at(-1);
  try {
    const endpoint = new URL("/.netlify/functions/shop-discovery", url.origin);
    endpoint.searchParams.set("id", id || "");
    const dataResponse = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
    if (!dataResponse.ok) return response;
    const data = await dataResponse.json();
    const html = await response.text();
    const schema = JSON.stringify(data.schema).replace(/</g, "\\u003c");
    const enhanced = html.replace(/(<script id="structured-data" type="application\/ld\+json">)[\s\S]*?(<\/script>)/, (_, start, end) => start + schema + end)
      .replace(/(<p class="shop-price">)[\s\S]*?(<\/p>)/, (_, start, end) => `${start}$${data.price} <span>CAD</span>${end}`);
    const headers = new Headers(response.headers);
    headers.delete("content-length"); headers.delete("etag");
    headers.set("Cache-Control", "public, max-age=60, must-revalidate");
    return new Response(enhanced, { status: response.status, headers });
  } catch { return response; }
};
export const config = { path: [
  "/shop/flow-stand-headphone-and-phone-holder/*",
  "/shop/curve-caddy-headphone-holder/*",
  "/shop/ring-dock-headphone-holder/*",
  "/shop/block-hub-headphone-and-phone-holder/*",
  "/shop/tower-trio-headphone-and-phone-holder/*",
  "/shop/arch-stand-headphone-holder/*",
] };
