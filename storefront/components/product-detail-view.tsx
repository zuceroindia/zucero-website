"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { useCMS } from "@/components/cms-provider";

export function ProductDetailView({
  product: initialProduct,
  relatedProduct: initialRelated,
}: {
  product: Product;
  relatedProduct?: Product | null;
}) {
  const { config: cmsConfig, getProduct } = useCMS();
  const product = getProduct(initialProduct.slug) ?? initialProduct;
  const relatedProduct = initialRelated ? (getProduct(initialRelated.slug) ?? initialRelated) : null;
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0].id);

  return (
    <section className="product-detail">
      <div className="pdp-gallery-column">
        <ProductGallery product={product} selectedVariantId={selectedVariantId} />
        {relatedProduct && (
          <section className="pdp-recommendation" aria-labelledby="related-product-heading">
            <h2 id="related-product-heading">You may also like</h2>
            <Link className="pdp-recommendation-card" href={`/products/${relatedProduct.slug}`}>
              <Image src={relatedProduct.image} alt={relatedProduct.name} width={112} height={112} sizes="112px" />
              <div>
                <h3>{relatedProduct.name}</h3>
                <p>From {formatPrice(relatedProduct.variants[0].pricePaise)}</p>
                <small style={{ display: "block", fontSize: "0.7rem", color: "#8a6616", fontWeight: 600, marginBottom: "0.25rem" }}>{cmsConfig.promotions.introductoryPriceText}</small>
                <span>View product <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          </section>
        )}
      </div>
      <ProductPurchase
        product={product}
        selectedVariantId={selectedVariantId}
        onSelectVariant={setSelectedVariantId}
      />
    </section>
  );
}
