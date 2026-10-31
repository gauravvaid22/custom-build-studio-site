import { randomUUID, createHash } from 'node:crypto';
export const LIMITS={source:50*1024*1024,display:4*1024*1024,chunk:1024*1024};
export function modelId(id){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id||'')||id.length>120)throw Error('Choose a valid product ID.');if(id==='endless-swirling-tree')throw Error('The custom animated spiral tree is protected.');return id;}
export function validateGlb(bytes){
 const b=Buffer.from(bytes);if(b.length<20||b.length>LIMITS.display||b.toString('ascii',0,4)!=='glTF'||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('Invalid or oversized GLB.');
 const len=b.readUInt32LE(12);if(b.readUInt32LE(16)!==0x4e4f534a||20+len>b.length)throw Error('Invalid GLB JSON.');
 const doc=JSON.parse(b.toString('utf8',20,20+len));
 if(doc.asset?.version!=='2.0'||!doc.meshes?.length||!doc.meshes.some(m=>m.primitives?.some(p=>Number.isInteger(p.attributes?.POSITION)))||doc.extensionsRequired?.length)throw Error('Use a standard GLB with visible geometry and no required extensions.');
 if(JSON.stringify(doc).length>3*1024*1024)throw Error('Model metadata is too large.');
 for(const item of [...(doc.buffers||[]),...(doc.images||[])])if(item.uri)throw Error('External model resources are not allowed.');
 if(doc.animations?.length)throw Error('Use a static product model.');
 return {bytes:b,sha256:createHash('sha256').update(b).digest('hex')};
}
// Store API: get(key), put(key,value), cas(key,value,expectedVersion). Binary uploads are base64 per bounded chunk.
export async function modelAction(store,action,body,scope='preview'){
 if(action==='list')return (await store.get('index'))||{};
 const id=modelId(body.id),key=`product/${id}`;
 const state=(await store.get(key))||{version:0,revisions:[],published:null,disabled:false};
 if(action==='read')return state;
 if(body.version!==state.version)throw Object.assign(Error('This model changed. Reload before saving.'),{status:409});
 if(action==='start'){
  if(!['3mf','stl','glb'].includes(body.extension)||!Number.isInteger(body.size)||body.size<1||body.size>LIMITS.source)throw Error('Use a 3MF, STL or GLB up to 50 MB.');
  const token=randomUUID();await store.put(`upload/${token}`,{id,size:body.size,name:String(body.name||'model').slice(0,160),extension:body.extension,createdAt:Date.now(),version:state.version});return {token,chunkBytes:LIMITS.chunk};
 }
 if(action==='chunk'){
  const u=await store.get(`upload/${body.token}`);if(!u||u.id!==id||Date.now()-u.createdAt>3600000)throw Error('Upload expired.');
  if(!Number.isInteger(body.index)||body.index<0||body.index>=Math.ceil(u.size/LIMITS.chunk))throw Error('Invalid chunk.');
  const bytes=Buffer.from(body.data||'','base64'),expected=Math.min(LIMITS.chunk,u.size-body.index*LIMITS.chunk);if(bytes.length!==expected)throw Error('Upload chunk has incorrect size.');
  await store.put(`upload/${body.token}/${body.index}`,bytes.toString('base64'));return {ok:true};
 }
 if(action==='save'){
  const u=await store.get(`upload/${body.token}`);if(!u||u.id!==id||u.version!==state.version||Date.now()-u.createdAt>3600000)throw Error('Upload expired.');
  const chunks=[];for(let i=0;i<Math.ceil(u.size/LIMITS.chunk);i++){const c=await store.get(`upload/${body.token}/${i}`);if(!c)throw Error('Upload incomplete.');chunks.push(Buffer.from(c,'base64'));}
  const source=Buffer.concat(chunks);if(source.length!==u.size)throw Error('Upload incomplete.');
  const display=validateGlb(Buffer.from(body.glb||'','base64'));
  const rev=randomUUID();await store.put(`source/${rev}`,source.toString('base64'));await store.put(`display/${rev}`,display.bytes.toString('base64'));
  state.revisions.unshift({revision:rev,filename:u.name,sourceHash:createHash('sha256').update(source).digest('hex'),displayHash:display.sha256,bytes:display.bytes.length,at:new Date().toISOString(),reviewed:body.reviewed===true,scope});
 }else if(action==='publish'||action==='restore'){
  const rev=state.revisions.find(r=>r.revision===body.revision);if(!rev?.reviewed)throw Error('Confirm geometry and colors before publishing.');
  state.published=rev.revision;state.disabled=false;
 }else if(action==='disable'){state.disabled=true;}else throw Error('Unknown model operation.');
 const expected=state.version;state.version++;await store.cas(key,state,expected);
 // Index is an overview only; authoritative reads always use the individual record.
 const index=(await store.get('index'))||{};index[id]={version:state.version,published:state.published,disabled:state.disabled,latest:state.revisions[0]};await store.put('index',index);
 return state;
}
