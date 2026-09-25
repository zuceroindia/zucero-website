"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_CMS_CONFIG, type CMSConfig, type Product } from "@/lib/cms";

type CMSContextValue = {
  config: CMSConfig;
  getProduct: (slug: string) => Product | undefined;
  refresh: () => Promise<void>;
};

const CMSContext = createContext<CMSContextValue>({
  config: DEFAULT_CMS_CONFIG,
  getProduct: (slug: string) => DEFAULT_CMS_CONFIG.products.find((p) => p.slug === slug),
  refresh: async () => {},
});

export function CMSProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig?: CMSConfig;
}) {
  const [config, setConfig] = useState<CMSConfig>(initialConfig ?? DEFAULT_CMS_CONFIG);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.config) {
          setConfig(data.config);
        }
      }
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  useEffect(() => {
    // If initialConfig was provided, refresh in background after 1s
    const timer = window.setTimeout(() => {
      void refresh();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const getProduct = useCallback(
    (slug: string) => {
      return config.products.find((p) => p.slug === slug);
    },
    [config.products]
  );

  return (
    <CMSContext.Provider value={{ config, getProduct, refresh }}>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  return useContext(CMSContext);
}
