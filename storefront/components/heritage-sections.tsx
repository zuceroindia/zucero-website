"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductVariant } from "@/lib/catalog";
import { useCMS } from "@/components/cms-provider";
import { SectionDivider } from "@/components/section-divider";

export function PhilosophySection() {
  const { config } = useCMS();
  return <div className="heritage">
    <section id="philosophy" className="heritage-philosophy">
      <SectionDivider number="05" title="Our Philosophy" />
      <h2>{config.homepage.philosophyHeading || "We believe in leaving good things alone."}</h2>
      <p>Nature has a remarkable way of getting things right.</p>
      <p>A sugarcane stalk carries sweetness within it.<br />Generations before us knew how to draw it out.<br />We simply believe there is wisdom in that simplicity.</p>
      <p>At ZUCERO, we don&apos;t believe in changing something merely because we can.</p>
      <p>We believe in thoughtful sourcing.<br />In patient craft.<br />In honest ingredients.<br />In knowing what belongs — and what doesn&apos;t.</p>
      <p><strong>Because true refinement isn&apos;t about doing more.<br />It&apos;s about knowing what to leave behind.</strong></p>
    </section>
  </div>;
}

export function CollectionSection() {
  const { config } = useCMS();
  const products = config.products;

  return <>
    <div className="collection-intro">
      <p>
        {config.homepage.collectionIntroLine1 || "Luxury is not about adding more."}
        <br />
        {config.homepage.collectionIntroLine2 || "It’s about preserving what truly matters."}
      </p>
    </div>
    <section id="products" className="heritage-collection">
      <div id="collection-title" className="collection-anchor"><SectionDivider number={config.homepage.collectionSectionNumber || "04"} title={config.homepage.collectionSectionTitle || "The Collection"} light /></div>
      <h2 className="sr-only">Explore Our Collection</h2>
      <header>
        <span className="heritage-rule" />
        <p>{config.homepage.collectionSubtitle || "Each one distinct. Each one with a story older than the brand."}</p>
        <div className="collection-launch-callout">
          <p className="eyebrow">{config.promotions.collectionBannerEyebrow}</p>
          <p className="collection-access-line">{config.promotions.collectionBannerSubtitle}</p>
          <p className="collection-coupon-offer">{config.promotions.referralOfferText}</p>
        </div>
      </header>
      <div className="heritage-product-grid">
        {products.map((product, index) => <article className="heritage-product" key={product.slug}>
          <div className="heritage-picture">
            <Image
              src={product.image || (index === 0 ? "/images/carousel-khand-matka-v2.png" : "/images/collection-mishri-v2.png")}
              alt={product.name}
              fill
              sizes="(max-width: 760px) 88vw, 42vw"
            />
            <div className="heritage-image-title">
              <span>No. 0{index + 1}</span>
              <h3>{product.name}</h3>
            </div>
          </div>
          <div className="heritage-product-details">
            <p className="eyebrow">{product.eyebrow}</p>
            <span className="heritage-rule" />
            <div className="heritage-product-story">
              <p>{config.homepage.collectionProductStories?.[product.slug] || (index ? "A centuries-old tradition of crystallised sweetness." : "Before refined sugar, there was Khand — a centuries-old Indian tradition of sweetness.")}</p>
              <p>{product.description}</p>
            </div>
            <p className="heritage-sizes">{product.variants.map((v: ProductVariant) => `${v.label} · ₹${(v.pricePaise ?? 0) / 100}`).join(" / ")}</p>
            <p className="heritage-intro-price">{config.promotions.introductoryPriceText}</p>
            <Link href={`/products/${product.slug}`} className="text-link">Buy now →</Link>
          </div>
        </article>)}
      </div>
    </section>
  </>;
}

export function HeritageSections({ philosophy }: { philosophy: ReactNode }) {
  const { config } = useCMS();

  return <div className="heritage">
    <section id="process" className="heritage-dark heritage-craft">
      <div className="heritage-panorama">
        <Image
          src={config.homepage.craftImage || "/images/khand-craft-artisan-v2.png"}
          alt="An artisan preparing fine Desi Khand in a traditional iron kadai"
          fill
          sizes="100vw"
        />
        <div className="section-image-caption craft-caption">
          <h2 className="overlay-section-title">{config.homepage.craftTitle || "The Craft"}</h2>
          <strong><b>Good</b><b>takes</b><b>time.</b></strong>
        </div>
      </div>
      <div className="heritage-columns heritage-copy-only">
        <div>
          <span className="heritage-rule" />
          <p className="heritage-lead">{config.homepage.craftLead || "At Zucero, we honour the wisdom of how sweetness was made before shortcuts became the norm."}</p>
          <p>Our Khand begins with fresh sugarcane juice and is prepared using time-honoured methods. Rather than using artificial techniques simply to accelerate the process, we let our Khand dry naturally under the sun — allowing time and nature to do their work while helping preserve its natural character and naturally occurring constituents.</p>
          <p>Traditionally, our Khand is also prepared in <strong>iron vessels</strong>, a craft practice that can contribute to its naturally occurring iron content.</p>
          <p>And then there is our Mishri.</p>
          <p>An ancient technique where countless fine threads are carefully woven and positioned to encourage the slow formation of beautiful crystals. A process so intricate and precise, it feels almost like <strong>ancient Indian nanotechnology</strong> — where geometry, patience and nature come together.</p>
          <p>No shortcuts.<br />No unnecessary intervention.</p>
          <p>Just sugarcane, time, tradition and craft.</p>
          <p><strong>Because purity isn&apos;t created at the end.<br />It is protected from the beginning.</strong></p>
          <p><strong>ZUCERO</strong><br /><em>The Good Sugar</em></p>
        </div>
      </div>
      <div className="craft-steps">{[["Source", "Good begins at the source — with carefully selected sugarcane, chosen for its natural character and quality."], ["Purify", "Traditionally clarified using natural ingredients to remove unwanted impurities while preserving its natural character."], ["Crystallise", "Slowly transformed into crystals through the art of traditional craftsmanship."], ["Deliver", "Carefully packed and prepared to bring Zucero to your home."]].map(([title, copy], i) => <article key={title}><span className="eyebrow">0{i + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <CollectionSection />
    {philosophy}
    <section className="heritage-dark heritage-slow"><SectionDivider number="06" title="Slow Sweetness" light /><div><span className="heritage-rule" /><p>There is something that happens when Mishri dissolves slowly in hot water. You wait for it. That waiting is the ritual. Not the sugar itself, but what it asks of you.</p></div><div className="heritage-panorama"><Image src="/images/slow-sweetness-ritual-v3.png" alt="Brown Mishri beside a brass cup of morning chai" fill sizes="100vw" /><div className="section-image-caption"><span>Everyday ritual</span><strong>Let sweetness<br />unfold slowly.</strong></div></div></section>
    <section className="heritage-founder">
      <SectionDivider number="07" title="The Founder’s Point of View" />
      <Image
        src={config.homepage.founderImage || "/images/foundertamanna.webp"}
        alt={`${config.homepage.founderName || "Tamanna Sharma"}, founder of Zucero`}
        width={380}
        height={480}
        sizes="(max-width: 640px) 70vw, 300px"
      />
      <blockquote>{config.homepage.founderQuote || "If marketing can create trust,\nit should also earn it."}</blockquote>
      <span className="heritage-rule" />
      <p>{config.homepage.founderStoryLead}</p>
      <p>She believes one thing deeply:</p>
      <p><strong>A good brand is not built by marketing alone. It is built by a good product, and strengthened by trust earned over time.</strong></p>
      <p>Marketing has the power to shape perceptions, influence choices and bring products into our homes. But that power comes with a responsibility.</p>
      <p>If marketing can make us notice what is in front of us, why not use it to bring attention to the good that often remains unseen?</p>
      <p>Zucero was born from this thought.</p>
      <p>There are still beautifully crafted, naturally made products rooted in traditional wisdom — products whose goodness has existed for generations, but whose stories have remained largely untold.</p>
      <p>We wanted to bring those products into the light.</p>
      <p>Not by making bigger promises.<br />Not by creating unnecessary noise.<br />But by making people <strong>more aware of what they choose.</strong></p>
      <p>Because when you know where something comes from, how it is made, and what goes into it, you can make a better choice — for yourself, for your family, and for the people you love.</p>
      <p><strong>Zucero exists to make good more visible.</strong></p>
      <p><strong>ZUCERO<br />THE GOOD SUGAR</strong></p>
      <Link className="text-link" href="/our-story">Read the founder’s story →</Link>
    </section>
    <section className="heritage-dark heritage-rituals"><SectionDivider number="08" title="Everyday Rituals" light /><h2>Small moments,<br />made meaningful.</h2><div className="heritage-ritual-grid">{[
      ["Morning chai", "Stir a spoon of khand into strong cardamom tea. Start small and sweeten to your taste.", "desi-khand", "Meet Khand"],
      ["After-dinner pause", "Let a mishri crystal dissolve slowly beside a cup of warm water. Make a little room for the pause.", "dhage-wali-mishri", "Meet Mishri"],
      ["Slow baking", "Bring khand into cakes, puddings and time-honoured Indian sweets. Familiar ingredients, considered moments.", "desi-khand", "Bake with Khand"]
    ].map(([title, copy, slug, cta], i) => <article key={title}><span className="eyebrow">0{i + 1}</span><h3>{title}</h3><p>{copy}</p><Link className="text-link" href={`/products/${slug}`}>{cta} →</Link></article>)}</div></section>
    <section className="heritage-dark heritage-journal"><SectionDivider number="09" title="From the Journal" light /><div className="heritage-journal-grid">{[
      ["morning-tea-ritual-v2.png", "Rituals", "The Ritual of Morning Tea", "A slower beginning, one cup at a time.", "morning-tea"],
      ["journal_editorial.webp", "Heritage", "The Hands Behind the Craft", "On the value of patience and traditional sugar-making.", "the-craft"]
    ].map(([img, tag, title, copy, slug]) => <Link href={`/journal#${slug}`} key={slug}><div className="heritage-picture"><Image src={`/images/${img}`} alt={title} fill sizes="(max-width: 760px) 88vw, 43vw" /><div className="section-image-caption"><span>{tag}</span><strong>{title}</strong></div></div><p>{copy}</p><span className="text-link">Read story →</span></Link>)}</div><Link className="button" href="/journal">View all stories</Link></section>
  </div>;
}
