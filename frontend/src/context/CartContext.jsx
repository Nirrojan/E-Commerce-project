import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user ? `bb_cart_${user.id}` : "bb_cart_guest";
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function addToCart(product, quantity = 1) {
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      return existing
        ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, { ...product, quantity }];
    });
  }
  function updateQuantity(id, quantity) {
    setItems(current => quantity < 1 ? current.filter(i => i.id !== id) : current.map(i => i.id === id ? { ...i, quantity } : i));
  }
  function removeItem(id) { setItems(current => current.filter(i => i.id !== id)); }
  function clearCart() { setItems([]); }
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return <CartContext.Provider value={{ items, count, total, addToCart, updateQuantity, removeItem, clearCart }}>
    {children}
  </CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);