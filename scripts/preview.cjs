// Local static preview of the exact Netlify publish directory. Never accepts form submissions.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve("dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
http
  .createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Form submissions require Netlify hosting.");
      return;
    }
    let url;
    try {
      url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (url === "/thank-you.html") {
      res.writeHead(301, { Location: "/thank-you" });
      res.end();
      return;
    }
    let file = path.resolve(root, "." + url);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    let status = 200;
    if (!fs.existsSync(file)) {
      status = 404;
      file = path.join(root, "404.html");
    }
    res.writeHead(status, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(file).pipe(res);
  })
  .listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log(
      `Production preview: http://127.0.0.1:${process.env.PORT || 4173}/`,
    ),
  );
