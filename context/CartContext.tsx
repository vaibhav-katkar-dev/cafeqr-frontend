"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartContextType {
  cart: CartItem[];
  note: string;
  setNote: (note: string) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState("");

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.itemId);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setNote("");
  }, []);

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, note, setNote, addItem, removeItem, deleteItem, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
