import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { AdminWhatsAppInbox } from "@/components/admin-whatsapp-inbox";

export const metadata: Metadata = {
  title: "WhatsApp Inbox | Zucero Admin",
  robots: { index: false, follow: false },
};

export default async function AdminWhatsAppPage() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) redirect("/account?redirect=/admin/whatsapp");

  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data } = await supabase.auth.getUser();
  const merchantEmail = (process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com").toLowerCase();
  if (data.user?.email?.toLowerCase() !== merchantEmail) redirect("/account?redirect=/admin/whatsapp");

  return (
    <div data-admin-page="true" style={{ background: "#ebe5d8", minHeight: "100vh" }}>
      <AdminHeader />
      <AdminWhatsAppInbox />
    </div>
  );
}
