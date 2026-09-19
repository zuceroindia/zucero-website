"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, type FormEvent } from "react";
import { StoreHeader } from "@/components/store-header";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/catalog";
import { SiteFooter } from "@/components/site-footer";
import type { CustomerDetails } from "@/lib/customer-details";
import { emptyCustomerDetails } from "@/lib/customer-details";
import { INDIAN_STATES } from "@/lib/india";
import { calculateCheckoutTotal, isIntraState } from "@/lib/tax";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { whatsappLink } from "@/lib/whatsapp";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
};

type SavedAddress = {
  id?: string;
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
};

type ShippingQuote = {
  shippingPaise: number;
  totalWeightGrams: number;
  chargeWeightKg: number;
  courierName: string;
  deliveryWindowText?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (window.Razorpay) return resolve(true);
      const timeout = window.setTimeout(() => resolve(Boolean(window.Razorpay)), 5000);
      existing.addEventListener("load", () => {
        window.clearTimeout(timeout);
        resolve(Boolean(window.Razorpay));
      }, { once: true });
      existing.addEventListener("error", () => {
        window.clearTimeout(timeout);
        resolve(false);
      }, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { lines, subtotalPaise, clear } = useCart();
  const [details, setDetails] = useState<CustomerDetails>(emptyCustomerDetails);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Unified referral field
  const [promoInput, setPromoInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  // Wallet
  const [walletBalancePaise, setWalletBalancePaise] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  // Shipping
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  // Success state
  const [completed, setCompleted] = useState<{
    orderNumber: string;
    localOrderId: string;
    captured: boolean;
    deliveryWindow?: string;
    customerEmail?: string;
    customerName?: string;
    referralCode?: string;
    invoiceToken?: string;
  } | null>(null);

  const discountPaise = useMemo(() => {
    if (appliedReferral) return Math.round(subtotalPaise * 0.10);
    return 0;
  }, [subtotalPaise, appliedReferral]);

  const shippingPaise = shippingQuote ? shippingQuote.shippingPaise : 0;

  const walletAppliedPaise = useMemo(() => {
    if (!useWallet || walletBalancePaise <= 0) return 0;
    const base = calculateCheckoutTotal(subtotalPaise, details.state || "Haryana", discountPaise, shippingPaise);
    return Math.min(walletBalancePaise, base.totalPaise);
  }, [useWallet, walletBalancePaise, subtotalPaise, details.state, discountPaise, shippingPaise]);

  const quote = useMemo(() => {
    return calculateCheckoutTotal(subtotalPaise, details.state || "Haryana", discountPaise, shippingPaise, walletAppliedPaise);
  }, [subtotalPaise, details.state, discountPaise, shippingPaise, walletAppliedPaise]);

  // Prefill from Supabase account
  useEffect(() => {
    let active = true;
    async function prefillAccount() {
      if (!isSupabaseConfigured()) return;
      const client = createSupabaseBrowserClient();
      const { data } = await client.auth.getUser();
      if (!active || !data.user) return;
      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const saved = Array.isArray(metadata.addresses) ? metadata.addresses as SavedAddress[] : [];
      const address = saved.find(item => item?.isDefault) ?? saved[0];
      setDetails(current => ({
        ...current,
        email: data.user?.email ?? current.email,
        fullName: address?.fullName || (typeof metadata.full_name === "string" ? metadata.full_name : current.fullName),
        phone: address?.phone || (typeof metadata.phone === "string" ? metadata.phone : current.phone),
        addressLine1: address?.addressLine1 || current.addressLine1,
        addressLine2: address?.addressLine2 || current.addressLine2,
        city: address?.city || current.city,
        state: address?.state || current.state,
        postalCode: address?.postalCode || current.postalCode,
        country: "India",
      }));
    }
    prefillAccount();
    return () => { active = false; };
  }, []);

  // Fetch wallet balance when email is entered
  const fetchWalletBalance = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) return;
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/wallet/balance?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalancePaise(data.balancePaise ?? 0);
      }
    } catch {
      // Silently fail — wallet is optional
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!details.email || !details.email.includes("@")) {
      setWalletBalancePaise(0);
      setUseWallet(false);
      return;
    }
    const timer = window.setTimeout(() => fetchWalletBalance(details.email), 600);
    return () => window.clearTimeout(timer);
  }, [details.email, fetchWalletBalance]);

  // Shipping quote
  useEffect(() => {
    setShippingQuote(null);
    setShippingError("");
    if (details.postalCode.length !== 6 || !lines.length) {
      setShippingLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setShippingLoading(true);
      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            postalCode: details.postalCode,
            state: details.state || undefined,
            lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
          }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not calculate delivery charge.");
        setShippingQuote({
          shippingPaise: result.shippingPaise,
          totalWeightGrams: result.totalWeightGrams,
          chargeWeightKg: result.chargeWeightKg,
          courierName: result.courierName,
          deliveryWindowText: result.deliveryWindowText,
        });
      } catch (quoteError) {
        if (controller.signal.aborted) return;
        const normState = (details.state ?? "").trim().toLowerCase();
        let fallbackShippingPaise = 11000;
        if (["haryana", "delhi", "chandigarh"].includes(normState)) {
          fallbackShippingPaise = 7500;
        } else if (["punjab", "uttar pradesh", "rajasthan", "himachal pradesh", "uttarakhand"].includes(normState)) {
          fallbackShippingPaise = 9000;
        }
        setShippingQuote({
          shippingPaise: fallbackShippingPaise,
          totalWeightGrams: 1000,
          chargeWeightKg: 1,
          courierName: "Insured Express Delivery",
          deliveryWindowText: "3-5 business days",
        });
        setShippingError("");
      } finally {
        if (!controller.signal.aborted) setShippingLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [details.postalCode, details.state, lines]);

  function update(field: keyof CustomerDetails, value: string) {
    setError("");
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function clearPromo() {
    setAppliedReferral("");
    setPromoInput("");
    setPromoMessage("Referral code removed.");
    setPromoError(false);
  }

  async function handlePromo() {
    if (appliedReferral) {
      clearPromo();
      return;
    }
    const raw = promoInput.trim().toUpperCase();
    if (!raw) {
      setPromoMessage("Please enter a referral code.");
      setPromoError(true);
      return;
    }
    setPromoLoading(true);
    setPromoMessage("");
    setPromoError(false);
    try {
      const refRes = await fetch("/api/referrals/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: raw, buyerEmail: details.email || undefined }),
      });
      const refData = await refRes.json();
      if (refData.valid) {
        setAppliedReferral(raw);
        setPromoInput(raw);
        setPromoMessage(`Referral code applied! You get an additional 10% discount on referral.`);
        setPromoError(false);
        return;
      }
      setPromoMessage(refData.error || "This referral code is not valid. Check for typos or try another.");
      setPromoError(true);
    } catch {
      setPromoMessage("Could not validate referral code. Please try again.");
      setPromoError(true);
    } finally {
      setPromoLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const orderResponse = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: { ...details, country: "India" },
          lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
          referralCode: appliedReferral || undefined,
          useWallet,
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error ?? "Could not prepare checkout.");

      // Wallet-only path (100% covered by wallet credits)
      if (order.walletOnly) {
        clear();
        // Fetch referral code to show on success screen
        let referralCode: string | undefined;
        try {
          const refRes = await fetch("/api/referrals/generate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: details.email, name: details.fullName, phone: details.phone }),
          });
          const refData = await refRes.json();
          referralCode = refData.code;
        } catch {}
        setCompleted({
          orderNumber: order.orderNumber,
          localOrderId: order.localOrderId,
          captured: true,
          deliveryWindow: order.deliveryWindow,
          customerEmail: details.email,
          customerName: details.fullName,
          referralCode,
          invoiceToken: order.invoiceToken,
        });
        setLoading(false);
        return;
      }

      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) throw new Error("Secure payment window could not load. Please try again.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        name: "Zucero",
        description: `Order ${order.orderNumber}`,
        order_id: order.razorpayOrderId,
        prefill: { name: details.fullName, email: details.email, contact: details.phone },
        handler: async (payment: RazorpayResponse) => {
          try {
            const verification = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                localOrderId: order.localOrderId,
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpaySignature: payment.razorpay_signature,
              }),
            });
            const result = await verification.json();
            if (!verification.ok && verification.status !== 202) throw new Error(result.error ?? "Payment confirmation failed.");
            clear();
            // Generate referral code to show on success screen
            let referralCode: string | undefined;
            try {
              const refRes = await fetch("/api/referrals/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: details.email, name: details.fullName, phone: details.phone }),
              });
              const refData = await refRes.json();
              referralCode = refData.code;
            } catch {}
            setCompleted({
              orderNumber: result.orderNumber ?? order.orderNumber,
              localOrderId: order.localOrderId,
              captured: result.captured !== false,
              deliveryWindow: order.deliveryWindow,
              customerEmail: details.email,
              customerName: details.fullName,
              referralCode,
              invoiceToken: order.invoiceToken,
            });
          } catch (verificationError) {
            setError(verificationError instanceof Error ? verificationError.message : "Payment confirmation failed. Please contact us with your payment ID.");
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      checkout.open();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Checkout is temporarily unavailable.");
      setLoading(false);
    }
  }

  if (completed) {
    const waOrderLink = whatsappLink(`Hello Zucero! I have placed order ${completed.orderNumber}. Please confirm my order and share delivery and shipment tracking updates.`);
    const referralShareMsg = completed.referralCode
      ? `Hey! I just ordered from Zucero (The Good Sugar Co.) — pure, chemical-free sugarcane sweetness. Use my referral code *${completed.referralCode}* at checkout to get *10% off* your first order! Shop at www.thegoodsugar.in 🍃`
      : "";
    const referralWaLink = referralShareMsg
      ? `https://wa.me/?text=${encodeURIComponent(referralShareMsg)}`
      : "";

    return (
      <main className="store-page">
        <StoreHeader />
        <section className="empty-cart" style={{ maxWidth: "660px", margin: "48px auto", textAlign: "left", padding: "0 24px" }}>
          <p className="eyebrow" style={{ color: "#2f5d47" }}>Order Successful!</p>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "2.1rem", margin: "8px 0 16px 0", color: "#10271d" }}>
            Your order has been placed.
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.5, color: "#10271d" }}>
            Order <strong>{completed.orderNumber}</strong> has been placed. {completed.captured ? "We are getting your parcel ready to ship." : "We are awaiting final capture confirmation."}
          </p>

          <div style={{ background: "#f4f7f4", borderLeft: "4px solid #10271d", padding: "16px 18px", margin: "22px 0", borderRadius: "4px" }}>
            <p style={{ margin: 0, fontWeight: "bold", color: "#10271d", fontSize: "0.95rem" }}>
              Estimated Delivery: {completed.deliveryWindow || "3-5 business days"}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#4a6358" }}>
              Dispatched from Gurugram, Haryana via insured express surface delivery. An email confirmation with GST invoice has been sent to your inbox.
            </p>
          </div>

          {/* Referral Share Card */}
          {completed.referralCode && (
            <div style={{
              background: "linear-gradient(135deg, #10271d 0%, #1e4d38 100%)",
              borderRadius: "10px",
              padding: "22px 24px",
              margin: "24px 0",
              color: "#fff",
            }}>
              <p style={{ margin: "0 0 6px 0", fontSize: "0.9rem", color: "#a3d5b8", fontWeight: 600 }}>
                🌟 Share the love &amp; save together!
              </p>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", fontFamily: "Georgia,serif", fontWeight: 500, color: "#fff", lineHeight: 1.4 }}>
                Give an additional 10% discount on referral to your friends and family.
              </h2>
              <p style={{ margin: "0 0 14px 0", fontSize: "0.9rem", color: "#c8e6d4", lineHeight: 1.5 }}>
                When your friend uses your code at checkout, they instantly get 10% off. Once their order is completed, you get 10% of their order value credited directly to your Zucero Digital Wallet!
              </p>
              <div style={{
                background: "rgba(255,255,255,0.12)",
                borderRadius: "6px",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "14px",
              }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "#a3d5b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Your Unique Referral Code
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: "1.45rem", fontWeight: "bold", letterSpacing: "2px", color: "#fff" }}>
                    {completed.referralCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(completed.referralCode ?? "").then(() => {
                      alert("Referral code copied to clipboard!");
                    });
                  }}
                  style={{
                    background: "#fff",
                    color: "#10271d",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Copy Code
                </button>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a
                  href={referralWaLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    background: "#25D366",
                    color: "#fff",
                    borderRadius: "4px",
                    padding: "9px 16px",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  Share on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "10% off Zucero!", text: referralShareMsg, url: "https://www.thegoodsugar.in" }).catch(() => {});
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "4px",
                    padding: "9px 16px",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Share via…
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "22px 0" }}>
            <a
              className="button button-dark"
              href={`/api/orders/${completed.localOrderId}/invoice${completed.invoiceToken ? `?token=${encodeURIComponent(completed.invoiceToken)}` : ""}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
            >
              <span>Download Tax Invoice (PDF)</span>
            </a>
            <a
              className="button"
              href={waOrderLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#25D366",
                color: "#ffffff",
                borderColor: "#25D366",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              <span>Get Updates on WhatsApp</span>
            </a>
          </div>

          <div className="button-row" style={{ marginTop: "32px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
            <Link className="button button-dark" href="/account/orders">View My Orders</Link>
            <Link className="text-link" href="/products">Continue Shopping</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (!lines.length) return <main className="store-page"><StoreHeader /><section className="empty-cart"><h1>Your bag is empty.</h1><Link className="button button-dark" href="/products">Shop products</Link></section><SiteFooter /></main>;

  const isAddressComplete = Boolean(
    details.email.trim() &&
    details.fullName.trim() &&
    details.phone.trim() &&
    details.addressLine1.trim() &&
    details.city.trim() &&
    details.state.trim() &&
    details.postalCode.length === 6
  );

  const checkoutDisabled = loading || shippingLoading || !isAddressComplete;
  const payableLabel = quote.payablePaise > 0 ? formatPrice(quote.payablePaise) : "₹0.00";
  const checkoutLabel = loading
    ? "Preparing secure payment…"
    : shippingLoading
      ? "Calculating delivery…"
      : !isAddressComplete
        ? "Complete delivery details"
        : quote.payablePaise <= 0
          ? "Place order (100% wallet credits)"
          : `Pay ${payableLabel} securely`;

  const appliedPromo = appliedReferral;

  return <main className="store-page checkout-page"><StoreHeader /><section className="checkout-layout">
    <form className="checkout-form" onSubmit={submit}>
      <div className="checkout-heading"><p className="eyebrow">Secure checkout</p><h1>Where should we send it?</h1></div>
      <fieldset><legend>Contact</legend><div className="field-grid"><label className="wide"><span>Email</span><input required type="email" autoComplete="email" value={details.email} onChange={event => update("email", event.target.value)} /></label><label className="wide"><span>Full name</span><input required autoComplete="name" value={details.fullName} onChange={event => update("fullName", event.target.value)} /></label><label className="wide"><span>Mobile number</span><input required inputMode="tel" autoComplete="tel" value={details.phone} onChange={event => update("phone", event.target.value)} /></label></div></fieldset>
      <fieldset><legend>Delivery address</legend><div className="field-grid"><label className="wide"><span>Address</span><input required autoComplete="address-line1" value={details.addressLine1} onChange={event => update("addressLine1", event.target.value)} /></label><label className="wide"><span>Apartment, suite, etc. (optional)</span><input autoComplete="address-line2" value={details.addressLine2} onChange={event => update("addressLine2", event.target.value)} /></label><label><span>PIN code</span><input required inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" value={details.postalCode} onChange={event => update("postalCode", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label><span>City</span><input required autoComplete="address-level2" value={details.city} onChange={event => update("city", event.target.value)} /></label><label><span>State / UT</span><select required autoComplete="address-level1" value={details.state} onChange={event => update("state", event.target.value)}><option value="">Select state</option>{INDIAN_STATES.map((state) => <option value={state} key={state}>{state}</option>)}</select></label><label><span>Country</span><input value="India" readOnly /></label></div></fieldset>
      {shippingError && <p className="form-message" role="alert">{shippingError}</p>}

      {/* Wallet Credits Toggle */}
      {walletBalancePaise > 0 && (
        <fieldset style={{ borderColor: "#10271d", background: "#f4faf7" }}>
          <legend style={{ color: "#10271d", fontWeight: 600 }}>🎁 Zucero Wallet Credits</legend>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <p style={{ margin: "0 0 2px 0", fontWeight: 600, color: "#10271d" }}>
                Available: {formatPrice(walletBalancePaise)}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#4a6358" }}>
                {useWallet
                  ? `Applying ${formatPrice(walletAppliedPaise)} from your wallet credits`
                  : "Use your earned cashback towards this order"}
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Use Credits</span>
            </label>
          </div>
          {walletLoading && <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "#4a6358" }}>Checking wallet…</p>}
        </fieldset>
      )}

      {/* Referral Code (Exclusively unlocks 10% discount) */}
      <fieldset>
        <legend>Referral Code</legend>
        <p style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#4a6358" }}>
          Get an additional discount of 10% on referral.
        </p>
        <div className="field-grid">
          <label className="wide"><span>Referral code</span>
            <input
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                setPromoMessage("");
                setPromoError(false);
                if (appliedReferral) { setAppliedReferral(""); }
              }}
              placeholder="Enter referral code (e.g. REF-XXXXX)"
              autoComplete="off"
              disabled={Boolean(appliedReferral)}
            />
          </label>
          <button
            className="button button-dark"
            type="button"
            onClick={handlePromo}
            disabled={promoLoading}
            style={{ alignSelf: "end" }}
          >
            {promoLoading ? "Checking…" : appliedReferral ? "Remove" : "Apply code"}
          </button>
        </div>
        {promoMessage && (
          <p className="form-message" role="status" style={{ color: promoError ? "#c0392b" : "#1b5e20" }}>
            {promoMessage}
          </p>
        )}
      </fieldset>

      {error && <p className="form-message" role="alert">{error}</p>}
      <button className="button button-dark checkout-button" type="submit" disabled={checkoutDisabled}>{checkoutLabel}</button>
    </form>
    <aside className="checkout-summary">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <p className="eyebrow" style={{ margin: 0 }}>Your order</p>
        <Link href="/cart" style={{ fontSize: "0.85rem", color: "#2f5d47", textDecoration: "underline" }}>Edit bag</Link>
      </div>
      {lines.map((line) => (
        <div className="checkout-line" key={line.variantId}>
          <span>{line.productName} · {line.variantLabel} × {line.quantity}</span>
          <strong>{formatPrice(line.pricePaise * line.quantity)}</strong>
        </div>
      ))}
      <div className="checkout-line">
        <span>Product subtotal</span>
        <strong>{formatPrice(subtotalPaise)}</strong>
      </div>
      {discountPaise > 0 && (
        <div className="checkout-line">
          <span>Referral discount ({appliedReferral}) · 10% off</span>
          <strong style={{ color: "#1b5e20" }}>-{formatPrice(discountPaise)}</strong>
        </div>
      )}
      {walletAppliedPaise > 0 && (
        <div className="checkout-line">
          <span>Wallet credits applied</span>
          <strong style={{ color: "#1b5e20" }}>-{formatPrice(walletAppliedPaise)}</strong>
        </div>
      )}
      <div className="checkout-line">
        <span>Shipping</span>
        <strong>
          {shippingLoading && details.postalCode.length === 6
            ? "Calculating…"
            : shippingQuote
              ? formatPrice(shippingQuote.shippingPaise)
              : details.postalCode.length === 6
                ? "Calculating…"
                : "Calculated at next step"}
        </strong>
      </div>
      {shippingQuote?.deliveryWindowText && (
        <div className="checkout-line" style={{ fontSize: "0.85rem", color: "#4a6358" }}>
          <span>Estimated delivery</span>
          <strong>{shippingQuote.deliveryWindowText}</strong>
        </div>
      )}
      {details.state ? (
        isIntraState(details.state) ? (
          <>
            <div className="checkout-line">
              <span>CGST @ 2.5%</span>
              <strong>{formatPrice(quote.cgstPaise)}</strong>
            </div>
            <div className="checkout-line">
              <span>SGST @ 2.5%</span>
              <strong>{formatPrice(quote.sgstPaise)}</strong>
            </div>
          </>
        ) : (
          <div className="checkout-line">
            <span>IGST @ 5%</span>
            <strong>{formatPrice(quote.igstPaise)}</strong>
          </div>
        )
      ) : (
        <div className="checkout-line">
          <span>Estimated GST (5%)</span>
          <strong>{formatPrice(quote.totalTaxPaise)}</strong>
        </div>
      )}
      <div className="checkout-total">
        <span>Total payable</span>
        <strong>{formatPrice(quote.payablePaise > 0 ? quote.payablePaise : 0)}</strong>
      </div>
      {walletAppliedPaise > 0 && (
        <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "#4a6358", textAlign: "right" }}>
          (Order total {formatPrice(quote.totalPaise)}, {formatPrice(walletAppliedPaise)} covered by wallet credits)
        </p>
      )}
    </aside>
  </section><SiteFooter /></main>;
}
