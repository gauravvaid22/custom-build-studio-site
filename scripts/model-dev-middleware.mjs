import fs from 'node:fs/promises';
import path from 'node:path';
import {modelAction,modelId} from '../commerce/model-manager.mjs';
const root=path.resolve('.tmp/model-manager');
const file=key=>path.join(root,Buffer.from(key).toString('hex')+'.json');
const store={get:async key=>{try{return JSON.parse(await fs.readFile(file(key),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},put:async(key,value)=>{await fs.mkdir(root,{recursive:true});await fs.writeFile(file(key),JSON.stringify(value));},cas:async(key,value,expected)=>{if(((await store.get(key))?.version||0)!==expected)throw Error('Model changed. Reload.');await store.put(key,value);}};
let queue=Promise.resolve();
export function modelDevMiddleware(){return(req,res,next)=>{const url=new URL(req.url,'http://localhost');if(url.pathname!=='/.netlify/functions/shop-models')return next();
 const work=async()=>{const json=(d,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(d));};try{
  const action=url.searchParams.get('action');
  if(req.method==='GET'){
   const id=modelId(url.searchParams.get('id')),s=await store.get(`product/${id}`);
   if(action==='manifest')return json({disabled:s?.disabled,model:s?.published&&!s.disabled?{url:`/.netlify/functions/shop-models?action=asset&id=${id}&revision=${s.published}`}:null});
   if(action==='asset'&&s?.published===url.searchParams.get('revision')&&!s.disabled){res.writeHead(200,{'Content-Type':'model/gltf-binary'});return res.end(Buffer.from(await store.get(`display/${s.published}`),'base64'));}return json({error:'Not found'},404);
  }
  if(req.method!=='POST'||!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin||''))return json({error:'Local origin required'},403);
  let raw='';for await(const c of req){raw+=c;if(raw.length>6*1024*1024)return json({error:'Request too large'},413);}const body=JSON.parse(raw||'{}');
  if(action==='draft-asset'){modelId(body.id);const state=await store.get(`product/${body.id}`);if(!state?.revisions.some(r=>r.revision===body.revision))throw Error('Unknown revision');return json({glb:await store.get(`display/${body.revision}`)});}
  return json(await modelAction(store,action,body,'local'));
 }catch(e){json({error:e.message},e.status||400);}};
 queue=queue.then(work,work);
};}
