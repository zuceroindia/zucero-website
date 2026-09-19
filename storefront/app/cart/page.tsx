"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/catalog";
import { SiteFooter } from "@/components/site-footer";

export default function CartPage() {
  const { lines, subtotalPaise, update, remove } = useCart();
  return <main className="store-page">
    <StoreHeader />
    <section className="cart-shell">
      <div className="page-title"><p className="eyebrow">Your selection</p><h1>Shopping bag</h1><p>{lines.length ? `${lines.length} selected product${lines.length === 1 ? "" : "s"}` : "Your bag is ready for something good."}</p></div>
      {!lines.length ? <div className="empty-cart"><h2>Your bag is empty.</h2><p>Explore the opening Zucero collection.</p><Link className="button button-dark" href="/products">Shop products</Link></div> : <div className="cart-layout">
        <div className="cart-lines">{lines.map((line) => <article className="cart-line" key={line.variantId}><Image src={line.image} alt={line.productName} width={180} height={200} /><div><Link href={`/products/${line.productSlug}`}><h2>{line.productName}</h2></Link><p>{line.variantLabel} · {line.sku}</p><div className="quantity-picker"><button onClick={() => update(line.variantId, line.quantity - 1)} aria-label="Decrease quantity"><Minus size={15} /></button><span>{line.quantity}</span><button onClick={() => update(line.variantId, line.quantity + 1)} aria-label="Increase quantity"><Plus size={15} /></button></div></div><div className="line-total"><strong>{formatPrice(line.pricePaise * line.quantity)}</strong><button onClick={() => remove(line.variantId)} aria-label={`Remove ${line.productName}`}><Trash2 size={17} /></button></div></article>)}</div>
        <aside className="order-summary"><p className="eyebrow">Order summary</p><div><span>Product subtotal</span><strong>{formatPrice(subtotalPaise)}</strong></div><div><span>GST &amp; shipping</span><span>Calculated at checkout</span></div><p className="summary-note">Get an additional discount of 10% on referral.</p><Link className="button button-dark checkout-button" href="/checkout">Proceed to checkout</Link><Link className="text-link continue-link" href="/products">Continue shopping</Link></aside>
      </div>}
    </section><SiteFooter />
  </main>;
}
