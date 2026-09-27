import { DynamicPolicyContent } from "@/components/dynamic-policy-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Refund Policy",
  description: "Zucero refund policy for cancelled, unavailable, damaged or incorrect Desi Khand and Mishri orders, including processing and shipping-charge guidance.",
  path: "/refunds",
  keywords: ["Zucero refund policy", "Desi Khand refund", "food order refund"],
});

export default function RefundsPage() {
  return <DynamicPolicyContent policyKey="refunds" />;
}
