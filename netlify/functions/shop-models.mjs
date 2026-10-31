import {getStore} from '@netlify/blobs';
import {requireAdmin} from '../../commerce/admin-session.mjs';
import {modelAction,modelId} from '../../commerce/model-manager.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export default async(request,context)=>{
 try{
  const url=new URL(request.url),action=url.searchParams.get('action');
  const production=(context?.deploy?.context||process.env.CONTEXT)==='production';
  const blob=getStore({name:production?'shop-models-production-v1':`shop-models-preview-${context?.deploy?.id||'local'}`,consistency:'strong'});
  const store={get:key=>blob.get(key,{type:'json'}),put:(key,value)=>blob.setJSON(key,value),cas:async(key,value,expected)=>{const old=await blob.getWithMetadata(key,{type:'json'});if((old?.data?.version||0)!==expected)throw Object.assign(Error('Model changed. Reload.'),{status:409});const result=await blob.setJSON(key,value,old?{onlyIfMatch:old.etag}:{onlyIfNew:true});if(result?.modified===false)throw Object.assign(Error('Model changed. Reload.'),{status:409});}};
  if(request.method==='GET'&&action==='manifest'){
   const id=modelId(url.searchParams.get('id'));const state=await store.get(`product/${id}`);
   if(!state)return json({model:null});if(state.disabled)return json({disabled:true});
   return json({model:state.published?{url:`/.netlify/functions/shop-models?action=asset&id=${id}&revision=${state.published}`}:null});
  }
  if(request.method==='GET'&&action==='asset'){
   const id=modelId(url.searchParams.get('id')),state=await store.get(`product/${id}`),rev=url.searchParams.get('revision');
   if(!state||state.disabled||state.published!==rev)return json({error:'Model unavailable'},404);
   const content=await store.get(`display/${rev}`);if(!content)return json({error:'Model unavailable'},404);
   return new Response(Buffer.from(content,'base64'),{headers:{'Content-Type':'model/gltf-binary','Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});
  }
  requireAdmin(request);
  const raw=await request.text();if(raw.length>6*1024*1024)return json({error:'Upload request too large'},413);
  const body=raw?JSON.parse(raw):{};
  if(action==='draft-asset'){modelId(body.id);const state=await store.get(`product/${body.id}`);if(!state?.revisions.some(r=>r.revision===body.revision))throw Error('Unknown revision');return json({glb:await store.get(`display/${body.revision}`)});}
  return json(await modelAction(store,action,body,production?'production':'preview'));
 }catch(e){return json({error:e.message},e.status||400);}
};
