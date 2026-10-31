import * as THREE from 'three';
import {ThreeMFLoader} from 'three/addons/loaders/3MFLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {unzipSync,strFromU8} from 'fflate';
import {adaptPrusaVolumes} from './prusaModelAdapter';
export async function importModel(file:File):Promise<{scene:THREE.Group;warning:string}>{
 if(file.size>50*1024*1024)throw Error('Choose a file below 50 MB.');
 const buf=await file.arrayBuffer(),ext=file.name.split('.').pop()?.toLowerCase();let scene:THREE.Group;let warning='';
 if(ext==='3mf'){
  const dv=new DataView(buf);let expanded=0,entries=0;
  for(let i=0;i+46<buf.byteLength;i++)if(dv.getUint32(i,true)===0x02014b50){expanded+=dv.getUint32(i+24,true);entries++;if(expanded>250*1024*1024||entries>2000)throw Error('Archive expands beyond the safe limit.');i+=45+dv.getUint16(i+28,true)+dv.getUint16(i+30,true)+dv.getUint16(i+32,true);}
  const files=unzipSync(new Uint8Array(buf));let triangles=0,hasColors=false;
  for(const [name,data] of Object.entries(files)){
   if(name.includes('..')||name.startsWith('/'))throw Error('Invalid archive paths.');
   if(/\.(model|rels)$/i.test(name)){
    const xml=strFromU8(data);if(/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External/i.test(xml))throw Error('External references are not supported.');
    if(!name.endsWith('.model'))continue;
    const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid 3MF XML.');
    triangles+=doc.getElementsByTagName('triangle').length;
    if(/paint_color|mmu_segmentation|paint_supports|paint_seam/.test(xml))throw Error('This file contains slicer-specific painting. Export a standard colored 3MF or a prepared GLB; the existing model is safe.');
    if(/p:path=/.test(xml))throw Error('This multi-document slicer file needs a flattened assembled 3MF export.');
    if(/texture2d/i.test(xml))throw Error('Textured 3MF requires a prepared embedded GLB in this version.');
    hasColors ||= /basematerials|colorgroup/i.test(xml);
   }
  }
  if(triangles>2000000)throw Error('Model exceeds 2 million triangles. Export a lighter display copy.');
  const adapted=adaptPrusaVolumes(files);scene=new ThreeMFLoader().parse(adapted?.buffer||buf);scene.rotation.x=-Math.PI/2;
  if(adapted?.missingColors||(!adapted&&!hasColors))warning='No standard color properties found. Assign and check part colors before saving.';
 }else if(ext==='stl'){
  const geometry=new STLLoader().parse(buf);scene=new THREE.Group();scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#eeeeee',roughness:.7})));scene.rotation.x=-Math.PI/2;warning='STL has no reliable color information. Set your product color below.';
 }else if(ext==='glb'){
  const dv=new DataView(buf),len=dv.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,len)));
  if([...(doc.buffers||[]),...(doc.images||[])].some(v=>v.uri)||doc.extensionsRequired?.length)throw Error('Use a GLB with embedded resources and no required extensions.');
  scene=(await new GLTFLoader().parseAsync(buf,'')).scene;
 }else throw Error('Choose a 3MF, STL or GLB file.');
 let count=0;scene.traverse(o=>{if(o instanceof THREE.Mesh){const g=o.geometry;count+=(g.index?.count||g.attributes.position?.count||0)/3;const p=g.attributes.position;for(let i=0;i<p.count;i++)if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))throw Error('Invalid geometry.');if(!o.name)o.name=Array.isArray(o.material)?o.material[0]?.name:o.material.name;o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const next=(m as THREE.MeshStandardMaterial).clone();if(ext!=='glb'){next.metalness=0;next.roughness=.58;}return next;});if(Array.isArray(o.material)&&o.material.length===1)o.material=o.material[0];o.userData={};}});
 if(!count||count>2000000)throw Error('Empty or overly complex model.');
 return {scene,warning};
}
export async function exportModel(scene:THREE.Group){const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});if(!(result instanceof ArrayBuffer)||result.byteLength>4*1024*1024)throw Error('Display model exceeds 4 MB. Export a lighter display copy first.');return result;}
export function base64(buf:ArrayBuffer){const bytes=new Uint8Array(buf);let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}

