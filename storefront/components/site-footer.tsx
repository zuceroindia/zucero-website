"use client";

import Image from "next/image";
import Link from "next/link";
import { useCMS } from "@/components/cms-provider";

export function SiteFooter() {
  const { config } = useCMS();
  const footer = config.footer;
  const contact = config.contact;

  const cleanPhone = (contact.whatsappPhone || "").replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello Zucero! I’d like to know more about The Good Sugar.")}`
    : "https://wa.me/918796349977";

  return <footer>
    <div className="footer-brand">
      <Image className="footer-logo" src="/images/zucero-highres-logo.png" alt="Zucero — The Good Sugar" width={180} height={120} />
      <p>{footer.tagline || "Thoughtfully made Indian sweetness, explained honestly."}</p>
    </div>
    <div>
      <h3>Explore</h3>
      <Link href="/products">Products</Link>
      <Link href="/#process">Our process</Link>
      <Link href="/our-story">Our story</Link>
      <Link href="/journal">Journal</Link>
      <Link href="/guides/desi-khand">Desi Khand guide</Link>
      <Link href="/guides/sugar-alternatives">Sugar alternatives guide</Link>
    </div>
    <div>
      <h3>Help</h3>
      <Link href="/account/orders">Track order</Link>
      <Link href="/shipping">Shipping</Link>
      <Link href="/returns">Returns</Link>
      <Link href="/contact">Contact</Link>
      <a href={waUrl}>WhatsApp: {contact.whatsappPhone || "+91 87963 49977"}</a>
    </div>
    <div>
      <h3>Legal</h3>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/refunds">Refund policy</Link>
    </div>
    <div className="footer-socials" role="group" aria-label="Follow Zucero">
      {contact.youtubeUrl && (
        <a href={contact.youtubeUrl} target="_blank" rel="noreferrer" aria-label="Zucero on YouTube">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9 5 3-5 3Z" /></svg>
        </a>
      )}
      {contact.twitterUrl && (
        <a href={contact.twitterUrl} target="_blank" rel="noreferrer" aria-label="Zucero on X">
          <span aria-hidden="true">X</span>
        </a>
      )}
      {contact.instagramUrl && (
        <a href={contact.instagramUrl} target="_blank" rel="noreferrer" aria-label="Zucero on Instagram">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="social-fill" /></svg>
        </a>
      )}
      {contact.linkedinUrl && (
        <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" aria-label="Zucero on LinkedIn">
          <span className="social-letter" aria-hidden="true">in</span>
        </a>
      )}
      {contact.facebookUrl && (
        <a href={contact.facebookUrl} target="_blank" rel="noreferrer" aria-label="Zucero on Facebook">
          <span className="social-letter" aria-hidden="true">f</span>
        </a>
      )}
    </div>
    <div className="footer-compliance" role="group" aria-label="Business registration details">
      <div className="footer-fssai">
        <Image src="/images/fssai-logo.png" alt="FSSAI" width={86} height={86} />
        <p><span>FSSAI Licence</span><strong>{footer.fssaiNumber || "20826018000800"}</strong></p>
      </div>
      <p><span>CIN</span><strong>{footer.cinNumber || "U56290HR2026PTC145994"}</strong></p>
      <address>
        <span>Registered office</span>
        <strong>{footer.companyName || "TIARA TRIVERSE PRIVATE LIMITED"}</strong>
        <small>{footer.registeredOffice || "Sector-2, Rohtak, 124001, Haryana, India"}</small>
      </address>
    </div>
    <div className="footer-bottom">
      <span>{footer.copyrightText || "© 2026 Zucero. All rights reserved."}</span>
      <a className="footer-creator" href="https://squargraph.com" target="_blank" rel="noreferrer" aria-label="Made with love by Squargraph">
        <span>Made with <span className="footer-heart" aria-hidden="true">♥</span> by</span>
        <Image src="/images/squargraph-logo.png" alt="Squargraph" width={160} height={24} />
      </a>
    </div>
  </footer>;
}
