"""Optimize selected official STLFLIX gallery media for the local mask preview.

The source JPG/WebM files are stored in .tmp/mask-source and are never copied
into the public site except for the curated photos and product videos here.
Requires Pillow; it is not part of the website build.
"""

import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / ".tmp" / "mask-source"
PUBLIC = ROOT / "public" / "media" / "shop"
MANIFEST = json.loads((ROOT / "commerce" / "halloween-mask-media-source.json").read_text(encoding="utf-8"))

for slug, details in MANIFEST["products"].items():
    source_dir = SOURCES / slug.removesuffix("-halloween-mask")
    output_dir = PUBLIC / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    for index, filename in enumerate(details["selectedImageFiles"], start=1):
        source = source_dir / filename
        with Image.open(source) as opened:
            original = ImageOps.exif_transpose(opened).convert("RGB")
            for width in (480, 1200):
                picture = original.copy()
                if picture.width > width:
                    picture = picture.resize((width, round(original.height * width / original.width)), Image.Resampling.LANCZOS)
                picture.save(output_dir / f"{index}-{width}.webp", "WEBP", quality=83, method=6)

    shutil.copyfile(source_dir / details["selectedVideoFile"], output_dir / f"{slug}.webm")
    total = sum(path.stat().st_size for path in output_dir.iterdir())
    print(f"{slug}: {len(details['selectedImageFiles'])} photos, 1 video, {total / 1024 / 1024:.1f} MiB")
