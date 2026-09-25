import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | Zucero",
  description: "Executive operations, orders management, and Supabase data exports for Zucero.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) redirect("/account?redirect=/admin");

  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  const { data } = await supabase.auth.getUser();
  const merchantEmail = (process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com").toLowerCase();

  if (data.user?.email?.toLowerCase() !== merchantEmail) {
    redirect("/account?redirect=/admin");
  }

  return (
    <main className="store-page">
      <StoreHeader />
      <AdminDashboard />
      <SiteFooter />
    </main>
  );
}
