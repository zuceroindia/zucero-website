"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useEmailOtp } from "@/lib/use-email-otp";
import { notifyZucero } from "@/lib/notify-zucero";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [complete, setComplete] = useState(false);
  const otp = useEmailOtp();

  async function save(userId: string) {
    if (!otp.client) return;
    const { error } = await otp.client.from("contact_inquiries").insert({ user_id: userId, email: email.trim().toLowerCase(), full_name: name.trim(), phone: phone.trim(), address_line1: addressLine1.trim(), address_line2: addressLine2.trim() || null, city: city.trim(), state: state.trim(), postal_code: postalCode.trim(), country: "India", order_number: orderNumber.trim() || null, message: body.trim() });
    if (error) { otp.setMessage(error.message); return; }
    await notifyZucero(otp.client, { kind: "contact", email: email.trim().toLowerCase(), fields: { Name: name.trim(), Email: email.trim().toLowerCase(), Phone: phone.trim(), Address: [addressLine1, addressLine2, city, state, postalCode, "India"].filter(Boolean).join(", "), "Order number": orderNumber.trim() || "Not provided", Message: body.trim() } });
    setComplete(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const existing = await otp.currentVerifiedUser(email);
    if (existing) { await save(existing.id); return; }
    if (!otp.codeSent) { await otp.sendCode(email, name); return; }
    const user = await otp.verifyCode(email, token);
    if (user) await save(user.id);
  }

  if (complete) return <div className="verified-success contact-success" role="status"><CheckCircle2 /><strong>Message received.</strong><span>Your email is verified and the Zucero team will reply soon.</span></div>;
  return <form className="contact-form otp-form" onSubmit={submit}>
    <label><span>Name</span><input name="name" autoComplete="name" required value={name} onChange={event => setName(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>Email</span><input name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>Mobile number</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+ ()-]{10,18}" required value={phone} onChange={event => setPhone(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>Address</span><input name="address" autoComplete="address-line1" required value={addressLine1} onChange={event => setAddressLine1(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>Apartment, suite, etc. (optional)</span><input name="address2" autoComplete="address-line2" value={addressLine2} onChange={event => setAddressLine2(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>City</span><input name="city" autoComplete="address-level2" required value={city} onChange={event => setCity(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>State</span><input name="state" autoComplete="address-level1" required value={state} onChange={event => setState(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>PIN code</span><input name="postalCode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={postalCode} onChange={event => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={otp.codeSent} /></label>
    <label><span>Order number (optional)</span><input name="order" value={orderNumber} onChange={event => setOrderNumber(event.target.value)} disabled={otp.codeSent} /></label>
    <label><span>Message</span><textarea name="message" required value={body} onChange={event => setBody(event.target.value)} disabled={otp.codeSent} /></label>
    {otp.codeSent && <label><span>Verification code</span><input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="6-digit code" required value={token} onChange={event => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}
    <button type="submit" className="button button-dark" disabled={otp.busy}>{otp.busy ? "Please wait…" : otp.codeSent ? "Verify & send message" : "Verify email to send"}</button>
    {otp.codeSent && <button className="otp-change" type="button" onClick={() => { otp.resetCode(); setToken(""); }}>Edit your details</button>}
    {otp.message && <p className="otp-message" role="status">{otp.message}</p>}
  </form>;
}
