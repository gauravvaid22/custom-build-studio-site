import { createService } from "./shop-sale.mjs";

// Netlify runs scheduled functions only for the published production deploy.
export const config = { schedule: "*/10 * * * *" };

export default async function shopSaleSchedule(_request, context) {
  const result = await createService(context).runSchedule();
  if (["needs-attention", "schedule-error"].includes(result.status)) {
    console.error("Shop sale schedule needs attention:", result.error || result.status);
  } else {
    console.log("Shop sale schedule:", result.status);
  }
}
