"""Apply the owner's 15 October prices and individually selectable figurine group."""
from pathlib import Path
import json
from PIL import Image, ImageOps

repo = Path(__file__).resolve().parents[1]
path = repo / 'commerce/christmas-preview.json'
data = json.loads(path.read_text(encoding='utf-8'))
prices = {'santa-s-snack-hat-bowl': 2999, 'village-on-the-moon-table-lamp': 3499,
          'endless-swirling-tree': 2999, 'hooked-santa': 2499, 'snow-in-jumper': 2499,
          'zou-christmas-baby-axolotl': 2499, 'bright-nativity-table-lamp': 4999,
          'meowy-christmas-tree-topper': 2499}
group = 'christmas-character-figurines'
ids = ['hooked-santa', 'snow-in-jumper', 'zou-christmas-baby-axolotl']
products = [p for p in data['products'] if p['id'] != group]
for p in products:
    if p['id'] in prices:
        p.update(priceCents=prices[p['id']], basePriceCents=prices[p['id']]-500)
    if p['id'] in ids:
        p['listingGroup'] = group
children = [next(p for p in products if p['id'] == id) for id in ids]
out = repo / 'public/media/shop' / group
out.mkdir(parents=True, exist_ok=True)
collage = Image.new('RGB', (1200, 650), '#121b16')
for i, p in enumerate(children):
    im = ImageOps.contain(Image.open(repo / 'public' / p['images'][0]['src'].lstrip('/')).convert('RGB'), (390, 620))
    collage.paste(im, (i*400+(400-im.width)//2, (650-im.height)//2))
for width in [1200, 480]:
    ImageOps.contain(collage, (width, width)).save(out / f'cover-{width}.webp', quality=90)
parent = dict(id=group, name='Christmas Character Figurines', priceCents=2499, basePriceCents=1999,
    deliveryExtraCents=0, pricingSchemaVersion=2, shippingPriceMode='included', shippingFeeCents=0,
    pickupPriceDifferenceCents=0, category='Christmas décor', seasonal=True,
    description='Choose your Christmas companion: Knit-Look Santa, Cosy Jumper Snowman or Christmas Baby Axolotl.',
    included='One finished figurine in your selected design. Each design is sold separately; this is not a set of three.',
    dimensions='Santa: approximately 10 cm tall. Snowman: 8.3 cm tall. Axolotl: 10 cm long.',
    notes='Select one design per item. No lights. Colours may vary slightly from reference photos. Knit textures are printed, not fabric.',
    images=[dict(src=f'/media/shop/{group}/cover-1200.webp', thumb=f'/media/shop/{group}/cover-480.webp', alt='Santa, Snowman and Baby Axolotl — three separately selectable Christmas figurines')],
    groupedDesigns=[dict(id=p['id'], label=p['name'], optionIds=[p['id']]) for p in children],
    variants=[dict(id=p['id'], label=p['name'], priceCents=p['priceCents'], basePriceCents=p['basePriceCents'], deliveryExtraCents=0, pricingSchemaVersion=2, dimensions=p['dimensions']) for p in children],
    variantLabel='Design', galleryOverviewCover=True, launchReady=False, productionReviewed=False)
parent.update(seoTitle=parent['name'], seoDescription=parent['description'])
# This generated lifestyle image is only a cover: keep each original licensed
# product gallery and design selection tied to the real reference photography.
cover_png = out / 'cover-lifestyle-generated.png'
if cover_png.exists():
    cover = Image.open(cover_png).convert('RGB')
    for width in [1200, 480]:
        ImageOps.contain(cover, (width, width)).save(out / f'cover-{width}.webp', 'WEBP', quality=88, method=6)
    parent['images'][0]['alt'] = 'Generated Christmas lifestyle cover showing the three available character figurines; reference product gallery follows.'
products.insert(products.index(children[0]), parent)
data['products'] = products
lookup = {p['id']: p for p in products}
docs = []
for doc in data['documents']:
    if doc['id'] in ids or doc['id'] == group:
        continue
    doc['products'] = [lookup[p['id']] for p in doc['products']]
    docs.append(doc)
docs.append(dict(id=group, template='design', categoryIds=['seasonal','home-decor'], products=[parent]+children, pickupPriceDifferenceCents=0, shippingPreset='existing', fulfillmentConfirmed=False))
data['documents'] = docs
data['listingIds'] = [p['id'] for p in products if not p.get('listingGroup')]
for c in data['costAssumptions']:
    if c['id'] not in prices: continue
    price = prices[c['id']] / 100
    c['deliveredCAD'] = price
    c['feeAllowanceCAD'] = round(price*.03+.3, 2)
    c['scenarioCostCAD'] = round(c['materialAllowanceCAD']+c['sourcePrintHours']*c['machineHourlyAllowanceCAD']+c['handsOnMinutesAllowance']/60*c['labourHourlyAllowanceCAD']+c['packagingAllowanceCAD']+c['shippingAllowanceCAD']+c['lightingAllowanceCAD']+price*.03+.3, 2)
    c['scenarioContributionCAD'] = round(price-c['scenarioCostCAD'], 2)
data['ownerPriceUpdate'] = '2026-10-15: selected figurines 24.99 each; Meowy Christmas Tree Topper 24.99; not a bundle. Fireside Glow unchanged.'
def save(path, value): path.write_text(json.dumps(value, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
save(path, data)
save(repo / 'commerce/christmas-preview-products.json', products)
layoutpath = repo / 'commerce/christmas-layout-draft.json'
layout = json.loads(layoutpath.read_text(encoding='utf-8'))
layout['collection']['products'] = data['listingIds']
save(layoutpath, layout)
print('Updated owner prices and three-design figurine listing; no live catalog changed.')
