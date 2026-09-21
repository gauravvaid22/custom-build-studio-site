import { createContext, useContext, useEffect, useState } from "react";
import products from "../../commerce/products.json";
export type CartItem = { id: string; quantity: number };
type CartContextType = {
  items: CartItem[];
  setQuantity: (id: string, quantity: number) => void;
  add: (id: string, quantity: number) => void;
  clear: () => void;
  notice: string;
};
const CartContext = createContext<CartContextType>({
  items: [],
  setQuantity: () => {},
  add: () => {},
  clear: () => {},
  notice: "",
});
export function CartProvider({ children }: { children: React.ReactNode }) {
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
                array.findIndex((p) => p.id === item.id) === index,
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
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { id, quantity } : item)),
    );
  };
  const add = (id: string, quantity: number) => {
    if (
      !products.some((p) => p.id === id) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    )
      return;
    setItems((current) => {
      const found = current.find((item) => item.id === id);
      return found
        ? current.map((item) =>
            item.id === id
              ? { id, quantity: Math.min(20, item.quantity + quantity) }
              : item,
          )
        : [...current, { id, quantity }];
    });
    setNotice(
      `${products.find((p) => p.id === id)!.name} added to cart. Maximum 20 of each product.`,
    );
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
