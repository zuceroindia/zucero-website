import { NextResponse } from "next/server";
import { ensureOutboundWhatsAppFeedbackTemplate } from "@/lib/whatsapp-outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await ensureOutboundWhatsAppFeedbackTemplate();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
