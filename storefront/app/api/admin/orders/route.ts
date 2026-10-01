import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { cancelShiprocketShipments } from "@/lib/shiprocket";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AdminOrderRecord = {
  id: string;
  order_number: string;
  created_at: string;
  updated_at?: string | null;
  status: string;
  payment_status: string;
  total_paise: number;
  subtotal_paise: number;
  tax_paise: number;
  shipping_paise: number;
  discount_paise?: number;
  wallet_spent_paise?: number;
  customer_email: string;
  customer_phone: string;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  tracking_awb: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  estimated_delivery_window: string | null;
  razorpay_payment_id: string | null;
  shiprocket_order_id?: string | null;
  shiprocket_shipment_id?: string | null;
  shipping_status?: string | null;
  shipping_status_updated_at?: string | null;
  shipment_status?: string | null;
  shipment_status_updated_at?: string | null;
  shiprocket_clone_count?: number | null;
  shiprocket_cloned_at?: string | null;
  last_shiprocket_sync_at?: string | null;
  shiprocket_sync_error?: string | null;
  admin_archived_at?: string | null;
  admin_archived_reason?: string | null;
};

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const status = url.searchParams.get("status")?.trim().toLowerCase() || "all";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 5), 100);
    const requestedPage = Math.max(Number(url.searchParams.get("page") || 1), 1);
    const offset = (requestedPage - 1) * limit;

    let query = db
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status === "archived") {
      query = query.not("admin_archived_at", "is", null);
    } else {
      query = query.is("admin_archived_at", null);
      if (status === "paid") {
        query = query.or("status.eq.paid,payment_status.eq.captured");
      } else if (status === "shipped") {
        query = query.in("status", ["shipped", "out_for_delivery"]);
      } else if (status === "pending") {
        query = query.in("status", ["pending_payment", "processing"]);
      } else if (status === "exception") {
        query = query.in("status", ["delivery_exception", "rto"]);
      } else if (status !== "all") {
        query = query.eq("status", status);
      }
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,shipping_address->>fullName.ilike.%${search}%,tracking_awb.ilike.%${search}%,courier_name.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, count, error } = await query;
    if (error) throw error;

    const orderList = ((orders as unknown as AdminOrderRecord[]) || []);
    const orderIds = orderList.map((order) => order.id);

    const itemsByOrder = new Map<
      string,
      Array<{
        product_name: string;
        variant_label: string;
        quantity: number;
        unit_price_paise: number;
        line_total_paise: number;
      }>
    >();

    if (orderIds.length) {
      const { data: items, error: itemsError } = await db
        .from("order_items")
        .select("order_id, product_name, variant_label, quantity, unit_price_paise, line_total_paise")
        .in("order_id", orderIds);
      if (itemsError) throw itemsError;

      for (const item of items || []) {
        const existing = itemsByOrder.get(item.order_id) || [];
        existing.push(item);
        itemsByOrder.set(item.order_id, existing);
      }
    }

    const formatted = orderList.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      updatedAt: order.updated_at || null,
      status: order.status,
      paymentStatus: order.payment_status,
      totalPaise: order.total_paise,
      totalRupees: (order.total_paise / 100).toFixed(2),
      subtotalRupees: (order.subtotal_paise / 100).toFixed(2),
      taxRupees: (order.tax_paise / 100).toFixed(2),
      shippingRupees: (order.shipping_paise / 100).toFixed(2),
      discountRupees: ((order.discount_paise || 0) / 100).toFixed(2),
      walletSpentRupees: ((order.wallet_spent_paise || 0) / 100).toFixed(2),
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address,
      trackingAwb: order.tracking_awb,
      courierName: order.courier_name,
      trackingUrl: order.tracking_url,
      estimatedDeliveryWindow: order.estimated_delivery_window,
      razorpayPaymentId: order.razorpay_payment_id,
      shiprocketOrderId: order.shiprocket_order_id || null,
      shiprocketShipmentId: order.shiprocket_shipment_id || null,
      shipmentStatus: order.shipping_status || order.shipment_status || null,
      shipmentStatusUpdatedAt: order.shipping_status_updated_at || order.shipment_status_updated_at || null,
      shiprocketCloneCount: Number(order.shiprocket_clone_count || 0),
      shiprocketClonedAt: order.shiprocket_cloned_at || null,
      lastShiprocketSyncAt: order.last_shiprocket_sync_at || null,
      shiprocketSyncError: order.shiprocket_sync_error || null,
      adminArchivedAt: order.admin_archived_at || null,
      adminArchivedReason: order.admin_archived_reason || null,
      items: itemsByOrder.get(order.id) || [],
    }));

    const totalCount = count ?? formatted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(requestedPage, totalPages);

    return NextResponse.json({
      orders: formatted,
      pagination: {
        currentPage,
        pageSize: limit,
        totalCount,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
      },
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Admin orders query failed:", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = z.object({
      orderId: z.string().uuid(),
      reason: z.string().trim().max(300).optional(),
    }).parse(await request.json());

    const db = supabaseAdmin();
    const { data: order, error } = await db
      .from("orders")
      .select("*")
      .eq("id", input.orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.admin_archived_at) {
      return NextResponse.json({ ok: true, alreadyArchived: true });
    }

    let shiprocketCancellation: "not_needed" | "cancelled" | "failed" = "not_needed";
    let shiprocketCancellationError: string | null = null;

    if (
      order.tracking_awb &&
      !["delivered", "cancelled", "refunded"].includes(String(order.status || "").toLowerCase())
    ) {
      try {
        await cancelShiprocketShipments([String(order.tracking_awb)]);
        shiprocketCancellation = "cancelled";
      } catch (cancelError) {
        shiprocketCancellation = "failed";
        shiprocketCancellationError = cancelError instanceof Error
          ? cancelError.message
          : "Shiprocket cancellation failed";
      }
    }

    const canMarkCancelled =
      shiprocketCancellation === "cancelled" ||
      !order.tracking_awb ||
      ["pending_payment", "paid", "processing", "payment_failed"].includes(String(order.status || "").toLowerCase());

    const now = new Date().toISOString();
    const reason = input.reason || "Cancelled / removed by Zucero admin";
    const update: Record<string, unknown> = {
      admin_archived_at: now,
      admin_archived_reason: reason,
      updated_at: now,
    };

    if (canMarkCancelled) {
      update.status = "cancelled";
      const cancellationStatus = shiprocketCancellation === "cancelled"
        ? "Cancelled in Shiprocket by Zucero"
        : "Cancelled by Zucero";
      update.shipping_status = cancellationStatus;
      update.shipping_status_updated_at = now;
      update.shipment_status = cancellationStatus;
      update.shipment_status_updated_at = now;
    }

    if (shiprocketCancellationError) {
      update.shiprocket_sync_error = shiprocketCancellationError.slice(0, 500);
      update.last_shiprocket_sync_at = now;
    }

    const { error: updateError } = await db
      .from("orders")
      .update(update)
      .eq("id", input.orderId);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      archived: true,
      orderNumber: order.order_number,
      status: canMarkCancelled ? "cancelled" : order.status,
      shiprocketCancellation,
      shiprocketCancellationError,
      message: shiprocketCancellation === "failed"
        ? "Order was archived locally, but Shiprocket could not cancel the active shipment. Live courier status remains authoritative."
        : "Order cancelled/archived successfully.",
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Invalid order archive request."
      : error instanceof Error
        ? error.message
        : "Could not archive the order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
