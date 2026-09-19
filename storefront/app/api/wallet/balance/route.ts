import { NextResponse } from "next/server";
import { getWalletInfo } from "@/lib/referral";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ balancePaise: 0, balanceRupees: 0, transactions: [] });
    }

    const info = await getWalletInfo(email);
    return NextResponse.json(info);
  } catch (error) {
    console.error("Wallet balance query failed:", error);
    return NextResponse.json({ balancePaise: 0, balanceRupees: 0, transactions: [] });
  }
}
