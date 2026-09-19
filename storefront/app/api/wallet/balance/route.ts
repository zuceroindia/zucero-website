import { NextResponse } from "next/server";
import { getWalletInfo } from "@/lib/referral";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      const empty = {
        balancePaise: 0,
        balanceRupees: 0,
        earnedReferralPaise: 0,
        earnedReferralRupees: 0,
        manualTopupPaise: 0,
        manualTopupRupees: 0,
        spentOrdersPaise: 0,
        spentOrdersRupees: 0,
        transactions: [],
      };
      return NextResponse.json({ ...empty, wallet: empty });
    }

    const info = await getWalletInfo(email);
    return NextResponse.json({
      ...info,
      wallet: info,
    });
  } catch (error) {
    console.error("Wallet balance query failed:", error);
    const empty = {
      balancePaise: 0,
      balanceRupees: 0,
      earnedReferralPaise: 0,
      earnedReferralRupees: 0,
      manualTopupPaise: 0,
      manualTopupRupees: 0,
      spentOrdersPaise: 0,
      spentOrdersRupees: 0,
      transactions: [],
    };
    return NextResponse.json({ ...empty, wallet: empty });
  }
}
