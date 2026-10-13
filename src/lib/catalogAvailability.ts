import {useEffect,useState} from 'react';
export function useCatalogAvailability() {
  const [archived,setArchived]=useState<string[]>([]);
  useEffect(()=>{
    const load=()=>{void fetch('/.netlify/functions/shop-catalog?action=availability',{cache:'no-store',signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():null).then(data=>{if(Array.isArray(data?.archived))setArchived(data.archived);}).catch(()=>{});};
    load();window.addEventListener('focus',load);return()=>window.removeEventListener('focus',load);
  },[]);
  return archived;
}
export async function assertCatalogAvailable(ids:string[]) {
  const response=await fetch('/.netlify/functions/shop-catalog?action=availability',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Unable to verify product availability. Please try checkout again shortly.');
  const data=await response.json();if(data.pricingUpdating)throw new Error("Prices are being updated. Please return shortly to complete checkout.");if(!Array.isArray(data.archived))throw new Error('Unable to verify product availability.');
  if(ids.some(id=>data.archived.includes(id)))throw new Error('An item has been removed from the shop. Remove it from your cart before checkout.');
}
