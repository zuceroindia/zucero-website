import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { absoluteUrl } from "@/lib/seo";

const title = "Our Story | Why Zucero Chose Traditional Indian Sweetness";
const description = "Discover why Zucero was created to bring greater transparency, provenance and traditional craft to Desi Khand, Mishri and everyday sugar choices.";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["Zucero story", "Desi Khand brand", "traditional Indian sweetness", "sugar alternatives", "health and wellness", "Khand", "Mishri"],
  alternates: { canonical: "/our-story" },
  openGraph: {
    type: "article",
    url: absoluteUrl("/our-story"),
    title: `${title} | Zucero`,
    description,
    images: [{ url: "/images/foundertamanna.webp", alt: "Zucero founder story" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Zucero`,
    description,
    images: ["/images/foundertamanna.webp"],
  },
};

import { DynamicOurStory } from "@/components/dynamic-our-story";

export default function OurStoryPage() {
  return <DynamicOurStory />;
}
