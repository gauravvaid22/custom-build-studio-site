import {strFromU8,strToU8,zipSync} from 'fflate';
// Prusa volume coordinates are already baked into the core mesh. Source matrices are provenance, not assembly transforms.
export function adaptPrusaVolumes(files:Record<string,Uint8Array>):{buffer:ArrayBuffer;missingColors:boolean}|null{
 if(!files['Metadata/Slic3r_PE_model.config']||!files['3D/3dmodel.model'])return null;
 const metadata=new DOMParser().parseFromString(strFromU8(files['Metadata/Slic3r_PE_model.config']),'application/xml');
 const cfg=files['Metadata/Slic3r_PE.config']?strFromU8(files['Metadata/Slic3r_PE.config']):'';
 const colors=(cfg.match(/^;\s*filament_colour\s*=\s*(.*)$/m)?.[1]||'').split(';').map(x=>x.trim());
 const objects=new Map<string,{first:number;last:number;name:string;slot:number}[]>();
 const meta=(el:Element,key:string)=>Array.from(el.children).find(n=>n.localName==='metadata'&&n.getAttribute('key')===key)?.getAttribute('value');
 for(const obj of Array.from(metadata.querySelectorAll('object'))){
  const ranges=Array.from(obj.querySelectorAll('volume')).map(v=>{const type=meta(v,'volume_type');if(type&&type!=='ModelPart')throw Error('Remove modifier or negative volumes before exporting the showcase model.');return{first:Number(v.getAttribute('firstid')),last:Number(v.getAttribute('lastid')),name:meta(v,'name')||'Part',slot:Number(meta(v,'extruder')||meta(obj,'extruder')||0)};});
  if(ranges.length)objects.set(obj.getAttribute('id')||'',ranges);
 }
 if(!objects.size)return null;
 let xml=strFromU8(files['3D/3dmodel.model']);if(/basematerials|colorgroup|\bpid=/.test(xml))return null;
 let nextId=1;for(const m of xml.matchAll(/\bid="(\d+)"/g))nextId=Math.max(nextId,Number(m[1])+1);
 const resourceId=nextId,bases:string[]=[];let missingColors=false;
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 xml=xml.replace(/<object\b([^>]*)>([\s\S]*?)<\/object>/g,(whole,attrs:string,body:string)=>{
  const id=attrs.match(/\bid="(\d+)"/)?.[1],ranges=objects.get(id||'');if(!ranges)return whole;
  const mapped=ranges.map(r=>{const color=r.slot>0?colors[r.slot-1]:'';if(!/^#[a-f\d]{6}$/i.test(color))missingColors=true;const index=bases.length;bases.push(`<base name="${escape(r.name)}" displaycolor="${/^#[a-f\d]{6}$/i.test(color)?color:'#EEEEEE'}"/>`);return{...r,index};});
  let triangle=0;const next=body.replace(/<triangle\b([^>]*?)\/?\s*>/g,(_t,a:string)=>{const matches=mapped.filter(r=>triangle>=r.first&&triangle<=r.last);triangle++;if(matches.length!==1)throw Error('Ambiguous Prusa part ranges. Re-export the assembled model.');return `<triangle ${a.replace(/\/$/,'')} pid="${resourceId}" p1="${matches[0].index}"/>`;});
  return `<object${attrs}>${next}</object>`;
 });
 xml=xml.replace('</resources>',`<basematerials id="${resourceId}">${bases.join('')}</basematerials></resources>`);
 const normalized={...files,'3D/3dmodel.model':strToU8(xml)};const result=zipSync(normalized,{level:0});return{buffer:result.slice().buffer as ArrayBuffer,missingColors};
}
