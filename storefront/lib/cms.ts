import type { Product, ProductVariant } from "@/lib/catalog";
export type { Product, ProductVariant };
import { products as defaultProducts } from "@/lib/catalog";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type CMSSectionBlock = {
  heading: string;
  content: string;
};

export type CMSFAQItem = {
  question: string;
  answer: string;
};

export type CMSNavLink = {
  label: string;
  href: string;
};

export type CMSHighlight = {
  title: string;
  description: string;
};

export type CMSCustomHomepageSection = {
  id: string;
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  imagePosition: "left" | "right" | "none";
  theme: "light" | "dark" | "green";
};

export type CMSUploadedFont = {
  id: string;
  name: string;
  url: string;
  format: "woff2" | "woff" | "ttf" | "otf";
};

export type CMSTypography = {
  bodyFont: string;
  headingFont: string;
  accentFont: string;
  bodyWeight: number;
  headingWeight: number;
  bodySizePx: number;
  h1SizePx: number;
  h2SizePx: number;
  h3SizePx: number;
  navSizePx: number;
  buttonSizePx: number;
  uploadedFonts: CMSUploadedFont[];
  advancedCss: string;
};

export type CMSPromotions = {
  introductoryPriceText: string;
  referralOfferText: string;
  popupEnabled: boolean;
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
  heroButtonLink: string;
  heroPosterImage: string;
  heroVideoUrl: string;
  heroQuickLinks: { label: string; href: string }[];
  highlights: CMSHighlight[];
  sugarProblemEyebrow: string;
  sugarProblemHeading: string;
  sugarProblemParagraphs: string[];
  natureSolutionOverlayTitle: string;
  natureSolutionHeading: string;
  natureSolutionParagraphs: string[];
  natureSolutionImage: string;
  collectionIntroLine1: string;
  collectionIntroLine2: string;
  collectionSubtitle: string;
  craftTitle: string;
  craftLead: string;
  craftImage: string;
  philosophyHeading: string;
  philosophyPoints: string[];
  founderName: string;
  founderQuote: string;
  founderImage: string;
  founderStoryLead: string;
  founderStoryParagraphs: string[];
  whyZuceroEyebrow: string;
  whyZuceroHeading: string;
  whyZuceroParagraphs: string[];
  whyZuceroBannerTitle: string;
  whyZuceroBannerSubtitle: string;
  whyZuceroButtonText: string;
  launchListEyebrow: string;
  launchListHeading: string;
  launchListSubtitle: string;
  customSections: CMSCustomHomepageSection[];
};

export type CMSContact = {
  eyebrow: string;
  title: string;
  intro: string;
  whatsappPhone: string;
  supportEmail: string;
  supportHours: string;
  responseNote: string;
  officeAddress: string;
  instagramUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
};

export type CMSOurStory = {
  eyebrow: string;
  title: string;
  intro: string;
  founderName: string;
  founderImage: string;
  founderQuote: string;
  storyParagraphs: string[];
  disclaimer: string;
};

export type CMSPolicyPage = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: CMSSectionBlock[];
  bottomNote?: string;
};

export type CMSPolicies = {
  shipping: CMSPolicyPage;
  returns: CMSPolicyPage;
  refunds: CMSPolicyPage;
  privacy: CMSPolicyPage;
  terms: CMSPolicyPage;
};

export type CMSGuidePage = {
  eyebrow: string;
  title: string;
  intro: string;
  faqs: CMSFAQItem[];
};

export type CMSGuides = {
  desiKhand: CMSGuidePage;
  sugarAlternatives: CMSGuidePage;
};

export type CMSHeader = {
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  navLinks: CMSNavLink[];
};

export type CMSFooter = {
  tagline: string;
  fssaiNumber: string;
  cinNumber: string;
  companyName: string;
  registeredOffice: string;
  copyrightText: string;
};

export type CMSConfig = {
  homepage: CMSHomepage;
  products: Product[];
  promotions: CMSPromotions;
  ourStory: CMSOurStory;
  contact: CMSContact;
  header: CMSHeader;
  footer: CMSFooter;
  policies: CMSPolicies;
  guides: CMSGuides;
  typography: CMSTypography;
  customPages?: Record<string, { title: string; contentHtml: string }>;
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
  homepage: {
    heroEyebrow: "Rooted in Indian sugar-making",
    heroTitleLine1: "Sweetness",
    heroTitleLine2: "is a ritual.",
    heroSubtitleLine1: "Nature perfected sweetness.",
    heroSubtitleLine2: "We simply preserved it.",
    heroButtonText: "Explore our collection",
    heroButtonLink: "#collection-title",
    heroPosterImage: "/images/hero-cinematic-poster.png",
    heroVideoUrl: "https://play.gumlet.io/embed/6a2ee82136223b22766f448c?background=true",
    heroQuickLinks: [
      { label: "Pure by nature", href: "/products/desi-khand#product-information" },
      { label: "Natural goodness", href: "#nature" },
      { label: "Mindful sweetness", href: "#problem" },
      { label: "Delicate sweetness", href: "/products/dhage-wali-mishri" },
    ],
    highlights: [
      { title: "PURE BY NATURE", description: "Nothing Artificial" },
      { title: "NATURAL GOODNESS", description: "Retains the goodness of its natural source" },
      { title: "MINDFUL SWEETNESS", description: "A natural alternative to refined sugar" },
      { title: "DELICATE SWEETNESS", description: "Light, subtle and naturally sweet" },
    ],
    sugarProblemEyebrow: "01 · The Sugar Problem",
    sugarProblemHeading: "Sweetness lost its story.",
    sugarProblemParagraphs: [
      "Sugar begins with something beautifully simple.",
      "A stalk of sugarcane. Sunlight. Soil. Time.",
      "For generations, India knew how to turn that sweetness into Gur, Khand and Mishri — with patience, craft and a deep respect for the ingredient.",
      "But somewhere along the way, sweetness became increasingly refined, standardised and disconnected from where it began.",
      "The colour became whiter. The crystals became more uniform. The story became harder to see.",
      "We believe sweetness deserves better. Not more. Not louder. Just closer to its source.",
      "So we went back to the beginning.",
    ],
    natureSolutionOverlayTitle: "Nature’s Solution",
    natureSolutionHeading: "Begin with sugarcane. Interfere less.",
    natureSolutionParagraphs: [
      "At Zucero, we believe some things don’t need to be reinvented. They simply need to be respected.",
      "We return to traditional forms of sweetness, thoughtfully crafted from sugarcane and brought into the modern kitchen with greater care, clarity and intention.",
      "This is sweetness with its story intact. This is The Good Sugar.",
    ],
    natureSolutionImage: "/images/nature-solution-field-v3.png",
    collectionIntroLine1: "Luxury is not about adding more.",
    collectionIntroLine2: "It’s about preserving what truly matters.",
    collectionSubtitle: "Each one distinct. Each one with a story older than the brand.",
    craftTitle: "The Craft",
    craftLead: "At Zucero, we honour the wisdom of how sweetness was made before shortcuts became the norm.",
    craftImage: "/images/khand-craft-artisan-v2.png",
    philosophyHeading: "We believe in leaving good things alone.",
    philosophyPoints: [
      "Nature has a remarkable way of getting things right.",
      "A sugarcane stalk carries sweetness within it. Generations before us knew how to draw it out. We simply believe there is wisdom in that simplicity.",
      "At ZUCERO, we don't believe in changing something merely because we can.",
      "We believe in thoughtful sourcing. In patient craft. In honest ingredients. In knowing what belongs — and what doesn't.",
      "Because true refinement isn't about doing more. It's about knowing what to leave behind.",
    ],
    founderName: "Tamanna Sharma",
    founderQuote: "If marketing can create trust, it should also earn it.",
    founderImage: "/images/foundertamanna.webp",
    founderStoryLead:
      "With extensive leadership experience across India and international markets, Tamanna Sharma has spent years understanding the power of brands — and, more importantly, the power of trust.",
    founderStoryParagraphs: [
      "For her, Zucero is not just about bringing back traditional sugar alternatives. It is about restoring integrity to a category where claims often blur the truth.",
      "Her vision is simple: create a modern, conscious food brand that stands for purity without compromise, provenance without pretence, and an unwavering respect for the intelligence of the consumer.",
    ],
    whyZuceroEyebrow: "10 · Why Zucero Exists",
    whyZuceroHeading: "We question what goes into everything else. Why not sugar?",
    whyZuceroParagraphs: [
      "We know where our coffee comes from. We ask about our milk. We read the labels on what we eat.",
      "Yet sugar — something we consume every day — is rarely questioned.",
      "Zucero exists to change that. To make sweetness more thoughtful. More transparent. More connected to its source.",
      "We return to sugarcane, traditional craft and the patience of time — because we believe good sugar should be made with the same care with which you choose it.",
      "Zucero. The Good Sugar.",
    ],
    whyZuceroBannerTitle: "Experience the goodness of the first batch",
    whyZuceroBannerSubtitle: "Exclusive referral access · Deliveries begin",
    whyZuceroButtonText: "Explore the collection",
    launchListEyebrow: "11 · The Launch List",
    launchListHeading: "Be first to taste the good sugar.",
    launchListSubtitle: "Get launch availability, founder notes, and early product access. No noisy inbox.",
    customSections: [],
  },
  products: JSON.parse(JSON.stringify(defaultProducts)),
  promotions: {
    introductoryPriceText: "Introductory price for first 100 orders only",
    referralOfferText: "Get an additional discount of 10% on referral.",
    popupEnabled: true,
    popupEyebrow: "Exclusive Referral Offer",
    popupHeading: "10% on referral",
    popupDescription: "Share the goodness of Zucero with friends and family.",
    collectionBannerEyebrow: "Experience the goodness of the first batch",
    collectionBannerSubtitle: "Introductory price for first 100 orders only · Deliveries begin",
  },
  typography: {
    bodyFont: "Outfit",
    headingFont: "Cormorant Garamond",
    accentFont: "Outfit",
    bodyWeight: 400,
    headingWeight: 400,
    bodySizePx: 0,
    h1SizePx: 0,
    h2SizePx: 0,
    h3SizePx: 0,
    navSizePx: 0,
    buttonSizePx: 0,
    uploadedFonts: [],
    advancedCss: "",
  },
  ourStory: {
    eyebrow: "Tamanna Sharma · The founder’s story",
    title: "It Started With a Simple Search for Something Better.",
    intro: "A personal search became a larger purpose — to bring traditional sweetness out of the grey and into the light.",
    founderName: "Tamanna Sharma",
    founderImage: "/images/foundertamanna.webp",
    founderQuote: "If marketing can create trust, it should also earn it.",
    storyParagraphs: [
      "My journey with Zucero began with a personal search.",
      "When I started my fitness journey, I began looking more closely at what I was consuming — and naturally, I started looking for an alternative to refined sugar.",
      "But having grown up in the heart of Haryana, sweetness had always meant something very different to me.",
      "Jaggery after a meal was tradition. It was familiar. It was something I genuinely loved.",
      "Yet as I began looking for it more consciously, I discovered something unsettling.",
      "Finding genuinely pure, unadulterated jaggery or Khand was becoming surprisingly difficult.",
      "The traditional carts. The small local sellers. Even farmers selling directly from villages.",
      "They looked wonderfully raw and authentic. But when I actually tried the products, I found that the story of “natural” did not always match what was inside.",
      "That made me realise just how grey the category had become.",
      "Jaggery, Khand and Mishri are everywhere. Yet there was no distinctive brand that made purity, provenance and the craft of these traditional sweeteners its very identity.",
      "And that raised a bigger question for me: If we can be so conscious about what goes into our food, why have we never really questioned our sugar?",
      "Today, adults are increasingly conscious about health and wellness. We read labels, change our diets and make more informed choices.",
      "But our children will still grow up around sweetness. Festivals, celebrations, desserts and little moments of indulgence will always be part of life.",
      "So perhaps the answer isn't to take sweetness away. Perhaps it is to make a better choice when we choose it.",
      "That is where Zucero began.",
      "A personal search became a larger purpose — to bring the goodness of natural sweetness out of the grey and into the light.",
    ],
    disclaimer: "Zucero products contain sugar. Traditional processing does not make them sugar-free or a treatment for health conditions.",
  },
  contact: {
    eyebrow: "Human support",
    title: "Talk to Zucero",
    intro: "Questions about products, orders, wholesale, or the launch are welcome.",
    whatsappPhone: "+91 87963 49977",
    supportEmail: "zucero.thegoodsugar@gmail.com",
    supportHours: "Monday – Saturday: 10:00 AM – 6:00 PM IST",
    responseNote: "We aim to respond during Indian business hours. Launch periods may take a little longer.",
    officeAddress: "Sector-2, Rohtak, 124001, Haryana, India",
    instagramUrl: "https://www.instagram.com/zuceroindia/",
    youtubeUrl: "https://www.youtube.com/@ZuceroIndia",
    twitterUrl: "https://x.com/zuceroindia",
    linkedinUrl: "https://www.linkedin.com/company/zuceroindia",
    facebookUrl: "https://www.facebook.com/zuceroindia",
  },
  header: {
    announcementEnabled: false,
    announcementText: "Free delivery across India on orders above ₹999",
    announcementLink: "/products",
    navLinks: [
      { label: "Our story", href: "/our-story" },
      { label: "Products", href: "/products" },
      { label: "How it’s made", href: "/#process" },
      { label: "Contact", href: "/contact" },
    ],
  },
  footer: {
    tagline: "Thoughtfully made Indian sweetness, explained honestly.",
    fssaiNumber: "20826018000800",
    cinNumber: "U56290HR2026PTC145994",
    companyName: "TIARA TRIVERSE PRIVATE LIMITED",
    registeredOffice: "Sector-2, Rohtak, 124001, Haryana, India",
    copyrightText: "© 2026 Zucero. All rights reserved.",
  },
  policies: {
    shipping: {
      eyebrow: "Delivery, clearly explained",
      title: "Shipping policy",
      intro: "Zucero currently ships within India from Haryana. Delivery serviceability and shipping charges are calculated before payment.",
      sections: [
        {
          heading: "Shipping charges",
          content:
            "All deliveries are chargeable. The shipping amount is calculated at checkout using the destination PIN code and the total packed weight of the order. When multiple products or quantities are purchased, their packed weights are combined for the shipping calculation.",
        },
        {
          heading: "Serviceability",
          content:
            "Before Razorpay opens, the checkout verifies the destination PIN code and applicable prepaid courier rate through Shiprocket. If the courier network cannot currently serve that PIN code, payment is not started.",
        },
        {
          heading: "Processing",
          content:
            "After Razorpay confirms a captured payment, the order is automatically sent to Shiprocket for fulfilment from our Haryana pickup location. The Zucero team then prepares and dispatches the parcel.",
        },
        {
          heading: "Tracking",
          content:
            "Once a shipment receives an AWB, courier tracking details can be associated with the order. Courier scans may take several hours to update after handover.",
        },
        {
          heading: "Address accuracy",
          content:
            "Please provide a complete address, reachable mobile number, correct state and six-digit PIN code. Re-shipping charges caused by an incorrect or incomplete customer address may be payable by the customer.",
        },
      ],
    },
    returns: {
      eyebrow: "We will make it right",
      title: "Returns and replacements",
      intro: "Food products need careful handling, so return eligibility depends on the condition and reason for the request.",
      sections: [
        {
          heading: "Damaged, incorrect, or missing items",
          content:
            "Contact us promptly after delivery with your order number, clear photographs of the outer package, shipping label, and affected product. Keep the original packaging until the request is resolved.",
        },
        {
          heading: "Change-of-mind returns",
          content:
            "For food-safety reasons, opened products and correctly delivered food items are generally not returnable for a change of mind. This does not limit remedies available for damaged, defective, or incorrectly supplied goods.",
        },
        {
          heading: "Resolution",
          content:
            "After verification, we may offer a replacement, refund, or another appropriate resolution. Approved refunds are returned to the original payment method according to payment-provider timelines.",
        },
      ],
      bottomNote: "For payment-specific information, read the refund policy.",
    },
    refunds: {
      eyebrow: "Fair and transparent",
      title: "Refund policy",
      intro: "Refunds are processed promptly upon verification and credited back to the original source of payment.",
      sections: [
        {
          heading: "Payment method and timeline",
          content:
            "Approved refunds are credited to the original payment method used during checkout via Razorpay. Depending on your bank, credit card company, or UPI provider, the credit typically reflects within 5 to 7 business days.",
        },
        {
          heading: "Pre-dispatch cancellations",
          content:
            "Orders cancelled before dispatch are eligible for a 100% refund. Once dispatched and handed over to the courier partner, cancellations cannot be accepted.",
        },
      ],
    },
    privacy: {
      eyebrow: "Your data is respected",
      title: "Privacy policy",
      intro: "We collect only what is strictly necessary to fulfill your orders and provide thoughtful customer support.",
      sections: [
        {
          heading: "Information we collect",
          content:
            "We collect your contact details (name, delivery address, phone number, email address) solely to process, deliver, and support your orders.",
        },
        {
          heading: "Payment security",
          content:
            "Payment processing is handled securely by Razorpay. Zucero does not collect, process, or store credit/debit card numbers, CVVs, or netbanking passwords on our servers.",
        },
        {
          heading: "Communications",
          content:
            "We may send order updates, tracking alerts, and essential service notices via WhatsApp, SMS, or email. You may opt out of non-essential communications at any time.",
        },
      ],
    },
    terms: {
      eyebrow: "Terms and conditions",
      title: "Terms of service",
      intro: "By using Zucero.thegoodsugar.in and placing an order, you agree to these terms.",
      sections: [
        {
          heading: "Product information & pricing",
          content:
            "We strive for complete accuracy in pricing, product descriptions, and weights. In the rare event of an error, we reserve the right to correct the error and contact you before proceeding.",
        },
        {
          heading: "Governing law",
          content:
            "These terms and transactions are governed by the laws of India, subject to the jurisdiction of the courts in Rohtak, Haryana.",
        },
      ],
    },
  },
  guides: {
    desiKhand: {
      eyebrow: "Educational Guide",
      title: "What Is Desi Khand? Shudh Khand, Organic Khand & Sugar Alternatives",
      intro: "A clear guide to Desi Khand: what Khand is, how it differs from refined sugar, what Shudh Khand and organic Khand mean, and how to read purity claims.",
      faqs: [
        {
          question: "What is Desi Khand?",
          answer:
            "Desi Khand is a traditional Indian form of cane sugar made from sugarcane juice with less refining than highly refined white sugar. Colour, texture and flavour can vary with the raw material and process.",
        },
        {
          question: "Is Shudh Khand the same as Desi Khand?",
          answer:
            "Shudh means pure, but the word itself is not proof of purity. Check the ingredient declaration, manufacturer details, food licence information and the final pack label rather than relying only on a marketing term.",
        },
        {
          question: "Is Desi Khand organic?",
          answer:
            "Desi Khand and organic Khand are not automatically the same thing. Organic is a sourcing and certification claim. A product should only be described as certified organic when the applicable certification is documented on the pack.",
        },
        {
          question: "Is Khand chemical-free sugar?",
          answer:
            "No food is literally chemical-free. Shoppers often use this phrase to mean fewer unnecessary additives or less intensive processing. Look for specific, verifiable claims on the label instead of broad chemical-free wording.",
        },
      ],
    },
    sugarAlternatives: {
      eyebrow: "Comparative Guide",
      title: "Sugar Alternatives in India: Understanding Jaggery, Khand and Natural Sweeteners",
      intro: "An honest comparison of traditional Indian sweeteners vs industrial sugar alternatives.",
      faqs: [
        {
          question: "How does Desi Khand compare to Brown Sugar?",
          answer:
            "Commercial brown sugar is typically white refined sugar with molasses sprayed back onto it. Desi Khand is made by crystallising sugarcane juice directly through traditional boiling and cooling.",
        },
        {
          question: "Can Khand be used as a 1:1 replacement in tea and baking?",
          answer:
            "Yes. Khand dissolves naturally and adds a rounded, caramel-like sweetness without the artificial aftertaste of chemical sweeteners.",
        },
      ],
    },
  },
  updatedAt: new Date().toISOString(),
};

const BUCKET_NAME = "site-cms";
const CONFIG_PATH = "config/live-site-content.json";
const COMMITS_PATH = "config/commits.json";

export function mergeWithDefaultCMS(partial?: Partial<CMSConfig> | null): CMSConfig {
  if (!partial) return JSON.parse(JSON.stringify(DEFAULT_CMS_CONFIG));

  return {
    homepage: {
      ...DEFAULT_CMS_CONFIG.homepage,
      ...(partial.homepage ?? {}),
      highlights: Array.isArray(partial.homepage?.highlights) && partial.homepage.highlights.length > 0
        ? partial.homepage.highlights
        : DEFAULT_CMS_CONFIG.homepage.highlights,
      sugarProblemParagraphs: Array.isArray(partial.homepage?.sugarProblemParagraphs) && partial.homepage.sugarProblemParagraphs.length > 0
        ? partial.homepage.sugarProblemParagraphs
        : DEFAULT_CMS_CONFIG.homepage.sugarProblemParagraphs,
      natureSolutionParagraphs: Array.isArray(partial.homepage?.natureSolutionParagraphs) && partial.homepage.natureSolutionParagraphs.length > 0
        ? partial.homepage.natureSolutionParagraphs
        : DEFAULT_CMS_CONFIG.homepage.natureSolutionParagraphs,
      philosophyPoints: Array.isArray(partial.homepage?.philosophyPoints) && partial.homepage.philosophyPoints.length > 0
        ? partial.homepage.philosophyPoints
        : DEFAULT_CMS_CONFIG.homepage.philosophyPoints,
      founderStoryParagraphs: Array.isArray(partial.homepage?.founderStoryParagraphs) && partial.homepage.founderStoryParagraphs.length > 0
        ? partial.homepage.founderStoryParagraphs
        : DEFAULT_CMS_CONFIG.homepage.founderStoryParagraphs,
      whyZuceroParagraphs: Array.isArray(partial.homepage?.whyZuceroParagraphs) && partial.homepage.whyZuceroParagraphs.length > 0
        ? partial.homepage.whyZuceroParagraphs
        : DEFAULT_CMS_CONFIG.homepage.whyZuceroParagraphs,
      customSections: Array.isArray(partial.homepage?.customSections)
        ? partial.homepage.customSections
        : DEFAULT_CMS_CONFIG.homepage.customSections,
    },
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
                    const hasPriceRupees = typeof v.priceRupees === "number";
                    const hasPricePaise = typeof v.pricePaise === "number";
                    const priceRupees = hasPriceRupees
                      ? v.priceRupees!
                      : hasPricePaise
                        ? v.pricePaise! / 100
                        : null;
                    const pricePaise = hasPricePaise
                      ? v.pricePaise!
                      : hasPriceRupees
                        ? Math.round(v.priceRupees! * 100)
                        : null;
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
    ourStory: {
      ...DEFAULT_CMS_CONFIG.ourStory,
      ...(partial.ourStory ?? {}),
      storyParagraphs: Array.isArray(partial.ourStory?.storyParagraphs) && partial.ourStory.storyParagraphs.length > 0
        ? partial.ourStory.storyParagraphs
        : DEFAULT_CMS_CONFIG.ourStory.storyParagraphs,
    },
    contact: {
      ...DEFAULT_CMS_CONFIG.contact,
      ...(partial.contact ?? {}),
    },
    header: {
      ...DEFAULT_CMS_CONFIG.header,
      ...(partial.header ?? {}),
      navLinks: Array.isArray(partial.header?.navLinks) && partial.header.navLinks.length > 0
        ? partial.header.navLinks
        : DEFAULT_CMS_CONFIG.header.navLinks,
    },
    footer: {
      ...DEFAULT_CMS_CONFIG.footer,
      ...(partial.footer ?? {}),
    },
    policies: {
      shipping: {
        ...DEFAULT_CMS_CONFIG.policies.shipping,
        ...(partial.policies?.shipping ?? {}),
        sections: Array.isArray(partial.policies?.shipping?.sections) && partial.policies.shipping.sections.length > 0
          ? partial.policies.shipping.sections
          : DEFAULT_CMS_CONFIG.policies.shipping.sections,
      },
      returns: {
        ...DEFAULT_CMS_CONFIG.policies.returns,
        ...(partial.policies?.returns ?? {}),
        sections: Array.isArray(partial.policies?.returns?.sections) && partial.policies.returns.sections.length > 0
          ? partial.policies.returns.sections
          : DEFAULT_CMS_CONFIG.policies.returns.sections,
      },
      refunds: {
        ...DEFAULT_CMS_CONFIG.policies.refunds,
        ...(partial.policies?.refunds ?? {}),
        sections: Array.isArray(partial.policies?.refunds?.sections) && partial.policies.refunds.sections.length > 0
          ? partial.policies.refunds.sections
          : DEFAULT_CMS_CONFIG.policies.refunds.sections,
      },
      privacy: {
        ...DEFAULT_CMS_CONFIG.policies.privacy,
        ...(partial.policies?.privacy ?? {}),
        sections: Array.isArray(partial.policies?.privacy?.sections) && partial.policies.privacy.sections.length > 0
          ? partial.policies.privacy.sections
          : DEFAULT_CMS_CONFIG.policies.privacy.sections,
      },
      terms: {
        ...DEFAULT_CMS_CONFIG.policies.terms,
        ...(partial.policies?.terms ?? {}),
        sections: Array.isArray(partial.policies?.terms?.sections) && partial.policies.terms.sections.length > 0
          ? partial.policies.terms.sections
          : DEFAULT_CMS_CONFIG.policies.terms.sections,
      },
    },
    typography: {
      ...DEFAULT_CMS_CONFIG.typography,
      ...(partial.typography ?? {}),
      uploadedFonts: Array.isArray(partial.typography?.uploadedFonts)
        ? partial.typography.uploadedFonts
        : DEFAULT_CMS_CONFIG.typography.uploadedFonts,
    },
    guides: {
      desiKhand: {
        ...DEFAULT_CMS_CONFIG.guides.desiKhand,
        ...(partial.guides?.desiKhand ?? {}),
        faqs: Array.isArray(partial.guides?.desiKhand?.faqs) && partial.guides.desiKhand.faqs.length > 0
          ? partial.guides.desiKhand.faqs
          : DEFAULT_CMS_CONFIG.guides.desiKhand.faqs,
      },
      sugarAlternatives: {
        ...DEFAULT_CMS_CONFIG.guides.sugarAlternatives,
        ...(partial.guides?.sugarAlternatives ?? {}),
        faqs: Array.isArray(partial.guides?.sugarAlternatives?.faqs) && partial.guides.sugarAlternatives.faqs.length > 0
          ? partial.guides.sugarAlternatives.faqs
          : DEFAULT_CMS_CONFIG.guides.sugarAlternatives.faqs,
      },
    },
    customPages: partial.customPages ?? {},
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

export async function saveLiveCMSConfig(
  newConfig: CMSConfig,
  commitMessage: string = "Updated live website content via Admin CMS",
  author: string = "Admin"
): Promise<{ success: boolean; commitId?: string; error?: string }> {
  try {
    await ensureBucket();
    const db = supabaseAdmin();
    const cleanConfig = mergeWithDefaultCMS(newConfig);
    cleanConfig.updatedAt = new Date().toISOString();

    const configBlob = Buffer.from(JSON.stringify(cleanConfig, null, 2), "utf-8");
    const { error: uploadError } = await db.storage
      .from(BUCKET_NAME)
      .upload(CONFIG_PATH, configBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const commitId = `commit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newCommit: CMSCommit = {
      id: commitId,
      message: commitMessage,
      author,
      timestamp: new Date().toISOString(),
      configSnapshot: cleanConfig,
    };

    let existingCommits: CMSCommit[] = [];
    try {
      const { data: commitData } = await db.storage.from(BUCKET_NAME).download(COMMITS_PATH);
      if (commitData) {
        existingCommits = JSON.parse(await commitData.text());
      }
    } catch {
      existingCommits = [];
    }

    const updatedCommits = [newCommit, ...(Array.isArray(existingCommits) ? existingCommits.slice(0, 49) : [])];
    await db.storage.from(BUCKET_NAME).upload(COMMITS_PATH, Buffer.from(JSON.stringify(updatedCommits, null, 2), "utf-8"), {
      contentType: "application/json",
      upsert: true,
    });

    return { success: true, commitId };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save CMS configuration" };
  }
}

export async function getCMSCommits(): Promise<CMSCommit[]> {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.storage.from(BUCKET_NAME).download(COMMITS_PATH);
    if (!error && data) {
      return JSON.parse(await data.text());
    }
  } catch {
    // Return empty list on failure
  }
  return [];
}

export async function rollbackCMSCommit(commitId: string): Promise<{ success: boolean; config?: CMSConfig; error?: string }> {
  try {
    const commits = await getCMSCommits();
    const target = commits.find((c) => c.id === commitId);
    if (!target) {
      return { success: false, error: "Commit snapshot not found" };
    }
    const result = await saveLiveCMSConfig(
      target.configSnapshot,
      `Rollback to snapshot ${commitId} (${target.message})`,
      "Admin Rollback"
    );
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, config: target.configSnapshot };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Rollback failed" };
  }
}
