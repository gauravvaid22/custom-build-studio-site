import { readFileSync, writeFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// 1. Christmas Product Renames & SEO Metadata
const CHRISTMAS_UPDATES = {
  "endless-swirling-tree": {
    name: "Spiral Tabletop Christmas Tree — Green & Gold Star",
    seoTitle: "Spiral Tabletop Christmas Tree — Green & Gold Mantel & Desk Holiday Decor",
    seoDescription: "Decorate your mantel, bookshelf or office desk with a modern forest-green spiral tabletop Christmas tree topped with a gold star. Made in Edmonton with Canadian shipping.",
    searchKeywords: ["tabletop christmas tree", "spiral christmas tree", "mini desk christmas tree", "mantel christmas decor", "green and gold christmas tree", "holiday home decor"]
  },
  "christmas-angel": {
    name: "Light-Up Angel Nativity Table Lamp",
    seoTitle: "Light-Up Angel Nativity Table Lamp — Glowing Holy Family Christmas Centerpiece",
    seoDescription: "Warm LED angel nativity table lamp with sculpted wings sheltering Mary, Joseph and Baby Jesus. A meaningful Christian Christmas centerpiece and gift.",
    searchKeywords: ["nativity table lamp", "angel nativity light", "light up nativity scene", "religious christmas gift", "christian christmas decor", "glowing manger lamp"]
  },
  "meowy-christmas-tree-topper": {
    name: "Cat & Gold Star Christmas Tree Topper",
    seoTitle: "Cat Christmas Tree Topper — Playful Kitty Reaching for Gold Star (Cat Lover Gift)",
    seoDescription: "Playful white cat Christmas tree topper reaching for a bright gold star. Lightweight holiday tree topper and gift for cat lovers.",
    searchKeywords: ["cat christmas tree topper", "funny christmas tree topper", "cat lover christmas gift", "kitty tree star", "pet christmas decor"]
  },
  "christmas-character-figurines": {
    name: "Cute Christmas Shelf Figurines — Santa, Snowman & Holiday Axolotl",
    seoTitle: "Cute Christmas Shelf Figurines — Santa Claus, Cozy Snowman & Holiday Axolotl",
    seoDescription: "Festive Christmas shelf and desk figurines featuring Knitted-Style Santa Claus, Cozy Sweater Snowman and a cute Christmas Axolotl in a Santa hat.",
    searchKeywords: ["christmas figurines", "santa claus figurine", "snowman shelf sitter", "christmas axolotl gift", "cute holiday desk decor", "stocking stuffers"]
  },
  "hooked-santa": {
    name: "Knitted-Style Santa Claus Shelf Figurine",
    seoTitle: "Knitted-Style Santa Claus Shelf Figurine — Cozy Textured Christmas Table Decor",
    seoDescription: "Charming knitted-texture Santa Claus figurine carrying a holiday gift sack. Ideal for Christmas mantels, bookshelves and tiered trays.",
    searchKeywords: ["santa claus figurine", "knitted santa decor", "christmas shelf sitter", "holiday mantel figurine", "stocking stuffer"]
  },
  "snow-in-jumper": {
    name: "Cozy Sweater Snowman Shelf Figurine",
    seoTitle: "Cozy Sweater Snowman Shelf Figurine — Winter Mantel & Desk Christmas Decor",
    seoDescription: "Cheerful snowman figurine dressed in a textured winter sweater, scarf and pom-pom beanie for Christmas shelves, desks and mantels.",
    searchKeywords: ["snowman figurine", "cute snowman decor", "winter shelf sitter", "christmas desk figurine", "snowman gift"]
  },
  "zou-christmas-baby-axolotl": {
    name: "Christmas Axolotl Fidget Figurine with Santa Hat",
    seoTitle: "Christmas Axolotl Fidget Figurine with Santa Hat — Cute Stocking Stuffer Gift",
    seoDescription: "Poseable holiday baby axolotl figurine wearing a red and white Santa hat. A fun Christmas stocking stuffer and desk companion for kids and axolotl fans.",
    searchKeywords: ["christmas axolotl", "axolotl stocking stuffer", "holiday fidget toy", "cute axolotl gift", "kids christmas gift"]
  },
  "christmas-gnome-set": {
    name: "Nordic Christmas Gnomes (Set of 5) — Mantel & Tabletop Decor",
    seoTitle: "Nordic Christmas Gnomes Set of 5 — Green & White Holiday Mantel & Tiered Tray Decor",
    seoDescription: "Set of 5 Scandinavian-inspired Christmas gnomes with textured green hats and white beards. Perfect for holiday mantels, tiered trays and table settings.",
    searchKeywords: ["christmas gnomes set", "nordic holiday gnomes", "scandinavian christmas tomte", "tiered tray christmas decor", "mantel gnome figurines"]
  },
  "bright-nativity-table-lamp": {
    name: "Light-Up Nativity Scene Table Lamp — Holy Family & Bethlehem Star",
    seoTitle: "Light-Up Nativity Scene Table Lamp — Glowing Holy Family & Bethlehem Star Night Light",
    seoDescription: "Illuminated Christmas nativity table lamp framing Mary, Joseph and Baby Jesus beneath the Star of Bethlehem with a warm ambient glow.",
    searchKeywords: ["light up nativity scene", "nativity night light", "holy family table lamp", "star of bethlehem lamp", "christmas manger light"]
  },
  "village-on-the-moon-table-lamp": {
    name: "Crescent Moon Christmas Village Night Light",
    seoTitle: "Crescent Moon Christmas Village Night Light — Glowing Winter Town Table Lamp",
    seoDescription: "Whimsical crescent moon table lamp cradling a glowing snowy Christmas village and pine trees. A cozy holiday night light for bedrooms and living rooms.",
    searchKeywords: ["christmas village night light", "crescent moon table lamp", "winter village lamp", "cozy christmas bedroom light", "holiday night light"]
  },
  "santa-s-bonfire-table-lamp": {
    name: "Santa & Reindeer Campfire Night Light",
    seoTitle: "Santa & Reindeer Campfire Night Light — Glowing Christmas Bonfire Table Lamp",
    seoDescription: "Cozy Christmas night light featuring Santa Claus and his reindeer roasting marshmallows around a warm glowing LED campfire.",
    searchKeywords: ["santa night light", "christmas campfire lamp", "santa and reindeer figurine light", "kids christmas night light", "cozy holiday table lamp"]
  },
  "santa-s-snack-hat-bowl": {
    name: "Santa Hat Christmas Candy Bowl & Treat Dish",
    seoTitle: "Santa Hat Christmas Candy Bowl — Red & White Holiday Treat, Nut & Chocolate Dish",
    seoDescription: "Festive knitted-style red and white Santa hat candy bowl for holiday chocolates, peppermints, nuts and party snacks.",
    searchKeywords: ["christmas candy bowl", "santa hat bowl", "holiday treat dish", "christmas table centerpiece bowl", "office candy dish"]
  },
  "christmas-character-ornaments": {
    name: "Cute Christmas Tree Ornaments — Pet, Santa, Snowman & Reindeer Baubles",
    seoTitle: "Cute Christmas Tree Ornaments — Puppy, Cat, Santa, Snowman, Reindeer & Nutcracker",
    seoDescription: "Collectible Christmas tree ornaments including sleeping puppy, kitty cat, bear cub, Santa, snowman, reindeer and nutcracker baubles.",
    searchKeywords: ["christmas tree ornaments", "dog christmas ornament", "cat christmas ornament", "cute holiday baubles", "stocking stuffer ornaments"]
  },
  "sleeping-dog-ornament": {
    name: "Sleeping Puppy Dog Christmas Tree Ornament",
    seoTitle: "Sleeping Puppy Dog Christmas Tree Ornament — Cute Dog Lover Holiday Bauble",
    seoDescription: "Adorable puppy curled asleep inside a red Christmas bauble with a Santa hat. A sweet holiday tree ornament for dog lovers.",
    searchKeywords: ["dog christmas ornament", "puppy tree bauble", "dog lover christmas gift", "pet christmas ornament"]
  },
  "sleeping-cat-ornament": {
    name: "Sleeping Kitty Cat Christmas Tree Ornament",
    seoTitle: "Sleeping Kitty Cat Christmas Tree Ornament — Cute Cat Lover Holiday Bauble",
    seoDescription: "Sweet kitty cat sleeping inside a festive red Christmas ornament with a Santa hat. A charming holiday gift for cat lovers.",
    searchKeywords: ["cat christmas ornament", "kitty tree bauble", "cat lover christmas gift", "pet christmas ornament"]
  },
  "sleeping-bear-ornament": {
    name: "Sleeping Bear Cub Christmas Tree Ornament",
    seoTitle: "Sleeping Bear Cub Christmas Tree Ornament — Cozy Woodland Holiday Bauble",
    seoDescription: "Cute bear cub curled up inside a red Christmas bauble with a Santa hat. Great for woodland and family Christmas trees.",
    searchKeywords: ["bear christmas ornament", "woodland tree ornament", "baby first christmas ornament", "cute holiday bauble"]
  },
  "santa-bauble-ornament": {
    name: "Classic Santa Claus Christmas Tree Ornament",
    seoTitle: "Classic Santa Claus Christmas Tree Ornament — Red & White Holiday Tree Bauble",
    seoDescription: "Cheerful sculpted Santa Claus bauble ornament in classic red and white for family Christmas trees and gift wrapping.",
    searchKeywords: ["santa christmas ornament", "santa claus bauble", "classic holiday tree ornament", "stocking stuffer"]
  },
  "snowman-bauble-ornament": {
    name: "Cozy Snowman Christmas Tree Ornament",
    seoTitle: "Cozy Snowman Christmas Tree Ornament — Festive Winter Holiday Tree Bauble",
    seoDescription: "Smiling snowman Christmas tree ornament with carrot nose and festive hat for winter holiday decorating.",
    searchKeywords: ["snowman christmas ornament", "snowman tree bauble", "winter holiday ornament", "kids christmas ornament"]
  },
  "reindeer-face-ornament": {
    name: "Cute Red-Nosed Reindeer Christmas Tree Ornament",
    seoTitle: "Cute Red-Nosed Reindeer Christmas Tree Ornament — Festive Antler Holiday Bauble",
    seoDescription: "Playful reindeer face Christmas ornament with antlers and bright red nose for family holiday trees.",
    searchKeywords: ["reindeer christmas ornament", "red nose reindeer bauble", "kids holiday tree ornament", "cute reindeer gift"]
  },
  "snowflake-reindeer-ornament": {
    name: "Snowflake Reindeer Christmas Tree Ornament",
    seoTitle: "Snowflake Reindeer Christmas Tree Ornament — Red & Gold Holiday Bauble",
    seoDescription: "Festive reindeer ornament framed in a red and gold snowflake bauble for classic Christmas trees.",
    searchKeywords: ["snowflake reindeer ornament", "red and gold christmas ornament", "reindeer tree bauble"]
  },
  "nutcracker-bauble-ornament": {
    name: "Traditional Nutcracker Soldier Christmas Ornament",
    seoTitle: "Traditional Nutcracker Soldier Christmas Ornament — Classic Holiday Tree Bauble",
    seoDescription: "Classic Nutcracker soldier bauble ornament in festive red, white and gold for traditional Christmas trees.",
    searchKeywords: ["nutcracker christmas ornament", "nutcracker soldier bauble", "traditional holiday tree ornament"]
  },
  "holy-family-embrace": {
    name: "Modern White & Gold Holy Family Nativity Statue",
    seoTitle: "Modern White & Gold Holy Family Nativity Statue — Minimalist Christmas Mantel Figurine",
    seoDescription: "Elegant white and gold minimalist Holy Family statue depicting Mary, Joseph and Baby Jesus. A serene Christmas mantel and tabletop centerpiece.",
    searchKeywords: ["modern nativity statue", "holy family figurine", "white and gold christmas decor", "minimalist nativity scene", "christian christmas gift"]
  },
  "heavenly-trio": {
    name: "Christmas Angel Figurines (Set of 3) — White, Silver & Gold Mantel Statues",
    seoTitle: "Christmas Angel Figurines Set of 3 — White, Silver & Gold Holiday Mantel Statues",
    seoDescription: "Set of 3 ribbed-gown Christmas angel figurines in matte white with gold and silver accents holding a star, heart and prayerful hands.",
    searchKeywords: ["christmas angel figurines", "angel statues set of 3", "white and gold angels", "holiday mantel decor", "memorial christmas angel gift"]
  },
  "guiding-star-tree-topper": {
    name: "Gold & White Bethlehem Star Christmas Tree Topper",
    seoTitle: "Gold & White Bethlehem Star Christmas Tree Topper — Classic 8-Point Holiday Tree Star",
    seoDescription: "Dimensional 8-point white and gold Star of Bethlehem Christmas tree topper with a spiral base mount for standard and tabletop trees.",
    searchKeywords: ["star christmas tree topper", "bethlehem star tree topper", "gold and white tree topper", "classic christmas star topper"]
  },
  "evergreen-wreath": {
    name: "White & Gold Christmas Wreath with Bow — Door & Mantel Wall Decor",
    seoTitle: "White & Gold Christmas Wreath with Gold Bow — Elegant Holiday Door & Mantel Decor",
    seoDescription: "Sculpted white and gold pine-style Christmas wreath accented with golden berries and a statement bow for indoor doors, walls and mantels.",
    searchKeywords: ["white and gold christmas wreath", "christmas door wreath with bow", "mantel holiday wreath", "modern winter wreath"]
  },
  "luminous-tree": {
    name: "Light-Up White & Gold Tabletop Christmas Tree Lantern",
    seoTitle: "Light-Up White & Gold Tabletop Christmas Tree Lantern — Glowing LED Centerpiece",
    seoDescription: "Illuminated white and gold openwork tabletop Christmas tree lantern available in Star Cutout, Lace Filigree and Spiral Star patterns.",
    searchKeywords: ["light up tabletop christmas tree", "white and gold christmas tree", "led christmas tree lantern", "holiday dining centerpiece"]
  },
  "luminous-tree-star-cutout": {
    name: "Light-Up White & Gold Christmas Tree — Star Cutouts",
    seoTitle: "Light-Up White & Gold Christmas Tree Lantern — Star Cutout Pattern",
    seoDescription: "Glowing white and gold tabletop Christmas tree lantern with star cutouts and a gold star topper.",
    searchKeywords: ["star cutout christmas tree", "light up tabletop tree", "white and gold holiday lantern"]
  },
  "luminous-tree-lace-filigree": {
    name: "Light-Up White & Gold Christmas Tree — Lace Filigree",
    seoTitle: "Light-Up White & Gold Christmas Tree Lantern — Ornate Lace Filigree Pattern",
    seoDescription: "Glowing white and gold tabletop Christmas tree lantern with delicate filigree scrollwork and a gold star topper.",
    searchKeywords: ["filigree christmas tree", "lace light up christmas tree", "white and gold holiday centerpiece"]
  },
  "luminous-tree-spiral-stars": {
    name: "Light-Up White & Gold Christmas Tree — Spiral Stars",
    seoTitle: "Light-Up White & Gold Christmas Tree Lantern — Spiral Star Ribbon Pattern",
    seoDescription: "Glowing white and gold tabletop Christmas tree lantern with sweeping spiral ribbons and star cutouts.",
    searchKeywords: ["spiral light up christmas tree", "white and gold tabletop tree", "led holiday tree lantern"]
  },
  "village-lights": {
    name: "Light-Up Christmas Village Houses (Set of 2) — White & Gold LED Cottages",
    seoTitle: "Light-Up Christmas Village Houses Set of 2 — White & Gold Glowing LED Holiday Cottages",
    seoDescription: "Pair of matte white and gold Christmas village houses with warm LED-lit windows and star cutouts for holiday mantels, shelves and windowsills.",
    searchKeywords: ["christmas village houses", "light up holiday cottages", "white and gold christmas village", "led mantel houses"]
  },
  "christmas-trinket-trays": {
    name: "Christmas Jewelry, Candy & Key Trinket Trays — Tree, Snowflake & Stocking",
    seoTitle: "Christmas Trinket Trays & Candy Dishes — Holiday Tree, Snowflake & Stocking Catchall Trays",
    seoDescription: "Festive Christmas catchall trinket trays and candy dishes in Christmas Tree, Winter Snowflake and Holiday Stocking shapes for keys, jewelry and treats.",
    searchKeywords: ["christmas trinket tray", "holiday jewelry dish", "christmas candy tray", "entryway key bowl", "stocking stuffer gift"]
  },
  "christmas-tree-trinket-tray": {
    name: "Christmas Tree Jewelry, Candy & Key Tray",
    seoTitle: "Christmas Tree Trinket Tray & Candy Dish — Green & Red Holiday Catchall Dish",
    seoDescription: "Christmas tree-shaped trinket tray and candy dish in festive green, red and gold for entryway keys, rings and holiday treats.",
    searchKeywords: ["christmas tree trinket tray", "tree shaped candy dish", "holiday key tray", "christmas jewelry dish"]
  },
  "snowflake-trinket-tray": {
    name: "Winter Snowflake Jewelry & Trinket Dish",
    seoTitle: "Winter Snowflake Jewelry & Trinket Dish — Blue & White Holiday Catchall Tray",
    seoDescription: "Icy blue and white snowflake trinket dish with raised compartments for rings, earrings, coins and winter table treats.",
    searchKeywords: ["snowflake trinket dish", "winter jewelry tray", "blue and white snowflake bowl", "holiday ring dish"]
  },
  "stocking-trinket-tray": {
    name: "Christmas Stocking Jewelry, Key & Candy Tray",
    seoTitle: "Christmas Stocking Trinket Tray & Candy Dish — Red & Green Holiday Catchall",
    seoDescription: "Festive red, white and green Christmas stocking trinket dish for entryway keys, bedside jewelry and holiday candies.",
    searchKeywords: ["christmas stocking tray", "holiday candy dish", "christmas key holder tray", "festive trinket dish"]
  }
};

const xmasProducts = readJson("commerce/christmas-preview-products.json");
for (const p of xmasProducts) {
  const upd = CHRISTMAS_UPDATES[p.id];
  if (upd) {
    p.name = upd.name;
    p.seoTitle = upd.seoTitle;
    p.seoDescription = upd.seoDescription;
    p.searchKeywords = upd.searchKeywords;
  }
  if (Array.isArray(p.groupedDesigns)) {
    for (const gd of p.groupedDesigns) {
      if (CHRISTMAS_UPDATES[gd.id]) {
        gd.label = CHRISTMAS_UPDATES[gd.id].name;
      }
    }
  }
  if (Array.isArray(p.variants)) {
    for (const v of p.variants) {
      if (CHRISTMAS_UPDATES[v.id]) {
        v.label = CHRISTMAS_UPDATES[v.id].name;
      }
    }
  }
}
writeJson("commerce/christmas-preview-products.json", xmasProducts);

const xmasPreview = readJson("commerce/christmas-preview.json");
if (Array.isArray(xmasPreview.items)) {
  for (const item of xmasPreview.items) {
    if (CHRISTMAS_UPDATES[item.id]) {
      item.name = CHRISTMAS_UPDATES[item.id].name;
    }
  }
}
writeJson("commerce/christmas-preview.json", xmasPreview);

// 2. Headphone Search Config & Generic Naming Update
const headphoneSearch = readJson("commerce/headphone-search.json");
const HEADPHONE_RENAMES = {
  "headphone-stand-designs": {
    name: "Gaming & Desk Headphone Stands — 6 Styles",
    seoTitle: "Headphone Stands & Gaming Headset Holders — 6 Desk Organizer Styles",
    seoDescription: "Compare 6 tabletop headphone stands and gaming headset holders with phone rests and pen trays. Made in Edmonton with free tracked Canadian shipping.",
    searchKeywords: ["headphone stand", "gaming headset holder", "desk headphone stand", "headphone and phone stand", "headset stand with pen holder", "gamer desk gift"]
  },
  "flow-stand-headphone-and-phone-holder": {
    name: "Desk Headphone & Phone Stand — Curved Holder",
    seoTitle: "Desk Headphone & Phone Stand — Curved Gaming Headset & Smartphone Holder",
    seoDescription: "Curved tabletop headphone and phone stand that holds over-ear gaming headsets and keeps your smartphone upright at your desk. Free Canadian shipping.",
    searchKeywords: ["headphone and phone stand", "curved headphone stand", "gaming headset holder", "desk phone and headset dock", "flow headphone stand"]
  },
  "curve-caddy-headphone-holder": {
    name: "Headphone Stand with Pen & Desk Organizer Tray",
    seoTitle: "Headphone Stand with Pen Holder & Desk Tray — Office & Gaming Headset Stand",
    seoDescription: "Sweeping desk headphone stand with a built-in pen cup and small-item organizer tray for everyday office and gaming setups. Free Canadian shipping.",
    searchKeywords: ["headphone stand with pen holder", "desk organizer headphone stand", "office headset holder", "gaming desk caddy", "curve caddy headphone stand"]
  },
  "ring-dock-headphone-holder": {
    name: "Round Gaming Headphone Stand — Circular Headset Holder",
    seoTitle: "Round Gaming Headphone Stand — Modern Circular Desk Headset Holder",
    seoDescription: "Sculptural circular headphone stand with a wide base tray and upright headset rest for clean gaming and home office desks. Free Canadian shipping.",
    searchKeywords: ["round headphone stand", "circular gaming headset holder", "modern desk headphone stand", "ring headphone dock"]
  },
  "block-hub-headphone-and-phone-holder": {
    name: "Headphone, Phone & Pen Desk Organizer Stand",
    seoTitle: "Headphone, Phone & Pen Desk Organizer Stand — Compact All-in-One Holder",
    seoDescription: "Compact all-in-one headphone stand with a front smartphone slot and pen holder compartment for tidy work and gaming desks. Free Canadian shipping.",
    searchKeywords: ["headphone phone and pen stand", "all in one desk organizer stand", "compact headset holder", "home office desk gift"]
  },
  "tower-trio-headphone-and-phone-holder": {
    name: "3-in-1 Headphone, Phone & Pen Tower Stand",
    seoTitle: "3-in-1 Headphone, Phone & Pen Tower Stand — Vertical Desk Organizer",
    seoDescription: "Vertical 3-in-1 desk tower that holds over-ear headphones, a smartphone and pens in one space-saving footprint. Free Canadian shipping.",
    searchKeywords: ["3 in 1 headphone stand", "headphone phone pen tower", "vertical headset organizer", "gaming desk organizer"]
  },
  "arch-stand-headphone-holder": {
    name: "Minimalist Arch Gaming Headphone Stand",
    seoTitle: "Minimalist Arch Gaming Headphone Stand — Clean Desk Headset Rest",
    seoDescription: "Clean architectural arch headphone stand for a dedicated, low-profile over-ear headset rest on gaming and studio desks. Free Canadian shipping.",
    searchKeywords: ["minimalist headphone stand", "arch headset holder", "simple gaming headphone stand", "studio headphone rest"]
  }
};

for (const [id, data] of Object.entries(HEADPHONE_RENAMES)) {
  if (headphoneSearch.products[id]) {
    headphoneSearch.products[id].name = data.name;
    headphoneSearch.products[id].seoTitle = data.seoTitle;
    headphoneSearch.products[id].seoDescription = data.seoDescription;
  }
}
writeJson("commerce/headphone-search.json", headphoneSearch);

// 3. Collections Update (Remove "3D-printed" & add buyer-first seoTitle)
const COLLECTIONS_SEO = {
  "personalized-gifts": {
    seoTitle: "Personalized Photo Lamps & Custom Picture Frame Gifts — Made in Edmonton",
    seoDescription: "Shop custom photo lamps and personalized picture frames with your printed photo included. Made in Edmonton with free tracked shipping across Canada."
  },
  "photo-lamps": {
    seoTitle: "Custom Photo Lamps & Personalized Night Lights — Wooden LED Base",
    seoDescription: "Turn your favourite family, couple, wedding or pet photograph into a warm glowing custom photo lamp. Made in Edmonton with free Canadian shipping."
  },
  "photo-frames": {
    seoTitle: "Cute Personalized Desk Photo Frames & Picture Holders — Print Included",
    seoDescription: "Personalized desk and tabletop photo holders for couples, babies, pets and memorials—your printed photograph is included and fitted before shipping."
  },
  "gaming-desk": {
    seoTitle: "Gaming Controller Holders, Headphone Stands & PS5 Console Stands",
    seoDescription: "Level up your gaming setup with headphone stands, controller holders and fitted PS5 console stands. Made in Edmonton with free Canadian shipping."
  },
  "controller-holders": {
    seoTitle: "Gaming Controller Stands & Headset Holders — Desk Setup Gifts",
    seoDescription: "Character gaming controller holders and desk stands for PlayStation, Xbox and Switch gamepads. Made in Edmonton with free Canadian shipping."
  },
  "console-stands": {
    seoTitle: "Themed PS5 Console Stands — Fitted for Original PS5 & PS5 Slim",
    seoDescription: "Themed horizontal and vertical display stands fitted for Original PS5 and PS5 Slim consoles. Made in Edmonton with free tracked Canadian shipping."
  },
  "headphone-stands": {
    seoTitle: "Desk Headphone Stands & Gaming Headset Holders — Phone & Pen Docks",
    seoDescription: "Tabletop headphone stands and gaming headset holders with phone slots and pen organizer trays. Made in Edmonton with free tracked Canadian shipping."
  },
  "home-bar-kitchen": {
    seoTitle: "Funny Beer & Soda Can Coolers, Wine Bottle Holders & Straw Toppers",
    seoDescription: "Fun insulated-style beer and soda can holders, sculptural wine bottle stands and tumbler straw toppers for parties, kitchens and gifts."
  },
  "can-holders": {
    seoTitle: "Funny Beer & Soda Can Holders — Character Drink Coolers with Handles",
    seoDescription: "Character beer and soda can holders and mug-style drink coolers sized for standard 12 oz cans. Great party, BBQ and gamer gifts."
  },
  "wine-bottle-holders": {
    seoTitle: "Octopus Countertop Wine Bottle Holder — Coastal Kitchen & Bar Gift",
    seoDescription: "Sculptural octopus countertop wine bottle holder sized for standard 750 mL wine bottles. Made in Edmonton with free Canadian shipping."
  },
  "straw-toppers": {
    seoTitle: "Cute Tumbler Straw Toppers & Straw Caps — Fits 8 mm to 10 mm Straws",
    seoDescription: "Cute character straw toppers and dust caps for Stanley-style 30 oz and 40 oz tumblers with 8 mm to 10 mm straws."
  },
  "collectibles-decor": {
    seoTitle: "Articulated Dragon Figurines, Mini Safari Animals & Cute Home Decor",
    seoDescription: "Poseable articulated dragons, dinosaurs, cute mini safari animal packs and character shelf decor made in Edmonton."
  },
  "halloween-horrors": {
    seoTitle: "Wearable Halloween Cosplay Masks, Candy Bowls & Spooky Decor",
    seoDescription: "Wearable Halloween horror masks, cute ghost candy bowls and gothic tabletop decor made in Edmonton with Canadian shipping."
  },
  "gifts-under-25": {
    seoTitle: "Cute Gifts & Stocking Stuffers Under $25 CAD — Animals, Keychains & Toppers",
    seoDescription: "Affordable gifts and stocking stuffers under $25 CAD including cute mini animals, articulated keychains and tumbler straw toppers."
  }
};

const collections = readJson("commerce/collections.json");
for (const c of collections) {
  if (COLLECTIONS_SEO[c.id]) {
    c.seoTitle = COLLECTIONS_SEO[c.id].seoTitle;
    c.seoDescription = COLLECTIONS_SEO[c.id].seoDescription;
  }
}
writeJson("commerce/collections.json", collections);

// 4. Exact Category Keywords & Suffixes
const CATEGORY_KEYWORDS = {
  "Pet hats & costumes": ["pet costume hat", "cat hat", "small dog costume", "funny pet photo prop", "gift for cat lover", "gift for dog lover", "paw couture", "gifts and decor"],
  "Creatures & collectibles": ["articulated figurine", "poseable desk toy", "fidget dragon", "bookshelf decor", "collectible gift", "animal figurine", "gifts and decor"],
  "Gaming & desk": ["controller holder", "gaming controller stand", "ps5 controller holder", "xbox controller stand", "gamer desk decor", "gift for gamer", "gifts and decor"],
  "Home & lighting": ["custom lamp", "personalized lamp", "custom photo lamp", "night light", "table lamp", "bedside lamp", "home decor", "gifts and decor"],
  "Home & entertaining": ["wine bottle holder", "countertop wine stand", "octopus wine holder", "bar cart decor", "wine lover gift", "kitchen decor", "home decor", "gifts and decor"],
  "Halloween": ["halloween decor", "halloween gift", "spooky home decor", "halloween party decor", "gifts and decor"],
  "Home décor": ["home decor", "shelf decor", "tabletop centerpiece", "decorative gift", "gifts and decor"],
  "Halloween costumes": ["halloween mask", "wearable mask", "cosplay mask", "horror mask", "halloween costume", "gifts and decor"],
  "Can holders": ["can holder", "beer can cooler", "soda can holder", "can mug with handle", "funny drink holder", "beer cooler gift", "gifts and decor"],
  "PS5 console stands": ["ps5 stand", "playstation 5 console stand", "ps5 slim stand", "themed ps5 base", "gamer room decor", "gift for ps5 gamer", "gifts and decor"],
  "Personalized photo holders": ["personalized photo frame", "custom picture holder", "desk photo stand", "printed photo gift", "custom family gift", "personalized gifts", "home decor", "gifts and decor"],
  "Headphone stands": ["headphone stand", "gaming headset holder", "desk headphone holder", "headset stand", "gamer desk organizer", "gift for gamer", "home office decor", "gifts and decor"],
  "Tumbler accessories": ["straw topper", "tumbler straw cap", "stanley cup straw cover", "cute straw charm", "stocking stuffer", "gifts and decor"],
  "Halloween candy holders": ["halloween candy bowl", "ghost candy dish", "spooky treat bowl", "halloween party decor", "gifts and decor"]
};

const CATEGORY_SUFFIX = {
  "Pet hats & costumes": "Cute Cat & Small Dog Costume Hat",
  "Creatures & collectibles": "Poseable Collectible Desk & Shelf Figurine",
  "Gaming & desk": "Gaming Controller & Desk Stand",
  "Home & lighting": "Custom Photo Night Light & Bedside Lamp",
  "Home & entertaining": "Countertop Wine Bottle Display Stand",
  "Halloween": "Spooky Halloween Costume & Tabletop Decor",
  "Home décor": "Unique Tabletop & Shelf Home Decor",
  "Halloween costumes": "Wearable Halloween Cosplay Mask",
  "Can holders": "12 oz Beer & Soda Can Cooler Gift",
  "PS5 console stands": "Fitted Stand for Original PS5 & PS5 Slim",
  "Personalized photo holders": "Custom Desk Picture Frame (Photo Included)",
  "Headphone stands": "Gaming Headset & Desk Organizer Stand",
  "Tumbler accessories": "Cute Cap for 8–10 mm Tumbler Straws",
  "Halloween candy holders": "Spooky Halloween Candy Bowl & Treat Dish"
};

function enrichProductsList(list) {
  for (const p of list) {
    if (HEADPHONE_RENAMES[p.id]) {
      p.name = HEADPHONE_RENAMES[p.id].name;
      p.seoTitle = HEADPHONE_RENAMES[p.id].seoTitle;
      p.seoDescription = HEADPHONE_RENAMES[p.id].seoDescription;
      p.searchKeywords = HEADPHONE_RENAMES[p.id].searchKeywords;
    }
    if (p.id === "headphone-stand-designs" && Array.isArray(p.groupedDesigns)) {
      for (const gd of p.groupedDesigns) {
        if (HEADPHONE_RENAMES[gd.id]) gd.label = HEADPHONE_RENAMES[gd.id].name;
      }
      if (Array.isArray(p.variants)) {
        for (const v of p.variants) {
          if (HEADPHONE_RENAMES[v.id]) v.label = HEADPHONE_RENAMES[v.id].name;
        }
      }
    }
    if (p.id === "lithophane-table-lamp") {
      p.seoTitle = "Custom Photo Lamp & Personalized Picture Night Light — Wooden LED Base";
      p.seoDescription = "Turn your favourite family, couple, wedding, baby or pet photo into a glowing custom photo lamp with a warm wooden LED base. Made in Edmonton with free tracked Canadian shipping.";
      p.searchKeywords = [
        "custom lamp",
        "personalized lamp",
        "custom photo lamp",
        "personalized picture night light",
        "photo night light",
        "custom bedside lamp",
        "anniversary photo gift",
        "memorial photo lamp",
        "personalized gifts edmonton",
        "lithophane lamp"
      ];
    }
    // Ensure every product has a unique buyer-first seoTitle, seoDescription, and searchKeywords
    if (!p.seoTitle) {
      const suffix = CATEGORY_SUFFIX[p.category] || "Custom Gift & Home Decor";
      p.seoTitle = `${p.name} — ${suffix}`;
    }
    if (!p.seoDescription) {
      const cleanDesc = (p.description || "").replace(/\s+/g, " ").trim();
      p.seoDescription = cleanDesc.length > 130
        ? cleanDesc.slice(0, 145).replace(/\s+\S*$/, "") + ". Made in Edmonton with Canadian shipping."
        : `${cleanDesc} Made in Edmonton with tracked shipping across Canada.`;
    }
    const baseTags = CATEGORY_KEYWORDS[p.category] || ["gifts and decor", "home decor", "personalized gifts"];
    const nameWords = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
    p.searchKeywords = Array.from(new Set([...(p.searchKeywords || []), ...baseTags, p.category.toLowerCase(), ...nameWords.slice(0, 5)]));
  }
}

const products = readJson("commerce/products.json");
enrichProductsList(products);
writeJson("commerce/products.json", products);

const baseline = readJson("commerce/catalog-baseline.json");
if (Array.isArray(baseline.products)) enrichProductsList(baseline.products);
if (Array.isArray(baseline.collections)) {
  for (const c of baseline.collections) {
    if (COLLECTIONS_SEO[c.id]) {
      c.seoTitle = COLLECTIONS_SEO[c.id].seoTitle;
      c.seoDescription = COLLECTIONS_SEO[c.id].seoDescription;
    }
  }
}
writeJson("commerce/catalog-baseline.json", baseline);

const namingPlan = readJson("commerce/search-naming-plan.json");
for (const [id, data] of Object.entries(HEADPHONE_RENAMES)) {
  if (namingPlan.products?.[id]) {
    namingPlan.products[id].name = data.name;
    namingPlan.products[id].seoTitle = data.seoTitle;
    namingPlan.products[id].seoDescription = data.seoDescription;
  }
}
if (namingPlan.products?.["lithophane-table-lamp"]) {
  namingPlan.products["lithophane-table-lamp"].seoTitle = "Custom Photo Lamp & Personalized Picture Night Light — Wooden LED Base";
  namingPlan.products["lithophane-table-lamp"].seoDescription = "Turn your favourite family, couple, wedding, baby or pet photo into a glowing custom photo lamp with a warm wooden LED base. Made in Edmonton with free tracked Canadian shipping.";
}
writeJson("commerce/search-naming-plan.json", namingPlan);

console.log("Updated all 34 Christmas products, 96 Shop products, 14 Collections, baseline & search-naming-plan with exact category tags.");
