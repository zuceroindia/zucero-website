import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function authenticatedUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function authenticatedEmail() {
  return (await authenticatedUser())?.email?.trim().toLowerCase() ?? null;
}
