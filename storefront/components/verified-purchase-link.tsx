"use client";

import { MailCheck, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { CustomerDetails, PurchaseLine } from "@/lib/customer-details";
import { emptyCustomerDetails } from "@/lib/customer-details";
import { useEmailOtp } from "@/lib/use-email-otp";
import { whatsappOrder } from "@/lib/whatsapp";
import { customerAddress } from "@/lib/customer-details";
import { notifyZucero } from "@/lib/notify-zucero";

type Props = {
  href: string;
  lines: PurchaseLine[];
  className?: string;
  children: React.ReactNode;
  defaultDetails?: Partial<CustomerDetails>;
};

export function VerifiedPurchaseLink({ href, lines, className, children, defaultDetails = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<CustomerDetails>({ ...emptyCustomerDetails, ...defaultDetails });
  const [token, setToken] = useState("");
  const otp = useEmailOtp();

  function update(field: keyof CustomerDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  async function save(userId: string) {
    if (!otp.client) return;
    const customer: CustomerDetails = {
      ...details,
      fullName: details.fullName.trim(),
      email: details.email.trim().toLowerCase(),
      phone: details.phone.trim(),
      addressLine1: details.addressLine1.trim(),
      addressLine2: details.addressLine2.trim(),
      city: details.city.trim(),
      state: details.state.trim(),
      postalCode: details.postalCode.trim(),
      country: details.country.trim() || "India",
    };
    const { error } = await otp.client.from("purchase_inquiries").insert({
      user_id: userId,
      email: customer.email,
      full_name: customer.fullName,
      phone: customer.phone,
      address_line1: customer.addressLine1,
      address_line2: customer.addressLine2 || null,
      city: customer.city,
      state: customer.state,
      postal_code: customer.postalCode,
      country: customer.country,
      items: lines,
      source: "website_purchase",
    });
    if (error) {
      otp.setMessage(error.message);
      return;
    }
    await notifyZucero(otp.client, { kind: "purchase", email: customer.email, fields: { Name: customer.fullName, Email: customer.email, Phone: customer.phone, Address: customerAddress(customer), Products: lines.map(line => `${line.productName} — ${line.variantLabel} × ${line.quantity}`).join("\n") } });
    window.location.assign(lines.length ? whatsappOrder(lines, customer) : href);
  }

  function begin() {
    setDetails((current) => ({ ...current, ...defaultDetails }));
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const existing = await otp.currentVerifiedUser(details.email);
    if (existing) {
      await save(existing.id);
      return;
    }
    if (!otp.codeSent) {
      await otp.sendCode(details.email, details.fullName);
      return;
    }
    const user = await otp.verifyCode(details.email, token);
    if (user) await save(user.id);
  }

  function close() {
    setOpen(false);
    setToken("");
    otp.resetCode();
  }

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="otp-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) close(); }}>
      <section className="otp-modal otp-purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-verification-title">
        <button className="otp-modal-close" type="button" aria-label="Close email verification" onClick={close}><X /></button>
        <MailCheck aria-hidden="true" />
        <p className="eyebrow">Secure purchase journey</p>
        <h2 id="purchase-verification-title">Your details</h2>
        <p>We save your order request only after your email is verified, then open a pre-filled WhatsApp chat.</p>
        <form className="otp-form otp-customer-grid" onSubmit={submit}>
          <label className="wide"><span>Full name</span><input autoComplete="name" required value={details.fullName} onChange={event => update("fullName", event.target.value)} disabled={otp.codeSent} /></label>
          <label><span>Email address</span><input type="email" autoComplete="email" required value={details.email} onChange={event => update("email", event.target.value)} disabled={otp.codeSent} /></label>
          <label><span>Mobile number</span><input type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+ ()-]{10,18}" required value={details.phone} onChange={event => update("phone", event.target.value)} disabled={otp.codeSent} /></label>
          <label className="wide"><span>Address</span><input autoComplete="address-line1" required value={details.addressLine1} onChange={event => update("addressLine1", event.target.value)} disabled={otp.codeSent} /></label>
          <label className="wide"><span>Apartment, suite, etc. (optional)</span><input autoComplete="address-line2" value={details.addressLine2} onChange={event => update("addressLine2", event.target.value)} disabled={otp.codeSent} /></label>
          <label><span>City</span><input autoComplete="address-level2" required value={details.city} onChange={event => update("city", event.target.value)} disabled={otp.codeSent} /></label>
          <label><span>State</span><input autoComplete="address-level1" required value={details.state} onChange={event => update("state", event.target.value)} disabled={otp.codeSent} /></label>
          <label><span>PIN code</span><input inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={details.postalCode} onChange={event => update("postalCode", event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={otp.codeSent} /></label>
          <label><span>Country</span><input autoComplete="country-name" required value={details.country} onChange={event => update("country", event.target.value)} disabled={otp.codeSent} /></label>
          {otp.codeSent && <label className="wide"><span>Verification code</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus value={token} onChange={event => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" /></label>}
          <button className="button button-gold wide" disabled={otp.busy}>{otp.busy ? "Please wait…" : otp.codeSent ? "Verify, save & continue" : "Send verification code"}</button>
          {otp.codeSent && <button className="otp-change wide" type="button" onClick={() => { otp.resetCode(); setToken(""); }}>Edit your details</button>}
          {otp.message && <p className="otp-message wide" role="status">{otp.message}</p>}
        </form>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>
    <button type="button" className={className} onClick={begin}>{children}</button>
    {modal}
  </>;
}
