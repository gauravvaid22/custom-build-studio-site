"""Prepare only Drop 377 in the local Christmas preview. Never exports/publishes live catalog."""
import copy
import json
import shutil
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports/christmas/drop-377'
PRIVATE = ROOT / '.tmp/christmas-drop-377'
GROUP = 'christmas-grace-decorations'
SOURCE = 'https://platform.stlflix.com/drops/drop-377'

# Configurable proposed delivered prices; production costs are not yet confirmed.
DESIGNS = [
    ('holy-family-embrace', 'Holy Family Nativity Sculpture', 2999,
     'Approximately 15 cm tall (source reference)',
     'A flowing white-and-gold nativity sculpture depicting Mary, Joseph and baby Jesus. A quiet centrepiece for a Christmas mantel or thoughtful seasonal gift.',
     'One finished Holy Family sculpture.', 3.85),
    ('heavenly-trio', 'Heavenly Trio Angel Figurines — Set of 3', 5499,
     'Source lists approximately 20 cm height; individual angel measurements pending model check.',
     'Three graceful angels in complementary poses, finished in a soft white-and-gold palette. Display the trio together or create little moments of Christmas throughout your home.',
     'Proposed set: three finished angel figures. Final set contents and individual dimensions need production review.', 8.7),
    ('guiding-star-tree-topper', 'Guiding Star Christmas Tree Topper', 2499,
     'Source lists approximately 12 cm height and Small/Large files; size-specific measurements pending model check.',
     'An open geometric star with a sculptural spiral base. A clean, elegant finishing touch for a Christmas tree, in white and gold tones.',
     'One finished star tree topper. Standard draft size only; confirm tree-tip fit before launch.', 4.23),
    ('evergreen-wreath', 'Evergreen Christmas Wreath', 2999,
     'Source lists approximately 3 cm depth; wreath diameter pending model check.',
     'A winter woodland wreath with sculpted trees and a golden bow. A festive accent for an indoor wall, sheltered doorway or seasonal display.',
     'One finished decorative wreath. Hook, mounting hardware and background décor are not included.', 5.13),
    ('luminous-tree', 'Luminous Christmas Tree LED Lantern', 3499,
     'Approximately 12 cm tall (source reference)',
     'A sculptural Christmas tree designed to glow from within using a battery LED tealight. Add a warm seasonal focal point to a shelf, side table or mantel.',
     'One finished tree lantern. LED fitting and battery inclusion await production confirmation; the preview shows the proposed lit appearance.', 10.78),
    ('village-lights', 'Christmas Village LED Houses — Set of 2', 5499,
     'Source heights: House 1 approximately 9 cm; House 2 approximately 14 cm.',
     'Two miniature village houses with snowy architectural details and windows designed for a warm LED glow. Arrange them together for a cosy Christmas scene.',
     'Proposed set: two finished house lanterns. LED fittings and battery inclusion await production confirmation.', 17.75),
    ('stocking-tray', 'Christmas Stocking Trinket Tray', 1999,
     'Approximately 2 cm deep; length and width pending model check.',
     'A Christmas stocking-shaped tray for jewellery, keys or little seasonal treasures. An easy festive touch for a bedside table or entryway.',
     'One finished stocking-shaped decorative tray. Contents are not included.', 3.03),
    ('snowflake-tray', 'Snowflake Christmas Trinket Tray', 1999,
     'Approximately 2 cm deep; length and width pending model check.',
     'A winter snowflake motif adds a festive touch to this small catch-all tray. Use it for jewellery, keys or decorative accents on a desk or side table.',
     'One finished snowflake decorative tray. Contents are not included.', 3.85),
    ('christmas-tree-tray', 'Christmas Tree Trinket Tray', 1999,
     'Approximately 2 cm deep; length and width pending model check.',
     'A Christmas tree-shaped catch-all for small treasures. A simple seasonal accent for a desk, dressing table or Christmas gift corner.',
     'One finished tree-shaped decorative tray. Contents are not included.', 3.38),
]

def main():
    REPORT.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    specs = {p['id']: p for p in json.loads((REPORT/'source-specs.json').read_text(encoding='utf-8'))}
    products = []
    for slug, name, price, dimensions, description, included, hours in DESIGNS:
        folder = ROOT/'public/media/shop'/slug
        folder.mkdir(parents=True, exist_ok=True)
        original = PRIVATE/(slug+'.webp')
        if not original.exists():
            request = urllib.request.Request(specs[slug]['images'][0], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=45) as response:
                original.write_bytes(response.read())
        image = ImageOps.exif_transpose(Image.open(original)).convert('RGB')
        for width in (1200, 480):
            ImageOps.contain(image, (width, width*2)).save(folder/f'1-{width}.webp', quality=88, method=6)
        notes = ('Finished decorative item made from PLA polymer. Indoor use; keep away from heat. '
                 'Colours are close to the reference photos; lighting and material batches can cause slight shade differences. '
                 'Reference images may include styling props that are not part of your order.')
        if 'tray' in slug:
            notes += ' Direct food contact is not verified. Use wrapped treats or a separate food-safe liner.'
        if slug in ('luminous-tree', 'village-lights'):
            notes += ' Battery LED lights only; never use a real flame.'
        products.append(dict(id=slug, name=name, priceCents=price, category='Christmas décor',
            description=description, included=included, dimensions=dimensions, notes=notes,
            images=[dict(src=f'/media/shop/{slug}/1-1200.webp', thumb=f'/media/shop/{slug}/1-480.webp',
                         alt=f'{name} — source reference photograph')],
            seasonal=True, source=f'https://platform.stlflix.com/product/{slug}', listingGroup=GROUP,
            launchReady=False, productionReviewed=False, basePriceCents=price-500,
            deliveryExtraCents=0, pricingSchemaVersion=2, shippingPriceMode='included', shippingFeeCents=0,
            pickupPriceDifferenceCents=0, seoTitle=name, seoDescription=description))
    parent = dict(id=GROUP, name='Christmas Grace — Nativity, Angels & Holiday Décor',
        category='Christmas décor', priceCents=min(p['priceCents'] for p in products),
        description='Choose your Christmas moment: a nativity sculpture, angel trio, star topper, woodland wreath, glowing tree, village houses or festive trinket tray. Explore all nine designs, then select the piece you love.',
        included='Your selected design only. The complete collection is not included in one purchase. Angel trio and two-house options are proposed sets as described.',
        dimensions='Dimensions vary by design. Choose an option to see the available source measurements.',
        notes='Local review draft. Prices and proposed set contents await approval. Some final dimensions, light fittings, additional media and 3D models are pending.',
        images=copy.deepcopy(products[0]['images']), galleryOverviewCover=True,
        groupedDesigns=[dict(id=p['id'],label=p['name'],optionIds=[p['id']]) for p in products],
        variants=[dict(id=p['id'],label=p['name'],priceCents=p['priceCents'],dimensions=p['dimensions'],
                       basePriceCents=p['basePriceCents'],deliveryExtraCents=0,pricingSchemaVersion=2) for p in products],
        variantLabel='Design', seasonal=True, launchReady=False, productionReviewed=False,
        source=SOURCE, basePriceCents=min(p['basePriceCents'] for p in products), deliveryExtraCents=0, pricingSchemaVersion=2,
        shippingPriceMode='included',shippingFeeCents=0,pickupPriceDifferenceCents=0,
        seoTitle='Christmas Nativity, Angel Figurines, LED Lanterns & Trinket Trays',
        seoDescription='Explore Christmas nativity décor, angel figurines, tree toppers, LED lanterns and festive trinket trays made in Edmonton. Choose your favourite design.')
    document = dict(id=GROUP,template='design',categoryIds=['seasonal','home-decor'],
                    products=[parent]+products,pickupPriceDifferenceCents=0,shippingPreset='existing',fulfillmentConfirmed=False)
    (REPORT/'admin-draft.json').write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    path=ROOT/'commerce/christmas-preview-products.json'
    backup=REPORT/'christmas-preview-products.before.json'
    if not backup.exists(): shutil.copy2(path,backup)
    current=json.loads(path.read_text(encoding='utf-8'))
    ids={p['id'] for p in document['products']}
    # Replace only this drop on repeated runs; preserve every existing owner edit.
    current=[p for p in current if p['id'] not in ids]+document['products']
    path.write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (REPORT/'pricing.json').write_text(json.dumps([dict(id=s[0],name=s[1],deliveredCAD=s[2]/100,
       sourceAssemblyPrintHours=s[6],status='Proposed only; production costs, parcel cost and margin unverified') for s in DESIGNS],indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(products)} design choices in one local-only listing. Originals: {PRIVATE}')

if __name__ == '__main__':
    raise SystemExit('Superseded by owner instruction: each product needs its own listing. Use finalize-christmas-drop-377.py; do not recreate the old grouped listing.')
