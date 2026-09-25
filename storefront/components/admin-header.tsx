"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Globe, LayoutDashboard, LogOut, MessageSquare } from "lucide-react";

export function AdminHeader() {
  const pathname = usePathname();

  const isOverview = pathname === "/admin";
  const isWhatsapp = pathname?.startsWith("/admin/whatsapp");

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "64px",
        background: "#102218",
        borderBottom: "1px solid rgba(211, 174, 77, 0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4vw",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link
          href="/admin"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}
          aria-label="Zucero Admin Home"
        >
          <Image
            src="/images/zucero-highres-logo.png"
            alt="Zucero"
            width={95}
            height={60}
            style={{ width: "95px", height: "auto", objectFit: "contain" }}
            priority
          />
          <span
            style={{
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontWeight: 700,
              background: "rgba(211, 174, 77, 0.18)",
              color: "#e5c57b",
              padding: "0.2rem 0.55rem",
              borderRadius: "4px",
              border: "1px solid rgba(211, 174, 77, 0.35)",
            }}
          >
            Admin Console
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
              background: isOverview ? "rgba(255, 255, 255, 0.12)" : "transparent",
              color: isOverview ? "#d8b456" : "#e2ded6",
              border: isOverview ? "1px solid rgba(211, 174, 77, 0.4)" : "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin?tab=cms"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
              background: "transparent",
              color: "#e2ded6",
              border: "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <Globe size={15} />
            <span>Update Live Website</span>
          </Link>

          <Link
            href="/admin/whatsapp"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.4rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
              background: isWhatsapp ? "rgba(255, 255, 255, 0.12)" : "transparent",
              color: isWhatsapp ? "#d8b456" : "#e2ded6",
              border: isWhatsapp ? "1px solid rgba(211, 174, 77, 0.4)" : "1px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <MessageSquare size={15} />
            <span>WhatsApp CRM</span>
          </Link>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.78rem",
            color: "#e2ded6",
            textDecoration: "none",
            background: "rgba(255, 255, 255, 0.06)",
            padding: "0.35rem 0.75rem",
            borderRadius: "5px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          title="Open live storefront in new tab"
        >
          <ExternalLink size={13} />
          <span>View Store</span>
        </Link>

        <Link
          href="/account"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.78rem",
            color: "#e2ded6",
            textDecoration: "none",
            background: "rgba(255, 255, 255, 0.06)",
            padding: "0.35rem 0.75rem",
            borderRadius: "5px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
          title="Switch to customer account"
        >
          <LogOut size={13} />
          <span>Account</span>
        </Link>
      </div>
    </header>
  );
}
