import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelAction,modelId,validateGlb} from '../commerce/model-manager.mjs';
function glb(){const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},meshes:[{primitives:[{attributes:{POSITION:0}}]}]}).padEnd(128,' '));const b=Buffer.alloc(20+json.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);return b;}
function store(){const m=new Map();return{get:async k=>structuredClone(m.get(k)),put:async(k,v)=>m.set(k,structuredClone(v)),cas:async(k,v,version)=>{assert.equal(m.get(k)?.version||0,version);m.set(k,structuredClone(v));}};}
test('protected spiral and malformed models are rejected',()=>{assert.throws(()=>modelId('endless-swirling-tree'));assert.throws(()=>modelId('../private'));assert.throws(()=>validateGlb(Buffer.from('bad')));});
test('draft, publish, disable and restore persist independently; conflicts fail',async()=>{
 const s=store(),id='test-product';const source=glb();const start=await modelAction(s,'start',{id,version:0,size:source.length,name:'test.glb',extension:'glb'});
 await modelAction(s,'chunk',{id,version:0,token:start.token,index:0,data:source.toString('base64')});
 let state=await modelAction(s,'save',{id,version:0,token:start.token,glb:source.toString('base64'),reviewed:true});assert.equal(state.version,1);assert.equal(state.published,null);
 const revision=state.revisions[0].revision;state=await modelAction(s,'publish',{id,version:1,revision});assert.equal(state.published,revision);
 await assert.rejects(()=>modelAction(s,'disable',{id,version:1}),/changed/);
 state=await modelAction(s,'disable',{id,version:2});assert.equal(state.disabled,true);
 state=await modelAction(s,'restore',{id,version:3,revision});assert.equal(state.disabled,false);assert.equal((await modelAction(s,'read',{id})).version,4);
});
test('unreviewed drafts and incorrect upload chunks cannot publish',async()=>{const s=store(),id='other-product',src=glb(),u=await modelAction(s,'start',{id,version:0,size:src.length,name:'x.glb',extension:'glb'});await assert.rejects(()=>modelAction(s,'chunk',{id,version:0,token:u.token,index:0,data:'AAAA'}),/size/);await modelAction(s,'chunk',{id,version:0,token:u.token,index:0,data:src.toString('base64')});const st=await modelAction(s,'save',{id,version:0,token:u.token,glb:src.toString('base64'),reviewed:false});await assert.rejects(()=>modelAction(s,'publish',{id,version:1,revision:st.revisions[0].revision}),/Confirm/);});
