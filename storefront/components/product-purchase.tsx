"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, CandyOff, Check, CookingPot, Gem, Leaf, Minus, Plus, ShoppingBag, Sparkles, Sun, Truck } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/components/cart-provider";

export function ProductPurchase({
  product,
  selectedVariantId,
  onSelectVariant,
}: {
  product: Product;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
}) {
  const router = useRouter();
  const [internalVariantId, setInternalVariantId] = useState(product.variants[0].id);
  const variantId = selectedVariantId ?? internalVariantId;
  const setVariant = (id: string) => {
    setInternalVariantId(id);
    onSelectVariant?.(id);
  };
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const [postalCode, setPostalCode] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const variant = product.variants.find((item) => item.id === variantId)!;
  const readyForSale = variant.pricePaise !== null;
  const isKhand = product.slug === "desi-khand";
  const offerPrice = variant.pricePaise === null ? "Price to be confirmed" : formatPrice(variant.pricePaise);
  const benefits = isKhand
    ? [
        { title: "Sun-dried", Icon: Sun },
        { title: "No added flavours", Icon: Ban },
        { title: "No added sweeteners", Icon: CandyOff },
        { title: "Traditional iron vessel craft", Icon: CookingPot },
        { title: "Natural character, preserved", Icon: Leaf },
      ]
    : [
        { title: "Khand-based", Icon: Leaf },
        { title: "Thread-crafted", Icon: Sparkles },
        { title: "Crystal by crystal", Icon: Gem },
        { title: "No added flavours", Icon: Ban },
        { title: "No added sweeteners", Icon: CandyOff },
      ];

  function cartLine() {
    if (variant.pricePaise === null) return null;
    return {
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantLabel: variant.label,
      sku: variant.sku,
      image: product.cartImage ?? product.image,
      pricePaise: variant.pricePaise,
      priceRupees: variant.priceRupees ?? variant.pricePaise / 100,
    };
  }

  function addToBag() {
    const line = cartLine();
    if (!line) return;
    add(line, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    const line = cartLine();
    if (!line) return;
    add(line, quantity);
    router.push("/checkout");
  }

  async function checkDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    setShippingMessage("");
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postalCode, weightGrams: variant.packedWeightGrams * quantity }),
      });
      const data = await response.json();
      if (!response.ok || !data.shippingPaise) {
        throw new Error(data.error || "unavailable");
      }
      const windowStr = data.deliveryWindowText ? ` (${data.deliveryWindowText})` : "";
      const courierStr = data.courierName ? ` via ${data.courierName}` : "";
      setShippingMessage(`Delivery available to ${postalCode}${windowStr}${courierStr}. Delivery charge: ${formatPrice(data.shippingPaise)}.`);
    } catch {
      setShippingMessage("We couldn’t confirm delivery for this PIN code right now. Please check the PIN code or contact us.");
    } finally {
      setChecking(false);
    }
  }

  return <div className="purchase-panel">
    <p className="eyebrow">{product.eyebrow}</p>
    <h1>{product.name}</h1>
    <p className="product-description">{product.description}</p>
    <aside className="featured-prebook-offer">
      <span>Experience the goodness of the first batch · {variant.label}</span>
      <strong>{offerPrice}</strong>
      <p><Sparkles size={18} aria-hidden="true" /> Introductory price for first 100 orders only</p>
    </aside>
    <p className="coupon-offer">Get an additional discount of 10% on referral.</p>
    <div className="pdp-khand-benefits">{benefits.map(({ title, Icon }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3></article>)}</div>
    <p className="pdp-ingredients"><strong>Ingredients:</strong> Sugar cane Juice, Desi Cow Milk and Desi Cow Ghee</p>
    <div className="purchase-block">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.4rem" }}>
        <span>Selected size: {variant.label}</span>
        <span style={{ fontSize: "0.74rem", color: "#8a6616", fontWeight: 600, letterSpacing: "0.02em" }}>Introductory price for first 100 orders only</span>
      </div>
      <div className="variant-row pdp-sizes">{product.variants.map((item) => <button key={item.id} type="button" aria-pressed={variantId === item.id} className={variantId === item.id ? "active" : ""} onClick={() => { setVariant(item.id); setShippingMessage(""); }}><strong>{item.label}</strong><small>{formatPrice(item.pricePaise)}</small></button>)}</div>
    </div>
    <div className="purchase-actions">
      <div className="quantity-picker" aria-label="Quantity"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div>
      <button type="button" className="button button-dark add-button" disabled={!readyForSale} onClick={addToBag}>{added ? <><Check size={17} /> Added</> : <><ShoppingBag size={17} /> {readyForSale ? "Add to cart" : "Awaiting launch price"}</>}</button>
    </div>
    <button type="button" className="button button-gold pdp-buy-now" disabled={!readyForSale} onClick={buyNow}>Buy now</button>
    {!readyForSale && <p className="pdp-tax-note">Ordering opens once the final launch prices are confirmed.</p>}
    <form className="pdp-delivery" onSubmit={checkDelivery}><label htmlFor="delivery-pin"><Truck size={18} /> Check delivery availability</label><div><input id="delivery-pin" value={postalCode} onChange={e => { setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setShippingMessage(""); }} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="Enter 6-digit PIN code" required /><button type="submit" disabled={checking}>{checking ? "Checking…" : "Check"}</button></div><p role="status">{shippingMessage}</p></form>
    <div className="pdp-sticky-buy"><span>{product.name}<small>{variant.label} · {formatPrice(variant.pricePaise)} · <span style={{ color: "#d8b456" }}>Introductory price for first 100 orders only</span></small></span><button type="button" className="button button-dark" disabled={!readyForSale} onClick={buyNow}>Buy now</button></div>
  </div>;
}
