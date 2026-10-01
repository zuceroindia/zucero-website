import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized. Admin or secret key required." }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Manual AWB entry is disabled. Shipping must be assigned in Shiprocket; the Zucero website only syncs and displays Shiprocket tracking data.",
      manualShiprocketOnly: true,
    },
    { status: 409 }
  );
}
