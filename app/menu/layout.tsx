"use client";
import { CartProvider } from "@/context/CartContext";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
