"""Import licensed Drop 367 desk-version media. Production archives stay private.
Usage: python scripts/import-photo-frames.py PATH_TO_EXTRACTED_MEDIA_PACKAGES
"""
import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / 'commerce/photo-frames-source.json').read_text(encoding='utf-8'))
INPUT = Path(sys.argv[1]).resolve()
catalog_path = ROOT / 'commerce/products.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
for item in SOURCE['products']:
    slug = item['id']
    folder = INPUT / slug
    destination = ROOT / 'public/media/shop' / slug
    destination.mkdir(parents=True, exist_ok=True)
    # Numbered views 1–4 show the desk version; omit magnet backs and alternative finishes.
    photos = sorted([(int(m.group(1)), p) for p in folder.iterdir()
                     if p.suffix.lower() in ('.jpg', '.jpeg', '.png')
                     and (m := re.search(r'(?:^|_)([1-4])_', p.name))], key=lambda row: row[0])
    if len(photos) < 3:
        raise ValueError(f'Missing desk-version photos: {slug}')
    images = []
    for index, (_, photo) in enumerate(photos, 1):
        with Image.open(photo) as original:
            rgb = ImageOps.exif_transpose(original).convert('RGB')
            for size in (480, 1200):
                output = rgb.copy()
                output.thumbnail((size, size), Image.Resampling.LANCZOS)
                output.save(destination / f'{index}-{size}.webp', 'WEBP', quality=82, method=6)
        images.append({'src': f'/media/shop/{slug}/{index}-1200.webp', 'thumb': f'/media/shop/{slug}/{index}-480.webp',
                       'alt': f"{item['name']} — {'photo display example' if index == 1 else f'desk holder view {index}'}",
                       'sourceFile': photo.name})
    videos = list(folder.glob('*.webm'))
    if len(videos) != 1:
        raise ValueError(f'Expected one product video for {slug}')
    shutil.copyfile(videos[0], destination / f'{slug}.webm')
    item.update({'source': 'https://platform.stlflix.com/product/' + slug,
                 'photos': [photo.name for _, photo in photos], 'videoSource': videos[0].name})
    product = {'id': slug, 'name': item['name'], 'priceCents': item['priceCents'],
               'category': 'Personalized photo holders', 'seasonal': False,
               'personalization': {'kind': 'photo-print', 'photoCount': SOURCE['photoCount']},
               'description': item['description'],
               'included': 'One assembled desk photo holder with one customer-supplied photo printed, trimmed and fitted. Reference photographs are examples; other props are not included.',
               'dimensions': 'Holder body: approximately ' + ' × '.join(map(str, item['bodyMm'])) + ' mm. The photo extends above the holder; these are not photo-print dimensions.',
               'notes': 'Small decorative desktop keepsake, not a standard 4 × 6 inch frame. Photo is cropped to suit the holder. Similar colours to the reference photos; exact shades may vary. Desk version only; no magnets. Keep away from heat and moisture.',
               'images': images, 'video': f'/media/shop/{slug}/{slug}.webm',
               'productionReviewed': False, 'source': item['source']}
    catalog = [p for p in catalog if p['id'] != slug] + [product]
    print(f'Imported {slug}: {len(images)} images + video')
catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(ROOT / 'commerce/photo-frames-source.json').write_text(json.dumps(SOURCE, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
path = ROOT / 'commerce/collections.json'
collections = json.loads(path.read_text(encoding='utf-8'))
ids = [p['id'] for p in SOURCE['products']]
personalized = next(c for c in collections if c['id'] == 'personalized-gifts')
personalized.update({'eyebrow': 'YOUR PHOTOS / PERSONAL KEEPSAKES', 'heading': 'Your memories. Made personal.',
 'description': 'Personal photo lamps and small photo holders, made in Edmonton. Upload your favourite image and we turn it into a keepsake, ready to gift.',
 'seoDescription': 'Shop personalized photo gifts made in Edmonton: custom photo lamps and decorative photo holders with your photo print included. Free tracked Canadian shipping or Edmonton pickup.',
 'products': ['lithophane-table-lamp'] + ids})
collection = {'id': 'photo-frames', 'kind': 'collection', 'name': 'Personalized Photo Holders', 'shortName': 'Photo holders',
 'eyebrow': 'SMALL FRAMES / REAL MEMORIES', 'heading': 'A little home for your favourite photo.',
 'description': 'Choose a floral, dinosaur, camera or travel-inspired desk holder. Upload one photo and we print, trim and fit it for you. Small personalized gifts made in Edmonton, with Canadian shipping included.',
 'seoDescription': 'Personalized mini photo frames and desk photo holders with a photo print included. Floral, dinosaur, camera and pet-inspired designs made in Edmonton. Free Canadian shipping.',
 'coverProduct': 'daisy-duo-photo-frame', 'products': ids}
collections = [c for c in collections if c['id'] != collection['id']] + [collection]
path.write_text(json.dumps(collections, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
