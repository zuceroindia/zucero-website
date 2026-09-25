"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const variant = product.variants.find((item) => item.id === variantId)!;
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-image">
        <Image src={product.image} alt={product.name} width={800} height={900} sizes="(max-width: 760px) 92vw, 45vw" />
      </Link>
      <div className="product-info">
        <p className="eyebrow">{product.eyebrow}</p>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p>{product.description}</p>
        <div className="variant-row" aria-label="Choose size">
          {product.variants.map((item) => <button key={item.id} onClick={() => setVariantId(item.id)} className={variantId === item.id ? "active" : ""}>{item.label}</button>)}
        </div>
        <div className="product-buy">
          <div>
            <strong>{formatPrice(variant.pricePaise)}</strong>
            <small style={{ display: "block", fontSize: "0.68rem", color: "#8a6616", fontWeight: 600 }}>Introductory price for first 100 orders only</small>
          </div>
          <Link className="button button-dark" href={`/products/${product.slug}`}>View product</Link>
        </div>
      </div>
    </article>
  );
}
