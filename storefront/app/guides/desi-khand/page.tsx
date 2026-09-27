import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { absoluteUrl, DEFAULT_OG_IMAGE, safeJsonLd } from "@/lib/seo";

const title = "What Is Desi Khand? Shudh Khand, Organic Khand & Sugar Alternatives";
const description = "A clear guide to Desi Khand: what Khand is, how it differs from refined sugar, what Shudh Khand and organic Khand mean, and how to read purity claims.";
const url = absoluteUrl("/guides/desi-khand");

export const metadata: Metadata = {
  title,
  description,
  keywords: ["Desi Khand", "what is Desi Khand", "Shudh Khand", "organic Khand", "Khand sugar", "Khand vs sugar", "chemical free sugar", "preservative free sugar", "natural sugar alternatives", "sugar alternatives"],
  alternates: { canonical: "/guides/desi-khand" },
  openGraph: {
    type: "article",
    url,
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

const faq = [
  {
    question: "What is Desi Khand?",
    answer: "Desi Khand is a traditional Indian form of cane sugar made from sugarcane juice with less refining than highly refined white sugar. Colour, texture and flavour can vary with the raw material and process.",
  },
  {
    question: "Is Shudh Khand the same as Desi Khand?",
    answer: "Shudh means pure, but the word itself is not proof of purity. Check the ingredient declaration, manufacturer details, food licence information and the final pack label rather than relying only on a marketing term.",
  },
  {
    question: "Is Desi Khand organic?",
    answer: "Desi Khand and organic Khand are not automatically the same thing. Organic is a sourcing and certification claim. A product should only be described as certified organic when the applicable certification is documented on the pack.",
  },
  {
    question: "Is Khand chemical-free sugar?",
    answer: "No food is literally chemical-free. Shoppers often use this phrase to mean fewer unnecessary additives or less intensive processing. Look for specific, verifiable claims on the label instead of broad chemical-free wording.",
  },
  {
    question: "Is Desi Khand a sugar alternative?",
    answer: "Desi Khand can be used as a culinary alternative to refined white sugar, but it is still sugar. It is not sugar-free and should be enjoyed in moderation.",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${url}#article`,
  headline: title,
  description,
  image: [absoluteUrl("/images/khand-branded-jar.png")],
  datePublished: "2026-09-10",
  dateModified: "2026-09-10",
  inLanguage: "en-IN",
  author: { "@id": "https://www.thegoodsugar.in/#organization" },
  publisher: { "@id": "https://www.thegoodsugar.in/#organization" },
  mainEntityOfPage: url,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Guides", item: absoluteUrl("/guides/desi-khand") },
    { "@type": "ListItem", position: 3, name: "Desi Khand Guide", item: url },
  ],
};

export default function DesiKhandGuidePage() {
  return <>
    <ContentPage eyebrow="The Good Sugar Guide" title="What is Desi Khand?" intro="A straightforward guide to traditional Khand, the language around purity, and what to look for before choosing a sugar.">
      <p><strong>Desi Khand</strong> is a traditional Indian form of cane sugar made from sugarcane juice. Compared with highly refined white sugar, Khand is generally associated with a less intensive traditional process and a more natural variation in colour, texture and flavour.</p>
      <p>If you are comparing products, start with the ingredient declaration and the process information on the pack. Marketing words are useful only when they are backed by specific facts.</p>

      <h2>Desi Khand vs refined white sugar</h2>
      <p>Both are sugars and both contribute sugar and calories to the diet. The meaningful difference is primarily in how they are made, their sensory character and the degree of processing. Zucero does not position Desi Khand as sugar-free or as a treatment for any health condition.</p>
      <p><Link href="/products/desi-khand">Explore Zucero Desi Khand, ingredients and available sizes →</Link></p>

      <h2>What does “Shudh Khand” mean?</h2>
      <p><em>Shudh</em> is commonly used to mean pure. But a search phrase such as “Shudh Khand” is not, by itself, evidence that a product is pure. Look for transparent ingredients, food-business details, manufacturing information and a compliant final label.</p>

      <h2>Organic Khand and Desi Khand are not the same claim</h2>
      <p>“Desi Khand” describes a traditional product format. “Organic Khand” is a sourcing and certification claim. A product should only be sold as certified organic when the relevant certification is actually documented. Zucero does not use an organic certification claim unless it is stated on the applicable pack.</p>

      <h2>What does “chemical-free sugar” mean?</h2>
      <p>Strictly speaking, no food is literally chemical-free. Water, sugar and every natural ingredient are made of chemicals. When shoppers search for <strong>chemical-free sugar</strong>, they often mean a product with fewer unnecessary additives or less intensive processing. More useful questions are: Does the product contain added colours, flavours, sweeteners or preservatives? What ingredients are declared? How is it made?</p>

      <h2>What about preservative-free sugar?</h2>
      <p>Preservative claims should be specific and supported by the final product declaration. Rather than assuming a traditional product is automatically preservative-free, check the pack. Zucero publishes its current ingredient information on each product page, while the final pack label remains the authoritative declaration.</p>

      <h2>Is Desi Khand a sugar alternative?</h2>
      <p>In cooking and beverages, Khand can be used as an alternative to refined white sugar when you prefer its flavour, texture or traditional process. Nutritionally, it remains a form of sugar, so “sugar alternative” here does not mean sugar-free substitute.</p>
      <p>For a broader health and wellness perspective, including questions about diabetes and blood glucose, read our <Link href="/guides/sugar-alternatives">guide to sugar alternatives</Link>.</p>

      <h2>Frequently asked questions</h2>
      {faq.map((item) => <section key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></section>)}
    </ContentPage>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
  </>;
}
