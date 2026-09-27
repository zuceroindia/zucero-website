"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findCatalogProductAndVariant } from "@/lib/catalog";
import { useCMS } from "@/components/cms-provider";

export type CartLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  image: string;
  pricePaise: number;
  priceRupees?: number;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotalPaise: number;
  subtotalRupees: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  update: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { config } = useCMS();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("zucero-cart-prelaunch-v2");
        if (saved) {
          const storedLines = JSON.parse(saved) as CartLine[];
          const migratedLines: CartLine[] = [];
          for (const rawLine of storedLines) {
            const match = findCatalogProductAndVariant(rawLine.variantId, config.products);
            if (!match) continue; // remove discontinued items that have no match

            const { product, variant } = match;
            const existingIndex = migratedLines.findIndex((l) => l.variantId === variant.id);
            if (existingIndex >= 0) {
              migratedLines[existingIndex].quantity = Math.min(
                10,
                migratedLines[existingIndex].quantity + rawLine.quantity
              );
            } else {
              migratedLines.push({
                variantId: variant.id,
                productSlug: product.slug,
                productName: product.name,
                variantLabel: variant.label,
                sku: variant.sku,
                image: product.cartImage ?? product.image,
                pricePaise: variant.pricePaise!,
                priceRupees: variant.priceRupees ?? variant.pricePaise! / 100,
                quantity: Math.min(10, Math.max(1, rawLine.quantity)),
              });
            }
          }
          setLines(migratedLines);
        }
      } catch {
        localStorage.removeItem("zucero-cart-prelaunch-v2");
      }
      setReady(true);
    });
  }, [config.products]);

  useEffect(() => {
    if (ready) localStorage.setItem("zucero-cart-prelaunch-v2", JSON.stringify(lines));
  }, [lines, ready]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalPaise = lines.reduce((total, line) => total + line.pricePaise * line.quantity, 0);
    return {
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      subtotalPaise,
      subtotalRupees: Number((subtotalPaise / 100).toFixed(2)),
      add: (incoming, quantity = 1) => setLines((current) => {
        const found = current.find((line) => line.variantId === incoming.variantId);
      return found
        ? current.map((line) => line.variantId === incoming.variantId ? { ...line, quantity: Math.min(10, line.quantity + quantity) } : line)
        : [...current, { ...incoming, quantity }];
    }),
    update: (variantId, quantity) => setLines((current) => quantity < 1 ? current.filter((line) => line.variantId !== variantId) : current.map((line) => line.variantId === variantId ? { ...line, quantity: Math.min(10, quantity) } : line)),
    remove: (variantId) => setLines((current) => current.filter((line) => line.variantId !== variantId)),
    clear: () => setLines([]),
  };
}, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
