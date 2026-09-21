import { settings, ShopError } from "./core.mjs";
export function handler(shop) {
  return async (request) => {
    const url = new URL(request.url),
      action = url.searchParams.get("action") || "config";
    const response = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    try {
      if (request.method === "GET" && action === "config")
        return response({
          settings,
          ready: shop.ready,
          setupChecks: shop.setupChecks,
          testMode: shop.testMode,
        });
      if (request.method !== "POST")
        return response({ error: "Method not allowed" }, 405);
      if (request.headers.get("origin") !== url.origin)
        return response({ error: "Request origin not allowed" }, 403);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return response({ error: "JSON required" }, 415);
      if (Number(request.headers.get("content-length")) > 16000)
        return response({ error: "Request too large" }, 413);
      const raw = await request.text();
      if (raw.length > 16000)
        return response({ error: "Request too large" }, 413);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return response({ error: "Invalid request" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return response({ error: "Invalid request" }, 400);
      await shop.rateLimit(
        request.headers.get("x-nf-client-connection-ip") || "local",
      );
      if (action === "create")
        return response(
          await shop.create(body, request.headers.get("Idempotency-Key")),
          201,
        );
      if (action === "lookup")
        return response({ order: await shop.lookup(body.key) });
      shop.authorize(
        (request.headers.get("authorization") || "").replace(/^Bearer /, ""),
      );
      if (action === "list") return response({ orders: await shop.list() });
      if (action === "retry-email") {
        await shop.notifyOwner(body.id);
        return response({orders: await shop.list()});
      }
      if (action === "update")
        return response({
          order: await shop.update(
            body.id,
            body.revision,
            body.action,
            body.note,
          ),
        });
      return response({ error: "Not found" }, 404);
    } catch (error) {
      return response(
        {
          error:
            error instanceof ShopError
              ? error.message
              : "Unable to save or load your order. Please retry with the same checkout, or contact the studio.",
        },
        error instanceof ShopError ? error.status : 503,
      );
    }
  };
}
