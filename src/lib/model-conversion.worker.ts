import {DOMParser} from 'linkedom';
import {importModel,exportModel} from './modelImport';
import {optimizeDisplay} from './modelOptimizer';
Object.assign(globalThis,{DOMParser});
onmessage=async(event:MessageEvent<File>)=>{try{postMessage({stage:'Reading geometry and source colors…'});const result=await importModel(event.data);postMessage({stage:'Preparing a lighter display copy…'});const optimized=await optimizeDisplay(result.scene);const glb=await exportModel(result.scene);(globalThis as unknown as {postMessage:(value:unknown,transfer:Transferable[])=>void}).postMessage({glb,warning:[result.warning,optimized?'A lighter display copy was created. Check small details, holes and silhouette before approving.':''].filter(Boolean).join(' ')},[glb]);}catch(error){postMessage({error:(error as Error).message});}};
