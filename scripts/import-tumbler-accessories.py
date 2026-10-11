"""Import Drop 301's reviewed photos/video. Original packages stay private.
Usage: python scripts/import-tumbler-accessories.py PRIVATE_MEDIA_ROOT
"""
import json, re, shutil, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MEDIA = Path(sys.argv[1]).resolve()
GROUP = 'straw-topper-charm-designs'
ROWS = [
 ('final-drink', 'Final Drink — Reaper', 1499, 30, 100, 288, [9], 'A tiny hooded reaper sits on your straw, paired with a skull-and-bat charm cluster for your cup handle.'),
 ('pawsitively-hydrated', 'Pawsitively Hydrated — Cat', 1599, 40, 57, 584, [8,9], 'A playful cat hugs a ball of yarn on your straw, with matching mouse, fishbone and paw charms for your cup handle.'),
 ('deep-sips', 'Deep Sips — Octopus', 1599, 30, 72, 265, [], 'An octopus wraps its tentacles around your straw, paired with cheerful sea-creature charms for your cup handle.'),
 ('udderly-thirsty', 'Udderly Thirsty — Cow', 1699, 50, 59, 997, [], 'A little cow brings farmyard fun to your straw, with matching cow-themed charms for your cup handle.'),
 ('bamboo-break', 'Bamboo Break — Panda', 1499, 40, 52, 467, [8,9], 'A panda hugs a bamboo-inspired straw decoration, paired with panda-and-bamboo charms for your cup handle.'),
 ('thirst-slayer', 'Thirst Slayer — Dragon', 1799, 30, 54, 692, [8], 'A bright little dragon guards your straw, with flame, sword and helmet charms for a fantasy-inspired cup handle.'),
]
catalog_path = ROOT / 'commerce/products.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
record = {'reviewedAt':'2026-10-11', 'drop':'https://platform.stlflix.com/drops/drop-301',
 'privateMediaRoot':'../private-production/tumbler-accessories-2026-10-11',
 'launchReady':False, 'hardwareConfirmed':'Owner confirmed complete assembled topper, charms, chain and rings on 2026-10-11.', 'pending':['Owner cover photo', 'Owner-tested straw diameter', 'Shipping/pickup rule confirmation and Shopify shipping verification'],
 'pricingNote':'Provisional CAD set prices, shipping extra. Review sliced material, hardware, batch yield and assembly time before claiming margins. Long single-item AMS estimates are not a viable cost basis at these prices.',
 'benchmarks':[{'url':'https://www.etsy.com/ie/listing/4444936271/final-drink-straw-topper-charm','price':9.02,'currency':'EUR','shipping':'extra','note':'Regular price observed; sale 8.12 EUR. Do not compare as CAD.'}], 'products':[]}

for prefix,label,cents,height,mono,multi,excluded,description in ROWS:
 slug = prefix+'-straw-topper-and-charm'
 folder = MEDIA / slug
 dest = ROOT / 'public/media/shop' / slug
 dest.mkdir(parents=True,exist_ok=True)
 candidates = []
 for path in folder.rglob('*.png'):
  match = re.search(r'Charm_?(\d+)_',path.name)
  if match: candidates.append((int(match[1]),path))
 candidates.sort()
 if len(candidates)<8: raise ValueError('Incomplete media: '+slug)
 photos = [(n,p) for n,p in candidates if n not in excluded]
 images = []
 for n,path in photos:
  with Image.open(path) as original:
   rgb = ImageOps.exif_transpose(original).convert('RGB')
   for size in (480,1200):
    out=rgb.copy();out.thumbnail((size,size),Image.Resampling.LANCZOS)
    out.save(dest/f'{n}-{size}.webp','WEBP',quality=82,method=6)
  images.append({'src':f'/media/shop/{slug}/{n}-1200.webp','thumb':f'/media/shop/{slug}/{n}-480.webp','alt':f'{label} straw topper and handle charm set — view {n}; cup and straw not included','sourceFile':path.name})
 videos=list(folder.rglob('*.webm'))
 if len(videos)!=1: raise ValueError('Expected one video: '+slug)
 shutil.copyfile(videos[0],dest/f'{slug}.webm')
 name=label+' Straw Topper & Charm Set'
 previous = next((p for p in catalog if p['id']==slug), {})
 product={'id':slug,'name':name,'category':'Tumbler accessories','seasonal':False,'priceCents':cents,'launchReady':False,
  'description':description,'included':'One finished straw topper and matching assembled handle charm set, including its chain and rings. Cup, straw, drink and display props are not included. Choose one design, not all six.',
  'dimensions':f'Original design reference: approximately {height} mm high. This is the accessory height, not the straw diameter.',
  'notes':'Decorative accessories in colours similar to the photos; shades may vary. Straw compatibility is being checked: contact Custom Build Studio with your straw diameter before ordering. No universal cup or straw fit is claimed. Hand-wipe gently; keep away from high heat. Small parts; not a toy. Ask us before ordering for a custom colour.',
  'images':images,'video':f'/media/shop/{slug}/{slug}.webm','source':'https://platform.stlflix.com/product/'+slug,'listingGroup':GROUP,'productionReviewed':False,'pickupPriceDifferenceCents':0,'shippingFeeCents':500}
 product['launchReady']=previous.get('launchReady',False)
 if prefix=='deep-sips': product['notes']+=' Contains small magnets; keep away from children and pets.'
 item={'id':slug,'name':name,'description':description,'category':product['category'],'priceCents':cents,
  'pickupPriceDifferenceCents':0,'shippingFeeCents':500,'source':product['source'],'drop':record['drop'],'heightMm':height,'tags':['tumbler accessory','straw topper','cup charm','Edmonton made'],
  'productionEstimates':{'monoMinutes':mono,'multicolorMinutes':multi},'photos':[p.name for _,p in photos],
  'excludedPhotos':[p.name for n,p in candidates if n in excluded],'excludedReason':'Monocolour/alternative finish does not represent the standard photo finish.',
  'videoSource':videos[0].name,'sourcePackage':slug+'-media-package.zip'}
 record['products'].append(item)
 catalog=[p for p in catalog if p['id']!=slug]+[product]

designs=[next(p for p in catalog if p['id']==prefix+'-straw-topper-and-charm') for prefix,*_ in ROWS]
group={**designs[0],'id':GROUP,'name':'Straw Topper & Cup Charm Sets — Choose Your Design',
 'description':'Dress up your tumbler with a matching straw topper and handle charm set. Explore six designs: reaper, cat, octopus, cow, panda and dragon. Select one design to see its photos, video and price. Cup and straw not included.',
 'priceCents':min(p['priceCents'] for p in designs),'variantLabel':'Design',
 'variants':[{'id':p['id'],'label':label,'priceCents':p['priceCents'],'dimensions':p['dimensions']} for p,(_,label,*_) in zip(designs,ROWS)],
 'groupedDesigns':[{'id':p['id'],'label':label,'optionIds':[p['id']]} for p,(_,label,*_) in zip(designs,ROWS)],
 'images':[p['images'][0] for p in designs],'source':record['drop']}
group.pop('listingGroup',None);group.pop('video',None)
previous_group=next((p for p in catalog if p['id']==GROUP),{})

if previous_group.get('galleryOverviewCover'):
 group['galleryOverviewCover']=True
 group['images']=[previous_group['images'][0]]+group['images']
record['launchReady']=all(p['launchReady'] for p in designs)
record['pending']=['Owner-tested straw diameter','Shopify shipping verification']
catalog=[p for p in catalog if p['id']!=GROUP]+[group]
collections_path=ROOT/'commerce/collections.json'
collections=json.loads(collections_path.read_text(encoding='utf-8'))
collection={'id':'tumbler-accessories','kind':'collection','name':'Tumbler accessories','shortName':'Tumbler accessories',
 'eyebrow':'SMALL DETAILS / BIG PERSONALITY','heading':'Make your tumbler your own.',
 'description':'Explore matching straw toppers and cup-handle charm sets in six playful designs. One finished accessory set per item; cups and straws are not included.',
 'seoDescription':'Shop decorative straw toppers and tumbler handle charm sets made in Edmonton. Cat, panda, cow, octopus, dragon and reaper designs. Choose your design online.',
 'coverProduct':GROUP,'products':[GROUP]}
collections=[c for c in collections if c['id']!='tumbler-accessories']+[collection]
for c in collections:
 if c['id']=='home-decor': c['products']=list(dict.fromkeys(c['products']+[GROUP]))
for path,data in [(catalog_path,catalog),(collections_path,collections),(ROOT/'commerce/tumbler-accessories-source.json',record)]:
 path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(f'Imported six designs, {sum(len(p["photos"]) for p in record["products"])} photos and six videos. Launch blocked pending fit, shipping and cover review.')
