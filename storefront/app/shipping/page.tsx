import { DynamicPolicyContent } from "@/components/dynamic-policy-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Shipping Policy",
  description: "Zucero shipping policy for Desi Khand and Mishri orders across India, including weight-based delivery charges, Shiprocket serviceability, dispatch and tracking.",
  path: "/shipping",
  keywords: ["Zucero shipping", "Desi Khand delivery", "Shiprocket delivery", "Khand shipping India"],
});

export default function ShippingPage() {
  return <DynamicPolicyContent policyKey="shipping" />;
}
