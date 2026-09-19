import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    resendKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 6) : null,
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? null,
    orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL ?? null,
    hasWhatsappToken: Boolean(process.env.WHATSAPP_API_TOKEN),
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
    whatsappTemplate: process.env.WHATSAPP_TEMPLATE_NAME ?? null,
    hasSupabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasShiprocketEmail: Boolean(process.env.SHIPROCKET_EMAIL),
    hasRazorpayKey: Boolean(process.env.RAZORPAY_KEY_ID),
    shiprocketWebhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET ?? null,
  });
}
