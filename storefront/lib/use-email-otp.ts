"use client";

import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

const PRODUCTION_SITE_URL = "https://www.thegoodsugar.in";

function getAuthCallbackUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL;
  return new URL("/auth/callback", configuredSiteUrl).toString();
}

function friendlyEmailError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Please wait a minute before requesting another verification code.";
  }
  if (normalized.includes("magic link") || normalized.includes("smtp") || normalized.includes("email")) {
    return "We couldn't send the verification code right now. Please try again in a moment.";
  }
  return message;
}

export function useEmailOtp() {
  const client = useMemo(() => isSupabaseConfigured() ? createSupabaseBrowserClient() : null, []);
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function currentVerifiedUser(email: string) {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user?.email?.toLowerCase() === email.trim().toLowerCase() ? data.user : null;
  }

  async function sendCode(email: string, fullName?: string) {
    if (!client) {
      setMessage("Email verification is temporarily unavailable. Please contact Zucero support.");
      return false;
    }
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthCallbackUrl(),
        data: fullName ? { full_name: fullName.trim() } : undefined,
      },
    });
    setBusy(false);
    if (error) {
      setMessage(friendlyEmailError(error.message));
      return false;
    }
    setCodeSent(true);
    setMessage("We sent a six-digit verification code to your email.");
    return true;
  }

  async function verifyCode(email: string, token: string): Promise<User | null> {
    if (!client) return null;
    setBusy(true);
    setMessage("");
    const { data, error } = await client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    setBusy(false);
    if (error || !data.user) {
      setMessage(error?.message ?? "That code could not be verified. Please request a new one.");
      return null;
    }
    return data.user;
  }

  function resetCode() {
    setCodeSent(false);
    setMessage("");
  }

  return { client, codeSent, busy, message, setMessage, sendCode, verifyCode, currentVerifiedUser, resetCode };
}
