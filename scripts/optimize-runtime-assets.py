from pathlib import Path
from PIL import Image
import io,base64,re,urllib.parse,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
# Replace the exact rectangular SVG mask runs with identical alpha bitmap pixels.
p=root/'public/hero-poses-v130.css';s=p.read_text();before=len(s)
def compact(m):
 svg=urllib.parse.unquote(m.group(1));node=ET.fromstring(svg);d=node.find('{http://www.w3.org/2000/svg}path').attrib['d'];im=Image.new('RGBA',(384,384),(255,255,255,0));from PIL import ImageDraw
 draw=ImageDraw.Draw(im)
 for x,y,w in re.findall(r'M(\d+),(\d+)h(\d+)v1H\d+z',d):
  x,y,w=map(int,(x,y,w));draw.rectangle((x,y,x+w-1,y),fill=(255,255,255,255))
 out=io.BytesIO();im.save(out,format='PNG',optimize=True);return 'url("data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()+'")'
s=re.sub(r'url\("data:image/svg\+xml,([^\"]+)"\)',compact,s);p.write_text(s);print('Mask CSS:',before,'->',len(s),flush=True)
# Keep source art; serve smaller WebP encodings under the same HTTP asset names.
out=root/'public/assets/optimized-v149';out.mkdir(exist_ok=True);total=small=0
for p in sorted((root/'public/assets').rglob('*')):
 if 'optimized-v149' in p.parts or not p.is_file() or p.suffix.lower() not in ['.png','.webp'] or p.stat().st_size<150000:continue
 im=Image.open(p);name=str(p.relative_to(root/'public/assets')).replace('/','_')+'.webp';dest=out/name
 if 'warden' in p.name and 'tutorial' in str(p):im.thumbnail((384,384),Image.Resampling.LANCZOS)
 elif p.name=='heroes.webp':im.thumbnail((1440,1440),Image.Resampling.LANCZOS)
 im.save(dest,'WEBP',quality=88,method=4)
 if dest.stat().st_size>=p.stat().st_size:dest.unlink();continue
 total+=p.stat().st_size;small+=dest.stat().st_size
print('Large art bytes:',total,'->',small,flush=True)
