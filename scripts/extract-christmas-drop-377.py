"""Extract authorized downloads privately; generate contact sheets for media review."""
import json, shutil, zipfile
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'local-product-sources/christmas-drop-377'
REPORT=ROOT/'reports/christmas/drop-377'
ledger=json.loads((REPORT/'downloads.json').read_text())
for record in ledger:
    slug=record['id']
    models=PRIVATE/'models'/slug
    media=PRIVATE/'media'/slug
    models.mkdir(parents=True,exist_ok=True);media.mkdir(parents=True,exist_ok=True)
    source=Path(record['model']); archive=models/source.name
    if not archive.exists():shutil.copy2(source,archive)
    with zipfile.ZipFile(source) as z:
        record['modelFiles']=[n for n in z.namelist() if not n.endswith('/')]
        # Keep original archive plus extracted actual multicolour geometry for inspection.
        for n in z.namelist():
            if not n.startswith('Multicolor/') or not n.lower().endswith(('.3mf','.stl')):continue
            dest=(models/n).resolve()
            if not dest.is_relative_to(models.resolve()):raise ValueError('Unsafe archive entry')
            dest.parent.mkdir(parents=True,exist_ok=True)
            if not dest.exists():dest.write_bytes(z.read(n))
    with zipfile.ZipFile(record['media']) as z:
        for n in z.namelist():
            dest=(media/n).resolve()
            if not dest.is_relative_to(media.resolve()):raise ValueError('Unsafe media entry')
            if n.endswith('/'):continue
            dest.parent.mkdir(parents=True,exist_ok=True)
            if not dest.exists():dest.write_bytes(z.read(n))
    photos=sorted(media.glob('*.png'))
    sheet=Image.new('RGB',(1000,((len(photos)+3)//4)*280),'#eee9dd');draw=ImageDraw.Draw(sheet)
    for i,p in enumerate(photos):
        im=ImageOps.contain(Image.open(p).convert('RGB'),(240,245))
        x=(i%4)*250;y=(i//4)*280
        sheet.paste(im,(x+(250-im.width)//2,y))
        draw.text((x+4,y+246),f'{i}: {p.name[:30]}',fill='black')
    sheet.save(REPORT/f'{slug}-contact.jpg')
    record['localArchive']=str(archive)
    record['localMedia']=str(media)
    record['photos']=[str(p) for p in photos]
    record['videos']=[str(p) for p in media.glob('*.webm')]
(REPORT/'download-inventory.json').write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Saved nine original model archives privately and prepared nine media contact sheets.')
