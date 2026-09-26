import type { MetadataRoute } from "next";
import { products } from "@/lib/catalog";

const siteUrl = "https://www.thegoodsugar.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/products",
    "/guides/desi-khand",
    "/guides/sugar-alternatives",
    "/our-story",
    "/journal",
    "/contact",
    "/shipping",
    "/returns",
    "/refunds",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" || path === "/products" || path.startsWith("/guides/") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/products" ? 0.9 : path.startsWith("/guides/") ? 0.85 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticEntries, ...productEntries];
}
