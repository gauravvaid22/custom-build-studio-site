const shop = "aqk73w-k2.myshopify.com";
const endpoint = `https://${shop}/admin/api/2026-07/graphql.json`;

export function createShopifyAdmin({ legacyToken = "", clientId = "", clientSecret = "", fetcher = fetch, now = () => Date.now() } = {}) {
  if (!legacyToken && !(clientId && clientSecret)) return null;
  let cached = null;
  let expiresAt = 0;
  async function token() {
    if (legacyToken) return legacyToken;
    if (cached && now() < expiresAt - 60000) return cached;
    const response = await fetcher(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token || !Number.isFinite(Number(payload.expires_in)))
      throw new Error("Shopify Admin authentication failed. Check the private app credentials in Netlify.");
    cached = payload.access_token;
    expiresAt = now() + Number(payload.expires_in) * 1000;
    return cached;
  }
  async function call(query, variables = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const accessToken = await token();
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 401 && !legacyToken && attempt === 0) { cached = null; continue; }
      const payload = await response.json();
      if (!response.ok || payload.errors?.length || !payload.data)
        throw new Error(payload.errors?.map((error) => error.message).join("; ") || "Shopify Admin API is unavailable.");
      return payload.data;
    }
    throw new Error("Shopify Admin authentication failed.");
  }
  return { call };
}
