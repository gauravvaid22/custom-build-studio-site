import { getStore } from '@netlify/blobs';
export function catalogStore(context = {}) {
  const production = (context?.deploy?.context || process.env.CONTEXT) === 'production';
  return getStore({name:production ? 'shop-catalog-v1' : `shop-catalog-preview-${context?.deploy?.id || process.env.DEPLOY_ID || 'local'}`,consistency:'strong'});
}
export const initialState = () => ({version:1,revision:0,documents:{},drafts:{},archived:[],collections:null,rows:[],history:[],jobs:[],connection:{}});
export async function readState(store) { const found = await store.getWithMetadata('state',{type:'json'}); return { state:found?.data || initialState(), etag:found?.etag }; }
export async function writeState(store,state,etag) { const result=await store.setJSON('state',state,etag ? {onlyIfMatch:etag} : {onlyIfNew:true});if(result?.modified===false)throw Object.assign(new Error('The catalog changed. Reload before saving.'),{status:409}); }
