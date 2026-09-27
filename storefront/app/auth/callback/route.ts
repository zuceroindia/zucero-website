import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = new URL("/account/orders", url.origin);
  if (!code || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.redirect(new URL("/account?error=auth", url.origin));
  const cookieStore = await cookies();
  const response = NextResponse.redirect(destination);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? NextResponse.redirect(new URL("/account?error=auth", url.origin)) : response;
}
