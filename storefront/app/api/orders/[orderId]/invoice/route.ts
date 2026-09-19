import { NextResponse } from "next/server";
import { generateInvoiceForOrder } from "@/lib/invoice";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const { buffer, invoiceNumber } = await generateInvoiceForOrder(orderId);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    const message = error instanceof Error ? error.message : "Could not generate invoice";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
