import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyShipmentStatus } from "@/lib/notifications";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

const schema = z.object({
  awb: z.string().min(4).max(50),
  courierName: z.string().min(2).max(100).optional(),
  trackingUrl: z.string().url().optional(),
  status: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const isAuthorized = await isAuthorizedAdminOrInternal(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Admin or secret key required." }, { status: 401 });
    }

    const { orderId } = await params;
    const body = schema.parse(await request.json());
    const db = supabaseAdmin();

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("*")
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const courier = body.courierName?.trim() || "Express Courier";
    const trackingUrl = body.trackingUrl?.trim() || `https://shiprocket.co/tracking/${body.awb}`;
    const status = body.status?.trim() || "shipped";

    const { error: updateError } = await db
      .from("orders")
      .update({
        status,
        tracking_awb: body.awb,
        courier_name: courier,
        tracking_url: trackingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      throw new Error(`Failed to update order tracking: ${updateError.message}`);
    }

    // Trigger customer and merchant tracking notifications
    await notifyShipmentStatus(order.id, "Dispatched & In Transit").catch((err) => {
      console.error("Failed to send shipment dispatch notification:", err);
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.order_number,
      trackingAwb: body.awb,
      courierName: courier,
      trackingUrl,
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid tracking input. Please provide a valid AWB code."
      : error instanceof Error ? error.message : "Shipment update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
