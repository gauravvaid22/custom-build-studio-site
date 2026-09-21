import { getStore } from "@netlify/blobs";
import { createShop } from "../../commerce/core.mjs";
import { handler } from "../../commerce/http.mjs";
import { resendMailer } from "../../commerce/notifications.mjs";
export default async (request, context) => {
  // Preview deploys never share orders or payment instructions with production.
  const deployContext = context?.deploy?.context || process.env.CONTEXT;
  const production = deployContext === "production";
  const testMode = ["deploy-preview", "branch-deploy", "dev"].includes(deployContext);
  const name = production
    ? "shop-orders-v1"
    : `shop-preview-${context?.deploy?.id || process.env.DEPLOY_ID || "local"}`;
  const blobs = getStore({ name, consistency: "strong" });
  const store = {
    get: (key) =>
      blobs.getWithMetadata(key, { type: "json", consistency: "strong" }),
    put: (key, data, conditions) => blobs.setJSON(key, data, conditions),
    list: async (prefix) =>
      (await blobs.list({ prefix })).blobs.map((blob) => blob.key),
  };
  return handler(
    createShop({
      store,
      testMode,
      enabled: production && process.env.SHOP_LIVE_ENABLED === "true",
      adminKey: process.env.SHOP_ADMIN_KEY || "",
      mailer: production ? resendMailer({apiKey: process.env.RESEND_API_KEY, from: process.env.SHOP_EMAIL_FROM}) : null,
    }),
  )(request);
};
