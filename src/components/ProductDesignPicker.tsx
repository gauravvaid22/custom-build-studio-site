import products from '../../commerce/products.json';
import { money } from './Cart';
import { useShopifyCatalog } from './ShopifyCatalog';

type Design = { id: string; label: string; optionIds: string[] };

/** Select real production SKUs; grouping changes browsing, never checkout identity. */
export function ProductDesignPicker({ designs, selectedId, onChange }: {
  designs: Design[]; selectedId: string; onChange: (id: string) => void;
}) {
  const { priceFor } = useShopifyCatalog();
  const selected = designs.find(design => design.optionIds.includes(selectedId)) || designs[0];
  const consoleSuffix = selectedId.endsWith('-slim') ? '-slim' : '-original';
  return <section className="shop-design-picker" aria-label="Choose your design">
    <strong>Choose your design</strong>
    <div className="shop-design-options">
      {designs.map(design => {
        const product = products.find(item => item.id === design.id)!;
        const cents = Math.min(...design.optionIds.map(id => {
          const option = products.find(item => item.id === id)!;
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
          const option = products.find(item => item.id === id)!;
          return <option value={id} key={id}>{id.endsWith('-slim') ? 'PS5 Slim' : 'Original PS5'} · {money(priceFor(id, option.priceCents))}</option>;
        })}
      </select>
    </label>}
  </section>;
}
