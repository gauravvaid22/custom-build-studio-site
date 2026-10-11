"""Import reviewed Drop 292 media and the owner's two collection covers.
Usage: python scripts/import-clothing-can-holders-ii.py PRIVATE_MEDIA_ROOT COVER_FOLDER
Original packages stay outside the public repository. Re-running is idempotent.
"""
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MEDIA, COVERS = (Path(value).resolve() for value in sys.argv[1:3])
GROUP = 'can-holder-designs-ii'
rows = [
    ('hoodie', 'Hoodie', 2999, 110, 193, 224, 'A miniature pullover hoodie gives your drink a relaxed, playful look. A fun little gift for a desk, table or game night.'),
    ('puffer-jacket', 'Puffer Jacket', 2999, 120, 186, 201, 'A quilted jacket look with a contrasting zip dresses up your favourite drink. A decorative conversation piece for your desk or table.'),
    ('leather-jacket', 'Leather Jacket', 3499, 120, 358, 404, 'A leather-jacket-inspired design with collar and zip details adds a little attitude to your drink. The holder is rigid plastic, not leather.'),
    ('bathrobe', 'Bathrobe', 2999, 110, 361, 361, 'Let your drink lounge in a miniature bathrobe, complete with collar, pockets and a tied belt. A lighthearted gift for slow evenings.'),
    ('suede-jacket', 'Suede Jacket', 2999, 120, 187, 228, 'A suede-jacket-inspired design with western-style panels brings character to your drink. The holder is rigid plastic, not suede.'),
    ('varsity-jacket', 'Varsity Jacket', 2999, 120, 203, 262, 'Sporty sleeves, pockets and button details give your drink a classic varsity-jacket look. A playful accessory for a desk or game night.'),
]
catalog_path = ROOT / 'commerce/products.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
managed_path = ROOT / 'commerce/candy-can-source.json'
managed = json.loads(managed_path.read_text(encoding='utf-8'))
record = {'reviewedAt': '2026-10-11', 'drop': 'https://platform.stlflix.com/drops/drop-292',
          'privateMediaRoot': '../private-production/can-holders-ii-2026-10-11',
          'pricingNote': 'Provisional CAD prices include $10 shipping allowance. Pickup is $10 less. Cost review still needs sliced grams and measured labour; efficient multipart assembly assumed, not high-purge multicolour printing.',
          'benchmarks': [{'url': 'https://3dcentral.ca/product/hoodie-can-holder-sleeve/', 'priceCad': 14.99, 'shipping': 'extra below $149'}, {'url': 'https://3dproducts.ca/', 'priceCad': 25, 'product': 'NFL hoodie can holder', 'shipping': 'quoted'}],
          'products': []}

def optimize(photo, destination, name):
    destination.mkdir(parents=True, exist_ok=True)
    with Image.open(photo) as original:
        rgb = ImageOps.exif_transpose(original).convert('RGB')
        for size in (480, 1200):
            output = rgb.copy()
            output.thumbnail((size, size), Image.Resampling.LANCZOS)
            output.save(destination / f'{name}-{size}.webp', 'WEBP', quality=82, method=6)
    return {'src': f'/media/shop/{destination.name}/{name}-1200.webp', 'thumb': f'/media/shop/{destination.name}/{name}-480.webp'}

for prefix, label, cents, height, mono, multipart, description in rows:
    slug = prefix + '-can-holder'
    folder = MEDIA / slug
    jpgs = sorted(folder.rglob('*.jpg'))
    photos = [path for path in jpgs if (match := re.search(r'(\d+)_', path.name)) and int(match[1]) <= 5]
    if len(photos) != 5:
        raise ValueError(f'Expected five reviewed standard-colour photos for {slug}')
    videos = list(folder.rglob('*.webm'))
    if len(videos) != 1:
        raise ValueError(f'Expected one video for {slug}')
    destination = ROOT / 'public/media/shop' / slug
    images = [{**optimize(photo, destination, str(i)), 'alt': f'{label} Can Holder — product view {i}; beverage can not included', 'sourceFile': photo.name} for i, photo in enumerate(photos, 1)]
    shutil.copyfile(videos[0], destination / f'{slug}.webm')
    product = {'id': slug, 'name': f'{label} Can Holder', 'category': 'Can holders', 'seasonal': False, 'priceCents': cents,
               'description': description, 'included': 'One assembled decorative can holder in colours similar to the main photo. Beverage can, drink and display props are not included.',
               'dimensions': f'Approximately {height} mm high. Based on the original design; width and depth are not yet measured.',
               'notes': 'A rigid decorative beverage-can holder, not fabric or an insulated cooler. The photos show a regular-shaped can. Slim, tall and wide cans may not fit: contact us before ordering if your can differs. Keep away from high heat; wipe clean with a damp cloth. Colours follow the main photo; shades may vary. Reference videos may show other finishes. Ask us before ordering for a custom colour.',
               'images': images, 'video': f'/media/shop/{slug}/{slug}.webm', 'productionReviewed': False,
               'source': f'https://platform.stlflix.com/product/{slug}', 'listingGroup': GROUP}
    catalog = [p for p in catalog if p['id'] != slug] + [product]
    item = {'id': slug, 'name': product['name'], 'description': description, 'category': 'Can holders', 'priceCents': cents,
            'source': product['source'], 'drop': record['drop'], 'heightMm': height,
            'tags': ['can holder', 'novelty drink accessory', 'Edmonton made'],
            'productionEstimates': {'monoMinutes': mono, 'multipartMinutes': multipart},
            'photos': [p.name for p in photos], 'videoSource': videos[0].name,
            'excludedPhotos': [p.name for p in jpgs if p not in photos], 'excludedReason': 'Alternative colours: the standard product follows the first photo.',
            'sourcePackage': slug + '-media-package.zip'}
    record['products'].append(item)
    managed['products'] = [p for p in managed['products'] if p['id'] != slug] + [item]

old = next(p for p in catalog if p['id'] == 'can-holder-designs')
old['name'] = 'Clothing Can Holders — Choose Your Design'
new_designs = [next(p for p in catalog if p['id'] == prefix + '-can-holder') for prefix, *_ in rows]
new = {**new_designs[0], 'id': GROUP, 'name': 'Clothing Can Holders II — Choose Your Design',
       'description': 'Six fresh looks for your drink: hoodie, puffer jacket, leather jacket, bathrobe, suede jacket and varsity jacket. Choose one design; its photos, size and price update below. One holder per item, not a set. Beverage can not included.',
       'priceCents': min(p['priceCents'] for p in new_designs), 'variantLabel': 'Design',
       'variants': [{'id': p['id'], 'label': p['name'], 'priceCents': p['priceCents'], 'dimensions': p['dimensions']} for p in new_designs],
       'groupedDesigns': [{'id': p['id'], 'label': p['name'].replace(' Can Holder', ''), 'optionIds': [p['id']]} for p in new_designs],
       'images': [p['images'][0] for p in new_designs], 'source': record['drop']}
new.pop('listingGroup', None)
new.pop('video', None)
for group, filename in [(old, 'CAN HOLDER II COVER.png'), (new, 'CAN HOLDER  COVER.png')]:
    cover = {**optimize(COVERS / filename, ROOT / 'public/media/shop' / group['id'], 'cover'),
             'alt': f"{group['name'].split(' — ')[0]} — four featured designs; choose one holder, drinks not included", 'sourceFile': filename}
    group['images'] = [cover] + [image for image in group['images'] if image.get('sourceFile') != filename and '/cover-' not in image['src']]
    group['galleryOverviewCover'] = True
catalog = [p for p in catalog if p['id'] != GROUP] + [new]
collections_path = ROOT / 'commerce/collections.json'
collections = json.loads(collections_path.read_text(encoding='utf-8'))
for collection in collections:
    if collection['id'] in ('can-holders', 'home-decor'):
        collection['products'] = list(dict.fromkeys(collection['products'] + [GROUP]))
    if collection['id'] == 'can-holders':
        collection.update({'description': 'Explore two collections of clothing-inspired can holders. Choose from 12 designs, from a suit and knight armour to hoodies and jackets. One finished holder per item; beverage cans are not included.',
                           'seoDescription': 'Shop 12 clothing-inspired soda and beverage can holder designs made in Edmonton. Hoodies, jackets, robes, suits and more. Free Canadian shipping or local pickup.', 'coverProduct': GROUP})
for path, data in [(catalog_path, catalog), (managed_path, managed), (collections_path, collections), (ROOT / 'commerce/clothing-can-holders-ii-source.json', record)]:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('Imported six designs, 30 photos, six videos and two collection covers.')
