"""Install reviewed background edits in the local Christmas preview only."""
import json, shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports/christmas/drop-377'
manifest = json.loads((REPORT / 'cover-backgrounds.json').read_text())
catalog_path = ROOT / 'commerce/christmas-preview-products.json'
products = json.loads(catalog_path.read_text(encoding='utf-8'))
backup = REPORT / 'products.before-backgrounds.json'
if not backup.exists(): shutil.copyfile(catalog_path, backup)
for item in manifest:
    p = next(p for p in products if p['id'] == item['id'])
    folder = ROOT / 'public/media/shop' / p['id']
    shutil.copyfile(item['output'], folder / 'grace-room-cover-v1.png')
    with Image.open(item['output']) as source:
        for width in (1200, 480):
            ImageOps.contain(source.convert('RGB'), (width, width)).save(folder / f'grace-room-cover-v1-{width}.webp', quality=90, method=6)
    prefix = f"/media/shop/{p['id']}/grace-room-cover-v1"
    cover = {'src':prefix+'-1200.webp', 'thumb':prefix+'-480.webp', 'alt':p['name']+' — digitally staged room setting; see original product views in gallery.', 'generatedLifestyle':True}
    p['images'] = [cover] + [i for i in p['images'] if 'grace-room-cover-v1' not in i['src']]
    if p.get('groupedDesigns'): p['galleryOverviewCover'] = True
lookup = {p['id']:p for p in products}
catalog_path.write_text(json.dumps(products, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
docs_path = REPORT / 'admin-drafts-separate.json'
docs = json.loads(docs_path.read_text(encoding='utf-8'))
for doc in docs:
    doc['products'] = [lookup[p['id']] for p in doc['products']]
docs_path.write_text(json.dumps(docs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Seven covers installed; original photos/videos retained. Preview only.')
