"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Copy,
  CreditCard,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  Repeat,
  Share2,
  UserRound,
  Wallet,
} from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { formatPrice, products } from "@/lib/catalog";
import { INDIAN_STATES } from "@/lib/india";
import styles from "./account.module.css";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type OrderItem = { sku: string; product_name: string; variant_label: string; quantity: number; line_total_paise: number };
type Order = {
  id: string;
  order_number: string;
  display_status: string;
  payment_status: string;
  subtotal_paise: number;
  tax_paise: number;
  shipping_paise: number;
  total_paise: number;
  tracking_awb: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  estimated_delivery_window?: string | null;
  invoice_number?: string | null;
  shipping_address: { fullName?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string } | null;
  created_at: string;
  items: OrderItem[];
};

type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "India";
  isDefault: boolean;
};

type Subscription = {
  id: string;
  product_variant_id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_paise: number;
  frequency: "weekly" | "monthly" | "custom";
  interval_weeks: number | null;
  status: "active" | "paused" | "cancelled";
  next_billing_date: string;
  shipping_address: any;
  created_at: string;
};

type WalletData = {
  balancePaise: number;
  balanceRupees: number;
  earnedReferralPaise: number;
  earnedReferralRupees: number;
  manualTopupPaise: number;
  manualTopupRupees: number;
  spentOrdersPaise: number;
  spentOrdersRupees: number;
  transactions?: Array<{
    id: string;
    type: string;
    amountPaise: number;
    amountRupees: number;
    description: string;
    createdAt: string;
  }>;
};

type Section = "overview" | "orders" | "wallet" | "subscriptions" | "addresses" | "profile";

const emptyAddress: Omit<SavedAddress, "id" | "isDefault"> = {
  label: "Home",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function orderProgress(status: string) {
  const value = status.toLowerCase();
  if (value.includes("delivered")) return 5;
  if (value.includes("out for delivery")) return 4;
  if (value.includes("shipped") || value.includes("in transit") || value.includes("pickup")) return 3;
  if (value.includes("processing") || value.includes("manifest") || value.includes("ready")) return 2;
  return 1;
}

export default function OrdersPage() {
  const router = useRouter();
  const client = useMemo(() => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null), []);
  const [section, setSection] = useState<Section>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Wallet & Referral state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [topupAmount, setTopupAmount] = useState(500);
  const [customTopup, setCustomTopup] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [subProductVariantId, setSubProductVariantId] = useState("khand-330");
  const [subQuantity, setSubQuantity] = useState(1);
  const [subFrequency, setSubFrequency] = useState<"weekly" | "monthly" | "custom">("monthly");
  const [subIntervalWeeks, setSubIntervalWeeks] = useState(2);
  const [subAddressId, setSubAddressId] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) {
        setError("Account services are temporarily unavailable.");
        setLoading(false);
        return;
      }
      const { data, error: userError } = await client.auth.getUser();
      if (userError || !data.user) {
        router.replace("/account");
        return;
      }
      if (!active) return;
      const userMetadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const savedAddresses = Array.isArray(userMetadata.addresses) ? (userMetadata.addresses as SavedAddress[]) : [];
      const safeAddresses = savedAddresses.filter((address) => address && typeof address.id === "string");
      const userEmail = data.user.email ?? "";

      setEmail(userEmail);
      setMetadata(userMetadata);
      setFullName(typeof userMetadata.full_name === "string" ? userMetadata.full_name : "");
      setPhone(typeof userMetadata.phone === "string" ? cleanPhone(userMetadata.phone) : "");
      setAddresses(safeAddresses);
      if (safeAddresses.length > 0 && !subAddressId) {
        const def = safeAddresses.find((a) => a.isDefault) || safeAddresses[0];
        setSubAddressId(def.id);
      }

      // Fetch Orders
      const orderPromise = fetch("/api/account/orders", { cache: "no-store" })
        .then((r) => r.json())
        .then((payload) => {
          if (active && payload.orders) setOrders(payload.orders);
        })
        .catch(() => {});

      // Fetch Wallet info
      const walletPromise = fetch(`/api/wallet/balance?email=${encodeURIComponent(userEmail)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((payload) => {
          if (active && payload.wallet) setWallet(payload.wallet);
        })
        .catch(() => {});

      // Fetch or generate customer's unique referral code
      const refPromise = fetch("/api/referrals/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: typeof userMetadata.full_name === "string" ? userMetadata.full_name : undefined,
          phone: typeof userMetadata.phone === "string" ? userMetadata.phone : undefined,
        }),
      })
        .then((r) => r.json())
        .then((payload) => {
          if (active && payload.code) setReferralCode(payload.code);
        })
        .catch(() => {});

      // Fetch Subscriptions
      const subPromise = fetch("/api/account/subscriptions", { cache: "no-store" })
        .then((r) => r.json())
        .then((payload) => {
          if (active && payload.subscriptions) setSubscriptions(payload.subscriptions);
        })
        .catch(() => {});

      await Promise.allSettled([orderPromise, walletPromise, refPromise, subPromise]);
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [client, router]);

  async function persistMetadata(next: Record<string, unknown>) {
    if (!client) return false;
    const { data, error: updateError } = await client.auth.updateUser({ data: next });
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setMetadata((data.user?.user_metadata ?? next) as Record<string, unknown>);
    return true;
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedPhone = cleanPhone(phone);
    if (normalizedPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setSaving(true);
    const ok = await persistMetadata({ ...metadata, full_name: fullName.trim(), phone: normalizedPhone, addresses });
    setSaving(false);
    if (ok) {
      setPhone(normalizedPhone);
      setMessage("Profile updated successfully.");
    }
  }

  function beginNewAddress() {
    setEditingAddressId("new");
    setAddressForm({ ...emptyAddress, fullName, phone });
    setMessage("");
    setError("");
  }

  function beginEditAddress(address: SavedAddress) {
    setEditingAddressId(address.id);
    const { id: _id, isDefault: _isDefault, ...rest } = address;
    setAddressForm(rest);
    setMessage("");
    setError("");
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedPhone = cleanPhone(addressForm.phone);
    if (normalizedPhone.length !== 10) {
      setError("Enter a valid 10-digit mobile number for this address.");
      return;
    }
    if (addressForm.postalCode.length !== 6 || !/^\d{6}$/.test(addressForm.postalCode)) {
      setError("Enter a valid 6-digit PIN code.");
      return;
    }
    setSaving(true);
    const nextId = editingAddressId === "new" ? crypto.randomUUID() : editingAddressId!;
    const existing = addresses.find((address) => address.id === nextId);
    const nextAddress: SavedAddress = {
      ...addressForm,
      phone: normalizedPhone,
      id: nextId,
      isDefault: existing?.isDefault ?? addresses.length === 0,
    };
    const nextAddresses =
      editingAddressId === "new"
        ? [...addresses, nextAddress]
        : addresses.map((address) => (address.id === nextId ? nextAddress : address));
    const ok = await persistMetadata({ ...metadata, full_name: fullName, phone, addresses: nextAddresses });
    setSaving(false);
    if (ok) {
      setAddresses(nextAddresses);
      setEditingAddressId(null);
      setAddressForm(emptyAddress);
      setMessage("Address saved successfully.");
    }
  }

  async function removeAddress(id: string) {
    if (!window.confirm("Remove this saved address?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    let nextAddresses = addresses.filter((address) => address.id !== id);
    if (nextAddresses.length && !nextAddresses.some((address) => address.isDefault)) {
      nextAddresses = nextAddresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
    }
    const ok = await persistMetadata({ ...metadata, full_name: fullName, phone, addresses: nextAddresses });
    setSaving(false);
    if (ok) {
      setAddresses(nextAddresses);
      setMessage("Address removed.");
    }
  }

  async function makeDefaultAddress(id: string) {
    const nextAddresses = addresses.map((address) => ({ ...address, isDefault: address.id === id }));
    setSaving(true);
    setError("");
    setMessage("");
    const ok = await persistMetadata({ ...metadata, full_name: fullName, phone, addresses: nextAddresses });
    setSaving(false);
    if (ok) {
      setAddresses(nextAddresses);
      setMessage("Default address updated.");
    }
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    router.replace("/account");
  }

  // ── Wallet Top-Up Handler ──────────────────────────────────────────────────
  async function handleAddMoney(amountRupees: number) {
    if (amountRupees < 100) {
      setError("Minimum top-up amount is ₹100.");
      return;
    }
    setError("");
    setMessage("");
    setTopupLoading(true);

    try {
      const res = await fetch("/api/wallet/topup/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountRupees, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start wallet top-up.");

      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) {
        throw new Error("Payment gateway could not load. Please check your connection.");
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Zucero Digital Wallet",
        description: `Add ₹${amountRupees} to wallet balance`,
        order_id: data.razorpayOrderId,
        prefill: { name: fullName, email, contact: phone },
        handler: async (payment: any) => {
          try {
            const verifyRes = await fetch("/api/wallet/topup/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpaySignature: payment.razorpay_signature,
                email,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed.");
            setWallet(verifyData.wallet);
            setMessage(`₹${amountRupees} added to your digital wallet!`);
            setCustomTopup("");
          } catch (err: any) {
            setError(err.message || "Failed to confirm wallet credit.");
          } finally {
            setTopupLoading(false);
          }
        },
        modal: { ondismiss: () => setTopupLoading(false) },
      });
      checkout.open();
    } catch (err: any) {
      setError(err.message || "Wallet top-up failed.");
      setTopupLoading(false);
    }
  }

  // ── Subscription Handlers ──────────────────────────────────────────────────
  async function handleCreateSubscription(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubSaving(true);

    try {
      const targetAddress = addresses.find((a) => a.id === subAddressId) || defaultAddress;
      if (!targetAddress) {
        throw new Error("Please save a delivery address before starting a subscription.");
      }

      const res = await fetch("/api/account/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productVariantId: subProductVariantId,
          quantity: subQuantity,
          frequency: subFrequency,
          intervalWeeks: subFrequency === "custom" ? subIntervalWeeks : undefined,
          shippingAddress: {
            fullName: targetAddress.fullName,
            phone: targetAddress.phone,
            addressLine1: targetAddress.addressLine1,
            addressLine2: targetAddress.addressLine2 || "",
            city: targetAddress.city,
            state: targetAddress.state,
            postalCode: targetAddress.postalCode,
            country: "India",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription creation failed.");

      setSubscriptions([data.subscription, ...subscriptions]);
      setShowAddSubscription(false);
      setMessage("Subscription activated! Recurring orders will draw from your wallet automatically.");
    } catch (err: any) {
      setError(err.message || "Could not activate subscription.");
    } finally {
      setSubSaving(false);
    }
  }

  async function handleUpdateSubStatus(id: string, status: "active" | "paused" | "cancelled") {
    if (status === "cancelled" && !window.confirm("Cancel this recurring subscription?")) return;
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/account/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update subscription.");

      setSubscriptions(subscriptions.map((s) => (s.id === id ? data.subscription : s)));
      setMessage(`Subscription ${status === "active" ? "resumed" : status}.`);
    } catch (err: any) {
      setError(err.message || "Subscription update failed.");
    }
  }

  const latestOrder = orders[0];
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const viralShareText = referralCode
    ? `Hey! I just ordered from Zucero (The Good Sugar Co.) — pure, chemical-free sugarcane sweetness. Use my referral code *${referralCode}* at checkout to get an additional *10% discount* on referral! Shop at www.thegoodsugar.in 🍃`
    : "";
  const referralWaUrl = viralShareText ? `https://wa.me/?text=${encodeURIComponent(viralShareText)}` : "";

  // Flat product variant list for subscription selector
  const catalogVariants = useMemo(() => {
    return products.flatMap((p) =>
      p.variants.map((v) => ({
        variantId: v.id,
        label: `${p.name} - ${v.label} (${formatPrice(v.pricePaise ?? 0)})`,
        pricePaise: v.pricePaise ?? 0,
      }))
    );
  }, []);

  if (loading) {
    return (
      <main className="store-page">
        <StoreHeader />
        <section className={styles.shell}>
          <div className={styles.empty}>
            <h2>Loading your account…</h2>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="store-page">
      <StoreHeader />
      <section className={styles.shell}>
        <div className={styles.topbar}>
          <div>
            <p className="eyebrow">My account</p>
            <h1>{fullName ? `Hello, ${fullName.split(" ")[0]}.` : "Welcome to Zucero."}</h1>
            <p className={styles.muted}>
              Manage your orders, digital wallet credits, recurring subscriptions, and addresses.
            </p>
          </div>
          <button className={styles.signout} type="button" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>

        <div className={styles.grid}>
          <nav className={styles.nav} aria-label="Account sections">
            <button
              type="button"
              className={section === "overview" ? styles.active : ""}
              onClick={() => setSection("overview")}
            >
              <Home size={17} /> Overview
            </button>
            <button
              type="button"
              className={section === "orders" ? styles.active : ""}
              onClick={() => setSection("orders")}
            >
              <Package size={17} /> Orders
            </button>
            <button
              type="button"
              className={section === "wallet" ? styles.active : ""}
              onClick={() => setSection("wallet")}
            >
              <Wallet size={17} /> Digital Wallet
            </button>
            <button
              type="button"
              className={section === "subscriptions" ? styles.active : ""}
              onClick={() => setSection("subscriptions")}
            >
              <Repeat size={17} /> Subscriptions
            </button>
            <button
              type="button"
              className={section === "addresses" ? styles.active : ""}
              onClick={() => setSection("addresses")}
            >
              <MapPin size={17} /> Addresses
            </button>
            <button
              type="button"
              className={section === "profile" ? styles.active : ""}
              onClick={() => setSection("profile")}
            >
              <UserRound size={17} /> Profile
            </button>
          </nav>

          <div className={styles.content}>
            {error && (
              <div className={styles.panel}>
                <p className={styles.error} role="alert">
                  {error}
                </p>
              </div>
            )}
            {message && (
              <div className={styles.panel}>
                <p className={styles.message} role="status">
                  {message}
                </p>
              </div>
            )}

            {/* ── SECTION: OVERVIEW ────────────────────────────────────────── */}
            {section === "overview" && (
              <>
                <div className={styles.overviewCards}>
                  <div className={styles.summaryCard}>
                    <span>Total orders</span>
                    <strong>{orders.length}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Wallet Balance</span>
                    <strong style={{ color: "#2f5d47" }}>
                      {wallet ? `₹${wallet.balanceRupees.toFixed(2)}` : "₹0.00"}
                    </strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Active Subscriptions</span>
                    <strong>{subscriptions.filter((s) => s.status === "active").length}</strong>
                  </div>
                  <div className={styles.summaryCard}>
                    <span>Saved addresses</span>
                    <strong>{addresses.length}</strong>
                  </div>
                </div>

                <div className={styles.panel} style={{ marginTop: 16 }}>
                  <div className={styles.panelHead}>
                    <div>
                      <h2>Account details</h2>
                      <p>Your verified contact information.</p>
                    </div>
                    <button className="button button-dark" type="button" onClick={() => setSection("profile")}>
                      Edit profile
                    </button>
                  </div>
                  <p>
                    <strong>{fullName || "Add your name"}</strong>
                    <br />
                    {email}
                    <br />
                    {phone ? `+91 ${phone}` : "Add mobile number"}
                  </p>
                </div>

                {referralCode && (
                  <div className={styles.panel}>
                    <div className={styles.panelHead}>
                      <div>
                        <h2>🎁 Refer &amp; Earn 10%</h2>
                        <p>Share with friends &amp; family. They get 10% off, you earn 10% cashback.</p>
                      </div>
                      <button className="button button-dark" type="button" onClick={() => setSection("wallet")}>
                        View Wallet
                      </button>
                    </div>
                    <p style={{ margin: 0 }}>
                      Your Unique Referral Code:{" "}
                      <strong style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{referralCode}</strong>
                    </p>
                  </div>
                )}

                {latestOrder && (
                  <div className={styles.panel}>
                    <div className={styles.panelHead}>
                      <div>
                        <h2>Latest order</h2>
                        <p>
                          {latestOrder.order_number} ·{" "}
                          {new Date(latestOrder.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <button className="button button-dark" type="button" onClick={() => setSection("orders")}>
                        View order
                      </button>
                    </div>
                    <p>
                      <strong>{latestOrder.display_status}</strong>
                      <br />
                      Total {formatPrice(latestOrder.total_paise)}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── SECTION: DIGITAL WALLET ───────────────────────────────────── */}
            {section === "wallet" && (
              <>
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <div>
                      <h2>Digital Wallet</h2>
                      <p>Available balance, dual stream earnings, and manual top-up funds.</p>
                    </div>
                  </div>

                  {/* Dual Stream Cards */}
                  <div className={styles.walletStreams}>
                    <div className={styles.streamCard} style={{ background: "#f2f8f3", borderColor: "#a9d4b4" }}>
                      <span>Total Available Balance</span>
                      <strong style={{ color: "#1c5132", fontSize: "1.8rem" }}>
                        ₹{wallet ? wallet.balanceRupees.toFixed(2) : "0.00"}
                      </strong>
                      <small>Usable on any checkout or subscription</small>
                    </div>
                    <div className={styles.streamCard}>
                      <span>✅ Earned Referral Credits</span>
                      <strong style={{ color: "#2f5d47" }}>
                        ₹{wallet ? wallet.earnedReferralRupees.toFixed(2) : "0.00"}
                      </strong>
                      <small>From 10% referral order kickbacks</small>
                    </div>
                    <div className={styles.streamCard}>
                      <span>✅ Manual Balance Top-Ups</span>
                      <strong style={{ color: "#8a6d2b" }}>
                        ₹{wallet ? wallet.manualTopupRupees.toFixed(2) : "0.00"}
                      </strong>
                      <small>Loaded via Card / UPI / NetBanking</small>
                    </div>
                  </div>

                  {/* Add Money to Wallet Module */}
                  <div style={{ background: "#fbf8f1", border: "1px solid var(--line)", padding: "20px", borderRadius: "6px", marginTop: "20px" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", fontFamily: "Georgia,serif" }}>
                      Add Money to Wallet
                    </h3>
                    <p style={{ margin: "0 0 14px 0", fontSize: "0.88rem", color: "var(--muted)" }}>
                      Select a quick recharge amount or enter a custom amount (UPI, Cards, NetBanking via Razorpay):
                    </p>
                    <div className={styles.chipRow}>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={`${styles.chip} ${topupAmount === amt && !customTopup ? styles.active : ""}`}
                          onClick={() => {
                            setTopupAmount(amt);
                            setCustomTopup("");
                          }}
                        >
                          + ₹{amt}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        min="100"
                        max="50000"
                        placeholder="Or custom amount (₹100 min)"
                        value={customTopup}
                        onChange={(e) => {
                          setCustomTopup(e.target.value);
                          const parsed = parseInt(e.target.value, 10);
                          if (!isNaN(parsed)) setTopupAmount(parsed);
                        }}
                        style={{
                          minHeight: "44px",
                          border: "1px solid var(--line)",
                          padding: "8px 12px",
                          width: "220px",
                          background: "#fff",
                        }}
                      />
                      <button
                        className="button button-dark"
                        type="button"
                        disabled={topupLoading || topupAmount < 100}
                        onClick={() => handleAddMoney(topupAmount)}
                      >
                        {topupLoading ? "Opening Gateway…" : `Add ₹${topupAmount} to Wallet`}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Viral Referral Loop Card */}
                {referralCode && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #10271d 0%, #1e4d38 100%)",
                      borderRadius: "10px",
                      padding: "24px",
                      marginBottom: "22px",
                      color: "#fff",
                    }}
                  >
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "#a3d5b8", fontWeight: 600 }}>
                      🌟 Share the love &amp; save together!
                    </p>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontFamily: "Georgia,serif", color: "#fff" }}>
                      Give an additional 10% discount on referral to your friends and family.
                    </h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.9rem", color: "#c8e6d4", lineHeight: 1.5 }}>
                      When your friend uses your unique code during checkout, they receive 10% off. Once their order is
                      completed, 10% of their total order value is deposited directly into your digital wallet!
                    </p>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: "6px",
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <div>
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#a3d5b8", textTransform: "uppercase" }}>
                          Your Unique Referral Code
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: "bold", letterSpacing: "2px" }}>
                          {referralCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode).then(() => {
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2500);
                          });
                        }}
                        style={{
                          background: "#fff",
                          color: "#10271d",
                          border: "none",
                          borderRadius: "4px",
                          padding: "8px 16px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {copiedCode ? "Copied!" : "Copy Code"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <a
                        href={referralWaUrl}
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
                    </div>
                  </div>
                )}

                {/* Transaction Ledger */}
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <div>
                      <h2>Transaction Ledger</h2>
                      <p>Full history of earned kickbacks, top-ups, and wallet order deductions.</p>
                    </div>
                  </div>
                  {!wallet?.transactions?.length ? (
                    <div className={styles.empty}>No wallet transactions recorded yet.</div>
                  ) : (
                    <table className={styles.ledgerTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallet.transactions.map((t) => {
                          const isCredit = t.amountPaise > 0;
                          return (
                            <tr key={t.id}>
                              <td>
                                {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td>
                                <span
                                  className={styles.badge}
                                  style={{
                                    background:
                                      t.type === "credit_referral"
                                        ? "#dcfce7"
                                        : t.type === "wallet_topup"
                                          ? "#e0f2fe"
                                          : "#fee2e2",
                                    color:
                                      t.type === "credit_referral"
                                        ? "#166534"
                                        : t.type === "wallet_topup"
                                          ? "#075985"
                                          : "#991b1b",
                                  }}
                                >
                                  {t.type.replaceAll("_", " ")}
                                </span>
                              </td>
                              <td>{t.description}</td>
                              <td
                                style={{
                                  textAlign: "right",
                                  fontWeight: 600,
                                  color: isCredit ? "#15803d" : "#b91c1c",
                                }}
                              >
                                {isCredit ? `+₹${t.amountRupees.toFixed(2)}` : `-₹${Math.abs(t.amountRupees).toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ── SECTION: SUBSCRIPTIONS ────────────────────────────────────── */}
            {section === "subscriptions" && (
              <>
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <div>
                      <h2>Subscription Preferences</h2>
                      <p>Automate recurring product shipments on your schedule.</p>
                    </div>
                    {!showAddSubscription && (
                      <button
                        className="button button-dark"
                        type="button"
                        onClick={() => setShowAddSubscription(true)}
                      >
                        <Plus size={15} /> Set Up Subscription
                      </button>
                    )}
                  </div>

                  {/* Wallet Tethering Banner */}
                  <div
                    style={{
                      background: "#f3f8f5",
                      borderLeft: "4px solid #2f5d47",
                      padding: "14px 18px",
                      marginBottom: "20px",
                      borderRadius: "4px",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 600, color: "#1c5132", fontSize: "0.92rem" }}>
                      💡 Digital Wallet Tethering Active
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#46633e" }}>
                      Recurring subscriptions automatically attempt to draw milestones first from your available
                      Digital Wallet Balance before falling back to charging the secondary card on file.
                    </p>
                  </div>

                  {/* Add Subscription Form */}
                  {showAddSubscription && (
                    <form onSubmit={handleCreateSubscription} style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
                      <p className={styles.sectionLabel}>Create automated recurring shipment</p>
                      <div className={styles.formGrid}>
                        <label className={styles.wide}>
                          <span>Select Product</span>
                          <select
                            value={subProductVariantId}
                            onChange={(e) => setSubProductVariantId(e.target.value)}
                          >
                            {catalogVariants.map((item) => (
                              <option key={item.variantId} value={item.variantId}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Quantity</span>
                          <select value={subQuantity} onChange={(e) => setSubQuantity(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5].map((q) => (
                              <option key={q} value={q}>
                                {q} {q === 1 ? "unit" : "units"}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Delivery Address</span>
                          <select value={subAddressId} onChange={(e) => setSubAddressId(e.target.value)} required>
                            {addresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.label} ({a.city}, {a.postalCode})
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className={styles.wide} style={{ margin: "10px 0" }}>
                          <span style={{ display: "block", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "8px" }}>
                            Delivery Frequency
                          </span>
                          <div className={styles.radioGroup}>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="frequency"
                                value="weekly"
                                checked={subFrequency === "weekly"}
                                onChange={() => setSubFrequency("weekly")}
                              />
                              <span>🗓 <strong>Weekly Recurring</strong> (every 7 days)</span>
                            </label>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="frequency"
                                value="monthly"
                                checked={subFrequency === "monthly"}
                                onChange={() => setSubFrequency("monthly")}
                              />
                              <span>🗓 <strong>Monthly Recurring</strong> (every 30 days)</span>
                            </label>
                            <label className={styles.radioOption}>
                              <input
                                type="radio"
                                name="frequency"
                                value="custom"
                                checked={subFrequency === "custom"}
                                onChange={() => setSubFrequency("custom")}
                              />
                              <span>🗓 <strong>Custom Order Interval</strong></span>
                            </label>
                          </div>

                          {subFrequency === "custom" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                              <span>Deliver every</span>
                              <input
                                type="number"
                                min="1"
                                max="24"
                                value={subIntervalWeeks}
                                onChange={(e) => setSubIntervalWeeks(Math.max(1, Number(e.target.value)))}
                                style={{ width: "80px", minHeight: "38px", border: "1px solid var(--line)", padding: "6px 10px" }}
                              />
                              <span>weeks</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button className="button button-dark" type="submit" disabled={subSaving}>
                          {subSaving ? "Activating…" : "Activate Subscription"}
                        </button>
                        <button
                          className={styles.textButton}
                          type="button"
                          onClick={() => setShowAddSubscription(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Subscriptions List */}
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <div>
                      <h2>Active Subscriptions</h2>
                      <p>Your ongoing scheduled deliveries.</p>
                    </div>
                  </div>

                  {!subscriptions.length ? (
                    <div className={styles.empty}>
                      <p>No automated subscriptions configured yet.</p>
                      <button
                        className="button button-dark"
                        type="button"
                        onClick={() => setShowAddSubscription(true)}
                        style={{ marginTop: "12px" }}
                      >
                        Set Up Your First Subscription
                      </button>
                    </div>
                  ) : (
                    subscriptions.map((sub) => {
                      const nextDate = new Date(sub.next_billing_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      const freqLabel =
                        sub.frequency === "weekly"
                          ? "Weekly"
                          : sub.frequency === "monthly"
                            ? "Monthly"
                            : `Every ${sub.interval_weeks || 1} weeks`;

                      return (
                        <div className={styles.subscriptionCard} key={sub.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                            <div>
                              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.2rem", fontFamily: "Georgia,serif" }}>
                                {sub.product_name} · {sub.variant_label} × {sub.quantity}
                              </h3>
                              <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                                Frequency: <strong>{freqLabel}</strong> · Next Dispatch: <strong>{nextDate}</strong>
                              </p>
                              {sub.shipping_address && (
                                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                                  Delivering to: {sub.shipping_address.addressLine1}, {sub.shipping_address.city} (
                                  {sub.shipping_address.postalCode})
                                </p>
                              )}
                            </div>
                            <span
                              className={styles.badge}
                              style={{
                                background:
                                  sub.status === "active"
                                    ? "#dcfce7"
                                    : sub.status === "paused"
                                      ? "#fef3c7"
                                      : "#fee2e2",
                                color:
                                  sub.status === "active"
                                    ? "#166534"
                                    : sub.status === "paused"
                                      ? "#92400e"
                                      : "#991b1b",
                              }}
                            >
                              {sub.status}
                            </span>
                          </div>

                          <div className={styles.addressButtons} style={{ marginTop: "14px" }}>
                            {sub.status === "active" ? (
                              <button
                                type="button"
                                className={styles.textButton}
                                onClick={() => handleUpdateSubStatus(sub.id, "paused")}
                              >
                                Pause Subscription
                              </button>
                            ) : sub.status === "paused" ? (
                              <button
                                type="button"
                                className={styles.textButton}
                                onClick={() => handleUpdateSubStatus(sub.id, "active")}
                              >
                                Resume Subscription
                              </button>
                            ) : null}
                            {sub.status !== "cancelled" && (
                              <button
                                type="button"
                                className={`${styles.textButton} ${styles.danger}`}
                                onClick={() => handleUpdateSubStatus(sub.id, "cancelled")}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* ── SECTION: ORDERS ───────────────────────────────────────────── */}
            {section === "orders" && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <h2>Your orders</h2>
                    <p>Live delivery status and tracking for purchases placed with {email}.</p>
                  </div>
                </div>
                {!orders.length ? (
                  <div className={styles.empty}>
                    <p>No orders to show yet.</p>
                    <Link className="button button-dark" href="/products">
                      Explore products
                    </Link>
                  </div>
                ) : (
                  <div className={styles.orderList}>
                    {orders.map((order) => {
                      const progress = orderProgress(order.display_status);
                      return (
                        <article className={styles.orderCard} key={order.id}>
                          <div className={styles.orderHead}>
                            <div>
                              <p className="eyebrow">
                                {new Date(order.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <h3>{order.order_number}</h3>
                              {order.estimated_delivery_window && (
                                <p
                                  style={{
                                    margin: "4px 0 0 0",
                                    fontSize: "0.85rem",
                                    color: "#2f5d47",
                                    fontWeight: 600,
                                  }}
                                >
                                  Delivery Window: {order.estimated_delivery_window}
                                </p>
                              )}
                            </div>
                            <span className={styles.status}>{order.display_status}</span>
                          </div>
                          <div className={styles.items}>
                            {order.items.map((item) => (
                              <div className={styles.itemRow} key={`${order.id}-${item.sku}`}>
                                <span>
                                  {item.product_name} · {item.variant_label} × {item.quantity}
                                </span>
                                <strong>{formatPrice(item.line_total_paise)}</strong>
                              </div>
                            ))}
                          </div>
                          <div className={styles.money}>
                            <div>
                              <span>Shipping</span>
                              <strong>{order.shipping_paise ? formatPrice(order.shipping_paise) : "Free"}</strong>
                            </div>
                            <div>
                              <span>GST</span>
                              <strong>{formatPrice(order.tax_paise)}</strong>
                            </div>
                            <div>
                              <span>Total paid</span>
                              <strong>{formatPrice(order.total_paise)}</strong>
                            </div>
                          </div>
                          <div className={styles.timeline} aria-label={`Order progress: ${order.display_status}`}>
                            {[1, 2, 3, 4, 5].map((step) => (
                              <span key={step} className={`${styles.step} ${progress >= step ? styles.done : ""}`} />
                            ))}
                          </div>
                          <div className={styles.tracking}>
                            <p>
                              <strong>Payment:</strong>{" "}
                              {order.payment_status === "captured" ? "Paid" : order.payment_status}
                            </p>
                            {order.tracking_awb ? (
                              <>
                                <p>
                                  <strong>Courier:</strong> {order.courier_name || "Assigned"}
                                </p>
                                <p>
                                  <strong>AWB:</strong> {order.tracking_awb}
                                </p>
                              </>
                            ) : (
                              <p>
                                <strong>Delivery:</strong> Your order is being prepared. Tracking will appear after
                                courier assignment.
                              </p>
                            )}
                            <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                              <a
                                className="button button-dark"
                                href={`/api/orders/${order.id}/invoice`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "0.82rem", padding: "8px 14px", textDecoration: "none" }}
                              >
                                Download Tax Invoice (PDF)
                              </a>
                              {order.tracking_url && (
                                <a
                                  className="button button-dark"
                                  href={order.tracking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: "0.82rem", padding: "8px 14px", textDecoration: "none" }}
                                >
                                  Track shipment
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION: ADDRESSES ────────────────────────────────────────── */}
            {section === "addresses" && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <h2>Saved addresses</h2>
                    <p>Add home, work or other delivery addresses.</p>
                  </div>
                  {editingAddressId === null && (
                    <button className="button button-dark" type="button" onClick={beginNewAddress}>
                      <Plus size={15} /> Add address
                    </button>
                  )}
                </div>
                {addresses.length ? (
                  <div className={styles.addressGrid}>
                    {addresses.map((address) => (
                      <article
                        key={address.id}
                        className={`${styles.addressCard} ${address.isDefault ? styles.default : ""}`}
                      >
                        <div className={styles.addressTitle}>
                          <strong>{address.label}</strong>
                          {address.isDefault && <span className={styles.badge}>Default</span>}
                        </div>
                        <p>{address.fullName}</p>
                        <p>
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                        </p>
                        <p>
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        <p>+91 {address.phone}</p>
                        <div className={styles.addressButtons}>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => beginEditAddress(address)}
                          >
                            Edit
                          </button>
                          {!address.isDefault && (
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() => makeDefaultAddress(address.id)}
                              disabled={saving}
                            >
                              Make default
                            </button>
                          )}
                          <button
                            type="button"
                            className={`${styles.textButton} ${styles.danger}`}
                            onClick={() => removeAddress(address.id)}
                            disabled={saving}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  !editingAddressId && <div className={styles.empty}>No saved addresses yet.</div>
                )}

                {editingAddressId && (
                  <form className={styles.addForm} onSubmit={saveAddress}>
                    <p className={styles.sectionLabel}>
                      {editingAddressId === "new" ? "New address" : "Edit address"}
                    </p>
                    <div className={styles.formGrid}>
                      <label>
                        <span>Label</span>
                        <select
                          value={addressForm.label}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, label: event.target.value }))
                          }
                        >
                          <option>Home</option>
                          <option>Work</option>
                          <option>Other</option>
                        </select>
                      </label>
                      <label>
                        <span>Full name</span>
                        <input
                          required
                          value={addressForm.fullName}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, fullName: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.wide}>
                        <span>Mobile number</span>
                        <input
                          required
                          inputMode="tel"
                          value={addressForm.phone}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, phone: cleanPhone(event.target.value) }))
                          }
                        />
                      </label>
                      <label className={styles.wide}>
                        <span>Address</span>
                        <input
                          required
                          value={addressForm.addressLine1}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, addressLine1: event.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.wide}>
                        <span>Apartment, suite, landmark (optional)</span>
                        <input
                          value={addressForm.addressLine2}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, addressLine2: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>PIN code</span>
                        <input
                          required
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          value={addressForm.postalCode}
                          onChange={(event) =>
                            setAddressForm((current) => ({
                              ...current,
                              postalCode: event.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>City</span>
                        <input
                          required
                          value={addressForm.city}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, city: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>State / UT</span>
                        <select
                          required
                          value={addressForm.state}
                          onChange={(event) =>
                            setAddressForm((current) => ({ ...current, state: event.target.value }))
                          }
                        >
                          <option value="">Select state</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Country</span>
                        <input value="India" readOnly />
                      </label>
                    </div>
                    <div className={styles.actions}>
                      <button className="button button-dark" type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Save address"}
                      </button>
                      <button
                        className={styles.textButton}
                        type="button"
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressForm(emptyAddress);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ── SECTION: PROFILE ──────────────────────────────────────────── */}
            {section === "profile" && (
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <h2>Profile</h2>
                    <p>Keep your contact details up to date.</p>
                  </div>
                </div>
                <form onSubmit={saveProfile}>
                  <div className={styles.formGrid}>
                    <label className={styles.wide}>
                      <span>Verified email</span>
                      <input className={styles.emailField} type="email" value={email} readOnly />
                    </label>
                    <label className={styles.wide}>
                      <span>Full name</span>
                      <input
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                      />
                    </label>
                    <label className={styles.wide}>
                      <span>Mobile number</span>
                      <input
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(event) => setPhone(cleanPhone(event.target.value))}
                      />
                    </label>
                  </div>
                  <div className={styles.actions}>
                    <button className="button button-dark" type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
