"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
import { useEmailOtp } from "@/lib/use-email-otp";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const otp = useEmailOtp();

  function destination() {
    if (typeof window === "undefined") return "/account/orders";
    const requested = new URLSearchParams(window.location.search).get("redirect");
    return requested?.startsWith("/admin/") ? requested : "/account/orders";
  }

  useEffect(() => {
    let active = true;
    async function checkSession() {
      if (!otp.client) return;
      const { data } = await otp.client.auth.getUser();
    if (active && data.user) router.replace(destination());
    }
    checkSession();
    return () => { active = false; };
  }, [otp.client, router]);

  async function continueWithEmail(event: FormEvent) {
    event.preventDefault();
    const existing = await otp.currentVerifiedUser(email);
    if (existing) { router.push(destination()); return; }
    if (!otp.codeSent) { await otp.sendCode(email); return; }
    const user = await otp.verifyCode(email, token);
    if (user) router.push(destination());
  }

  return <main className="store-page"><StoreHeader /><section className="account-shell"><div className="account-story"><p className="eyebrow gold">Your Zucero account</p><h1>Orders, addresses,<br />and tracking in one place.</h1><p>Sign in with Google or a verified email code. Guest checkout remains available.</p><ul><li><ShieldCheck /> Secure Supabase authentication</li><li><Mail /> Order and shipment notifications</li></ul></div><form className="account-card otp-form" onSubmit={continueWithEmail}><p className="eyebrow">Sign in or create account</p><h2>Continue securely</h2><SocialAuthButtons /><div className="auth-divider"><span>or continue with email</span></div><label><span>Email address</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" disabled={otp.codeSent} /></label>{otp.codeSent && <label><span>Verification code</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={token} onChange={event => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" /></label>}<button className="button button-dark" disabled={otp.busy}>{otp.busy ? "Please wait…" : otp.codeSent ? "Verify & continue" : "Send email verification code"}</button>{otp.codeSent && <button className="otp-change" type="button" onClick={() => { otp.resetCode(); setToken(""); }}>Use a different email</button>}{otp.message && <p className="form-message" role="status">{otp.message}</p>}<small>By continuing, you accept our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</small></form></section><SiteFooter /></main>;
}
