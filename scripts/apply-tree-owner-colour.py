"""Replace one tree gallery photo with an owner-referenced colour edit in preview only."""
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps

repo = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('index', type=int)
parser.add_argument('image')
parser.add_argument('prompt_file')
args = parser.parse_args()
state_path = repo / 'commerce/christmas-preview.json'
data = json.loads(state_path.read_text(encoding='utf-8'))
product = next(p for p in data['products'] if p['id'] == 'endless-swirling-tree')
previous = product['images'][args.index]
record_dir = repo / 'reports/christmas/tree-owner-colour-v3'
record_dir.mkdir(parents=True, exist_ok=True)
source_copy = record_dir / f'{args.index}-edited.png'
shutil.copyfile(args.image, source_copy)
folder = repo / 'public/media/shop/endless-swirling-tree'
with Image.open(args.image) as source:
    im = ImageOps.exif_transpose(source).convert('RGB')
    for width in (1200, 480):
        ImageOps.contain(im, (width, width * 2)).save(folder / f'owner-green-v3-{args.index}-{width}.webp', 'WEBP', quality=90, method=6)
prefix = f'/media/shop/endless-swirling-tree/owner-green-v3-{args.index}'
updated = dict(previous)
updated.update({'src':prefix+'-1200.webp', 'thumb':prefix+'-480.webp',
    'alt':f'Swirling Christmas Tree — photo {args.index + 1}, colours edited to match the owner’s printed green and gold tree.',
    'colourMatchedToOwner':True, 'originalSrc':previous.get('originalSrc', previous['src'])})
product['images'][args.index] = updated
lookup = {p['id']:p for p in data['products']}
for doc in data.get('documents', []):
    doc['products'] = [lookup[p['id']] for p in doc['products']]
for path, obj in ((state_path, data), (repo/'commerce/christmas-preview-products.json', data['products'])):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
ledger_path = record_dir/'edits.json'
ledger = json.loads(ledger_path.read_text(encoding='utf-8')) if ledger_path.exists() else {}
ledger[str(args.index)] = {'tool':'built-in image_gen', 'prompt':Path(args.prompt_file).read_text(encoding='utf-8'),
    'original':updated['originalSrc'], 'output':str(source_copy), 'website':updated['src'], 'published':False}
ledger_path.write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(f'Updated tree photo {args.index + 1} in unpublished preview')
