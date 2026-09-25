import type { Product, ProductVariant } from "@/lib/catalog";
export type { Product, ProductVariant };
import { products as defaultProducts } from "@/lib/catalog";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type CMSPromotions = {
  introductoryPriceText: string;
  referralOfferText: string;
  popupEyebrow: string;
  popupHeading: string;
  popupDescription: string;
  collectionBannerEyebrow: string;
  collectionBannerSubtitle: string;
};

export type CMSHomepage = {
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitleLine1: string;
  heroSubtitleLine2: string;
  heroButtonText: string;
  heroPosterImage: string;
  collectionIntroLine1: string;
  collectionIntroLine2: string;
  collectionSubtitle: string;
  craftTitle: string;
  craftLead: string;
  craftImage: string;
  philosophyHeading: string;
  founderName: string;
  founderQuote: string;
  founderImage: string;
  founderStoryLead: string;
};

export type CMSContact = {
  whatsappPhone: string;
  supportEmail: string;
  instagramUrl: string;
};

export type CMSConfig = {
  products: Product[];
  promotions: CMSPromotions;
  homepage: CMSHomepage;
  contact: CMSContact;
  updatedAt: string;
};

export type CMSCommit = {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  configSnapshot: CMSConfig;
};

export const DEFAULT_CMS_CONFIG: CMSConfig = {
  products: JSON.parse(JSON.stringify(defaultProducts)),
  promotions: {
    introductoryPriceText: "Introductory price for first 100 orders only",
    referralOfferText: "Get an additional discount of 10% on referral.",
    popupEyebrow: "Exclusive Referral Offer",
    popupHeading: "10% on referral",
    popupDescription: "Share the goodness of Zucero with friends and family.",
    collectionBannerEyebrow: "Experience the goodness of the first batch",
    collectionBannerSubtitle: "Introductory price for first 100 orders only · Deliveries begin",
  },
  homepage: {
    heroEyebrow: "Rooted in Indian sugar-making",
    heroTitleLine1: "Sweetness",
    heroTitleLine2: "is a ritual.",
    heroSubtitleLine1: "Nature perfected sweetness.",
    heroSubtitleLine2: "We simply preserved it.",
    heroButtonText: "Explore our collection",
    heroPosterImage: "/images/hero-cinematic-poster.png",
    collectionIntroLine1: "Luxury is not about adding more.",
    collectionIntroLine2: "It’s about preserving what truly matters.",
    collectionSubtitle: "Each one distinct. Each one with a story older than the brand.",
    craftTitle: "The Craft",
    craftLead: "At Zucero, we honour the wisdom of how sweetness was made before shortcuts became the norm.",
    craftImage: "/images/khand-craft-artisan-v2.png",
    philosophyHeading: "We believe in leaving good things alone.",
    founderName: "Tamanna Sharma",
    founderQuote: "If marketing can create trust, it should also earn it.",
    founderImage: "/images/foundertamanna.webp",
    founderStoryLead:
      "With extensive leadership experience across India and international markets, Tamanna Sharma has spent years understanding the power of brands — and, more importantly, the power of trust.",
  },
  contact: {
    whatsappPhone: "+91 87963 49977",
    supportEmail: "zucero.thegoodsugar@gmail.com",
    instagramUrl: "https://www.instagram.com/zucero.in/",
  },
  updatedAt: new Date().toISOString(),
};

const BUCKET_NAME = "site-cms";
const CONFIG_PATH = "config/live-site-content.json";
const COMMITS_PATH = "config/commits.json";

export function mergeWithDefaultCMS(partial?: Partial<CMSConfig> | null): CMSConfig {
  if (!partial) return JSON.parse(JSON.stringify(DEFAULT_CMS_CONFIG));

  return {
    products:
      Array.isArray(partial.products) && partial.products.length > 0
        ? partial.products.map((p: Partial<Product>, idx: number) => {
            const defProd = DEFAULT_CMS_CONFIG.products.find((d: Product) => d.slug === p.slug) ?? DEFAULT_CMS_CONFIG.products[idx] ?? (p as Product);
            return {
              ...defProd,
              ...p,
              variants: Array.isArray(p.variants)
                ? p.variants.map((v: Partial<ProductVariant>, vIdx: number) => {
                    const defVar = defProd.variants?.find((dv: ProductVariant) => dv.id === v.id) ?? defProd.variants?.[vIdx] ?? (v as ProductVariant);
                    const priceRupees = typeof v.priceRupees === "number" ? v.priceRupees : (v.pricePaise ?? 0) / 100;
                    const pricePaise = typeof v.pricePaise === "number" ? v.pricePaise : Math.round(priceRupees * 100);
                    return {
                      ...defVar,
                      ...v,
                      priceRupees,
                      pricePaise,
                      galleryPhotos: Array.isArray(v.galleryPhotos) ? v.galleryPhotos : defVar.galleryPhotos ?? [],
                    };
                  })
                : defProd.variants,
            };
          })
        : JSON.parse(JSON.stringify(DEFAULT_CMS_CONFIG.products)),
    promotions: {
      ...DEFAULT_CMS_CONFIG.promotions,
      ...(partial.promotions ?? {}),
    },
    homepage: {
      ...DEFAULT_CMS_CONFIG.homepage,
      ...(partial.homepage ?? {}),
    },
    contact: {
      ...DEFAULT_CMS_CONFIG.contact,
      ...(partial.contact ?? {}),
    },
    updatedAt: partial.updatedAt || DEFAULT_CMS_CONFIG.updatedAt,
  };
}

async function ensureBucket() {
  try {
    const db = supabaseAdmin();
    const { data: buckets } = await db.storage.listBuckets();
    if (!buckets?.find((b: { name: string }) => b.name === BUCKET_NAME)) {
      await db.storage.createBucket(BUCKET_NAME, { public: true });
    }
  } catch {
    // Ignore if bucket already exists
  }
}

export async function getLiveCMSConfig(): Promise<CMSConfig> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${CONFIG_PATH}?t=${Date.now()}`;
      const res = await fetch(publicUrl, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        return mergeWithDefaultCMS(json);
      }
    }
    const db = supabaseAdmin();
    const { data, error } = await db.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return mergeWithDefaultCMS(parsed);
    }
  } catch {
    // Fallback to default config
  }
  return mergeWithDefaultCMS(null);
}

export async function getCMSCommits(): Promise<CMSCommit[]> {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.storage.from(BUCKET_NAME).download(COMMITS_PATH);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Return empty commits if none saved yet
  }
  return [];
}

export async function saveLiveCMSConfig(
  newConfig: CMSConfig,
  commitMessage: string,
  authorEmail: string
): Promise<{ config: CMSConfig; commits: CMSCommit[] }> {
  await ensureBucket();
  const db = supabaseAdmin();
  const merged = mergeWithDefaultCMS({
    ...newConfig,
    updatedAt: new Date().toISOString(),
  });

  const configBuffer = Buffer.from(JSON.stringify(merged, null, 2), "utf-8");
  const { error: uploadErr } = await db.storage.from(BUCKET_NAME).upload(CONFIG_PATH, configBuffer, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
  if (uploadErr) {
    throw new Error(`Failed to save live website config: ${uploadErr.message}`);
  }

  const existingCommits = await getCMSCommits();
  const newCommit: CMSCommit = {
    id: `commit-${Date.now().toString(36)}`,
    message: commitMessage.trim() || "Updated live website content & products",
    author: authorEmail,
    timestamp: merged.updatedAt,
    configSnapshot: merged,
  };

  const updatedCommits = [newCommit, ...existingCommits].slice(0, 25);
  const commitsBuffer = Buffer.from(JSON.stringify(updatedCommits, null, 2), "utf-8");
  await db.storage.from(BUCKET_NAME).upload(COMMITS_PATH, commitsBuffer, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });

  return { config: merged, commits: updatedCommits };
}
