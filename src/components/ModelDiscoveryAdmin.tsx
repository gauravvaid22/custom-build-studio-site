import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import defaults from '../../commerce/model-discovery.json';
import '../model-discovery.css';

type Discovery = typeof defaults;
const placementLabels: Record<keyof Discovery['placements'], string> = { home: 'Homepage', services: 'Services overview', printing: '3D printing pages', quote: 'Quote form library links', navigation: 'Services menu & footer' };
async function request(action: string, body: object) {
  const response = await fetch(`/.netlify/functions/shop?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save model discovery settings.');
  return data;
}

export function ModelDiscoveryAdmin() {
  const [value, setValue] = useState<Discovery>(defaults);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    request('get-content', {}).then(data => { if (active) { setValue(data.siteContent.modelDiscovery || defaults); setError(''); } }).catch(error => { if (active) { setError(error.message); setFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  function change<K extends keyof Discovery>(key: K, next: Discovery[K]) { setSaved(''); setValue(current => ({ ...current, [key]: next })); }
  function changeLibrary(index: number, key: keyof Discovery['libraries'][number], next: string | boolean) {
    change('libraries', value.libraries.map((library, position) => position === index ? { ...library, [key]: next } : library));
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...value.libraries];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    change('libraries', next);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSaved('');
    try { const data = await request('save-model-discovery', { modelDiscovery: value }); setValue(data.siteContent.modelDiscovery); setSaved('Saved. Refresh a public page to see your changes.'); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="quote-form shop-admin-settings" onSubmit={save}>
    <p className="eyebrow">CUSTOM PRINTING ENQUIRIES</p><h2>Model discovery</h2><p>Help customers find designs and send a link for a manual quote.</p>
    {loading && <p role="status">Loading your current settings…</p>}
    {error && <p role="alert">{error}</p>}
    {failed && <button type="button" className="button" onClick={() => setReload(current => current + 1)}>Retry loading</button>}
    <fieldset disabled={loading || failed || busy}>
      <legend className="sr-only">Model discovery settings</legend>
      <div className="model-admin-flags"><label><input type="checkbox" checked={value.enabled} onChange={event => change('enabled', event.target.checked)} /> Enable model discovery invitations</label></div>
      <label>Page headline<input maxLength={100} required value={value.headline} onChange={event => change('headline', event.target.value)} /></label>
      <label>Introduction<textarea rows={3} maxLength={400} required value={value.introduction} onChange={event => change('introduction', event.target.value)} /></label>
      <div className="form-grid"><label>Browse button<input maxLength={60} required value={value.buttonLabel} onChange={event => change('buttonLabel', event.target.value)} /></label><label>Quote button<input maxLength={60} required value={value.quoteButtonLabel} onChange={event => change('quoteButtonLabel', event.target.value)} /></label></div>
      <label>Browsing instructions<textarea rows={2} maxLength={400} required value={value.helperText} onChange={event => change('helperText', event.target.value)} /></label>
      <label>Quote review note<textarea rows={2} maxLength={400} required value={value.permissionText} onChange={event => change('permissionText', event.target.value)} /></label>
      <label>Response time <span>(optional; leave blank if it varies)</span><input maxLength={160} value={value.responseTime} onChange={event => change('responseTime', event.target.value)} /></label>
      <h3>Where invitations appear</h3><div className="model-admin-flags">{Object.entries(placementLabels).map(([key, label]) => <label key={key}><input type="checkbox" checked={value.placements[key as keyof typeof value.placements]} onChange={event => change('placements', { ...value.placements, [key]: event.target.checked })} />{label}</label>)}</div>
      <h3>Model libraries</h3><p className="small">Edit links and descriptions, change their order, or hide a library.</p>
      {value.libraries.map((library, index) => <fieldset className="model-admin-library" key={library.id}><legend>{index + 1}. {library.name || 'New library'}</legend>
        <div className="model-admin-flags"><label><input type="checkbox" checked={library.enabled} onChange={event => changeLibrary(index, 'enabled', event.target.checked)} /> Visible</label></div>
        <label>Library name<input required maxLength={60} value={library.name} onChange={event => changeLibrary(index, 'name', event.target.value)} /></label>
        <label>Website URL<input type="url" required maxLength={500} value={library.url} onChange={event => changeLibrary(index, 'url', event.target.value)} /></label>
        <label>Short description<textarea rows={2} required maxLength={200} value={library.description} onChange={event => changeLibrary(index, 'description', event.target.value)} /></label>
        <div className="button-row"><button type="button" className="text-button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${library.name} earlier`}>Move up ↑</button><button type="button" className="text-button" disabled={index === value.libraries.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${library.name} later`}>Move down ↓</button>{value.libraries.length > 1 && <button type="button" className="text-button" onClick={() => change('libraries', value.libraries.filter(item => item.id !== library.id))}>Remove library</button>}</div>
      </fieldset>)}
      {value.libraries.length < 12 && <button type="button" className="text-link" onClick={() => change('libraries', [...value.libraries, { id: `library-${Date.now().toString(36)}`, name: '', url: '', description: '', enabled: true }])}>+ Add model library</button>}
      <div className="button-row"><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save model discovery'}</button><Link to="/find-a-3d-model" className="text-link" target="_blank" rel="noopener noreferrer">View public page ↗</Link></div>
    </fieldset>
    {saved && <p role="status">{saved}</p>}
  </form>;
}
