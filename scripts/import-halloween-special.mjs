import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[2] || process.env.HALLOWEEN_PRODUCT_SOURCE;
if (!sourceRoot) {
  throw new Error(
    "Pass the WEBSITE PRODUCT folder as the first argument or set HALLOWEEN_PRODUCT_SOURCE.",
  );
}

const definitions = [
  {
    id: "skull-web-trinket-dish",
    folder: "SKULL WEB - TRINKET DISH",
    mediaFolder: "skull-web-trinket-dish-media-package",
    imagePattern: /^Skull_Web_Trinket_Dish[1-5]_.*\.png$/i,
  },
  {
    id: "ghost-on-a-swing",
    folder: "GHOST ON A SWING",
    mediaFolder: "ghost-on-a-swing-media-package",
    imagePattern: /^Ghost_on_a_Swing_[1-6]_.*\.png$/i,
  },
  {
    id: "candlelight-pumpkins-table-lamp",
    folder: "CANDLELIGHT PUMPKINS - TABLE LAMP",
    mediaFolder: "candlelight-pumpkins-table-lamp-media-package",
    imagePattern: /^Candlelight_Pumpkins_Table_Lamp_[1-6]_.*\.png$/i,
  },
  {
    id: "ghost-duo-trinket-dish",
    folder: "GHOST DUO - TRINKET DISH",
    mediaFolder: "ghost-duo-trinket-dish-media-package",
    imagePattern: /^Ghost_Duo_Trinket_Dish[1-4]_.*\.png$/i,
  },
];

function parseCost(text, folder) {
  const price = text.match(/\$(\d+(?:\.\d{1,2})?)/);
  const size = text.match(
    /SIZE\s*(\d+)\s*MM\s*X\s*(\d+)\s*MM\s*X\s*(\d+)\s*MM/i,
  );
  if (!price || !size) throw new Error(`Invalid COST.txt in ${folder}`);
  return {
    priceCents: Math.round(Number(price[1]) * 100),
    dimensions: `${size[1]} × ${size[2]} × ${size[3]} mm`,
  };
}

const manifest = [];
for (const definition of definitions) {
  const folder = path.join(sourceRoot, definition.folder);
  const cost = parseCost(await readFile(path.join(folder, "COST.txt"), "utf8"), definition.folder);
  const mediaPath = path.join(folder, definition.mediaFolder);
  const files = await readdir(mediaPath);
  manifest.push({
    id: definition.id,
    sourceFolder: definition.folder,
    ...cost,
    images: files.filter((name) => definition.imagePattern.test(name)).sort(),
    video: files.find((name) => name.toLowerCase().endsWith(".webm")) || null,
  });
}

const output = path.resolve("commerce/halloween-special-source.json");
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Mapped ${manifest.length} products to ${output}`);
