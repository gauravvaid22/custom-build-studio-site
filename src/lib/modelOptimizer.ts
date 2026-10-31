import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
export async function optimizeDisplay(scene:THREE.Group){
 await MeshoptSimplifier.ready;let total=0;scene.traverse(o=>{if(o instanceof THREE.Mesh)total+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 if(total<=100000)return false;
 scene.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;let g=o.geometry;
  // Keep painted/texture seams and material groups intact; require an external display export for these complex cases.
  if(g.groups.length>1||g.attributes.color||g.attributes.uv)return;
  if(!g.index)g=mergeVertices(g,1e-6);
  const p=g.attributes.position;if(!(p.array instanceof Float32Array)||p.itemSize!==3)return;
  const index=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:p.count},(_,i)=>i);
  const target=Math.max(12,Math.floor(index.length*100000/total/3)*3);
  const [reduced]=MeshoptSimplifier.simplify(index,p.array,3,target,.002,['LockBorder']);
  const remap=new Map<number,number>(),used:number[]=[],indices=new Uint32Array(reduced.length);
  for(let i=0;i<reduced.length;i++){const old=reduced[i];let n=remap.get(old);if(n===undefined){n=used.length;used.push(old);remap.set(old,n);}indices[i]=n;}
  const next=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(g.attributes) as [string,THREE.BufferAttribute][]){const output=new Float32Array(used.length*attr.itemSize);used.forEach((old,i)=>{for(let k=0;k<attr.itemSize;k++)output[i*attr.itemSize+k]=attr.array[old*attr.itemSize+k];});next.setAttribute(name,new THREE.BufferAttribute(output,attr.itemSize));}next.setIndex(new THREE.BufferAttribute(indices,1));next.computeVertexNormals();o.geometry=next;
 });return true;
}
