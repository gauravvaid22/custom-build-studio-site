import {CUSTOMER_3D_ENABLED} from '../lib/storefrontFeatures';
import {lazy,Suspense,useEffect,useState} from 'react';
import Christmas3DViewer,{type Christmas3DViewerProps} from './Christmas3DViewer';
import '../model-manager.css';
const Canvas=lazy(()=>import('./ModelCanvas'));

type Props = Christmas3DViewerProps & {onlyUploaded?:boolean};
export default function Managed3DViewer(props:Props){
  if (!CUSTOMER_3D_ENABLED) return props.onlyUploaded ? null : props.poster ? <div className="managed-model-poster"><img src={props.poster} alt={props.productName}/></div> : null;
  return <EnabledManaged3DViewer {...props}/>;
}
function EnabledManaged3DViewer(props:Props){
  const [model,setModel]=useState<{url:string}|null>(null);
  const [disabled,setDisabled]=useState(false);
  const [checking,setChecking]=useState(props.modelId !== 'endless-swirling-tree');

  useEffect(()=>{
    let cancelled=false;
    setModel(null);
    setDisabled(false);
    if(props.modelId==='endless-swirling-tree'){
      setChecking(false);
      return;
    }
    setChecking(true);
    fetch(`/.netlify/functions/shop-models?action=manifest&id=${encodeURIComponent(props.modelId)}`)
      .then(r=>r.ok?r.json():{})
      .then((d:{model?:{url:string};disabled?:boolean})=>{
        if(!cancelled){
          setModel(d.model||null);
          setDisabled(d.disabled===true);
          setChecking(false);
        }
      })
      .catch(()=>{
        if(!cancelled) setChecking(false);
      });
    return()=>{cancelled=true;};
  },[props.modelId]);

  if(props.modelId==='endless-swirling-tree')return <Christmas3DViewer {...props}/>;
  if(disabled)return props.poster?<img src={props.poster} alt={props.productName}/>:null;
  if(checking && !props.onlyUploaded) {
    return props.poster ? <div className="managed-model-poster"><img src={props.poster} alt={props.productName}/></div> : <div className="managed-model-poster" role="status">Loading 3D preview…</div>;
  }
  if(!model)return props.onlyUploaded?null:<Christmas3DViewer {...props}/>;
  return <div className="managed-model"><Suspense fallback={<div className="managed-model-poster" role="status">Loading 3D preview…</div>}><Canvas url={model.url} label={`Interactive ${props.productName}`} warmLighting={props.warmLighting} compact={props.compact}/></Suspense></div>;
}
