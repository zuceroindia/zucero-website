import type { Metadata } from "next";
import "./globals.css";
import "./account-extras.css";
import { CartProvider } from "@/components/cart-provider";
import { BackToTop } from "@/components/back-to-top";
import { PublicWhatsAppWidget } from "@/components/public-whatsapp-widget";
import { GoogleAnalytics } from "@/components/google-analytics";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, coreKeywords, safeJsonLd, socialProfiles } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Zucero",
  title: {
    default: "Desi Khand & Traditional Sugar Alternatives | Zucero",
    template: "%s | Zucero",
  },
  description: "Discover Zucero Desi Khand and traditional Indian sugar alternatives, thoughtfully crafted from sugarcane with clear ingredients, honest product information and mindful sweetness.",
  keywords: coreKeywords,
  authors: [{ name: "Zucero" }],
  creator: "Zucero",
  publisher: "TIARA TRIVERSE PRIVATE LIMITED",
  category: "Food & Beverage",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Desi Khand & Traditional Sugar Alternatives | Zucero",
    description: "Traditional Indian sweetness from sugarcane, with clear ingredients, honest product information and a modern approach to Desi Khand and Khand Mishri.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1600, height: 900, alt: "Zucero — The Good Sugar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Desi Khand & Traditional Sugar Alternatives | Zucero",
    description: "Explore Zucero Desi Khand and traditional Indian sugar alternatives, thoughtfully made from sugarcane.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: { icon: "/images/zucero-favicon.webp", apple: "/images/zucero-favicon.webp" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Zucero",
  alternateName: "Zucero — The Good Sugar",
  legalName: "TIARA TRIVERSE PRIVATE LIMITED",
  url: SITE_URL,
  logo: `${SITE_URL}/images/zucero-highres-logo.png`,
  image: DEFAULT_OG_IMAGE,
  email: "zucero.thegoodsugar@gmail.com",
  telephone: "+91 87963 49977",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Rohtak",
    addressRegion: "Haryana",
    postalCode: "124001",
    addressCountry: "IN",
  },
  identifier: {
    "@type": "PropertyValue",
    propertyID: "FSSAI Licence",
    value: "20826018000800",
  },
  sameAs: socialProfiles,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  alternateName: "The Good Sugar",
  description: "Zucero is an Indian food brand focused on traditional sugarcane sweetness including Desi Khand and Khand Mishri.",
  inLanguage: "en-IN",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

import { CMSProvider } from "@/components/cms-provider";
import { getLiveCMSConfig } from "@/lib/cms";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialCMS = await getLiveCMSConfig();
  return <html lang="en-IN"><body>
    <CMSProvider initialConfig={initialCMS}>
      <CartProvider>{children}<BackToTop /><PublicWhatsAppWidget /></CartProvider>
    </CMSProvider>
    <GoogleAnalytics />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />
  </body></html>;
}
