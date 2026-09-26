import { DynamicPolicyContent } from "@/components/dynamic-policy-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Read Zucero's privacy policy covering account, delivery, order, analytics, payment and shipping data used to operate the storefront and fulfil orders.",
  path: "/privacy",
  keywords: ["Zucero privacy policy", "Zucero data policy", "The Good Sugar privacy"],
});

export default function PrivacyPage() {
  return <DynamicPolicyContent policyKey="privacy" />;
}
