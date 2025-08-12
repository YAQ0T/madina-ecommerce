// 🧠 CartContext.tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type Product = {
  _id: string;
  name: string;
  price: number;
  image: string;
  selectedColor?: string; // ✅ اللون المختار
  selectedMeasure?: string; // ✅ المقاس المختار
};

type CartItem = Product & { quantity: number };

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (
    productId: string,
    selectedColor?: string,
    selectedMeasure?: string
  ) => void;
  clearCart: () => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    selectedColor?: string,
    selectedMeasure?: string
  ) => void;
};

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item._id === product._id &&
          item.selectedColor === product.selectedColor &&
          item.selectedMeasure === product.selectedMeasure
      );
      if (existing) {
        return prev.map((item) =>
          item._id === product._id &&
          item.selectedColor === product.selectedColor &&
          item.selectedMeasure === product.selectedMeasure
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (
    productId: string,
    selectedColor?: string,
    selectedMeasure?: string
  ) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item._id === productId &&
            item.selectedColor === selectedColor &&
            item.selectedMeasure === selectedMeasure
          )
      )
    );
  };

  const clearCart = () => setCart([]);

  const updateQuantity = (
    productId: string,
    quantity: number,
    selectedColor?: string,
    selectedMeasure?: string
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId &&
        item.selectedColor === selectedColor &&
        item.selectedMeasure === selectedMeasure
          ? { ...item, quantity }
          : item
      )
    );
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, updateQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext)!;
