import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, FlaskConical, Leaf, PackageCheck, Sparkles, Sun } from "lucide-react";
import { Header } from "@/components/header";
import { LocationConsent } from "@/components/location-consent";
import { HeritageSections, PhilosophySection } from "@/components/heritage-sections";
import { SiteFooter } from "@/components/site-footer";
import { StoryCarousel } from "@/components/story-carousel";
import { SectionDivider } from "@/components/section-divider";
import { LaunchListForm } from "@/components/launch-list-form";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Desi Khand & Traditional Sugar Alternatives",
  description: "Explore Zucero Desi Khand and Khand Mishri, traditional Indian sugarcane sweetness with transparent ingredients, thoughtful craft and a modern health-conscious approach.",
  keywords: ["Desi Khand", "Khand sugar", "Shudh Khand", "traditional Khand", "Khand Mishri", "sugar alternatives", "natural sugar alternatives", "health and wellness", "traditional Indian sugar"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    title: "Desi Khand & Traditional Sugar Alternatives | Zucero",
    description: "Traditional Indian sugarcane sweetness, thoughtfully made and explained honestly. Explore Desi Khand and Khand Mishri by Zucero.",
    images: [{ url: "/images/hero-cinematic-poster.png", alt: "Zucero Desi Khand among sugarcane" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desi Khand & Traditional Sugar Alternatives | Zucero",
    description: "Explore Zucero Desi Khand and traditional Indian sugar alternatives made from sugarcane.",
    images: ["/images/hero-cinematic-poster.png"],
  },
};

const highlights = [
  { Icon: Leaf, title: "PURE BY NATURE", description: "Nothing Artificial" },
  { Icon: FlaskConical, title: "NATURAL GOODNESS", description: "Retains the goodness of its natural source" },
  { Icon: Sparkles, title: "MINDFUL SWEETNESS", description: "A natural alternative to refined sugar" },
  { Icon: PackageCheck, title: "DELICATE SWEETNESS", description: "Light, subtle and naturally sweet" },
];
export default function Home() {
  return (
    <main>
      <section className="hero">
        <Image className="hero-image" src="/images/hero-cinematic-poster.png" alt="Zucero Desi Khand in warm sunlight among sugarcane" fill priority sizes="100vw" />
        <div className="hero-video-embed" aria-hidden="true">
          <iframe
            title="Zucero cinematic hero film"
            src="https://play.gumlet.io/embed/6a2ee82136223b22766f448c?background=true"
            referrerPolicy="origin"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            tabIndex={-1}
          />
        </div>
        <div className="hero-shade" />
        <Header />
        <div className="hero-copy">
          <p className="eyebrow gold">Rooted in Indian sugar-making</p>
          <h1>Sweetness<br />is a <em>ritual.</em></h1>
          <p>Nature perfected sweetness.<br />We simply preserved it.</p>
          <div className="button-row"><Link className="button button-gold" href="#collection-title">Explore our collection <ArrowRight size={16} /></Link></div>
          <div className="hero-labels"><Link href="/products/desi-khand#product-information">Pure by nature</Link><Link href="#nature">Natural goodness</Link><Link href="#problem">Mindful sweetness</Link><Link href="/products/dhage-wali-mishri">Delicate sweetness</Link></div>
        </div>
        <div className="hero-proofs" aria-label="Product highlights">
          <div className="hero-proofs-track">
            {[...highlights, ...highlights].map(({ Icon, title, description }, index) => (
              <span key={`${title}-${index}`} aria-hidden={index >= highlights.length ? true : undefined}>
                <Icon aria-hidden="true" />
                <b className="hero-proof-copy"><strong>{title}</strong><small>{description}</small></b>
              </span>
            ))}
          </div>
        </div>
        <Link href="#carousel" className="scroll-cue" aria-label="Scroll to explore"><ArrowDown /></Link>
      </section>

      <StoryCarousel />

      <section id="problem" className="problem">
        <SectionDivider number="01" title="The Sugar Problem" />
        <div className="section-copy"><header className="problem-heading"><h2>Sweetness lost<br /><em>its story.</em></h2></header><p>Sugar begins with something beautifully simple.</p><p><strong>A stalk of sugarcane.<br />Sunlight.<br />Soil.<br />Time.</strong></p><p>For generations, India knew how to turn that sweetness into Gur, Khand and Mishri — with patience, craft and a deep respect for the ingredient.</p><p>But somewhere along the way, sweetness became increasingly refined, standardised and disconnected from where it began.</p><p>The colour became whiter.<br />The crystals became more uniform.<br />The story became harder to see.</p><p><strong>We believe sweetness deserves better.</strong><br />Not more.<br />Not louder.<br />Just <strong>closer to its source.</strong></p><p><strong>So we went back to the beginning.</strong></p></div>
      </section>

      <section id="nature" className="nature-section">
        <div className="nature-art"><Image src="/images/nature-solution-field-v3.png" alt="An Indian woman standing in a sugarcane field at sunrise" fill sizes="100vw" /></div>
        <div className="nature-copy"><p className="overlay-section-title">Nature’s Solution</p><Sun /><h2>Begin with sugarcane.<br />Interfere less.</h2><p>At Zucero, we believe some things don’t need to be reinvented. They simply need to be respected.</p><p>We return to traditional forms of sweetness, thoughtfully crafted from sugarcane and brought into the modern kitchen with greater care, clarity and intention.</p><p>This is sweetness with its story intact.<br />This is The Good Sugar.</p></div>
      </section>

      <HeritageSections philosophy={<PhilosophySection />} />

      <section className="why-zucero section-shell"><SectionDivider number="10" title="Why Zucero Exists" /><h2>We question what goes into everything else.<br /><em>Why not sugar?</em></h2><p>We know where our coffee comes from.<br />We ask about our milk.<br />We read the labels on what we eat.</p><p>Yet sugar — something we consume every day — is rarely questioned.</p><p><strong>Zucero exists to change that.</strong><br />To make sweetness more thoughtful.<br />More transparent.<br />More connected to its source.</p><p>We return to sugarcane, traditional craft and the patience of time — because we believe <strong>good sugar should be made with the same care with which you choose it.</strong></p><p><strong>Zucero. The Good Sugar.</strong></p><div className="why-highlight"><strong>Experience the goodness of the first batch</strong><span>Exclusive referral access · Deliveries begin</span><Link className="button button-gold" href="#collection-title">Explore the collection <ArrowRight size={16} /></Link></div></section>

      <section id="contact" className="contact-section"><SectionDivider number="11" title="The Launch List" light /><div><h2>Be first to taste<br /><em>the good sugar.</em></h2><p>Get launch availability, founder notes, and early product access. No noisy inbox.</p></div><LaunchListForm /></section>

      <SiteFooter />
      <LocationConsent />
    </main>
  );
}
