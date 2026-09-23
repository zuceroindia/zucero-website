import { NextResponse } from "next/server";
import { getWalletInfo } from "@/lib/referral";
import { authenticatedEmail } from "@/lib/server-auth";

export async function GET() {
  try {
    const email = await authenticatedEmail();
    if (!email) return NextResponse.json({ error: "Please sign in to view wallet credits." }, { status: 401 });

    const info = await getWalletInfo(email);
    return NextResponse.json({
      ...info,
      wallet: info,
      email,
    });
  } catch (error) {
    console.error("Wallet balance query failed:", error);
    return NextResponse.json({ error: "Could not load wallet credits." }, { status: 500 });
  }
}
