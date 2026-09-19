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

// India launch prices are before GST as shown on printed labels.
// Checkout adds GST based on the delivery state.
// weightGrams remains a conservative shipping-weight alias for checkout serviceability.
// packedWeightGrams is the packed weight used for direct PIN checks and Shiprocket fulfilment.
export const products: Product[] = [
  {
    slug: "desi-khand",
    name: "Single Origin Desi Khand",
    eyebrow: "Natural unrefined cane sugar",
    description: "Born from fresh sugarcane juice. Shaped by time. Crafted to preserve its natural character.",
    image: "/images/khand-branded-jar.png",
    ingredients: "Sugarcane juice, desi cow milk and desi cow ghee. Contains milk.",
    variants: [
      {
        id: "khand-330",
        label: "330 g",
        sku: "ZUC-KHA-330",
        netWeightGrams: 330,
        weightGrams: 550,
        packedWeightGrams: 550,
        pricePaise: 40000,
        priceRupees: 400.00,
        hsn: "1701",
        galleryPhotos: [
          { src: "/images/khand-branded-jar.png", label: "Single Origin Desi Khand 330 g jar" },
          { src: "/images/labels/khand-330g-back.png", label: "Approved Nutrition Facts, Ingredients & MRP ₹400.00" },
          { src: "/images/khand-matka-serving.png", label: "Fine Desi Khand served from a black matka" },
        ],
      },
      {
        id: "khand-580",
        label: "580 g",
        sku: "ZUC-KHA-580",
        netWeightGrams: 580,
        weightGrams: 900,
        packedWeightGrams: 900,
        pricePaise: 68000,
        priceRupees: 680.00,
        hsn: "1701",
        galleryPhotos: [
          { src: "/images/khand-branded-jar.png", label: "Single Origin Desi Khand 580 g jar" },
          { src: "/images/labels/khand-580g-back.png", label: "Approved Nutrition Facts, Ingredients & MRP ₹680.00" },
          { src: "/images/khand-matka-serving.png", label: "Fine Desi Khand served from a black matka" },
        ],
      },
    ],
  },
  {
    slug: "dhage-wali-mishri",
    name: "Original Khand Dhaga Mishri",
    eyebrow: "From the abundance of sugarcane to the rarity of every crystal",
    description: "Crafted crystal by crystal through an age-old Indian thread technique, preserving its distinctive colour, delicate sweetness and refined crunch.",
    image: "/images/mishri-jar-lifestyle.png",
    cartImage: "/images/mishri-jar-lifestyle.png",
    ingredients: "Sugarcane juice, desi cow milk and desi cow ghee. Contains milk.",
    variants: [
      {
        id: "mishri-280",
        label: "280 g",
        sku: "ZUC-MIS-280",
        netWeightGrams: 280,
        weightGrams: 450,
        packedWeightGrams: 450,
        pricePaise: 63000,
        priceRupees: 630.00,
        hsn: "1702",
        galleryPhotos: [
          { src: "/images/mishri-jar-lifestyle.png", label: "Original Khand Dhaga Mishri 280 g jar" },
          { src: "/images/labels/mishri-280g-back.png", label: "Approved Nutrition Facts, Ingredients & MRP ₹630.00" },
          { src: "/images/mishri-raw-hero.png", label: "Brown Mishri served in a silver bowl" },
        ],
      },
      {
        id: "mishri-580",
        label: "580 g",
        sku: "ZUC-MIS-580",
        netWeightGrams: 580,
        weightGrams: 900,
        packedWeightGrams: 900,
        pricePaise: 110000,
        priceRupees: 1100.00,
        hsn: "1702",
        galleryPhotos: [
          { src: "/images/mishri-jar-lifestyle.png", label: "Original Khand Dhaga Mishri 580 g jar" },
          { src: "/images/labels/mishri-580g-back.png", label: "Approved Nutrition Facts, Ingredients & MRP ₹1,100.00" },
          { src: "/images/mishri-raw-hero.png", label: "Brown Mishri served in a silver bowl" },
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
