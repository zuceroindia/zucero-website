import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { assignShiprocketAwb, formatAccurateEdd } from "@/lib/shiprocket";
import { extractShiprocketSnapshot } from "@/lib/shipping-status";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    if (!UUID_PATTERN.test(orderId)) {
      return NextResponse.json({ error: "Invalid order identifier" }, { status: 400 });
    }

    const body = z.object({
      courierId: z.number().int().positive().nullable().optional(),
      reassign: z.boolean().optional(),
    }).parse(await request.json().catch(() => ({})));

    const db = supabaseAdmin();
    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.shiprocket_shipment_id) {
      return NextResponse.json(
        { error: "This order does not have a Shiprocket shipment ID yet." },
        { status: 400 }
      );
    }

    const result = await assignShiprocketAwb({
      shipmentId: String(order.shiprocket_shipment_id),
      courierId: body.courierId ?? undefined,
      reassign: Boolean(body.reassign),
    });
    const snapshot = extractShiprocketSnapshot(result);
    const awb = snapshot.awb || order.tracking_awb;
    const courier = snapshot.courier || order.courier_name;
    const now = new Date().toISOString();
    const exactStatus = snapshot.rawStatus || (awb ? "AWB assigned · Ready to ship" : "Courier assignment requested");
    const accurateEdd = formatAccurateEdd(snapshot.edd);

    const { error: updateError } = await db
      .from("orders")
      .update({
        ...(awb ? {
          tracking_awb: awb,
          tracking_url: snapshot.trackingUrl || `https://shiprocket.co/tracking/${awb}`,
        } : {}),
        ...(courier ? { courier_name: courier } : {}),
        ...(accurateEdd ? { estimated_delivery_window: accurateEdd } : {}),
        shipping_status: exactStatus,
        shipping_status_updated_at: now,
        shipment_status: exactStatus,
        shipment_status_updated_at: now,
        last_shiprocket_sync_at: now,
        shiprocket_sync_error: null,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      awb: awb || null,
      courier: courier || null,
      shipmentId: order.shiprocket_shipment_id,
      message: awb
        ? "Courier assigned and AWB generated."
        : "Shiprocket accepted the assignment request. Refresh live status shortly.",
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid courier assignment request."
      : error instanceof Error
        ? error.message
        : "Could not assign shipping.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
