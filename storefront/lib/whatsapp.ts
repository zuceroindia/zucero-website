import type { CustomerDetails, PurchaseLine } from "@/lib/customer-details";
import { customerAddress } from "@/lib/customer-details";

export const WHATSAPP_NUMBER = "918796349977";
export function whatsappLink(message = "Hello Zucero! I’d like to know more about The Good Sugar.") {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
export function whatsappOrder(lines: PurchaseLine[], customer?: CustomerDetails) {
  const customerBlock = customer
    ? `\n\nCustomer details:\nName: ${customer.fullName}\nEmail: ${customer.email}\nPhone: ${customer.phone}\nDelivery address: ${customerAddress(customer)}`
    : "";
  return whatsappLink(`Hello Zucero! I’d like to order:\n${lines.map(line => `• ${line.productName} — ${line.variantLabel} × ${line.quantity}`).join("\n")}${customerBlock}\n\nPlease confirm availability, the final price including tax and shipping, and payment details.`);
}
