import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import '../model-manager.css';
function Icon({kind}:{kind:string}) {
 const paths:Record<string,string>={spin:'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 3 M4 15l2 3a7 7 0 0 0 12-1',pause:'M9 5v14 M15 5v14',plus:'M12 5v14 M5 12h14',minus:'M5 12h14',reset:'M4 4v6h6 M4 10a8 8 0 1 1 1 8',expand:'M8 4H4v4 M16 4h4v4 M4 16v4h4 M20 16v4h-4',close:'m6 6 12 12 M18 6 6 18',light:'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6 7 7 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'};
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]||paths.spin}/></svg>;
}
export default function ModelCanvas({url,object,label,warmLighting=false,compact=false}:{url?:string;object?:THREE.Group;label:string;warmLighting?:boolean;compact?:boolean}){
 const host=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null),actions=useRef({zoom:(_factor:number)=>{},reset:()=>{},rotate:(_x:number,_y:number)=>{}});
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[active,setActive]=useState(false),[expanded,setExpanded]=useState(false),[spinning,setSpinning]=useState(true),[warm,setWarm]=useState(warmLighting),[parts,setParts]=useState<{name:string;color:string}[]>([]);
 const live=useRef({spinning,warm,active});live.current={spinning,warm,active};
 useEffect(()=>setWarm(warmLighting),[warmLighting]);
 useEffect(()=>{
  const el=host.current;if(!el)return;let dead=false,frame=0,visible=true,loaded:THREE.Group|undefined;
  setLoading(true);setError('');setParts([]);let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{setError('3D is unavailable on this device. Please explore the product photos.');setLoading(false);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;el.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,80),orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enablePan=false;orbit.enableZoom=true;orbit.enableDamping=true;orbit.dampingFactor=.075;orbit.autoRotateSpeed=.48;orbit.minPolarAngle=.15;orbit.maxPolarAngle=Math.PI*.8;
  const coarse=matchMedia('(pointer:coarse)'),motion=matchMedia('(prefers-reduced-motion: reduce)');if(motion.matches)setSpinning(false);
  const motionChange=()=>{if(motion.matches)setSpinning(false);};motion.addEventListener('change',motionChange);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xeaf4ff,0x23332a,.9));
  const key=new THREE.DirectionalLight(0xfff5e4,3);key.position.set(3,4,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xdceaff,1.1);fill.position.set(-4,1,2);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffe6b1,2);rim.position.set(1,3,-4);scene.add(rim);
  const disk=document.createElement('canvas');disk.width=disk.height=128;const ctx=disk.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,2,64,64,62);gradient.addColorStop(0,'rgba(0,0,0,.42)');gradient.addColorStop(.4,'rgba(0,0,0,.18)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(disk),shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.5),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  let size=new THREE.Vector3(1,1.8,1);
  const fit=()=>{const half=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),distance=Math.max(2.7,Math.max(size.y/(2*half),size.x/(2*half*Math.max(camera.aspect,.25)))*1.4+size.z*.45);camera.position.set(distance*.22,distance*.12,distance);orbit.target.set(0,0,0);orbit.minDistance=distance*.55;orbit.maxDistance=distance*2.4;orbit.update();};
  actions.current={zoom:factor=>{const offset=camera.position.clone().sub(orbit.target);camera.position.copy(orbit.target).add(offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,orbit.minDistance,orbit.maxDistance)));orbit.update();},reset:()=>{setSpinning(false);fit();},rotate:(x,y)=>{setSpinning(false);const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));s.theta+=x;s.phi=THREE.MathUtils.clamp(s.phi+y,.15,Math.PI*.8);camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(s));orbit.update();}};
  const disposeRoot=(root:THREE.Object3D)=>root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  const add=(source:THREE.Group)=>{
   if(dead){if(!object)disposeRoot(source);return;}loaded=source;
   if(object)source.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
   source.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3());size=box.getSize(new THREE.Vector3());const scale=1.8/Math.max(size.x,size.y,size.z,.001);size.multiplyScalar(scale);
   const wrapper=new THREE.Group();wrapper.add(source);wrapper.scale.setScalar(scale);wrapper.position.copy(center).multiplyScalar(-scale);scene.add(wrapper);shadow.position.y=-size.y/2-.015;shadow.scale.set(Math.max(.38,size.x*.65),Math.max(.38,size.z*.65),1);
   const swatches=new Map<string,{name:string;color:string}>();source.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){const material=m as THREE.MeshStandardMaterial;if(material.color){const name=material.name||o.name||'Product finish',color='#'+material.color.getHexString();swatches.set(name+color,{name,color});}}});setParts([...swatches.values()].slice(0,16));fit();setLoading(false);
  };
  if(object)add(object.clone(true));else if(url)new GLTFLoader().load(url,g=>add(g.scene),undefined,()=>{if(!dead){setError('Unable to load this 3D view. Please reload or explore the product photos.');setLoading(false);}});
  const resize=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/Math.max(el.clientHeight,1);camera.updateProjectionMatrix();if(loaded)fit();});resize.observe(el);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;});intersection.observe(el);orbit.addEventListener('start',()=>setSpinning(false));
  const lost=(e:Event)=>{e.preventDefault();setError('The 3D display was interrupted. Reload this page to try again.');};renderer.domElement.addEventListener('webglcontextlost',lost);
  let previous=0;const draw=(time:number)=>{if(dead)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden){previous=time;return;}const dt=Math.min((time-previous)/1000,.05);previous=time;orbit.enabled=!coarse.matches||live.current.active;orbit.enableZoom=!coarse.matches||live.current.active;orbit.autoRotate=live.current.spinning&&!motion.matches;key.color.set(live.current.warm?0xffead0:0xfffaf3);rim.color.set(live.current.warm?0xffd69a:0xeaf0ff);orbit.update(dt);renderer.render(scene,camera);};frame=requestAnimationFrame(draw);
  return()=>{dead=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();motion.removeEventListener('change',motionChange);orbit.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);disposeRoot(scene);shadowTexture.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[url,object,expanded]);
 useEffect(()=>{
  if(!expanded)return;const previous=document.activeElement as HTMLElement|null,old=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);if(e.key==='Tab'){const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],summary')||[]),first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus();};
 },[expanded]);
 const content=<div ref={panel} className={`model-canvas studio-viewer ${expanded?'is-expanded':''} ${compact?'is-compact':''}`} role={expanded?'dialog':'region'} aria-modal={expanded||undefined} aria-label={label} tabIndex={expanded?-1:undefined} onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()}>
  <div className="studio-viewer-heading"><span className="studio-live"><i/> Explore in 3D</span><span className="studio-viewer-brand">CUSTOM BUILD STUDIO</span></div>
  <div ref={host} className="model-canvas-stage" tabIndex={0} role="img" aria-label={`${label}. Arrow keys rotate; plus and minus zoom.`} style={{touchAction:active?'none':'pan-y'}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')actions.current.rotate(-.15,0);if(e.key==='ArrowRight')actions.current.rotate(.15,0);if(e.key==='ArrowUp')actions.current.rotate(0,-.12);if(e.key==='ArrowDown')actions.current.rotate(0,.12);if(['+','='].includes(e.key))actions.current.zoom(.88);if(e.key==='-')actions.current.zoom(1.12);}}}/>
  {loading&&<div className="studio-status" role="status"><span className="studio-loader"/>Preparing your 3D view</div>}{error&&<div className="studio-status" role="alert">{error}</div>}
  <div className="studio-controls"><div className="studio-control-dock">
   <button type="button" className={spinning?'is-selected':''} aria-label={spinning?'Pause auto rotation':'Start auto rotation'} aria-pressed={spinning} onClick={()=>setSpinning(!spinning)}><Icon kind={spinning?'pause':'spin'}/><span>{spinning?'Pause':'Auto-spin'}</span></button><span className="studio-control-divider"/>
   <button type="button" aria-label="Zoom out" title="Zoom out" onClick={()=>actions.current.zoom(1.15)}><Icon kind="minus"/></button><button type="button" aria-label="Zoom in" title="Zoom in" onClick={()=>actions.current.zoom(.85)}><Icon kind="plus"/></button><button type="button" aria-label="Reset view" title="Reset view" onClick={()=>actions.current.reset()}><Icon kind="reset"/></button><button type="button" className={warm?'is-selected':''} aria-label={warm?'Use neutral studio lighting':'Use warm studio lighting'} title="Studio lighting" aria-pressed={warm} onClick={()=>setWarm(!warm)}><Icon kind="light"/></button><button type="button" aria-label={expanded?'Close expanded view':'Expand'} title={expanded?'Close expanded view':'Expand'} onClick={()=>setExpanded(!expanded)}><Icon kind={expanded?'close':'expand'}/></button>
  </div><button className="studio-touch-toggle" type="button" aria-pressed={active} onClick={()=>setActive(!active)}>{active?'Done exploring · scroll page':'Touch to rotate & pinch to zoom'}</button><p className="studio-desktop-hint">Drag to rotate · Scroll to zoom</p></div>
  {parts.length>0&&<details className="studio-finishes"><summary>Product details <span>{parts.length} {parts.length===1?'finish':'finishes'}</span></summary><div>{parts.map((p,i)=><span key={i}><i style={{background:p.color}}/>{p.name}</span>)}</div></details>}
 </div>;
 return expanded?createPortal(content,document.body):content;
}


