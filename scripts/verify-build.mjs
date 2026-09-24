import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import assert from "node:assert/strict";

const root = resolve("dist");
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}
const htmlFiles = (await walk(root)).filter(
  (path) => extname(path) === ".html",
);
assert.equal(htmlFiles.length, 51, "Expected all 51 prerendered routes");
const titles = new Set();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `One H1: ${file}`);
  assert(html.includes('name="description"'), `Description: ${file}`);
  assert(html.includes('property="og:image"'), `Open Graph: ${file}`);
  assert(html.includes('rel="canonical"'), `Canonical: ${file}`);
  assert(html.includes("application/ld+json"), `Structured data: ${file}`);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert(!titles.has(title), `Duplicate title: ${file}`);
  titles.add(title);
  for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]*)/g)) {
    const url = match[1];
    if (url === "/") continue;
    const target = join(root, decodeURIComponent(url));
    try {
      const info = await stat(target);
      if (info.isDirectory()) await stat(join(target, "index.html"));
    } catch {
      assert.fail(`Broken reference ${url} in ${file}`);
    }
  }
  assert(!/href="#"/.test(html), `Placeholder link: ${file}`);
}
const contact = await readFile(join(root, "contact/index.html"), "utf8");
for (const field of [
  "form-name",
  "name",
  "email",
  "phone",
  "service",
  "message",
  "quantity",
  "material",
  "deadline",
  "location",
  "file-link",
  "notes",
  "subject",
  "bot-field",
  ...Array.from({ length: 5 }, (_, i) => `file_${i + 1}`),
])
  assert(
    contact.includes(`name="${field}"`),
    `Netlify schema missing ${field}`,
  );
assert(contact.includes('data-netlify="true"'));
assert(contact.includes('data-netlify-honeypot="bot-field"'));
assert(contact.includes('encType="multipart/form-data"'));
assert(
  (await readFile(join(root, "404.html"), "utf8")).includes("noindex,follow"),
);
assert(
  (await readFile(join(root, "thank-you/index.html"), "utf8")).includes(
    "noindex,follow",
  ),
);
console.log(
  `Verified ${htmlFiles.length} HTML pages, internal links, images, metadata, 404 and Netlify form schema.`,
);
