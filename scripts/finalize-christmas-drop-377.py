"""Owner correction: nine separate listings, with reviewed media. LOCAL ONLY."""
import json, shutil, zipfile, struct
from pathlib import Path
from PIL import Image, ImageOps
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/christmas/drop-377'
PRIVATE=ROOT/'local-product-sources/christmas-drop-377'
SELECTED={
 'holy-family-embrace':[2,3,4,5,6],
 'heavenly-trio':[3,5,7,8,9],
 'guiding-star-tree-topper':[4,0,8],
 'evergreen-wreath':[3,5,4,7],
 'luminous-tree':[3,12,9,10,13,6,8,11],
 'village-lights':[6,7,8,10,11,12,13,14,15,4],
 'stocking-tray':[0,3,4,5,2],
 'snowflake-tray':[0,3,4,5,2],
 'christmas-tree-tray':[0,3,1],
}

def main():
 inventory=json.loads((REPORT/'download-inventory.json').read_text(encoding='utf-8'))
 previous=json.loads((REPORT/'admin-draft.json').read_text(encoding='utf-8'))
 products=[p for p in previous['products'] if p['id'] in SELECTED]
 docs=[]
 for p in products:
  slug=p['id'];record=next(x for x in inventory if x['id']==slug)
  p.pop('listingGroup',None)
  output=ROOT/'public/media/shop'/slug
  p['images']=[]
  for index,chosen in enumerate(SELECTED[slug],1):
   source=Path(record['photos'][chosen]);im=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
   for width in (1200,480):ImageOps.contain(im,(width,width*2)).save(output/f'{index}-{width}.webp',quality=87,method=6)
   p['images'].append(dict(src=f'/media/shop/{slug}/{index}-1200.webp',thumb=f'/media/shop/{slug}/{index}-480.webp',alt=f'{p["name"]} — reference view {index}',sourceFile=source.name))
  p['videos']=[]
  for index,source in enumerate(record['videos'],1):
   dst=output/f'product-{index}.webm';shutil.copy2(source,dst)
   p['videos'].append(f'/media/shop/{slug}/{dst.name}')
  if p['videos']:p['video']=p['videos'][0]
  p['notes']+=' Reference video may show alternate styles or finishes; only the described selected item/set is included.'
  if slug=='heavenly-trio':p['included']='Three finished angel figures: Halo, Heart and Star. Shelving and background decorations are not included.'
  if slug=='village-lights':p['included']='Two finished house lanterns in the pictured house designs. LED fittings and batteries await production confirmation.'
  # Read actual raw model extents for complete single-piece trays and wreath.
  if slug in ('stocking-tray','snowflake-tray','christmas-tree-tray','evergreen-wreath'):
   with zipfile.ZipFile(record['localArchive']) as z:
    name=next(n for n in z.namelist() if n.startswith('Monocolor/') and n.endswith('_Monocolor.stl'))
    raw=z.read(name);count=struct.unpack_from('<I',raw,80)[0]
    if len(raw)!=84+50*count:raise ValueError('Expected binary STL')
    dtype=np.dtype([('normal','<f4',3),('vertices','<f4',(3,3)),('attribute','<u2')])
    vertices=np.frombuffer(raw,dtype=dtype,offset=84)['vertices'].reshape(-1,3)
    spans=vertices.max(axis=0)-vertices.min(axis=0)
    record['modelBoundsMM']=[round(float(v),2) for v in spans]
    p['dimensions']='Source model bounds approximately '+ ' × '.join(f'{float(v)/10:.1f}' for v in spans)+' cm (X × Y × Z; orientation varies). Printed size to confirm before launch.'
  if slug=='luminous-tree':
   # Three source styles are options within this one tree listing, not extra shop cards.
   styles=[('stars','Starry Tiers',[0,1]),('lace','Lace Tiers',[2,3,4]),('spiral','Spiral Stars',[5,6,7])]
   children=[]
   for key,label,indices in styles:
    child=dict(p,id=f'luminous-tree-{key}',name=f'Luminous Christmas Tree — {label}',listingGroup=slug,
       images=[p['images'][i] for i in indices],videos=[])
    child.pop('video',None)
    child['description']=f'{label} design. '+p['description']
    children.append(child)
   p['groupedDesigns']=[dict(id=c['id'],label=style[1],optionIds=[c['id']]) for c,style in zip(children,styles)]
   p['variants']=[dict(id=c['id'],label=style[1],priceCents=c['priceCents'],dimensions=c['dimensions'],basePriceCents=c['basePriceCents'],deliveryExtraCents=0,pricingSchemaVersion=2) for c,style in zip(children,styles)]
   p['variantLabel']='Tree style';p['galleryOverviewCover']=True
   p['included']='One finished tree lantern in your selected style. LED fitting and battery inclusion await production confirmation.'
   p['description']='Choose Starry Tiers, Lace Tiers or Spiral Stars: three white-and-gold Christmas tree designs made for a gentle battery LED glow. One selected tree per order.'
   docProducts=[p]+children
  else:docProducts=[p]
  docs.append(dict(id=slug,template='design' if p.get('groupedDesigns') else 'bundle' if slug in ('heavenly-trio','village-lights') else 'single',categoryIds=['seasonal','home-decor'],products=docProducts,pickupPriceDifferenceCents=0,shippingPreset='existing',fulfillmentConfirmed=False))
 ids={p['id'] for d in docs for p in d['products']}|{'christmas-grace-decorations'}
 path=ROOT/'commerce/christmas-preview-products.json'
 current=json.loads(path.read_text(encoding='utf-8'))
 backup=REPORT/'christmas-preview-products.before-separate.json'
 if not backup.exists():shutil.copy2(path,backup)
 current=[p for p in current if p['id'] not in ids]+[p for d in docs for p in d['products']]
 path.write_text(json.dumps(current,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 (REPORT/'admin-drafts-separate.json').write_text(json.dumps(docs,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 (REPORT/'download-inventory.json').write_text(json.dumps(inventory,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 layoutPath=ROOT/'commerce/christmas-layout-draft.json'
 layout=json.loads(layoutPath.read_text(encoding='utf-8'))
 layout['collection']['products']=[x for x in layout['collection']['products'] if x not in ids]+[d['id'] for d in docs]
 layoutPath.write_text(json.dumps(layout,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print(f'Prepared {len(docs)} separate listings, {sum(len(p["images"]) for p in products)} reviewed images and nine videos; all remain local/non-purchasable.')

if __name__=='__main__':main()
