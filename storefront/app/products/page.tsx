import type { Metadata } from "next";
import { CollectionSection } from "@/components/heritage-sections";
import { SiteFooter } from "@/components/site-footer";
import { StoreHeader } from "@/components/store-header";
import { products } from "@/lib/catalog";
import { absoluteUrl, DEFAULT_OG_IMAGE, safeJsonLd } from "@/lib/seo";

const title = "Desi Khand & Khand Mishri Collection";
const description = "Shop Zucero Desi Khand and Original Brown Khand Mishri, traditional Indian sugarcane sweetness with clear ingredients, sizes, pricing and product information.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["Desi Khand", "Khand sugar", "Shudh Khand", "Khand Mishri", "Dhage Wali Mishri", "traditional Indian sugar", "sugar alternatives", "natural sugar alternatives"],
  alternates: { canonical: "/products" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/products"),
    title: `${title} | Zucero`,
    description,
    images: [{ url: DEFAULT_OG_IMAGE, alt: "Zucero — The Good Sugar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Zucero`,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${absoluteUrl("/products")}#collection`,
  name: "Zucero Desi Khand & Khand Mishri Collection",
  url: absoluteUrl("/products"),
  description,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/products/${product.slug}`),
    })),
  },
};

export default function ProductsPage() {
  return <main className="store-page collection-page">
    <StoreHeader />
    <div className="heritage"><h1 className="sr-only">Desi Khand and traditional Indian sugar alternatives</h1><CollectionSection /></div>
    <SiteFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionJsonLd) }} />
  </main>;
}
