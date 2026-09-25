"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, FlaskConical, Leaf, PackageCheck, Sparkles, Sun } from "lucide-react";
import { useCMS } from "@/components/cms-provider";
import { Header } from "@/components/header";
import { SectionDivider } from "@/components/section-divider";
import { LaunchListForm } from "@/components/launch-list-form";
import { CMSSectionFrame, cmsTextAlign } from "@/components/cms-section-frame";

const highlightIcons = [Leaf, FlaskConical, Sparkles, PackageCheck];

export function DynamicHeroSection() {
  const { config } = useCMS();
  const hp = config.homepage;
  const layout = config.sectionLayouts?.["homepage.hero"];
  const textAlign = cmsTextAlign(layout);
  const contentJustify = textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start";

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
      <div className="hero-copy" style={{ textAlign }}>
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
        <div className="button-row" style={{ justifyContent: contentJustify }}>
          <Link className="button button-gold" href={hp.heroButtonLink || "#collection-title"}>
            {hp.heroButtonText || "Explore our collection"} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-labels" style={{ justifyContent: contentJustify }}>
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
  const layout = config.sectionLayouts?.["homepage.problem"];

  return (
    <section id="problem" className="problem">
      <SectionDivider number="01" title={hp.sugarProblemEyebrow || "The Sugar Problem"} />
      <CMSSectionFrame layout={layout}>
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
      </CMSSectionFrame>
    </section>
  );
}

export function DynamicNatureSection() {
  const { config } = useCMS();
  const hp = config.homepage;
  const layout = config.sectionLayouts?.["homepage.nature"];

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
      <div className="nature-copy" style={{ textAlign: cmsTextAlign(layout) }}>
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
  const layout = config.sectionLayouts?.["homepage.whyZucero"];

  return (
    <section className="why-zucero section-shell">
      <SectionDivider number="10" title={hp.whyZuceroEyebrow || "Why Zucero Exists"} />
      <CMSSectionFrame layout={layout}>
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
      </CMSSectionFrame>
    </section>
  );
}

export function DynamicLaunchListSection() {
  const { config } = useCMS();
  const hp = config.homepage;
  const layout = config.sectionLayouts?.["homepage.launchList"];

  return (
    <section id="contact" className="contact-section">
      <SectionDivider number="11" title={hp.launchListEyebrow || "The Launch List"} light />
      <CMSSectionFrame layout={layout}>
        <div>
          <h2>{hp.launchListHeading || "Be first to taste the good sugar."}</h2>
          <p>{hp.launchListSubtitle || "Get launch availability, founder notes, and early product access. No noisy inbox."}</p>
        </div>
        <LaunchListForm />
      </CMSSectionFrame>
    </section>
  );
}


export function DynamicCustomSections() {
  const { config } = useCMS();
  const sections = config.homepage.customSections || [];

  if (!sections.some((section) => section.enabled)) return null;

  return (
    <>
      {sections.filter((section) => section.enabled).map((section) => {
        const hasImage = Boolean(section.image) && section.imagePosition !== "none";
        const dark = section.theme === "dark" || section.theme === "green";
        const background = section.theme === "dark"
          ? "#11130f"
          : section.theme === "green"
            ? "#102218"
            : "var(--paper)";
        const color = dark ? "#f4efe4" : "var(--ink)";
        const muted = dark ? "rgba(244,239,228,.72)" : "var(--muted)";
        const imageFirst = section.imagePosition === "left" || section.imagePosition === "top";
        const splitImage = section.imagePosition === "left" || section.imagePosition === "right";

        const copy = (
          <div style={{ padding: "clamp(3.5rem,7vw,7rem)", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: section.textAlign || "left" }}>
            {section.eyebrow && (
              <p className="eyebrow" style={{ color: dark ? "#d8b456" : undefined }}>
                {section.eyebrow}
              </p>
            )}
            <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "clamp(2.6rem,4.8vw,5.2rem)", lineHeight: 1.05, margin: "0 0 1.1rem" }}>
              {section.title}
            </h2>
            <div style={{ color: muted, whiteSpace: "pre-line", fontSize: "1.03rem", lineHeight: 1.7 }}>
              {section.body}
            </div>
          </div>
        );

        const image = hasImage ? (
          <div style={{ position: "relative", minHeight: "clamp(360px,52vw,680px)" }}>
            <Image
              src={section.image}
              alt={section.imageAlt || section.title || "Zucero editorial section"}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        ) : null;

        return (
          <section
            key={section.id}
            id={section.id}
            style={{
              background,
              color,
              display: hasImage ? "grid" : "block",
              gridTemplateColumns: hasImage && splitImage ? "repeat(2,minmax(0,1fr))" : "1fr",
            }}
            className="cms-custom-section"
          >
            {hasImage ? (
              imageFirst ? <>{image}{copy}</> : <>{copy}{image}</>
            ) : copy}
          </section>
        );
      })}
    </>
  );
}
