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

  const layoutSizingCss = React.useMemo(() => {
    const l = config.layoutSizing ?? DEFAULT_CMS_CONFIG.layoutSizing;
    const rules = [
      l.contentMaxWidthPx > 0
        ? `.section-shell,.content-shell,.heritage-philosophy,.heritage-founder,.heritage-rituals,.heritage-journal,.heritage-collection,.problem>.section-copy{max-width:${l.contentMaxWidthPx}px!important;margin-left:auto!important;margin-right:auto!important;}`
        : "",
      l.sectionPaddingYPx > 0
        ? `main section:not(.hero):not(.story-carousel){padding-top:${l.sectionPaddingYPx}px!important;padding-bottom:${l.sectionPaddingYPx}px!important;}`
        : "",
      l.sectionPaddingXPx > 0
        ? `main section:not(.hero):not(.story-carousel){padding-left:${l.sectionPaddingXPx}px!important;padding-right:${l.sectionPaddingXPx}px!important;}`
        : "",
      l.cardPaddingPx > 0
        ? `.heritage-product-details,.why-highlight,.collection-launch-callout,.account-card,.checkout-summary,.order-card,.prelaunch-card,.pdp-difference article,.proof-grid article,.process-grid article,.heritage-ritual-grid article,.admin-card{padding:${l.cardPaddingPx}px!important;}`
        : "",
      l.cardRadiusPx > 0
        ? `.heritage-product,.heritage-picture,.heritage-product-details,.why-highlight,.collection-launch-callout,.account-card,.checkout-summary,.order-card,.prelaunch-card,.pdp-difference article,.proof-grid article,.process-grid article,.heritage-ritual-grid article,.marquee-image{border-radius:${l.cardRadiusPx}px!important;overflow:hidden;}`
        : "",
      l.cardGapPx > 0
        ? `.heritage-product-grid,.heritage-ritual-grid,.heritage-journal-grid,.proof-grid,.process-grid,.pdp-difference-grid,.account-grid{gap:${l.cardGapPx}px!important;}`
        : "",
      l.cardMinWidthPx > 0
        ? `.heritage-product-grid,.heritage-ritual-grid,.heritage-journal-grid,.proof-grid,.process-grid,.pdp-difference-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,${l.cardMinWidthPx}px),1fr))!important;}`
        : "",
      l.cardMinHeightPx > 0
        ? `.heritage-product,.heritage-ritual-grid article,.heritage-journal-grid>a,.proof-grid article,.process-grid article,.pdp-difference article,.pdp-recommendation-card,.account-card,.order-card{min-height:${l.cardMinHeightPx}px!important;}`
        : "",
      l.cardImageHeightPx > 0
        ? `.heritage-picture,.prelaunch-card img,.pdp-difference article img{height:${l.cardImageHeightPx}px!important;min-height:${l.cardImageHeightPx}px!important;aspect-ratio:auto!important;}`
        : "",
      l.carouselCardWidthPx > 0
        ? `.carousel-viewport .marquee-image{width:${l.carouselCardWidthPx}px!important;flex-basis:${l.carouselCardWidthPx}px!important;}`
        : "",
      l.carouselCardHeightPx > 0
        ? `.carousel-viewport .marquee-image{height:${l.carouselCardHeightPx}px!important;max-height:none!important;}`
        : "",
    ].filter(Boolean).join("\n");
    return rules;
  }, [config.layoutSizing]);

  const typographyCss = React.useMemo(() => {
    const t = config.typography ?? DEFAULT_CMS_CONFIG.typography;
    const fontFaces = (t.uploadedFonts || []).map((font) => {
      const safeName = font.name.replace(/["\\]/g, "");
      const safeUrl = font.url.replace(/["\\]/g, "");
      const cssFormat = font.format === "ttf" ? "truetype" : font.format === "otf" ? "opentype" : font.format;
      return `@font-face{font-family:"${safeName}";src:url("${safeUrl}") format("${cssFormat}");font-style:normal;font-weight:100 900;font-display:swap;}`;
    }).join("\n");

    const rules = [
      `:root{--sans:"${String(t.bodyFont || "Manrope").replace(/["\\]/g, "")}",Arial,sans-serif;--serif:"${String(t.headingFont || "Cormorant Garamond").replace(/["\\]/g, "")}",Georgia,serif;--cms-accent-font:"${String(t.accentFont || t.bodyFont || "Manrope").replace(/["\\]/g, "")}",Arial,sans-serif;}`,
      `body{font-family:var(--sans);font-weight:${Number(t.bodyWeight) || 400};}`,
      `h1,h2,h3,h4,h5,h6,.product-info h3,.purchase-panel h1,.page-title h1,.checkout-heading h1,.account-story h1,.orders-shell h1{font-family:var(--serif);font-weight:${Number(t.headingWeight) || 400};}`,
      `.eyebrow,.button,.nav,.text-link,.text-button{font-family:var(--cms-accent-font);}`,
      t.bodySizePx > 0 ? `body{font-size:${t.bodySizePx}px!important;}` : "",
      t.h1SizePx > 0 ? `h1,.hero h1,.purchase-panel h1,.page-title h1,.checkout-heading h1,.account-story h1,.orders-shell h1{font-size:${t.h1SizePx}px!important;}` : "",
      t.h2SizePx > 0 ? `h2,.section-copy h2,.section-heading h2,.nature-copy h2,.proof-section h2,.faq-section h2,.contact-section h2{font-size:${t.h2SizePx}px!important;}` : "",
      t.h3SizePx > 0 ? `h3,.product-info h3,.process-grid h3,.proof-grid h3{font-size:${t.h3SizePx}px!important;}` : "",
      t.navSizePx > 0 ? `.nav,.nav a{font-size:${t.navSizePx}px!important;}` : "",
      t.buttonSizePx > 0 ? `.button,.text-link,.text-button{font-size:${t.buttonSizePx}px!important;}` : "",
      t.advancedCss || "",
    ].filter(Boolean).join("\n");

    return `${fontFaces}\n${rules}`;
  }, [config.typography]);

  return (
    <CMSContext.Provider value={{ config, getProduct, refresh }}>
      <style data-zucero-cms-typography>{typographyCss}</style>
      <style data-zucero-cms-layout-sizing>{layoutSizingCss}</style>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  return useContext(CMSContext);
}
