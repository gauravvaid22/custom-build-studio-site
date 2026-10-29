import products from '../data/catalog';
import { useId, useState } from 'react';
import { money } from './Cart';
import { useShopifyCatalog } from './ShopifyCatalog';

type Design = { id: string; label: string; optionIds: string[] };

/** Select real production SKUs; grouping changes browsing, never checkout identity. */
export function ProductDesignPicker({ designs, selectedId, onChange, catalog = products, showDropdown = false }: {
  designs: Design[]; selectedId: string; onChange: (id: string) => void; catalog?: typeof products; showDropdown?: boolean;
}) {
  const { priceFor } = useShopifyCatalog();
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  const selected = designs.find(design => design.optionIds.includes(selectedId)) || designs[0];
  const consoleSuffix = selectedId.endsWith('-slim') ? '-slim' : '-original';
  return <section className={`shop-design-picker${expanded ? ' is-expanded' : ''}`} aria-label="Choose your design">
    <strong>Choose your design</strong>
    <label className={`shop-variant-select${showDropdown ? '' : ' shop-mobile-design-select'}`}>Design
      <select aria-label="Product design" value={selectedId} onChange={event => onChange(event.target.value)}>
        {designs.map(design => {
          const optionId = design.optionIds.includes(selectedId) ? selectedId : design.optionIds.find(id => id.endsWith(consoleSuffix)) || design.optionIds[0];
          return <option key={design.id} value={optionId}>{design.label} · {money(priceFor(optionId, catalog.find(p => p.id === optionId)!.priceCents))} CAD</option>;
        })}
      </select>
    </label>
    <button type="button" className="shop-design-expand" aria-expanded={expanded} aria-controls={optionsId} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide design photos −' : `See all ${designs.length} design photos +`}</button>
    <div className="shop-design-options" id={optionsId}>
      {designs.map(design => {
        const product = catalog.find(item => item.id === design.id)!;
        const cents = Math.min(...design.optionIds.map(id => {
          const option = catalog.find(item => item.id === id)!;
          return priceFor(id, option.priceCents);
        }));
        return <button type="button" key={design.id} aria-pressed={selected.id === design.id}
          onClick={() => onChange(design.optionIds.find(id => id.endsWith(consoleSuffix)) || design.optionIds[0])}>
          <img src={product.images[0].thumb} alt="" width="90" height="90" loading="lazy" />
          <span>{design.label}<small>{money(cents)} CAD</small></span>
          {selected.id === design.id && <span className="shop-design-check" aria-hidden="true">✓</span>}
        </button>;
      })}
    </div>
    {selected.optionIds.length > 1 && <label className="shop-variant-select">Console model
      <select aria-label="Console model" value={selectedId} onChange={event => onChange(event.target.value)}>
        {selected.optionIds.map(id => {
          const option = catalog.find(item => item.id === id)!;
          return <option value={id} key={id}>{id.endsWith('-slim') ? 'PS5 Slim' : 'Original PS5'} · {money(priceFor(id, option.priceCents))}</option>;
        })}
      </select>
    </label>}
  </section>;
}
