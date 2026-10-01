import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Courier and AWB assignment is intentionally disabled on the Zucero website. Assign the shipment manually in Shiprocket, then use Refresh Live Shiprocket Status in Admin.",
      manualShiprocketOnly: true,
    },
    { status: 409 }
  );
}
