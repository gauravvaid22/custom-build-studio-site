import {useShopifyCatalog} from './ShopifyCatalog';
import './inventory.css';
export function StockStatus({ids}:{ids:string[]}){
 const {stockFor,inventoryEnabled,inventoryLoaded}=useShopifyCatalog();
 if(!inventoryLoaded)return <p className="stock-status" data-status="unknown" role="status">Checking availability…</p>;
 if(!inventoryEnabled)return null;
 const rows=ids.map(stockFor),known=rows.filter(r=>r&&!r.unknown),available=known.some(r=>r.sellable&&Number(r.available)>0);
 const unknown=known.length!==rows.length;
 return <p className="stock-status" data-status={available?'available':unknown?'unknown':'sold'} role="status">{available?'Available to order':unknown?'Availability temporarily unavailable':'Currently sold out'}</p>;
}
