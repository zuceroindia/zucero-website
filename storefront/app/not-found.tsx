import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return <main className="store-page"><StoreHeader /><section className="empty-cart"><p className="eyebrow">404</p><h1>This page has wandered from the field.</h1><p>Return to the Zucero collection and continue exploring.</p><Link className="button button-dark" href="/products">Explore products</Link></section><SiteFooter /></main>;
}
