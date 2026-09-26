"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

export function PublicWhatsAppWidget() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <aside aria-label="WhatsApp contact">
      <a
        href={whatsappLink()}
        className="whatsapp-contact"
        aria-label="Chat with Zucero on WhatsApp at +91 87963 49977"
      >
        <MessageCircle size={24} />
        <span>WhatsApp</span>
      </a>
    </aside>
  );
}
