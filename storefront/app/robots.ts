import type { MetadataRoute } from "next";

const siteUrl = "https://www.thegoodsugar.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/cart", "/checkout", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
