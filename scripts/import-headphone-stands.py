"""Import the licensed Drop 338 media after extracting its six media packages locally.

Usage: python scripts/import-headphone-stands.py PATH_TO_EXTRACTED_PACKAGES
Only the selected public marketing images and WebM previews are copied. Do not
put STL/3MF, instructions, or complete media-package archives in this repo.
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / "commerce/headphone-stands-source.json").read_text(encoding="utf-8"))
INPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
if not INPUT or not INPUT.is_dir():
    raise SystemExit("Pass the directory containing the six extracted media-package folders.")

catalog_path = ROOT / "commerce/products.json"
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
existing = {product["id"] for product in catalog}

for item in SOURCE["products"]:
    slug = item["id"]
    source_dir = INPUT / slug
    if not source_dir.is_dir():
        raise FileNotFoundError(source_dir)
    destination = ROOT / "public/media/shop" / slug
    destination.mkdir(parents=True, exist_ok=True)
    images = []
    for index, name in enumerate(item["photos"], 1):
        source_file = source_dir / name
        if not source_file.is_file():
            raise FileNotFoundError(source_file)
        with Image.open(source_file) as original:
            converted = ImageOps.exif_transpose(original).convert("RGB")
            for size in (480, 1200):
                preview = converted.copy()
                preview.thumbnail((size, size), Image.Resampling.LANCZOS)
                preview.save(destination / f"{index}-{size}.webp", "WEBP", quality=82, method=6)
        images.append({
            "src": f"/media/shop/{slug}/{index}-1200.webp",
            "thumb": f"/media/shop/{slug}/{index}-480.webp",
            "alt": f"{item['name']} — {'front view' if index == 1 else f'view {index}'}",
            "sourceFile": name,
        })
    video_file = source_dir / item["video"]
    if not video_file.is_file():
        raise FileNotFoundError(video_file)
    shutil.copyfile(video_file, destination / f"{slug}.webm")
    if slug not in existing:
        catalog.append({
            "id": slug,
            "name": item["name"],
            "priceCents": item["priceCents"],
            "category": "Headphone stands",
            "seasonal": False,
            "description": item["description"],
            "included": "One assembled physical headphone stand. Headphones, phone, pens and other photo props are not included.",
            "dimensions": f"Source model: approximately {item['heightMm']} mm high. Finished size may vary slightly.",
            "notes": "Made to order in a colour similar to the reference photos; exact shades and finish may vary. Ask about other colours before checkout. Check device fit with us if you have an unusually large headset or phone case.",
            "images": images,
            "video": f"/media/shop/{slug}/{slug}.webm",
            "productionReviewed": False,
            "source": item["source"],
        })
        existing.add(slug)
    print(f"Imported {slug}: {len(images)} photos + 1 video")

catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
