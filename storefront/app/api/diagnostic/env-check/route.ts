import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  return NextResponse.json({
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    hasResendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
    hasOrderNotificationEmail: Boolean(process.env.ORDER_NOTIFICATION_EMAIL),
    hasWhatsappToken: Boolean(process.env.WHATSAPP_API_TOKEN),
    hasWhatsappPhoneId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasWhatsappTemplate: Boolean(process.env.WHATSAPP_TEMPLATE_NAME),
    hasSupabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasShiprocketEmail: Boolean(process.env.SHIPROCKET_EMAIL),
    hasRazorpayKey: Boolean(process.env.RAZORPAY_KEY_ID),
    hasShiprocketWebhookSecret: Boolean(process.env.SHIPROCKET_WEBHOOK_SECRET),
  });
}
