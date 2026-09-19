import type { Metadata } from "next";
import Link from "next/link";
import { Leaf, PackageCheck, Truck, MessageCircle } from "lucide-react";
import { ProductDetailView } from "@/components/product-detail-view";
import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { products, formatPrice } from "@/lib/catalog";
import { absoluteUrl, safeJsonLd } from "@/lib/seo";

export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return {};

  const isKhand = slug === "desi-khand";
  const title = isKhand ? "Single Origin Desi Khand | Traditional Unrefined Cane Sugar" : "Original Khand Dhaga Mishri | Dhage Wali Mishri";
  const description = isKhand
    ? "Explore Zucero Single Origin Desi Khand, traditionally crafted from sugarcane. See ingredients, approved 330 g & 580 g sizes, uses, pricing and shipping information."
    : "Explore Zucero Original Khand Dhaga Mishri, slowly crystallised using the traditional thread technique. See ingredients, approved 280 g & 580 g sizes, pricing and product information.";
  const image = absoluteUrl(product.image);
  const url = absoluteUrl(`/products/${product.slug}`);

  return {
    title,
    description,
    keywords: isKhand
      ? ["Desi Khand", "Khand sugar", "traditional Khand", "Shudh Khand", "unrefined cane sugar", "sugar alternatives", "natural sugar alternatives", "sugarcane sugar"]
      : ["Khand Mishri", "Dhage Wali Mishri", "brown Mishri", "Mishri sugar", "traditional Indian sugar", "sugar alternatives", "sugarcane crystals"],
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      url,
      title: `${title} | Zucero`,
      description,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Zucero`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const isKhand = slug === "desi-khand";
  const relatedProduct = products.find((item) => item.slug === (isKhand ? "dhage-wali-mishri" : "desi-khand"));
  const goodFacts = isKhand ? [["Sun-dried", "Naturally dried under the sun as part of our traditional process."], ["No added flavours", "Nothing added to alter its natural character or taste."], ["No added sweeteners", "Sweetness comes from sugarcane, without added sweeteners."], ["Traditional iron vessel craft", "Traditionally prepared in iron vessels as part of the time-honoured making process."], ["Natural character, preserved", "A slower process designed to retain the character of sugarcane."]] : [["Khand-based", "Crafted from sugarcane-derived Khand, not refined white sugar."], ["Thread-crafted", "Crystallised slowly around carefully positioned threads using an age-old Indian technique."], ["Crystal by crystal", "Each crystal forms gradually through a patient, traditional process."], ["No added flavours", "Nothing added to alter its natural sweetness or character."], ["No added sweeteners", "Sweetness comes from the sugarcane-derived base."], ["Traditional craft", "A time-honoured method where patience, precision and nature shape every crystal."]];

  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const offers = product.variants.filter((variant) => variant.pricePaise !== null).map((variant) => ({
    "@type": "Offer",
    url: productUrl,
    priceCurrency: "INR",
    price: ((variant.pricePaise ?? 0) / 100).toFixed(2),
    sku: variant.sku,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": "https://www.thegoodsugar.in/#organization" },
  }));
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description,
    image: [absoluteUrl(product.image)],
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "Zucero" },
    category: "Food & Beverage > Sugar & Sweeteners",
    countryOfOrigin: { "@type": "Country", name: "India" },
    offers,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Ingredients", value: product.ingredients },
      { "@type": "PropertyValue", name: "Available sizes", value: product.variants.map((variant) => variant.label).join(", ") },
    ],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "The Collection", item: absoluteUrl("/products") },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  };

  return <main className="store-page pdp-page">
    <StoreHeader />
    <nav className="pdp-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/products">The Collection</Link><span>/</span><span>{product.name}</span></nav>
    <ProductDetailView product={product} relatedProduct={relatedProduct} />
    <section className="pdp-service-strip" aria-label="Shopping information"><Link href="/shipping"><Truck /><strong>Delivery by PIN code</strong><span>Check availability above</span></Link><Link href="/returns"><PackageCheck /><strong>Care with every order</strong><span>Read our returns policy</span></Link><Link href="/contact"><MessageCircle /><strong>Here to help</strong><span>Contact Zucero support</span></Link><a href="#product-information"><Leaf /><strong>Know your sugar</strong><span>Ingredients, clearly stated</span></a></section>
    <section className="pdp-difference"><p className="eyebrow">The Good Facts — {isKhand ? "Desi Khand" : "Mishri"}</p><h2>Good begins<br /><em>with how it’s made.</em></h2><div>{goodFacts.map(([title, copy]) => <article key={title}><Leaf /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="transparency-section"><p className="eyebrow">Transparency</p><h2>Nothing hidden<br /><em>behind sweetness.</em></h2><p>Clear information. Specific claims. Nothing overstated.</p><p>Check your pack for the complete ingredients, manufacturing, nutrition and best-before details.</p><p><strong>Contains milk.</strong> Both products are prepared with desi cow milk and desi cow ghee.</p></section>
    <section id="product-information" className="pdp-information"><div><p className="eyebrow">Every detail matters</p><h2>Get to know<br />{product.name}.</h2></div><div>
      <details open><summary>Description <span>+</span></summary><p>{product.description} {isKhand ? "Use it where you enjoy a rounded sweetness in your everyday cooking." : "Enjoy its crystalline texture and allow time for it to dissolve in warm drinks."}</p><p>Zucero products are sugars. Enjoy in moderation; they are not sugar-free or a treatment for any health condition.</p></details>
      <details><summary>Character &amp; uses <span>+</span></summary><p>{isKhand ? "A versatile choice for tea, coffee, kheer, halwa and home baking. Start with a small amount and adjust to taste." : "A traditional format for warm beverages and sweet preparations. Larger crystals take longer to dissolve than fine sugar."}</p></details>
      <details><summary>How to use <span>+</span></summary><p>{isKhand ? "Measure with a clean, dry spoon. Stir into hot drinks or incorporate into your recipe, adjusting the amount to your taste." : "Separate the sugar crystals from any thread before using them. Dissolve in a warm drink or use in a recipe. Do not consume the thread."}</p></details>
      <details><summary>Ingredients <span>+</span></summary><p>{product.ingredients}. Refer to the final pack label for the complete product declaration and batch details.</p></details>
      <details><summary>Storage <span>+</span></summary><p>Keep tightly closed in a cool, dry place, away from moisture. Always use a clean, dry spoon. Check your pack for the batch-specific best-before date.</p></details>
      <details><summary>Shipping &amp; returns <span>+</span></summary><p>Delivery serviceability is checked using your PIN code. Final charges and taxes are shown at checkout. Please see our <Link href="/shipping">shipping</Link> and <Link href="/returns">returns policies</Link> for details.</p></details>
      {isKhand && <p><Link href="/guides/desi-khand">Read our Desi Khand guide: Shudh Khand, organic claims, processing and sugar alternatives →</Link></p>}
      <p><Link href="/guides/sugar-alternatives">Read our guide to sugar alternatives, health &amp; wellness and diabetes-related questions →</Link></p>
    </div></section>
    <SiteFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
  </main>;
}
