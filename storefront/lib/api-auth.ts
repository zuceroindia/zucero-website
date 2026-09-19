import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Checks if the request comes from an authenticated merchant or trusted internal system.
 * Verifies:
 * 1. Shared secret in header (x-zucero-secret, x-api-key, Authorization: Bearer <secret>) or query parameter (?secret=... / ?token=...)
 *    Matching INTERNAL_API_SECRET, SHIPROCKET_WEBHOOK_SECRET, or SUPABASE_SERVICE_ROLE_KEY.
 * 2. Or an authenticated Supabase merchant user session.
 */
export async function isAuthorizedAdminOrInternal(request: Request): Promise<boolean> {
  const secrets = [
    process.env.INTERNAL_API_SECRET?.trim(),
    process.env.SHIPROCKET_WEBHOOK_SECRET?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  ].filter(Boolean) as string[];

  const url = new URL(request.url);
  const supplied = request.headers.get("x-zucero-secret")
    ?? request.headers.get("x-api-key")
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? url.searchParams.get("secret")
    ?? url.searchParams.get("token");

  if (supplied && secrets.includes(supplied)) {
    return true;
  }

  // Check Supabase session
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: () => {},
          },
        }
      );
      const { data: auth } = await supabase.auth.getUser();
      const merchantEmail = (process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com").toLowerCase();
      if (auth.user?.email && auth.user.email.toLowerCase() === merchantEmail) {
        return true;
      }
    }
  } catch {}

  return false;
}
