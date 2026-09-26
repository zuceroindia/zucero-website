"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.thegoodsugar.in";

export function SocialAuthButtons() {
  const client = useMemo(() => isSupabaseConfigured() ? createSupabaseBrowserClient() : null, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function continueWithGoogle() {
    if (!client) { setMessage("Account sign in is temporarily unavailable."); return; }
    setBusy(true);
    setMessage("");
    const redirectTo = new URL("/auth/callback", SITE_URL).toString();
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }

  return <div className="social-auth"><button className="social-auth-button" type="button" disabled={busy} onClick={continueWithGoogle}><span className="social-auth-mark">G</span>{busy ? "Connecting…" : "Continue with Google"}</button>{message && <p className="form-message" role="status">{message}</p>}</div>;
}
