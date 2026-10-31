export type GalleryPhoto = {
  src: string;
  label: string;
};

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  netWeightGrams: number;
  weightGrams: number;
  packedWeightGrams: number;
  pricePaise: number | null;
  priceRupees: number | null;
  hsn: string;
  galleryPhotos?: GalleryPhoto[];
};

export type Product = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  image: string;
  cartImage?: string;
  ingredients: string;
  variants: ProductVariant[];
};

// India catalog prices are before GST; checkout adds GST based on the delivery state.
// weightGrams remains a conservative shipping-weight alias for checkout serviceability.
// packedWeightGrams is the packed weight used for direct PIN checks and Shiprocket fulfilment.
export const products: Product[] = [
  {
    slug: "desi-khand",
    name: "Single Origin Desi Khand",
    eyebrow: "Natural unrefined cane sugar",
    description: "Born from fresh sugarcane juice. Shaped by time. Crafted to preserve its natural character.",
    image: "/images/khand-hero-2026.jpg",
    ingredients: "Sugarcane juice, desi cow milk and desi cow ghee. Contains milk.",
    variants: [
      {
        id: "khand-330",
        label: "330 g",
        sku: "ZUC-KHA-330",
        netWeightGrams: 330,
        weightGrams: 550,
        packedWeightGrams: 550,
        pricePaise: 42000,
        priceRupees: 420.00,
        hsn: "1701",
        galleryPhotos: [
          { src: "/images/khand-hero-2026.jpg", label: "Single Origin Desi Khand jar with sugarcane and golden Khand" },
          { src: "/images/khand-collage-full.jpeg", label: "Desi Khand product and story collage" },
          { src: "/images/khand-collage-01.jpg", label: "Desi Khand jar and product" },
          { src: "/images/khand-collage-02.jpg", label: "Why choose Zucero Desi Khand" },
          { src: "/images/khand-collage-03.jpg", label: "Desi Khand with a cup of tea" },
          { src: "/images/khand-collage-04.jpg", label: "Desi Khand in everyday recipes" },
          { src: "/images/khand-collage-05.jpg", label: "Traditional Desi Khand process" },
          { src: "/images/khand-collage-06.jpg", label: "Golden Desi Khand powder" },
        ],
      },
      {
        id: "khand-680",
        label: "680 g",
        sku: "ZUC-KHA-680",
        netWeightGrams: 680,
        weightGrams: 900,
        packedWeightGrams: 1000,
        pricePaise: 84000,
        priceRupees: 840.00,
        hsn: "1701",
        galleryPhotos: [
          { src: "/images/khand-hero-2026.jpg", label: "Single Origin Desi Khand jar with sugarcane and golden Khand" },
          { src: "/images/khand-collage-full.jpeg", label: "Desi Khand product and story collage" },
          { src: "/images/khand-collage-01.jpg", label: "Desi Khand jar and product" },
          { src: "/images/khand-collage-02.jpg", label: "Why choose Zucero Desi Khand" },
          { src: "/images/khand-collage-03.jpg", label: "Desi Khand with a cup of tea" },
          { src: "/images/khand-collage-04.jpg", label: "Desi Khand in everyday recipes" },
          { src: "/images/khand-collage-05.jpg", label: "Traditional Desi Khand process" },
          { src: "/images/khand-collage-06.jpg", label: "Golden Desi Khand powder" },
        ],
      },
    ],
  },
  {
    slug: "dhage-wali-mishri",
    name: "Original Khand Dhaga Mishri",
    eyebrow: "From the abundance of sugarcane to the rarity of every crystal",
    description: "Crafted crystal by crystal through an age-old Indian thread technique, preserving its distinctive colour, delicate sweetness and refined crunch.",
    image: "/images/mishri-jar-2026.jpg",
    cartImage: "/images/mishri-jar-2026.jpg",
    ingredients: "Sugarcane juice, desi cow milk and desi cow ghee. Contains milk.",
    variants: [
      {
        id: "mishri-280",
        label: "280 g",
        sku: "ZUC-MIS-280",
        netWeightGrams: 280,
        weightGrams: 450,
        packedWeightGrams: 450,
        pricePaise: 67000,
        priceRupees: 670.00,
        hsn: "1702",
        galleryPhotos: [
          { src: "/images/mishri-jar-2026.jpg", label: "Original Khand Dhaga Mishri jar with golden crystals" },
          { src: "/images/mishri-collage-full.jpeg", label: "Original Khand Dhaga Mishri product collage" },
          { src: "/images/mishri-collage-01.jpg", label: "Golden Mishri crystals on a wooden surface" },
          { src: "/images/mishri-collage-02.jpg", label: "Close view of Mishri crystal texture" },
          { src: "/images/mishri-collage-03.jpg", label: "Mishri crystal texture detail" },
          { src: "/images/mishri-collage-04.jpg", label: "Mishri crystals in a traditional bowl" },
          { src: "/images/mishri-collage-05.jpg", label: "A Mishri crystal held in the hand" },
          { src: "/images/mishri-collage-06.jpg", label: "Mishri crystals in a wooden bowl" },
        ],
      },
      {
        id: "mishri-580",
        label: "580 g",
        sku: "ZUC-MIS-580",
        netWeightGrams: 580,
        weightGrams: 900,
        packedWeightGrams: 900,
        pricePaise: 139900,
        priceRupees: 1399.00,
        hsn: "1702",
        galleryPhotos: [
          { src: "/images/mishri-jar-2026.jpg", label: "Original Khand Dhaga Mishri jar with golden crystals" },
          { src: "/images/mishri-collage-full.jpeg", label: "Original Khand Dhaga Mishri product collage" },
          { src: "/images/mishri-collage-01.jpg", label: "Golden Mishri crystals on a wooden surface" },
          { src: "/images/mishri-collage-02.jpg", label: "Close view of Mishri crystal texture" },
          { src: "/images/mishri-collage-03.jpg", label: "Mishri crystal texture detail" },
          { src: "/images/mishri-collage-04.jpg", label: "Mishri crystals in a traditional bowl" },
          { src: "/images/mishri-collage-05.jpg", label: "A Mishri crystal held in the hand" },
          { src: "/images/mishri-collage-06.jpg", label: "Mishri crystals in a wooden bowl" },
        ],
      },
    ],
  },
];

export function formatPrice(pricePaise: number | null) {
  if (pricePaise === null) return "Price to be confirmed";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pricePaise / 100);
}

export function formatRupees(priceRupees: number | null | undefined) {
  if (priceRupees === null || priceRupees === undefined) return "Price to be confirmed";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceRupees);
}

export function paiseToRupees(paise: number | null | undefined): number {
  return Number(((paise ?? 0) / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number | null | undefined): number {
  return Math.round((rupees ?? 0) * 100);
}

export const LEGACY_VARIANT_ALIASES: Record<string, string> = {
  "khand-490": "khand-330",
  "khand-990": "khand-680",
  "khand-580": "khand-680",
  "mishri-250": "mishri-280",
  "mishri-500": "mishri-580",
};

export const LEGACY_SKU_ALIASES: Record<string, string> = {
  "ZUC-KHA-490": "ZUC-KHA-330",
  "ZUC-KHA-990": "ZUC-KHA-680",
  "ZUC-KHA-580": "ZUC-KHA-680",
  "ZUC-MIS-250": "ZUC-MIS-280",
  "ZUC-MIS-500": "ZUC-MIS-580",
};

export function resolveVariantId(variantId: string): string {
  return LEGACY_VARIANT_ALIASES[variantId] || variantId;
}

export function resolveSku(sku: string): string {
  return LEGACY_SKU_ALIASES[sku] || sku;
}

export function findCatalogProductAndVariant(variantId: string, customProducts?: Product[]) {
  const resolvedId = resolveVariantId(variantId);
  const list = customProducts && customProducts.length > 0 ? customProducts : products;
  for (const product of list) {
    const variant = product.variants.find((item) => item.id === resolvedId);
    if (variant && (variant.pricePaise ?? 0) > 0) {
      return { product, variant };
    }
  }
  return null;
}

