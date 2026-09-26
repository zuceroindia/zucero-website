import { createClient } from "@supabase/supabase-js";

// The project does not yet generate Supabase database types, so the admin
// client must remain untyped until a Database schema type is introduced.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function supabaseAdmin(): any {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Supabase server credentials are not configured");
  adminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
