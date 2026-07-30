import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import {
  fetchCart,
  addToCart as apiAddToCart,
  updateCartQty as apiUpdateCartQty,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
  type CartEntry,
} from "@/lib/api/cartApi";

export interface CartItem {
  productId: string;
  name: string;
  pricePerPc: number;
  qty: number;
  image: string;
  moq: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartState | null>(null);

function toCartItem(entry: CartEntry): CartItem | null {
  if (!entry.product) return null;
  return {
    productId: entry.productId,
    name: entry.product.name,
    pricePerPc: entry.product.pricePerPc,
    qty: entry.quantity,
    image: entry.product.images[0],
    moq: entry.product.moq,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { member } = useAuth();
  const { removeFavorite } = useFavorites();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!member?.id) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetchCart().then(cart => {
      if (!cancelled) setItems(cart.map(toCartItem).filter((i): i is CartItem => i !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  const addItem = useCallback(
    (item: CartItem) => {
      setItems(prev => {
        const existing = prev.find(i => i.productId === item.productId);
        const nextQty = existing ? existing.qty + item.qty : item.qty;
        void apiAddToCart(item.productId, nextQty);
        if (existing) {
          return prev.map(i => (i.productId === item.productId ? { ...i, qty: nextQty } : i));
        }
        return [...prev, item];
      });
      // Adding a favorited product to the cart removes it from favorites
      // (the backend does this too — kept in sync here so the UI updates immediately).
      removeFavorite(item.productId);
      setIsOpen(true);
    },
    [removeFavorite],
  );

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
    void apiRemoveFromCart(productId);
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems(prev =>
      prev.map(i => {
        if (i.productId !== productId) return i;
        const clamped = Math.max(i.moq, qty);
        void apiUpdateCartQty(productId, clamped);
        return { ...i, qty: clamped };
      }),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    void apiClearCart();
  }, []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const total = items.reduce((sum, i) => sum + i.pricePerPc * i.qty, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, addItem, removeItem, updateQty, clearCart, openCart, closeCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
