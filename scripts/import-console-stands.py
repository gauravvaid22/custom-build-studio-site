"""Import licensed Community Drop 26 media. STL/3MF archives remain private.
Usage: python scripts/import-console-stands.py PRIVATE_MEDIA_ROOT
"""
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'commerce/console-stands-source.json'
source = json.loads(source_path.read_text(encoding='utf-8'))
media_root = Path(sys.argv[1]).resolve()
catalog_path = ROOT / 'commerce/products.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
for item in source['products']:
    slug = item['id']
    folder = media_root / slug
    destination = ROOT / 'public/media/shop' / slug
    destination.mkdir(parents=True, exist_ok=True)
    # The numbered black-background views show the product; unnumbered images
    # are slicer screenshots. Omit the final alternative single-colour finish.
    limit = 8 if slug.startswith('neon-') else 6 if slug.startswith('runestone-') else 7
    photos = sorted([(int(m.group(1)), p) for p in folder.iterdir()
                     if p.suffix.lower() in ('.png', '.jpg', '.jpeg')
                     and (m := re.search(r'Console_Stand_?(\d+)_', p.name))
                     and int(m.group(1)) <= limit
                     and Image.open(p).convert('RGB').getpixel((0, 0)) == (0, 0, 0)], key=lambda row: row[0])
    if len(photos) < 3:
        raise ValueError(f'Missing product views: {slug}')
    main_view = 3 if slug.startswith(('neon-', 'runestone-')) else 4
    photos.sort(key=lambda row: (row[0] != main_view, row[0]))
    images = []
    for index, (source_number, photo) in enumerate(photos, 1):
        with Image.open(photo) as original:
            rgb = ImageOps.exif_transpose(original).convert('RGB')
            for size in (480, 1200):
                output = rgb.copy()
                output.thumbnail((size, size), Image.Resampling.LANCZOS)
                output.save(destination / f'{index}-{size}.webp', 'WEBP', quality=82, method=6)
        images.append({'src': f'/media/shop/{slug}/{index}-1200.webp', 'thumb': f'/media/shop/{slug}/{index}-480.webp',
                       'alt': f"{item['name']} — {'console placement example; console not included' if source_number < main_view else f'stand detail view {index}'}",
                       'sourceFile': photo.name})
    videos = list(folder.glob('*.webm'))
    if len(videos) != 1:
        raise ValueError(f'Expected one video for {slug}')
    shutil.copyfile(videos[0], destination / f'{slug}.webm')
    item.update({'photos': [photo.name for _, photo in photos], 'videoSource': videos[0].name})
    included = 'One assembled decorative PS5 console stand for the selected console model, with its matching mounting screw. Console, controller, games and other display props are not included. No lighting or charging electronics.'
    notes = 'Choose Original PS5 or PS5 Slim to match your console; PS5 Pro compatibility is not offered. Similar colours to the reference photos; exact shades may vary. Keep console ventilation clear. Independent accessory; not made or endorsed by Sony.'
    dimensions = f"Approximately {item['heightMm']} mm high (stand only). Width and depth are pending production measurement; console not included in these dimensions."
    variants = [{'id': v['id'], 'label': v['label'], 'priceCents': v['priceCents'], 'dimensions': v['label'] + ' version. ' + dimensions} for v in item['options']]
    product = {'id': slug, 'name': item['name'], 'priceCents': item['priceCents'], 'category': 'PS5 console stands', 'seasonal': False,
               'description': item['description'], 'included': included, 'dimensions': dimensions, 'notes': notes,
               'variantLabel': 'Console model', 'variants': variants, 'images': images, 'video': f'/media/shop/{slug}/{slug}.webm',
               'productionReviewed': False, 'source': item['source']}
    children = [{**product, 'id': v['id'], 'name': item['name'] + ' — ' + v['label'], 'priceCents': v['priceCents'], 'dimensions': v['dimensions'],
                 'variantOf': slug, 'images': [images[0]]} for v in variants]
    for child in children:
        for key in ('variants', 'variantLabel', 'video'):
            child.pop(key, None)
    ids = {slug, *(v['id'] for v in variants)}
    catalog = [p for p in catalog if p['id'] not in ids] + [product] + children
    print(f'Imported {slug}: {len(images)} photos, video, 2 console options')
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
source_path.write_text(json.dumps(source, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
path = ROOT / 'commerce/collections.json'
collections = json.loads(path.read_text(encoding='utf-8'))
ids = [p['id'] for p in source['products']]
gaming = next(c for c in collections if c['id'] == 'gaming-desk')
gaming['products'] = list(dict.fromkeys(gaming['products'] + ids))
collection = {'id': 'console-stands', 'kind': 'collection', 'name': 'PS5 Console Stands', 'shortName': 'Console stands',
              'eyebrow': 'YOUR CONSOLE / YOUR STYLE', 'heading': 'Give your PS5 a stand with character.',
              'description': 'Explore six sculptural PS5 console stands, from crescent moons to retro cityscapes. Choose your design and console model. Made in Edmonton, with free tracked Canadian shipping or local pickup.',
              'seoDescription': 'Shop decorative PS5 console stands for original PlayStation 5 and PS5 Slim. Moon, sci-fi, runestone and retro gaming designs made in Edmonton. Free Canadian shipping.',
              'coverProduct': 'neon-cityscape-console-stand', 'products': ids}
collections = [c for c in collections if c['id'] != collection['id']] + [collection]
path.write_text(json.dumps(collections, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
