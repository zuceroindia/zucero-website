import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureOutboundWhatsAppFeedbackTemplate } from "@/lib/whatsapp-outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("key")?.trim();
  if (!raw) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const digest = createHash("sha256").update(raw).digest("hex");
  if (digest !== "45ae37755da6868c4e07668b8a8da99296502a23cf19a7e39f249c09503c0fd4") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureOutboundWhatsAppFeedbackTemplate();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
