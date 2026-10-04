import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const MAX_CUSTOMER_BYTES = 25 * 1024 * 1024;
const MAX_SHOWCASE_BYTES = 4 * 1024 * 1024;
const CHUNK_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
const digest = (value) => createHash("sha256").update(value).digest("hex");
const equal = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const safeName = (value) =>
  String(value || "photo")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .slice(0, 120) || "photo";

export default async (request, context) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "manifest";
  const deployContext = context?.deploy?.context || process.env.CONTEXT;
  const production = deployContext === "production";
  const store = getStore({
    name: production
      ? "shop-product-media-v1"
      : `shop-product-media-preview-${context?.deploy?.id || process.env.DEPLOY_ID || "local"}`,
    consistency: "strong",
  });
  const adminKey = process.env.SHOP_ADMIN_KEY || "";
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  const admin = adminKey.length >= 24 && equal(bearer, adminKey);
  const sameOrigin = request.headers.get("origin") === url.origin;
  const id = url.searchParams.get("id") || "";
  const token = url.searchParams.get("token") || request.headers.get("x-upload-token") || "";
  const manifestKey = `upload/${id}/manifest`;

  try {
    if (request.method === "POST" && action === "start") {
      if (!sameOrigin) return json({ error: "Request origin not allowed." }, 403);
      const body = await request.json();
      const purpose = body?.purpose === "showcase" ? "showcase" : "customer-photo";
      if (purpose === "showcase" && !admin)
        return json({ error: "Administrator authentication required." }, 401);
      const size = Number(body?.size);
      const type = String(body?.type || "").toLowerCase();
      const maximum = purpose === "showcase" ? MAX_SHOWCASE_BYTES : MAX_CUSTOMER_BYTES;
      if (!Number.isInteger(size) || size < 1 || size > maximum)
        return json({ error: `Choose an image no larger than ${maximum / 1024 / 1024} MB.` }, 400);
      if (!ALLOWED_TYPES.has(type))
        return json({ error: "Use a JPG, PNG, WebP or HEIC image." }, 400);
      const ip = request.headers.get("x-nf-client-connection-ip") || "local";
      if (!admin) {
        const window = Math.floor(Date.now() / 3600000);
        const rateKey = `rate/${digest(ip).slice(0, 24)}/${window}`;
        const found = await store.getWithMetadata(rateKey, { type: "json", consistency: "strong" });
        const count = Number(found?.data?.count || 0);
        if (count >= 10) return json({ error: "Too many uploads. Please try again later." }, 429);
        await store.setJSON(rateKey, { count: count + 1 }, found ? { onlyIfMatch: found.etag } : { onlyIfNew: true });
      }
      const uploadId = randomUUID();
      const uploadToken = randomBytes(24).toString("hex");
      const parts = Math.ceil(size / CHUNK_BYTES);
      await store.setJSON(`upload/${uploadId}/manifest`, {
        id: uploadId,
        tokenHash: digest(uploadToken),
        name: safeName(body.name),
        type,
        size,
        parts,
        purpose,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      return json({ id: uploadId, token: uploadToken, chunkBytes: CHUNK_BYTES, parts });
    }

    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Upload not found." }, 404);
    const found = await store.getWithMetadata(manifestKey, { type: "json", consistency: "strong" });
    const manifest = found?.data;
    if (!manifest || (!admin && !equal(manifest.tokenHash, digest(token))))
      return json({ error: "Upload not found." }, 404);

    if (request.method === "POST" && action === "chunk") {
      if (!sameOrigin) return json({ error: "Request origin not allowed." }, 403);
      const index = Number(url.searchParams.get("index"));
      if (!Number.isInteger(index) || index < 0 || index >= manifest.parts)
        return json({ error: "Invalid upload part." }, 400);
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > CHUNK_BYTES)
        return json({ error: "Upload part is too large." }, 413);
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > CHUNK_BYTES)
        return json({ error: "Upload part is empty or too large." }, 400);
      await store.set(`upload/${id}/part-${index}`, bytes, {
        metadata: { type: manifest.type, index },
      });
      return json({ received: index });
    }

    if (request.method === "POST" && action === "complete") {
      if (!sameOrigin) return json({ error: "Request origin not allowed." }, 403);
      const listed = await store.list({ prefix: `upload/${id}/part-` });
      if (listed.blobs.length !== manifest.parts)
        return json({ error: "Upload is incomplete. Please retry." }, 409);
      const complete = { ...manifest, completed: true, completedAt: new Date().toISOString() };
      await store.setJSON(manifestKey, complete, { onlyIfMatch: found.etag });
      const base = `/.netlify/functions/shop-media?id=${id}&token=${token}`;
      return json({
        id,
        name: manifest.name,
        purpose: manifest.purpose,
        referenceUrl: manifest.purpose === "showcase" ? `${base}&action=asset` : `/shop/photo?id=${id}&token=${token}`,
        manifestUrl: `${base}&action=manifest`,
      });
    }

    if (request.method === "GET" && action === "manifest") {
      if (!manifest.completed) return json({ error: "Upload is incomplete." }, 409);
      return json({ id, name: manifest.name, type: manifest.type, size: manifest.size, parts: manifest.parts, purpose: manifest.purpose });
    }

    if (request.method === "GET" && action === "chunk") {
      if (!manifest.completed) return json({ error: "Upload is incomplete." }, 409);
      const index = Number(url.searchParams.get("index"));
      if (!Number.isInteger(index) || index < 0 || index >= manifest.parts)
        return json({ error: "Invalid upload part." }, 400);
      const bytes = await store.get(`upload/${id}/part-${index}`, { type: "arrayBuffer", consistency: "strong" });
      if (!bytes) return json({ error: "Upload part not found." }, 404);
      return new Response(bytes, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }

    if (request.method === "GET" && action === "asset") {
      if (!manifest.completed || manifest.purpose !== "showcase" || manifest.parts !== 1)
        return json({ error: "Image not found." }, 404);
      const bytes = await store.get(`upload/${id}/part-0`, { type: "arrayBuffer", consistency: "strong" });
      if (!bytes) return json({ error: "Image not found." }, 404);
      return new Response(bytes, { headers: { "Content-Type": manifest.type, "Content-Disposition": "inline", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
    }

    if (request.method === "DELETE" && action === "delete") {
      if (!sameOrigin || !admin) return json({ error: "Administrator authentication required." }, 401);
      for (let index = 0; index < manifest.parts; index++)
        await store.delete(`upload/${id}/part-${index}`);
      await store.delete(manifestKey);
      return json({ deleted: true });
    }

    return json({ error: "Not found." }, 404);
  } catch {
    return json({ error: "The image service is temporarily unavailable. Please try again." }, 503);
  }
};

export const config = {
  path: "/.netlify/functions/shop-media",
  rateLimit: { windowSize: 60, windowLimit: 80, aggregateBy: ["domain", "ip"] },
};
