"""Import reviewed, licensed candy-holder and Drop 310 media.
Usage: python scripts/import-candy-can.py PRIVATE_MEDIA_ROOT
Only selected images and WebM are public. Production models stay private.
"""
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'commerce/candy-can-source.json'
source = json.loads(source_path.read_text(encoding='utf-8'))
media_root = Path(sys.argv[1]).resolve()
catalog_path = ROOT / 'commerce/products.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
for item in source['products']:
    slug = item['id']
    folder = media_root / slug
    destination = ROOT / 'public/media/shop' / slug
    destination.mkdir(parents=True, exist_ok=True)
    photos = []
    for path in folder.iterdir():
        match = re.search(r'(?:Holder|Dispenser)_?(\d+)_', path.name)
        if path.suffix.lower() in ('.jpg', '.png', '.jpeg') and match and int(match[1]) in item['photoNumbers']:
            photos.append((int(match[1]), path))
    photos.sort(key=lambda row: row[0])
    if len(photos) != len(item['photoNumbers']):
        raise ValueError(f'Missing reviewed photos: {slug}')
    images = []
    for index, (_, photo) in enumerate(photos, 1):
        with Image.open(photo) as original:
            rgb = ImageOps.exif_transpose(original).convert('RGB')
            for size in (480, 1200):
                output = rgb.copy()
                output.thumbnail((size, size), Image.Resampling.LANCZOS)
                output.save(destination / f'{index}-{size}.webp', 'WEBP', quality=82, method=6)
        images.append({'src': f'/media/shop/{slug}/{index}-1200.webp', 'thumb': f'/media/shop/{slug}/{index}-480.webp',
                       'alt': f"{item['name']} — product view {index}; {'beverage can' if item['category'] == 'Can holders' else 'candy'} not included",
                       'sourceFile': photo.name})
    videos = list(folder.glob('*.webm'))
    if len(videos) != 1:
        raise ValueError(f'Expected one source video: {slug}')
    shutil.copyfile(videos[0], destination / f'{slug}.webm')
    is_can = item['category'] == 'Can holders'
    included = ('One assembled decorative can holder in colours similar to the main photo. Beverage can, drink and display props are not included.' if is_can else
                'One finished candy holder. Candy and display props are not included.')
    if slug == 'melting-pumpkin-candy-dispenser':
        included = 'One finished pumpkin candy container with its removable stem lid. Candy and display props are not included.'
    if slug == 'walkin-pumpkin-candy-holder':
        included = 'One assembled pumpkin candy holder with its handle and articulated legs. Candy and display props are not included.'
    notes = ('Decorative beverage-can holder; not an insulated cooler. The photos show a regular-shaped can. Slim, tall and wide cans may not fit: contact us before ordering if your can differs. Keep away from high heat and wipe clean with a damp cloth.' if is_can else
             'For individually wrapped treats or decorative storage. Not intended for direct contact with unwrapped food. Keep away from heat; wipe clean with a damp cloth. No lighting included.')
    notes += ' Standard colours follow the main photo; shades may vary. Reference videos may show alternative finishes. Ask us before ordering for a custom colour.'
    product = {'id': slug, 'name': item['name'], 'priceCents': item['priceCents'], 'category': item['category'], 'seasonal': not is_can,
               'description': item['description'], 'included': included, 'dimensions': f"Approximately {item['heightMm']} mm high. Height is based on the original design; width and depth are not yet measured.",
               'notes': notes, 'images': images, 'video': f'/media/shop/{slug}/{slug}.webm', 'productionReviewed': False, 'source': item['source']}
    catalog = [p for p in catalog if p['id'] != slug] + [product]
    item.update({'photos': [p.name for _, p in photos], 'videoSource': videos[0].name})
    print(f'Imported {slug}: {len(images)} images + WebM')
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
source_path.write_text(json.dumps(source, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
path = ROOT / 'commerce/collections.json'
collections = json.loads(path.read_text(encoding='utf-8'))
can_ids = [p['id'] for p in source['products'] if p['category'] == 'Can holders']
candy_ids = [p['id'] for p in source['products'] if p['category'] != 'Can holders']
for collection in collections:
    if collection['id'] in ('halloween', 'seasonal'):
        collection['products'] = list(dict.fromkeys(collection['products'] + candy_ids))
    if collection['id'] == 'home-decor':
        collection['products'] = list(dict.fromkeys(collection['products'] + can_ids + candy_ids))
collections = [c for c in collections if c['id'] != 'can-holders'] + [{
    'id': 'can-holders', 'kind': 'collection', 'name': 'Novelty can holders', 'shortName': 'Can holders',
    'eyebrow': 'A LITTLE CHARACTER / EVERYDAY DRINKS', 'heading': 'Give your drink some character.',
    'description': 'Shop six clothing-inspired beverage can holders, from a suit and tie to knight armour. Finished gifts made in Edmonton for desks, game nights and tables. Beverage cans are not included.',
    'seoDescription': 'Novelty soda and beverage can holders made in Edmonton: suit, overalls, kimono, apron, knight armour and overcoat designs. Free Canadian shipping or Edmonton pickup.',
    'coverProduct': 'knight-armor-can-holder', 'products': can_ids
}]
path.write_text(json.dumps(collections, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
