import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { sqliteStore } from "../commerce/sqlite-store.mjs";
import { createShop } from "../commerce/core.mjs";
import { handler } from "../commerce/http.mjs";
const root = resolve("dist"),
  privateRoot = resolve("../private-production/shop-preview");
await mkdir(privateRoot, { recursive: true });
const keyPath = resolve(privateRoot, "admin-key.txt");
let key;
try {
  key = (await readFile(keyPath, "utf8")).trim();
} catch {
  key = randomBytes(32).toString("hex");
  await (await import("node:fs/promises")).writeFile(keyPath, key);
}
const shop = createShop({
  store: sqliteStore(resolve(privateRoot, "orders.sqlite")),
  testMode: true,
  adminKey: key,
});
const api = handler(shop),
  port = Number(process.env.PORT || 4180);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/.netlify/functions/shop") {
      let data = "";
      for await (const chunk of req) {
        data += chunk;
        if (data.length > 16000) {
          res.writeHead(413);
          res.end();
          return;
        }
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers))
        if (value)
          headers.set(name, Array.isArray(value) ? value.join(",") : value);
      const result = await api(
        new Request(url, {
          method: req.method,
          headers,
          ...(!["GET", "HEAD"].includes(req.method) ? { body: data } : {}),
        }),
      );
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(await result.text());
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let file = resolve(root, "." + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let status = 200;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      await stat(file);
    } catch {
      file = resolve(root, "404.html");
      status = 404;
    }
    const type =
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".xml": "application/xml",
        ".txt": "text/plain",
      }[extname(file)] || "application/octet-stream";
    res.writeHead(status, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    });
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("Preview server error");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `TEST SHOP: http://127.0.0.1:${port}/shop\nAdmin key is stored privately at ${keyPath}\nOrders persist in SQLite outside the repository. No payments or messages are sent.`,
  ),
);
