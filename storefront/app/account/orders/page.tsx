"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, MapPin, Package, Plus, UserRound } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { formatPrice } from "@/lib/catalog";
import { INDIAN_STATES } from "@/lib/india";
import styles from "./account.module.css";

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

type Section = "overview" | "orders" | "addresses" | "profile";

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
  const client = useMemo(() => isSupabaseConfigured() ? createSupabaseBrowserClient() : null, []);
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

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) { setError("Account services are temporarily unavailable."); setLoading(false); return; }
      const { data, error: userError } = await client.auth.getUser();
      if (userError || !data.user) { router.replace("/account"); return; }
      if (!active) return;
      const userMetadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const savedAddresses = Array.isArray(userMetadata.addresses) ? userMetadata.addresses as SavedAddress[] : [];
      const safeAddresses = savedAddresses.filter(address => address && typeof address.id === "string");
      setEmail(data.user.email ?? "");
      setMetadata(userMetadata);
      setFullName(typeof userMetadata.full_name === "string" ? userMetadata.full_name : "");
      setPhone(typeof userMetadata.phone === "string" ? cleanPhone(userMetadata.phone) : "");
      setAddresses(safeAddresses);
      const response = await fetch("/api/account/orders", { cache: "no-store" });
      const payload = await response.json();
      if (!active) return;
      if (!response.ok) setError(payload.error ?? "Could not load your orders.");
      else setOrders(payload.orders ?? []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
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
    setError(""); setMessage("");
    const normalizedPhone = cleanPhone(phone);
    if (normalizedPhone.length !== 10) { setError("Enter a valid 10-digit mobile number."); return; }
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    setSaving(true);
    const ok = await persistMetadata({ ...metadata, full_name: fullName.trim(), phone: normalizedPhone, addresses });
    setSaving(false);
    if (ok) { setPhone(normalizedPhone); setMessage("Profile updated successfully."); }
  }

  function beginNewAddress() {
    setEditingAddressId("new");
    setAddressForm({ ...emptyAddress, fullName, phone });
    setMessage(""); setError("");
  }

  function beginEditAddress(address: SavedAddress) {
    setEditingAddressId(address.id);
    const { id: _id, isDefault: _isDefault, ...rest } = address;
    setAddressForm(rest);
    setMessage(""); setError("");
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    const normalizedPhone = cleanPhone(addressForm.phone);
    if (normalizedPhone.length !== 10) { setError("Enter a valid 10-digit mobile number for this address."); return; }
    if (addressForm.postalCode.length !== 6 || !/^\d{6}$/.test(addressForm.postalCode)) { setError("Enter a valid 6-digit PIN code."); return; }
    setSaving(true);
    const nextId = editingAddressId === "new" ? crypto.randomUUID() : editingAddressId!;
    const existing = addresses.find(address => address.id === nextId);
    const nextAddress: SavedAddress = {
      ...addressForm,
      phone: normalizedPhone,
      id: nextId,
      isDefault: existing?.isDefault ?? addresses.length === 0,
    };
    const nextAddresses = editingAddressId === "new"
      ? [...addresses, nextAddress]
      : addresses.map(address => address.id === nextId ? nextAddress : address);
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
    setSaving(true); setError(""); setMessage("");
    let nextAddresses = addresses.filter(address => address.id !== id);
    if (nextAddresses.length && !nextAddresses.some(address => address.isDefault)) nextAddresses = nextAddresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
    const ok = await persistMetadata({ ...metadata, full_name: fullName, phone, addresses: nextAddresses });
    setSaving(false);
    if (ok) { setAddresses(nextAddresses); setMessage("Address removed."); }
  }

  async function makeDefaultAddress(id: string) {
    const nextAddresses = addresses.map(address => ({ ...address, isDefault: address.id === id }));
    setSaving(true); setError(""); setMessage("");
    const ok = await persistMetadata({ ...metadata, full_name: fullName, phone, addresses: nextAddresses });
    setSaving(false);
    if (ok) { setAddresses(nextAddresses); setMessage("Default address updated."); }
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    router.replace("/account");
  }

  const latestOrder = orders[0];
  const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0];

  if (loading) return <main className="store-page"><StoreHeader /><section className={styles.shell}><div className={styles.empty}><h2>Loading your account…</h2></div></section><SiteFooter /></main>;

  return <main className="store-page"><StoreHeader /><section className={styles.shell}>
    <div className={styles.topbar}><div><p className="eyebrow">My account</p><h1>{fullName ? `Hello, ${fullName.split(" ")[0]}.` : "Welcome to Zucero."}</h1><p className={styles.muted}>Manage your profile, saved addresses, orders and delivery tracking.</p></div><button className={styles.signout} type="button" onClick={signOut}><LogOut size={15} /> Sign out</button></div>
    <div className={styles.grid}>
      <nav className={styles.nav} aria-label="Account sections">
        <button type="button" className={section === "overview" ? styles.active : ""} onClick={() => setSection("overview")}><Home size={17}/> Overview</button>
        <button type="button" className={section === "orders" ? styles.active : ""} onClick={() => setSection("orders")}><Package size={17}/> Orders</button>
        <button type="button" className={section === "addresses" ? styles.active : ""} onClick={() => setSection("addresses")}><MapPin size={17}/> Addresses</button>
        <button type="button" className={section === "profile" ? styles.active : ""} onClick={() => setSection("profile")}><UserRound size={17}/> Profile</button>
      </nav>
      <div className={styles.content}>
        {error && <div className={styles.panel}><p className={styles.error} role="alert">{error}</p></div>}
        {message && <div className={styles.panel}><p className={styles.message} role="status">{message}</p></div>}

        {section === "overview" && <>
          <div className={styles.overviewCards}>
            <div className={styles.summaryCard}><span>Total orders</span><strong>{orders.length}</strong></div>
            <div className={styles.summaryCard}><span>Latest order</span><strong>{latestOrder ? latestOrder.display_status : "No orders yet"}</strong></div>
            <div className={styles.summaryCard}><span>Saved addresses</span><strong>{addresses.length}</strong></div>
          </div>
          <div className={styles.panel} style={{marginTop:16}}><div className={styles.panelHead}><div><h2>Account details</h2><p>Your verified contact information.</p></div><button className="button button-dark" type="button" onClick={() => setSection("profile")}>Edit profile</button></div><p><strong>{fullName || "Add your name"}</strong><br/>{email}<br/>{phone ? `+91 ${phone}` : "Add mobile number"}</p></div>
          <div className={styles.panel}><div className={styles.panelHead}><div><h2>Default delivery address</h2><p>Used to make future checkouts faster.</p></div><button className="button button-dark" type="button" onClick={() => setSection("addresses")}>{defaultAddress ? "Manage addresses" : "Add address"}</button></div>{defaultAddress ? <><strong>{defaultAddress.label}</strong><p>{defaultAddress.fullName}<br/>{defaultAddress.addressLine1}{defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ""}<br/>{defaultAddress.city}, {defaultAddress.state} {defaultAddress.postalCode}<br/>+91 {defaultAddress.phone}</p></> : <p className={styles.muted}>No saved address yet.</p>}</div>
          {latestOrder && <div className={styles.panel}><div className={styles.panelHead}><div><h2>Latest order</h2><p>{latestOrder.order_number} · {new Date(latestOrder.created_at).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</p></div><button className="button button-dark" type="button" onClick={() => setSection("orders")}>View order</button></div><p><strong>{latestOrder.display_status}</strong><br/>Total {formatPrice(latestOrder.total_paise)}</p></div>}
        </>}

        {section === "profile" && <div className={styles.panel}><div className={styles.panelHead}><div><h2>Profile</h2><p>Keep your contact details up to date.</p></div></div><form onSubmit={saveProfile}><div className={styles.formGrid}><label className={styles.wide}><span>Verified email</span><input className={styles.emailField} type="email" value={email} readOnly /></label><label className={styles.wide}><span>Full name</span><input required autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} /></label><label className={styles.wide}><span>Mobile number</span><input required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" value={phone} onChange={event => setPhone(cleanPhone(event.target.value))} /></label></div><div className={styles.actions}><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div></form></div>}

        {section === "addresses" && <div className={styles.panel}><div className={styles.panelHead}><div><h2>Saved addresses</h2><p>Add home, work or other delivery addresses.</p></div>{editingAddressId === null && <button className="button button-dark" type="button" onClick={beginNewAddress}><Plus size={15}/> Add address</button>}</div>
          {addresses.length ? <div className={styles.addressGrid}>{addresses.map(address => <article key={address.id} className={`${styles.addressCard} ${address.isDefault ? styles.default : ""}`}><div className={styles.addressTitle}><strong>{address.label}</strong>{address.isDefault && <span className={styles.badge}>Default</span>}</div><p>{address.fullName}</p><p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}</p><p>{address.city}, {address.state} {address.postalCode}</p><p>+91 {address.phone}</p><div className={styles.addressButtons}><button type="button" className={styles.textButton} onClick={() => beginEditAddress(address)}>Edit</button>{!address.isDefault && <button type="button" className={styles.textButton} onClick={() => makeDefaultAddress(address.id)} disabled={saving}>Make default</button>}<button type="button" className={`${styles.textButton} ${styles.danger}`} onClick={() => removeAddress(address.id)} disabled={saving}>Remove</button></div></article>)}</div> : !editingAddressId && <div className={styles.empty}>No saved addresses yet.</div>}
          {editingAddressId && <form className={styles.addForm} onSubmit={saveAddress}><p className={styles.sectionLabel}>{editingAddressId === "new" ? "New address" : "Edit address"}</p><div className={styles.formGrid}><label><span>Label</span><select value={addressForm.label} onChange={event => setAddressForm(current => ({...current,label:event.target.value}))}><option>Home</option><option>Work</option><option>Other</option></select></label><label><span>Full name</span><input required value={addressForm.fullName} onChange={event => setAddressForm(current => ({...current,fullName:event.target.value}))}/></label><label className={styles.wide}><span>Mobile number</span><input required inputMode="tel" value={addressForm.phone} onChange={event => setAddressForm(current => ({...current,phone:cleanPhone(event.target.value)}))}/></label><label className={styles.wide}><span>Address</span><input required value={addressForm.addressLine1} onChange={event => setAddressForm(current => ({...current,addressLine1:event.target.value}))}/></label><label className={styles.wide}><span>Apartment, suite, landmark (optional)</span><input value={addressForm.addressLine2} onChange={event => setAddressForm(current => ({...current,addressLine2:event.target.value}))}/></label><label><span>PIN code</span><input required inputMode="numeric" pattern="[0-9]{6}" value={addressForm.postalCode} onChange={event => setAddressForm(current => ({...current,postalCode:event.target.value.replace(/\D/g,"").slice(0,6)}))}/></label><label><span>City</span><input required value={addressForm.city} onChange={event => setAddressForm(current => ({...current,city:event.target.value}))}/></label><label><span>State / UT</span><select required value={addressForm.state} onChange={event => setAddressForm(current => ({...current,state:event.target.value}))}><option value="">Select state</option>{INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}</select></label><label><span>Country</span><input value="India" readOnly /></label></div><div className={styles.actions}><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save address"}</button><button className={styles.textButton} type="button" onClick={() => {setEditingAddressId(null);setAddressForm(emptyAddress);}}>Cancel</button></div></form>}
        </div>}

        {section === "orders" && <div className={styles.panel}><div className={styles.panelHead}><div><h2>Your orders</h2><p>Live delivery status and tracking for purchases placed with {email}.</p></div></div>{!orders.length ? <div className={styles.empty}><p>No orders to show yet.</p><Link className="button button-dark" href="/products">Explore products</Link></div> : <div className={styles.orderList}>{orders.map(order => { const progress = orderProgress(order.display_status); return <article className={styles.orderCard} key={order.id}><div className={styles.orderHead}><div><p className="eyebrow">{new Date(order.created_at).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</p><h3>{order.order_number}</h3>{order.estimated_delivery_window && <p style={{margin:"4px 0 0 0",fontSize:"0.85rem",color:"#2f5d47",fontWeight:600}}>Delivery Window: {order.estimated_delivery_window}</p>}</div><span className={styles.status}>{order.display_status}</span></div><div className={styles.items}>{order.items.map(item => <div className={styles.itemRow} key={`${order.id}-${item.sku}`}><span>{item.product_name} · {item.variant_label} × {item.quantity}</span><strong>{formatPrice(item.line_total_paise)}</strong></div>)}</div><div className={styles.money}><div><span>Shipping</span><strong>{order.shipping_paise ? formatPrice(order.shipping_paise) : "Free"}</strong></div><div><span>GST</span><strong>{formatPrice(order.tax_paise)}</strong></div><div><span>Total paid</span><strong>{formatPrice(order.total_paise)}</strong></div></div><div className={styles.timeline} aria-label={`Order progress: ${order.display_status}`}>{[1,2,3,4,5].map(step => <span key={step} className={`${styles.step} ${progress >= step ? styles.done : ""}`}/>)}</div><div className={styles.tracking}><p><strong>Payment:</strong> {order.payment_status === "captured" ? "Paid" : order.payment_status}</p>{order.tracking_awb ? <><p><strong>Courier:</strong> {order.courier_name || "Assigned"}</p><p><strong>AWB:</strong> {order.tracking_awb}</p></> : <p><strong>Delivery:</strong> Your order is being prepared. Tracking will appear after courier assignment.</p>}<div style={{display:"flex",gap:"10px",marginTop:"12px",flexWrap:"wrap"}}><a className="button button-dark" href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" style={{fontSize:"0.82rem",padding:"8px 14px",textDecoration:"none"}}>Download Tax Invoice (PDF)</a>{order.tracking_url && <a className="button button-dark" href={order.tracking_url} target="_blank" rel="noreferrer" style={{fontSize:"0.82rem",padding:"8px 14px",textDecoration:"none"}}>Track shipment</a>}</div></div></article>; })}</div>}</div>}
      </div>
    </div>
  </section><SiteFooter /></main>;
}
