"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, FlaskConical, Leaf, PackageCheck, Sparkles, Sun } from "lucide-react";
import { useCMS } from "@/components/cms-provider";
import { Header } from "@/components/header";
import { SectionDivider } from "@/components/section-divider";
import { LaunchListForm } from "@/components/launch-list-form";

const highlightIcons = [Leaf, FlaskConical, Sparkles, PackageCheck];

export function DynamicHeroSection() {
  const { config } = useCMS();
  const hp = config.homepage;

  const highlights = hp.highlights && hp.highlights.length > 0
    ? hp.highlights
    : [
        { title: "PURE BY NATURE", description: "Nothing Artificial" },
        { title: "NATURAL GOODNESS", description: "Retains the goodness of its natural source" },
        { title: "MINDFUL SWEETNESS", description: "A natural alternative to refined sugar" },
        { title: "DELICATE SWEETNESS", description: "Light, subtle and naturally sweet" },
      ];

  const quickLinks = hp.heroQuickLinks && hp.heroQuickLinks.length > 0
    ? hp.heroQuickLinks
    : [
        { label: "Pure by nature", href: "/products/desi-khand#product-information" },
        { label: "Natural goodness", href: "#nature" },
        { label: "Mindful sweetness", href: "#problem" },
        { label: "Delicate sweetness", href: "/products/dhage-wali-mishri" },
      ];

  return (
    <section className="hero">
      <Image
        className="hero-image"
        src={hp.heroPosterImage || "/images/hero-cinematic-poster.png"}
        alt="Zucero Desi Khand in warm sunlight among sugarcane"
        fill
        priority
        sizes="100vw"
      />
      {hp.heroVideoUrl && (
        <div className="hero-video-embed" aria-hidden="true">
          <iframe
            title="Zucero cinematic hero film"
            src={hp.heroVideoUrl}
            referrerPolicy="origin"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            tabIndex={-1}
          />
        </div>
      )}
      <div className="hero-shade" />
      <Header />
      <div className="hero-copy">
        <p className="eyebrow gold">{hp.heroEyebrow || "Rooted in Indian sugar-making"}</p>
        <h1>
          {hp.heroTitleLine1 || "Sweetness"}
          <br />
          <em>{hp.heroTitleLine2 || "is a ritual."}</em>
        </h1>
        <p>
          {hp.heroSubtitleLine1 || "Nature perfected sweetness."}
          <br />
          {hp.heroSubtitleLine2 || "We simply preserved it."}
        </p>
        <div className="button-row">
          <Link className="button button-gold" href={hp.heroButtonLink || "#collection-title"}>
            {hp.heroButtonText || "Explore our collection"} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-labels">
          {quickLinks.map((ql, idx) => (
            <Link key={`${ql.href}-${idx}`} href={ql.href}>
              {ql.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="hero-proofs" aria-label="Product highlights">
        <div className="hero-proofs-track">
          {[...highlights, ...highlights].map((item, index) => {
            const Icon = highlightIcons[index % highlightIcons.length] || Leaf;
            return (
              <span key={`${item.title}-${index}`} aria-hidden={index >= highlights.length ? true : undefined}>
                <Icon aria-hidden="true" />
                <b className="hero-proof-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </b>
              </span>
            );
          })}
        </div>
      </div>
      <Link href="#carousel" className="scroll-cue" aria-label="Scroll to explore">
        <ArrowDown />
      </Link>
    </section>
  );
}

export function DynamicProblemSection() {
  const { config } = useCMS();
  const hp = config.homepage;

  return (
    <section id="problem" className="problem">
      <SectionDivider number="01" title={hp.sugarProblemEyebrow || "The Sugar Problem"} />
      <div className="section-copy">
        <header className="problem-heading">
          <h2>{hp.sugarProblemHeading || "Sweetness lost its story."}</h2>
        </header>
        {hp.sugarProblemParagraphs?.map((paragraph, idx) => (
          <p key={idx} style={{ whiteSpace: "pre-line" }}>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

export function DynamicNatureSection() {
  const { config } = useCMS();
  const hp = config.homepage;

  return (
    <section id="nature" className="nature-section">
      <div className="nature-art">
        <Image
          src={hp.natureSolutionImage || "/images/nature-solution-field-v3.png"}
          alt="An Indian woman standing in a sugarcane field at sunrise"
          fill
          sizes="100vw"
        />
      </div>
      <div className="nature-copy">
        <p className="overlay-section-title">{hp.natureSolutionOverlayTitle || "Nature’s Solution"}</p>
        <Sun />
        <h2>{hp.natureSolutionHeading || "Begin with sugarcane. Interfere less."}</h2>
        {hp.natureSolutionParagraphs?.map((paragraph, idx) => (
          <p key={idx} style={{ whiteSpace: "pre-line" }}>
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

export function DynamicWhyZuceroSection() {
  const { config } = useCMS();
  const hp = config.homepage;

  return (
    <section className="why-zucero section-shell">
      <SectionDivider number="10" title={hp.whyZuceroEyebrow || "Why Zucero Exists"} />
      <h2>{hp.whyZuceroHeading || "We question what goes into everything else. Why not sugar?"}</h2>
      {hp.whyZuceroParagraphs?.map((paragraph, idx) => (
        <p key={idx} style={{ whiteSpace: "pre-line" }}>
          {paragraph}
        </p>
      ))}
      <div className="why-highlight">
        <strong>{hp.whyZuceroBannerTitle || "Experience the goodness of the first batch"}</strong>
        <span>{hp.whyZuceroBannerSubtitle || "Exclusive referral access · Deliveries begin"}</span>
        <Link className="button button-gold" href={hp.heroButtonLink || "#collection-title"}>
          {hp.whyZuceroButtonText || "Explore the collection"} <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export function DynamicLaunchListSection() {
  const { config } = useCMS();
  const hp = config.homepage;

  return (
    <section id="contact" className="contact-section">
      <SectionDivider number="11" title={hp.launchListEyebrow || "The Launch List"} light />
      <div>
        <h2>{hp.launchListHeading || "Be first to taste the good sugar."}</h2>
        <p>{hp.launchListSubtitle || "Get launch availability, founder notes, and early product access. No noisy inbox."}</p>
      </div>
      <LaunchListForm />
    </section>
  );
}
