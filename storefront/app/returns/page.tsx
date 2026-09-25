import { DynamicPolicyContent } from "@/components/dynamic-policy-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Returns & Replacements",
  description: "Zucero returns and replacement policy for Desi Khand, Mishri and other food orders, including damaged, incorrect and missing-item resolutions.",
  path: "/returns",
  keywords: ["Zucero returns", "Desi Khand returns", "food order replacement"],
});

export default function ReturnsPage() {
  return <DynamicPolicyContent policyKey="returns" />;
}
