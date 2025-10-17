import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  variantId?: string;
  options?: Record<string, string>;
  vendorId?: string;
  vendorName?: string;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  buyerFee: number;
  grandTotal: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  addItem: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotals: () => CartTotals;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "rise-local-cart";
const FL_TAX_RATE = 0.07;
const BUYER_FEE_RATE = 0.03;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const addItem = (product: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) => {
        if (item.id !== product.id) return false;
        if (item.variantId && product.variantId && item.variantId !== product.variantId) return false;
        if (item.options && product.options) {
          const sameOptions = JSON.stringify(item.options) === JSON.stringify(product.options);
          if (!sameOptions) return false;
        }
        return true;
      });

      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [...current, { ...product, quantity }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  };

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartTotals = (): CartTotals => {
    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const tax = subtotal * FL_TAX_RATE;
    const buyerFee = subtotal * BUYER_FEE_RATE;
    const grandTotal = subtotal + tax + buyerFee;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      buyerFee: Number(buyerFee.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  };

  const value: CartContextType = {
    items,
    itemCount,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    cartTotals,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
