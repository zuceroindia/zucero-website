import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";

const title = "Journal | Desi Khand, Indian Sweetness & Everyday Rituals";
const description = "Read Zucero notes on Desi Khand, traditional Indian sweetness, sugar alternatives, craft, mindful consumption and everyday food rituals.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["Desi Khand", "Khand sugar", "traditional Indian sugar", "sugar alternatives", "health and wellness", "Mishri", "Indian sweetness"],
  alternates: { canonical: "/journal" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/journal"),
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

export default function Journal() {
  return <main className="store-page"><StoreHeader /><header className="content-hero"><p className="eyebrow">Zucero Journal</p><h1>Stories worth<br />slowing down for.</h1><p>Notes on taste, craft and the small rituals of everyday life.</p></header><div className="content-shell journal-articles">
    <article id="morning-tea"><Image src="/images/slow_sweetness.webp" alt="A quiet morning tea ritual" width={920} height={600} /><p className="eyebrow">Rituals</p><h2>The Ritual of Morning Tea</h2><p>Before the messages and the rush, there is the kettle. A cup of tea creates a small space between waking and doing. The water warms, the leaves open, and the kitchen begins to feel like the start of a day.</p><p>Sweeten thoughtfully. A little khand brings its own character; a mishri crystal invites you to wait as it dissolves. Taste before adding more. The ritual is not about how much sweetness you use, but the attention you give to an ordinary moment.</p><p>Keep your favourite cup close. Leave the phone aside for a minute. Let the first sip be enough.</p></article>
    <article id="the-craft"><Image src="/images/journal_editorial.webp" alt="An editorial view of traditional sweetness" width={920} height={600} /><p className="eyebrow">Heritage</p><h2>The Hands Behind the Craft</h2><p>Traditional ingredients carry more than a name. They carry a way of noticing: the texture of a crystal, the colour of a batch, the point at which an ingredient tastes ready.</p><p>At Zucero, the story of craft begins with questions. What went into this product? How was it made? How should it be stored and enjoyed? Clear answers matter more than grand promises.</p><p>Our journal is a place for that curiosity. As the brand grows, we look forward to sharing documented stories from the people and processes behind the collection.</p></article>
    <article><p className="eyebrow">Guides</p><h2>Understand the sugar you choose</h2><p>For clear answers to common search questions, read our <Link href="/guides/desi-khand">Desi Khand guide</Link> and our <Link href="/guides/sugar-alternatives">sugar alternatives, health and diabetes guide</Link>.</p></article>
  </div><SiteFooter /></main>;
}
