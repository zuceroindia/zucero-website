"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ZuceroSubmissionNotification = {
  kind: "launch_list" | "contact" | "purchase";
  email: string;
  fields: Record<string, string>;
};

export async function notifyZucero(client: SupabaseClient, payload: ZuceroSubmissionNotification) {
  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return;
  await fetch("/api/notifications/submission", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
