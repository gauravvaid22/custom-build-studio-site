"""Add generated, reviewed lifestyle covers while retaining genuine reference photos."""
from pathlib import Path
import json
from PIL import Image, ImageOps

repo = Path(__file__).resolve().parents[1]
state_path = repo/'commerce/christmas-preview.json'
data = json.loads(state_path.read_text(encoding='utf-8'))
public_products = data['products']
changes=[]
for p in public_products:
    # Group overview covers are managed separately; no other image is rewritten.
    folder=repo/'public/media/shop'/p['id']
    source=folder/'staged-generated.png'
    if not source.exists():
        continue
    im=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    for width in (1200,480):
        ImageOps.contain(im,(width,width*2)).save(folder/f'staged-cover-{width}.webp','WEBP',quality=88,method=6)
    image={'src':f'/media/shop/{p["id"]}/staged-cover-1200.webp',
           'thumb':f'/media/shop/{p["id"]}/staged-cover-480.webp',
           'alt':f'Generated lifestyle staging of {p["name"]}; original product photos follow.',
           'generatedLifestyle':True}
    p['images']=[image]+[x for x in p['images'] if x.get('src') != image['src']]
    changes.append({'id':p['id'],'image':image['src']})
lookup={p['id']:p for p in public_products}
for doc in data['documents']:
    doc['products']=[lookup[p['id']] for p in doc['products']]
def save(path,obj): path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
save(state_path,data)
save(repo/'commerce/christmas-preview-products.json',public_products)
print(json.dumps(changes))
