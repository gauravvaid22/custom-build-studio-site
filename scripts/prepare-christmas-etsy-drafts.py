import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
out=root/'reports/christmas/etsy-drafts-2026-10-17'
out.mkdir(parents=True,exist_ok=True)
products=json.loads((root/'commerce/christmas-preview-products.json').read_text(encoding='utf-8-sig'))
by_id={p['id']:p for p in products}
specs=[
('endless-swirling-tree','Green and Gold Spiral Christmas Tree, Tabletop Decoration','Christmas Trees',['spiral tree','tabletop tree','christmas tree decor','green gold decor','mantel decoration','holiday shelf decor','small space decor','desk christmas decor','modern christmas','winter home decor','hostess gift','holiday centerpiece','star topped tree']),
('christmas-angel','Angel Nativity Light, Christmas Table Decoration','Christmas Decorations',['angel nativity','nativity light','angel figurine','christian decor','religious christmas','holy family decor','christmas angel','nativity scene','mantel decoration','christmas display','holiday centerpiece','angel decoration','winter home decor']),
('meowy-christmas-tree-topper','Cat Christmas Tree Topper with Star','Tree Toppers',['cat tree topper','cat christmas decor','kitty tree topper','cat lover gift','whimsical christmas','star tree topper','cat decoration','christmas tree star','funny cat decor','feline holiday decor','holiday tree decor','cat with star','christmas topper']),
('christmas-character-figurines','Christmas Figurine - Choose Santa, Snowman or Axolotl','Figurines & Knick Knacks',['santa figurine','snowman figurine','axolotl christmas','knit look santa','winter shelf decor','christmas figurine','holiday desk decor','cosy christmas','axolotl figurine','santa shelf decor','snowman decoration','small holiday gift','christmas companion']),
('christmas-gnome-set','Christmas Gnome Figurines, Set of Five','Figurines & Knick Knacks',['christmas gnomes','gnome figurines','gnome set','holiday shelf decor','tiered tray decor','five gnome set','christmas display','gnome lover gift','winter mantel decor','festive figurines','holiday centerpiece','whimsical christmas','small space decor']),
('bright-nativity-table-lamp','Nativity Lantern, Christmas Tabletop Display','Christmas Decorations',['nativity lantern','nativity scene','christian decor','holy family decor','christmas display','religious christmas','nativity decoration','christmas lantern','star nativity','mantel decoration','holiday centerpiece','shelf nativity','christmas table']),
('village-on-the-moon-table-lamp','Moon Christmas Village, Tabletop Holiday Display','Christmas Decorations',['christmas village','moon village','crescent moon decor','winter village','holiday mantel decor','miniature village','christmas display','moon decoration','winter shelf decor','holiday centerpiece','small space decor','village decoration','christmas scene']),
('santa-s-bonfire-table-lamp','Santa and Reindeer Fireside Christmas Display','Christmas Decorations',['santa figurine','reindeer decor','christmas display','holiday shelf decor','santa scene','fireside santa','christmas reindeer','campfire decoration','winter mantel decor','holiday centerpiece','cosy christmas','santa decoration','festive figurines']),
('santa-s-snack-hat-bowl','Santa Hat Decorative Bowl for Wrapped Christmas Sweets','Decorative Bowls',['santa hat bowl','christmas candy bowl','wrapped candy dish','holiday table decor','festive catchall','christmas bowl','santa candy dish','holiday candy dish','santa hat decor','christmas catchall','festive entryway','holiday hostess gift','christmas table']),
('christmas-character-ornaments','Christmas Tree Ornament - Choose Your Character','Ornaments',['cat ornament','dog ornament','bear ornament','snowman ornament','reindeer ornament','nutcracker ornament','santa ornament','christmas ornament','tree decoration','animal tree decor','holiday keepsake','sleepy animal decor','character ornament'])
]
common='Printed and finished by Custom Build Studio in Edmonton, Alberta, from STLFLIX designs. These are physical decorations. Fine printed layer lines are part of the surface finish. Colours may vary slightly with lighting, screen settings and material batches.'
care='For indoor decorative use. Handle small details gently. Keep away from heat and open flames. Clean with a soft dry or slightly damp cloth. Decorative props are not included.'
delivery='In stock and ready to ship from Edmonton, Alberta, with next-day dispatch according to our processing schedule. Delivery time is additional; please check the estimated arrival date.'
manifest=[]
for pid,title,category,tags in specs:
    p=by_id[pid]
    assert len(tags)==13 and all(len(t)<=20 for t in tags),(pid,tags)
    folder=out/pid
    folder.mkdir(exist_ok=True)
    included=p['included']
    lead=p['description']
    if pid=='christmas-angel':
        included='One complete assembled angel nativity light, including its lighting setup and batteries.'
    elif pid in ['bright-nativity-table-lamp','village-on-the-moon-table-lamp','santa-s-bonfire-table-lamp']:
        included='One assembled decorative display. No light, LED tealight or batteries are included. Any illumination in reference photographs is shown as a styling example only. Use only a suitably fitted battery LED light if you choose to add lighting; never use a flame candle.'
        if pid=='village-on-the-moon-table-lamp':
            lead='A miniature Christmas village nestled inside a crescent moon, made for a winter shelf or mantel.'
        if pid=='santa-s-bonfire-table-lamp':
            lead='Santa and his reindeer take a quiet break beside a little campfire scene. A colourful display for a cosy Christmas shelf.'
    elif pid=='christmas-gnome-set':
        included='A complete set of five finished gnome figures.'
    dimensions=p['dimensions'].replace('Approximately Up to approximately','Up to approximately')
    extra=''
    if pid=='christmas-character-figurines':
        extra='Choose one design: Knit-Look Santa, Cosy Jumper Snowman or Christmas Baby Axolotl. Each is sold individually at CAD24.99. The group photograph shows available choices, not a three-piece set. Knit-look texture is printed plastic, not fabric or crochet. These are decorative collectibles, not baby toys.'
    if pid=='christmas-character-ornaments':
        extra='Choose one design: Santa Claus, Sleeping Bear, Sleeping Dog, Reindeer, Snowman, Sleeping Cat, Resting Reindeer or Nutcracker. Each is sold individually at CAD24.99. The overview shows available choices, not a set of eight.'
    description='\n\n'.join(x for x in [lead,'WHAT YOU RECEIVE\n'+included,extra,'SIZE\n'+dimensions,'HOW IT IS MADE\n'+common,'CARE\n'+care,'DELIVERY\n'+delivery] if x)
    images=[]
    candidates=list(p['images'])
    for design in p.get('groupedDesigns',[]):
        candidates.extend(by_id[design['id']]['images'][:2])
    seen=set()
    for img in candidates:
        src=img['src']
        if src in seen: continue
        seen.add(src)
        source=root/'public'/src.lstrip('/')
        dst=folder/f'{len(images)+1:02d}.jpg'
        with Image.open(source) as im:
            if im.mode!='RGB': im=im.convert('RGB')
            im.save(dst,quality=95)
        images.append(str(dst))
    if pid=='endless-swirling-tree':
        attach=Path('C:/Users/User/.codex/codex-remote-attachments/01a13b08-7327-7383-8989-5c5d01ac1d28/5D3A1FF9-237D-40D5-988D-2237F806C7DC')
        images=[str(attach/'1-Photo-1.jpg'),str(attach/'2-Photo-2.jpg')]
    item=dict(id=pid,title=title,category=category,price=f"{p['priceCents']/100:.2f}",currency='CAD',quantity=5,description=description,tags=tags,images=images,variants=[dict(label=v['label'],price=f"{v['priceCents']/100:.2f}",quantity=5) for v in p.get('variants',[])],processing='Ready to dispatch: 1 day',whenMade='2020 - 2026',section='Christmas Decor',ads=False,renewal='manual',eligibility='Unresolved: third-party STLFLIX design; no original-design claim',prelaunchChecks=['Design eligibility','Actual final-product photos for all except owner tree','Confirm measured dimensions and packed postage costs'])
    manifest.append(item)
    (folder/'listing.json').write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8')
    (folder/'description.txt').write_text(description,encoding='utf-8')
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(listings=len(manifest),images=sum(len(i['images']) for i in manifest),output=str(out))))
