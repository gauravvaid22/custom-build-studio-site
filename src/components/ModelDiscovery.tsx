import { Link } from 'react-router-dom';
import { useSiteContent } from './SiteContent';
import { trackModelDiscovery } from './Analytics';
import '../model-discovery.css';

export const modelQuotePath = '/contact?service=3d-printing&start=link#quote-start';
export function useModelDiscovery() { return useSiteContent().modelDiscovery; }

export function ModelJourneyGraphic() {
  return <div className="model-journey" aria-hidden="true">
    <div className="model-journey-stage"><span className="model-stage-index">01 / DISCOVER</span>
      <svg viewBox="0 0 220 180" fill="none"><rect x="24" y="20" width="172" height="136" rx="12" className="model-svg-window"/><path d="M24 49h172"/><circle cx="39" cy="35" r="2"/><circle cx="48" cy="35" r="2"/><path className="model-svg-wire" d="m70 83 40-22 40 22v44l-40 22-40-22V83Zm0 0 40 23 40-23m-40 23v43m0-88v45"/><path className="model-svg-cursor" d="m157 118 22 10-10 4-5 11-7-25Z"/></svg>
      <strong>A design you love</strong></div>
    <span className="model-journey-arrow">→</span>
    <div className="model-journey-stage"><span className="model-stage-index">02 / CONNECT</span>
      <svg viewBox="0 0 220 180" fill="none"><rect x="24" y="48" width="172" height="84" rx="14" className="model-svg-window"/><g className="model-svg-link"><path d="m96 103 28-28m-21 40-6 6a20 20 0 0 1-28-28l18-18a20 20 0 0 1 28 0m-10 30a20 20 0 0 0 28 0l18-18a20 20 0 0 0-28-28l-6 6"/></g></svg>
      <strong>Send us the link</strong></div>
    <span className="model-journey-arrow">→</span>
    <div className="model-journey-stage"><span className="model-stage-index">03 / CREATE</span>
      <svg viewBox="0 0 220 180" fill="none"><ellipse cx="110" cy="146" rx="67" ry="10" className="model-svg-shadow"/><g className="model-svg-finished"><path d="m67 75 43-25 43 25v50l-43 25-43-25V75Z"/><path d="m67 75 43 25 43-25m-43 25v50"/><path className="model-svg-layers" d="m71 92 39 23 39-23m-78 11 39 23 39-23m-78 11 39 23 39-23"/></g><path className="model-svg-spark" d="M170 35v20m-10-10h20M50 49v12m-6-6h12"/></svg>
      <strong>Made into something real</strong></div>
  </div>;
}

export function ModelLibraries({ compact = false }: { compact?: boolean }) {
  const config = useModelDiscovery();
  if (!config.enabled) return null;
  return <div className={compact ? 'model-library-links' : 'model-library-grid'}>
    {config.libraries.filter(library => library.enabled).map((library, index) => <a key={library.id} href={library.url} target="_blank" rel="noopener noreferrer" onClick={() => trackModelDiscovery('model_library_click', { library_id: library.id })}>
      {!compact && <span className="model-library-number" aria-hidden="true">0{index + 1}</span>}
      <strong>{library.name} <span aria-hidden="true">↗</span></strong>
      {!compact && <><p>{library.description}</p><span className="model-library-action">Browse models <span className="small">· opens a new tab</span></span></>}
    </a>)}
  </div>;
}

export function ModelDiscoveryTeaser({ placement }: { placement: 'home' | 'services' | 'printing' }) {
  const config = useModelDiscovery();
  if (!config.enabled || !config.placements[placement]) return null;
  return <section className="section model-discovery-teaser" aria-label="Find a 3D model to print"><div className="container model-teaser-inner">
    <div><p className="eyebrow">NO MODEL? START HERE</p><h2>{config.headline}</h2><p>{config.introduction}</p><div className="button-row"><Link className="button" to="/find-a-3d-model">{config.buttonLabel} <span aria-hidden="true">↗</span></Link><Link className="text-link" to={modelQuotePath}>Already found one? Send the link ↗</Link></div></div>
    <ModelJourneyGraphic />
  </div></section>;
}
