"""Install one reviewed cover into the unpublished Christmas draft only."""
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageOps

repo = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("product_id")
parser.add_argument("image")
parser.add_argument("prompt_file")
args = parser.parse_args()
state_path = repo / "commerce/christmas-preview.json"
state = json.loads(state_path.read_text(encoding="utf-8"))
product = next(p for p in state["products"] if p["id"] == args.product_id)
folder = repo / "public/media/shop" / args.product_id
folder.mkdir(parents=True, exist_ok=True)
shutil.copyfile(args.image, folder / "natural-cover-v2.png")
with Image.open(args.image) as source:
    im = ImageOps.exif_transpose(source).convert("RGB")
    for width in (1200, 480):
        ImageOps.contain(im, (width, width)).save(folder / f"natural-cover-v2-{width}.webp", "WEBP", quality=90, method=6)
prefix = f"/media/shop/{args.product_id}/natural-cover-v2"
cover = {"src": prefix + "-1200.webp", "thumb": prefix + "-480.webp",
         "alt": f"Edited Christmas setting for {product['name']}; original product views are included in the gallery.",
         "generatedLifestyle": True}
product["images"] = [cover] + [i for i in product["images"] if not i.get("generatedLifestyle")]
if product.get("groupedDesigns"):
    product["galleryOverviewCover"] = True
lookup = {p["id"]: p for p in state["products"]}
for doc in state.get("documents", []):
    doc["products"] = [lookup[p["id"]] for p in doc["products"]]
for path, obj in ((state_path, state), (repo / "commerce/christmas-preview-products.json", state["products"])):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
ledger_path = repo / "reports/christmas/cover-refresh-v2.json"
ledger_path.parent.mkdir(parents=True, exist_ok=True)
ledger = json.loads(ledger_path.read_text(encoding="utf-8")) if ledger_path.exists() else {}
ledger[args.product_id] = {"updated": datetime.now(timezone.utc).isoformat(), "tool": "built-in image_gen",
    "prompt": Path(args.prompt_file).read_text(encoding="utf-8"), "output": str(folder / "natural-cover-v2.png"),
    "preview": f"http://127.0.0.1:4192/preview/christmas/{args.product_id}?analytics_test=1", "published": False}
ledger_path.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Updated unpublished cover: {args.product_id}")
