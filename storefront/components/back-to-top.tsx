"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 480);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (pathname?.startsWith("/admin")) return null;
  if (!visible) return null;
  return <button className="back-to-top" aria-label="Back to top" title="Back to top" onClick={() => {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    document.querySelector<HTMLAnchorElement>(".site-header .brand")?.focus({ preventScroll: true });
  }}><ArrowUp size={22} aria-hidden="true" /></button>;
}
