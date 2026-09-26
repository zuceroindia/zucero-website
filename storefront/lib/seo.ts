import type { Metadata } from "next";

export const SITE_URL = "https://www.thegoodsugar.in";
export const SITE_NAME = "Zucero — The Good Sugar";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/api/social-preview`;

export const coreKeywords = [
  "Zucero",
  "Desi Khand",
  "Khand sugar",
  "traditional Khand",
  "Shudh Khand",
  "Dhage Wali Mishri",
  "brown Khand Mishri",
  "traditional Indian sugar",
  "natural sugar alternatives",
  "sugar alternatives",
  "health and wellness",
  "mindful sweetness",
  "sugarcane sugar",
];

export const socialProfiles = [
  "https://www.youtube.com/@ZuceroIndia",
  "https://x.com/zuceroindia",
  "https://www.instagram.com/zuceroindia/",
  "https://www.linkedin.com/company/zuceroindia",
  "https://www.facebook.com/zuceroindia",
];

export function absoluteUrl(path = "") {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
}): Metadata {
  return {
    title,
    description,
    keywords: [...coreKeywords, ...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: absoluteUrl(path),
      title: `${title} | Zucero`,
      description,
      images: [{ url: image, alt: `${title} — Zucero` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Zucero`,
      description,
      images: [image],
    },
  };
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
