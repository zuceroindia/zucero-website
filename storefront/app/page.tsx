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

import {
  DynamicHeroSection,
  DynamicProblemSection,
  DynamicNatureSection,
  DynamicCustomSections,
  DynamicWhyZuceroSection,
  DynamicLaunchListSection,
} from "@/components/dynamic-home-sections";

export default function Home() {
  return (
    <main>
      <DynamicHeroSection />
      <StoryCarousel />
      <DynamicProblemSection />
      <DynamicNatureSection />
      <HeritageSections philosophy={<PhilosophySection />} />
      <DynamicCustomSections />
      <DynamicWhyZuceroSection />
      <DynamicLaunchListSection />
      <SiteFooter />
      <LocationConsent />
    </main>
  );
}
