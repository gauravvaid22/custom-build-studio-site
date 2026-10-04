import { createContext, useContext, useEffect, useState } from "react";
import products from "../../commerce/products.json";
import { trackShop } from "./Analytics";
import { useShopifyCatalog } from "./ShopifyCatalog";
import { useFulfillment } from "./Fulfillment";
export type CartAttribute = { key: string; value: string };
export type CartItem = { lineId?: string; id: string; quantity: number; attributes?: CartAttribute[] };
type CartContextType = {
  items: CartItem[];
  setQuantity: (id: string, quantity: number) => void;
  add: (id: string, quantity: number, attributes?: CartAttribute[]) => boolean;
  clear: () => void;
  notice: string;
};
const CartContext = createContext<CartContextType>({
  items: [],
  setQuantity: () => {},
  add: () => false,
  clear: () => {},
  notice: "",
});
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { priceFor } = useShopifyCatalog();
  const { mode } = useFulfillment();
  const [items, setItems] = useState<CartItem[]>([]),
    [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cbs-cart-v1") || "[]");
      if (Array.isArray(saved))
        setItems(
          saved
            .filter(
              (item: CartItem) =>
                products.some((p) => p.id === item.id) &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0 &&
                item.quantity <= 20,
            )
            .filter(
              (item: CartItem, index: number, array: CartItem[]) =>
                array.findIndex((p) => (p.lineId || p.id) === (item.lineId || item.id)) === index,
            ),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem("cbs-cart-v1", JSON.stringify(items));
      } catch {}
  }, [items, loaded]);
  const setQuantity = (id: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) return;
    setItems((current) =>
      quantity === 0
        ? current.filter((item) => (item.lineId || item.id) !== id)
        : current.map((item) => ((item.lineId || item.id) === id ? { ...item, quantity } : item)),
    );
  };
  const add = (id: string, quantity: number, attributes?: CartAttribute[]) => {
    if (
      !products.some((p) => p.id === id) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    )
      return false;
    // A different personalization photo is a different order line.
    const photo = attributes?.find(attribute => attribute.key === "Personalization photo")?.value;
    const existingLine = items.find(item => item.id === id && JSON.stringify(item.attributes || []) === JSON.stringify(attributes || []));
    const lineId = existingLine ? (existingLine.lineId || existingLine.id) : (photo ? `${id}:${crypto.randomUUID()}` : id);
    const existing = existingLine?.quantity || 0;
    if (existing + quantity > 20) return false;
    setItems((current) => {
      const found = current.find((item) => (item.lineId || item.id) === lineId);
      return found
        ? current.map((item) =>
            (item.lineId || item.id) === lineId
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + quantity),
                  ...(attributes?.length ? { attributes } : item.attributes ? { attributes: item.attributes } : {}),
                }
              : item,
          )
        : [...current, { id, ...(photo ? { lineId } : {}), quantity, ...(attributes?.length ? { attributes } : {}) }];
    });
    setNotice(
      `${products.find((p) => p.id === id)!.name} added to cart. Maximum 20 of each product.`,
    );
    trackShop("add_to_cart", [{id, quantity, priceCents: priceFor(id, products.find(p => p.id === id)!.priceCents)}], mode);
    return true;
  };
  return (
    <CartContext.Provider
      value={{ items, setQuantity, add, clear: () => setItems([]), notice }}
    >
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
export const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    cents / 100,
  );
