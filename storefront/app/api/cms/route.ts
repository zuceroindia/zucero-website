import { NextResponse } from "next/server";
import { getLiveCMSConfig } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getLiveCMSConfig();
    return NextResponse.json({ ok: true, config }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load CMS config" },
      { status: 500 }
    );
  }
}
