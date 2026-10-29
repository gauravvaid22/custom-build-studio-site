"""Prepare reviewed, private Christmas draft data and optimized reference media."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json, shutil, re
repo=Path(__file__).resolve().parents[1]
workspace=repo.parent
inventory=json.loads((repo/'commerce/christmas-media-source.json').read_text(encoding='utf-8'))
by_name={p['name']:p for p in inventory}
# Prices are provisional CAD delivered prices, not claimed production costs.
specs=[
 ('endless-swirling-tree','Endless Swirling Tree','Swirling Christmas Tree',3499,'19 cm tall',19.17,4,12,'A sculptural spiral tree with a sliding, swirling centre. A little holiday magic for your desk or mantel.','One finished spiral tree with star.','Endless Swirling Tree',[0,1,2,4,5]),
 ('christmas-angel','Christmas Angel','Christmas Angel Nativity Light',6499,'21 cm tall',25.92,9,25,'An angel silhouette frames a delicate nativity scene, creating a peaceful Christmas centrepiece.','One assembled angel display. Proposed price includes a light allowance; final LED and power setup needs review.','Christmas Angel',list(range(8))),
 ('meowy-christmas-tree-topper','Meowy Christmas Tree Topper','Meowy Christmas Tree Topper',3999,'27 cm tall',3.95,3.5,15,'A mischievous little cat reaches for the star. The finishing touch for a Christmas tree with personality.','One assembled cat-and-star tree topper. Tree and decorations are not included.','Meowy Christmas Tree Topper',list(range(8))),
 ('hooked-santa','hooked-santa','Knit-Look Santa',2999,'10 cm tall',8.5,2,12,'All the cosy charm of a knitted Santa, captured in a detailed printed figurine. Made for festive shelves and little gift surprises.','One finished Santa figurine. This is a printed texture, not a fabric or crocheted item.','Hooked Santa',list(range(5))),
 ('zou-christmas-baby-axolotl','zou-christmas-baby-axolotl','Christmas Baby Axolotl',2499,'10 cm long',5.1,1.5,10,'A pink articulated axolotl dressed for the holidays with a tiny Santa hat. A cheerful desk companion for creature collectors.','One finished articulated axolotl with holiday hat.','Zou Christmas Baby Axolotl',list(range(5))),
 ('christmas-gnome-set','5-gnomes','Five Christmas Gnomes',7999,'Up to approximately 14.9 cm tall',49.52,12,25,'Five whimsical gnomes with tall hats and textured beards. Arrange them together for a playful little Christmas village.','A set of five finished gnome figures. Colours are proposed from the reference palette.','5 Gnomes',[7,8,9,10,11,12,13,14,15]),
 ('bright-nativity-table-lamp','bright-nativity-table-lamp','Starlit Nativity Lantern',4999,'19 cm tall',12.53,6,20,'A golden star shines above a sheltered nativity scene. An inviting focal point for a Christmas shelf or mantel.','One assembled nativity display. A fitted battery LED tealight is proposed; final fit and battery inclusion need review.','Bright Nativity Table Lamp',[6,7,8,9,10,11]),
 ('snow-in-jumper','snow-in-jumper','Cosy Jumper Snowman',2999,'8.3 cm tall',15.35,2,12,'A little snowman wrapped in a knit-look jumper and scarf, topped with a bright red winter hat.','One finished snowman figurine. Texture is 3D printed, not knitted fabric.','Snow in Jumper',list(range(7))),
 ('village-on-the-moon-table-lamp','village-on-the-moon-table-lamp','Moonlit Christmas Village',4499,'14 cm tall',8.35,4.5,18,'A miniature village nestled inside a crescent moon. A dreamy winter scene with softly lit windows.','One assembled moon-village display. A fitted battery LED tealight is proposed; final fit and battery inclusion need review.','Village on the Moon Table Lamp',list(range(3,10))),
 ('santa-s-bonfire-table-lamp',"Santa's Bonfire Table Lamp",'Santa’s Fireside Glow',4999,'11 cm tall',9.08,5,22,'Santa and his reindeer take a quiet break beside a glowing little campfire. A colourful scene for cosy Christmas evenings.','One assembled Santa-and-reindeer display. A fitted battery LED tealight is proposed; final fit and battery inclusion need review.',"Santa's Bonfire Table Lamp",list(range(8))),
 ('santa-s-snack-hat-bowl',"Santa's Snack Hat - Bowl",'Santa Hat Treat Bowl',3499,'8.7 cm tall',4.5,3.5,12,'A bright Santa hat turned into a festive catch-all. Fill it with individually wrapped sweets or display it with little holiday treasures.','One finished decorative bowl. Contents and plants are not included. Use wrapped sweets or a separate food-safe liner. Direct food contact is not verified.',"Santa's Snack Hat - Bowl",[0,1,3,4,6]),
]
ornaments=[('santa-claus','Santa Claus',5.67),('sleeping-bear','Sleeping Bear',5.57),('sleeping-dog','Sleeping Dog',5.52),('reindeer-head','Reindeer',5.18),('snowman','Snowman',5.77),('sleeping-cat','Sleeping Cat',5.28),('lying-reindeer','Resting Reindeer',5.63),('nutcracker','Nutcracker',5.18)]
assets=repo/'public/media/shop'
products=[];sources=[];costs=[]
def optimize(id, rec, indices):
    out=assets/id;out.mkdir(parents=True,exist_ok=True);images=[]
    for k,index in enumerate(indices,1):
        src=Path(rec['photos'][index]);im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        for width in [1200,480]:
            img=ImageOps.contain(im,(width,width*2));img.save(out/f'{k}-{width}.webp','WEBP',quality=86,method=6)
        images.append({'src':f'/media/shop/{id}/{k}-1200.webp','thumb':f'/media/shop/{id}/{k}-480.webp','alt':f'{id.replace("-"," ")} — reference view {k}','sourceFile':src.name})
    videos=[]
    for k,file in enumerate(rec['videos']):
        dst=out/f'product-{k+1}.webm';shutil.copy2(file,dst);videos.append(f'/media/shop/{id}/{dst.name}')
    return images,videos
def add(id,key,name,price,dimension,hours,material,minutes,desc,included,source_slug,indices,group=None):
    images,videos=optimize(id,by_name[key],indices)
    lighting=8 if id=='christmas-angel' else 2.5 if 'lamp' in id else 0
    cost=round(material+hours*.35+minutes/60*24+2+10+lighting+price/100*.03+.3,2)
    note='For indoor decorative use. Colours will be similar to the reference photos; lighting and filament batches may produce slight shade differences. Keep away from heat. Handle small parts gently.'
    p=dict(id=id,name=name,priceCents=price,category='Christmas décor',description=desc,included=included,dimensions='Approximately '+dimension,notes=note,images=images,videos=videos,seasonal=True,source='https://platform.stlflix.com/product/'+source_slug,launchReady=False,productionReviewed=False,pickupPriceDifferenceCents=0)
    if videos:p['video']=videos[0]
    if group:p['listingGroup']=group
    p.update(basePriceCents=price-500,deliveryExtraCents=0,pricingSchemaVersion=2,shippingPriceMode="included",shippingFeeCents=0,seoTitle=name,seoDescription=desc[:300])
    products.append(p)
    sources.append(dict(id=id,source=p['source'],mediaDirectory=by_name[key]['directory'],sourcePrintHours=hours,dimensions=p['dimensions'],photos=[by_name[key]['photos'][i] for i in indices],videos=by_name[key]['videos']))
    costs.append(dict(id=id,name=name,deliveredCAD=price/100,materialAllowanceCAD=material,sourcePrintHours=hours,machineHourlyAllowanceCAD=.35,handsOnMinutesAllowance=minutes,labourHourlyAllowanceCAD=24,packagingAllowanceCAD=2,shippingAllowanceCAD=10,lightingAllowanceCAD=lighting,feeAllowanceCAD=round(price/100*.03+.3,2),scenarioCostCAD=cost,scenarioContributionCAD=round(price/100-cost,2),status='Provisional scenario: mass, actual print time, labour, packed parcel and shipping not verified.'))
for id,key,name,price,dim,hours,material,minutes,desc,included,source_name,indices in specs:
    slug='5-gnomes' if id=='christmas-gnome-set' else id
    add(id,key,name,price,dim,hours,material,minutes,desc,included,slug,indices)
group='christmas-character-ornaments'
for slug,label,hours in ornaments:
    id=slug+'-christmas-ornament'
    # Every selected angle is the actual multicolour design, never slicer screenshots.
    rec=by_name[id];indices=list(range(min(6,len(rec['photos']))))
    add(id,id,label+' Christmas Ornament',2499,'5 cm tall (source reference)',hours,.9,8,'A character bauble with festive colour and sculpted detail. '+label+' brings a little personality to your Christmas tree.','One finished '+label.lower()+' ornament. Hanging loop is part of the design; tree, ribbon and other decorations are not included.',id,indices,group)
children=[p for p in products if p.get('listingGroup')==group]
# Faithful collage of actual design photos; no generated product geometry.
out=assets/group;out.mkdir(parents=True,exist_ok=True)
collage=Image.new('RGB',(1600,1000),'#090d0c')
for i,p in enumerate(children):
    im=Image.open(repo/'public'/p['images'][0]['src'].lstrip('/'))
    im=ImageOps.contain(im,(380,470));collage.paste(im,((i%4)*400+(400-im.width)//2,(i//4)*500+(500-im.height)//2))
for w in [1200,480]:ImageOps.contain(collage,(w,w)).save(out/f'cover-{w}.webp','WEBP',quality=90)
parent=dict(id=group,name='Christmas Character Ornaments',priceCents=2499,category='Christmas ornaments',description='Eight little personalities. One very merry tree. Choose Santa, a sleepy animal, a reindeer, a snowman or a nutcracker — each ornament is made individually for you.',included='One finished ornament in your selected design. This is not a set of eight.',dimensions='Approximately 5 cm tall per source model; antlers and character details vary.',notes='Select one design per item. Reference photos show the proposed colour palette. Ribbon and Christmas tree are not included.',images=[dict(src=f'/media/shop/{group}/cover-1200.webp',thumb=f'/media/shop/{group}/cover-480.webp',alt='Eight available Christmas character ornament designs')],groupedDesigns=[dict(id=p['id'],label=label,optionIds=[p['id']]) for p,(_,label,_) in zip(children,ornaments)],variants=[dict(id=p['id'],label=label,priceCents=p['priceCents'],dimensions=p['dimensions']) for p,(_,label,_) in zip(children,ornaments)],variantLabel='Design',galleryOverviewCover=True,launchReady=False,productionReviewed=False,seasonal=True,pickupPriceDifferenceCents=0,source='https://platform.stlflix.com/drops/drop-175')
parent.update(basePriceCents=1999,deliveryExtraCents=0,pricingSchemaVersion=2,shippingPriceMode="included",shippingFeeCents=0)
for v in parent["variants"]:v.update(basePriceCents=v["priceCents"]-500,deliveryExtraCents=0,pricingSchemaVersion=2)
products.append(parent)
documents=[]
for p in products:
    if p.get('listingGroup'):continue
    documents.append(dict(id=p['id'],template='design' if p['id']==group else 'light' if p['id'] in ['christmas-angel','bright-nativity-table-lamp','village-on-the-moon-table-lamp','santa-s-bonfire-table-lamp'] else 'bundle' if p['id']=='christmas-gnome-set' else 'single',categoryIds=['seasonal','home-decor'],products=[p]+(children if p['id']==group else []),pickupPriceDifferenceCents=0,shippingPreset='existing',fulfillmentConfirmed=False))
data=dict(status='LOCAL REVIEW ONLY — not published; checkout disabled',products=products,documents=documents,costAssumptions=costs,sources=sources,listingIds=[p['id'] for p in products if not p.get('listingGroup')])
(repo/'commerce/christmas-preview.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(repo/'commerce/christmas-preview-products.json').write_text(json.dumps(products,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(f'Prepared {len(products)} records, {len(documents)} listings and media galleries. No live catalog edited.')

# Reapply owner-approved prices and grouped selections after regenerating source media.
import subprocess, sys
subprocess.run([sys.executable, str(repo/'scripts/apply-christmas-owner-updates.py')], check=True)
