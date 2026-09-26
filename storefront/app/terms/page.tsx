import { DynamicPolicyContent } from "@/components/dynamic-policy-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms of Use & Sale",
  description: "Read Zucero's terms for products, orders, pricing, tax, accounts, privacy, shipping, returns and refunds on The Good Sugar storefront.",
  path: "/terms",
  keywords: ["Zucero terms", "The Good Sugar terms", "Desi Khand order terms"],
});

export default function TermsPage() {
  return <DynamicPolicyContent policyKey="terms" />;
}
