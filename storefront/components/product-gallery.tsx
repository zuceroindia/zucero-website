"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { Product } from "@/lib/catalog";

export function ProductGallery({ product, selectedVariantId }: { product: Product; selectedVariantId?: string }) {
  const currentVariant = product.variants.find((item) => item.id === selectedVariantId) ?? product.variants[0];
  const photos = currentVariant.galleryPhotos && currentVariant.galleryPhotos.length > 0
    ? currentVariant.galleryPhotos
    : [
        { src: product.image, label: `${product.name} jar` },
      ];

  const [active, setActive] = useState(0);
  const zoom = useRef<HTMLDialogElement>(null);

  // When variant changes, ensure active index is valid
  const safeActive = active >= photos.length ? 0 : active;

  return (
    <div className="pdp-gallery">
      <div className="pdp-main-image">
        <button
          type="button"
          className="pdp-zoom"
          onClick={() => zoom.current?.showModal()}
          aria-label={`Enlarge ${photos[safeActive].label}`}
        >
          <Image
            src={photos[safeActive].src}
            alt={photos[safeActive].label}
            fill
            priority
            sizes="(max-width: 900px) 92vw, 48vw"
          />
          <Expand className="zoom-icon" size={22} />
        </button>
        <div className="gallery-controls">
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => setActive((safeActive + photos.length - 1) % photos.length)}
          >
            <ChevronLeft />
          </button>
          <span aria-live="polite">{safeActive + 1} / {photos.length}</span>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => setActive((safeActive + 1) % photos.length)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="pdp-thumbnails">
        {photos.map((photo, i) => (
          <button
            key={`${photo.src}-${i}`}
            type="button"
            aria-label={`View ${photo.label}`}
            aria-pressed={i === safeActive}
            onClick={() => setActive(i)}
          >
            <Image src={photo.src} alt="" width={100} height={100} />
          </button>
        ))}
      </div>
      <dialog className="pdp-lightbox" ref={zoom}>
        <button type="button" autoFocus aria-label="Close enlarged image" onClick={() => zoom.current?.close()}>
          <X />
        </button>
        <Image src={photos[safeActive].src} alt={photos[safeActive].label} width={1200} height={1200} />
      </dialog>
    </div>
  );
}
