import { readFile, mkdir, writeFile } from "node:fs/promises";
const id = process.env.VITE_GA_MEASUREMENT_ID?.trim();
if (!/^G-[A-Z0-9]+$/.test(id || "")) throw new Error("Set VITE_GA_MEASUREMENT_ID to your verified GA4 web stream ID.");
const template = await readFile("commerce/checkout-analytics.pixel.js", "utf8");
await mkdir(".tmp", { recursive: true });
await writeFile(".tmp/checkout-analytics.pixel.js", template.replace("__GA_MEASUREMENT_ID__", id));
console.log("Checkout pixel prepared at .tmp/checkout-analytics.pixel.js (outside public assets).");
