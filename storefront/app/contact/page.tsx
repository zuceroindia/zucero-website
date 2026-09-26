import { DynamicContactContent } from "@/components/dynamic-contact-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Contact Zucero",
  description: "Contact Zucero for product questions, Desi Khand and Mishri information, orders, shipping, wholesale enquiries and customer support.",
  path: "/contact",
  keywords: ["Zucero contact", "Desi Khand support", "Khand order support"],
});

export default function ContactPage() {
  return <DynamicContactContent />;
}
