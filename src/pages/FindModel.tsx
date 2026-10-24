import { Link } from 'react-router-dom';
import { ModelJourneyGraphic, ModelLibraries, modelQuotePath, useModelDiscovery } from '../components/ModelDiscovery';

export default function FindModel() {
  const config = useModelDiscovery();
  return <>
    <section className="page-intro model-discovery-hero"><div className="container">
      <Link className="breadcrumb" to="/services/3d-printing">← Custom 3D printing</Link>
      <p className="eyebrow">YOUR NEXT IDEA STARTS HERE / EDMONTON</p>
      <h1>{config.enabled ? config.headline : 'Have an idea? Let’s make it.'}</h1>
      <p className="lead">{config.enabled ? config.introduction : 'Send a file, a design link or a description of your idea for a custom printing quote.'}</p>
      <div className="button-row"><a className="button" href={config.enabled ? '#model-libraries' : modelQuotePath}>{config.enabled ? config.buttonLabel : config.quoteButtonLabel} <span aria-hidden="true">↓</span></a>{config.enabled && <Link className="text-link" to={modelQuotePath}>I already have a link ↗</Link>}</div>
      <ModelJourneyGraphic />
    </div></section>
    {config.enabled && <section className="section model-libraries-section" id="model-libraries"><div className="container">
      <p className="eyebrow">A WORLD OF POSSIBILITIES</p><h2>Choose somewhere to explore.</h2>
      <p className="model-section-description">Home organizers, desk accessories, decorations or a part for your next project. Search for what you want to make.</p>
      <ModelLibraries />
      <p className="model-help">{config.helperText}</p>
      <p className="small">These are independent model libraries. Some designs are free; others require a purchase or creator permission. A file price is separate from our printing quote.</p>
    </div></section>}
    <section className="section model-quote-section"><div className="container model-quote-panel"><div>
      <p className="eyebrow">FOUND SOMETHING?</p><h2>Let’s bring your idea off the screen.</h2>
      <p>Send the model page link, how many you need, and your preferred size or colour. “Not sure” is a perfectly good starting point.</p>
      <p className="small">{config.permissionText}</p>{config.responseTime && <p>{config.responseTime}</p>}
    </div><div><Link className="button" to={modelQuotePath}>{config.quoteButtonLabel} <span aria-hidden="true">↗</span></Link><p className="small">Manual quote · No payment required</p><Link className="text-link" to="/contact?start=idea#quote-start">Need help finding a model? Ask us ↗</Link></div></div></section>
  </>;
}
