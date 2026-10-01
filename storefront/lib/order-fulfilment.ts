import { products, resolveSku } from "@/lib/catalog";
import { createShiprocketOrder } from "@/lib/shiprocket";
import { supabaseAdmin } from "@/lib/supabase-admin";

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function phone10(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-10);
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" "),
  };
}

function catalogVariantBySku(sku: string) {
  const resolvedSku = resolveSku(sku);
  for (const product of products) {
    const variant = product.variants.find((item) => item.sku === resolvedSku);
    if (variant) return { product, variant };
  }
  return null;
}

type FulfilmentItem = {
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_paise: number;
};

export async function fulfilPaidOrder(orderId: string) {
  const db = supabaseAdmin();

  const { data: existing, error: existingError } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (existingError || !existing) throw new Error("Order not found for fulfilment");
  if (existing.shiprocket_order_id) return { fulfilled: true, alreadyCreated: true };
  if (existing.payment_status !== "captured") return { fulfilled: false, reason: "payment_not_captured" };

  const { data: claimed, error: claimError } = await db
    .from("orders")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "paid")
    .eq("payment_status", "captured")
    .is("shiprocket_order_id", null)
    .select("*")
    .maybeSingle();
  if (claimError) throw new Error("Could not claim order for fulfilment");
  if (!claimed) return { fulfilled: false, reason: "already_processing" };

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (itemsError || !items?.length) {
    await db.from("orders").update({ status: "paid" }).eq("id", orderId);
    throw new Error("Order items missing for fulfilment");
  }

  const address = claimed.shipping_address as {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  const { firstName, lastName } = splitName(address.fullName);
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  if (!pickupLocation) throw new Error("Shiprocket pickup location is not configured");

  const fulfilmentItems = items as FulfilmentItem[];
  const packageWeightGrams = fulfilmentItems.reduce((total: number, item) => {
    const match = catalogVariantBySku(item.sku);
    return total + (match?.variant.packedWeightGrams ?? match?.variant.weightGrams ?? 0) * item.quantity;
  }, 0);

  const payload = {
    order_id: claimed.order_number,
    order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    pickup_location: pickupLocation,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: address.addressLine1,
    billing_address_2: address.addressLine2 || "",
    billing_city: address.city,
    billing_pincode: address.postalCode,
    billing_state: address.state,
    billing_country: "India",
    billing_email: claimed.customer_email,
    billing_phone: phone10(claimed.customer_phone),
    shipping_is_billing: true,
    order_items: fulfilmentItems.map((item) => {
      const match = catalogVariantBySku(item.sku);
      return {
        name: item.product_name,
        sku: item.sku,
        units: item.quantity,
        selling_price: item.unit_price_paise / 100,
        discount: 0,
        tax: 5,
        hsn: match?.variant.hsn ?? "1701",
      };
    }),
    payment_method: "Prepaid",
    shipping_charges: claimed.shipping_paise / 100,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: claimed.discount_paise / 100,
    sub_total: claimed.subtotal_paise / 100,
    length: positiveNumber(process.env.SHIPROCKET_DEFAULT_LENGTH_CM, 20),
    breadth: positiveNumber(process.env.SHIPROCKET_DEFAULT_BREADTH_CM, 15),
    height: positiveNumber(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM, 12),
    weight: Math.max(0.5, packageWeightGrams / 1000),
  };

  const reservationKey = `shiprocket-create:${orderId}`;
  const { error: reservationError } = await db.from("payment_events").insert({
    provider: "internal",
    provider_event_id: reservationKey,
    event_type: "shiprocket.order_create_reserved",
    payload: { order_id: orderId, order_number: claimed.order_number },
    processed_at: new Date().toISOString(),
  });

  if (reservationError) {
    if (reservationError.code === "23505") {
      return { fulfilled: false, reason: "already_processing" };
    }
    throw new Error(`Could not reserve Shiprocket order creation: ${reservationError.message}`);
  }

  try {
    const shiprocket = await createShiprocketOrder(payload) as { order_id?: number | string; shipment_id?: number | string };
    if (!shiprocket.order_id) throw new Error("Shiprocket did not return an order ID");
    const shiprocketOrderId = String(shiprocket.order_id);
    const shipmentId = shiprocket.shipment_id ? String(shiprocket.shipment_id) : null;
    const createdAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("orders")
      .update({
        shiprocket_order_id: shiprocketOrderId,
        shiprocket_shipment_id: shipmentId,
        status: "processing",
        shipping_status: "Shiprocket order created",
        shipping_status_updated_at: createdAt,
        shipment_status: "Shiprocket order created",
        shipment_status_updated_at: createdAt,
        last_shiprocket_sync_at: createdAt,
        shiprocket_sync_error: null,
        updated_at: createdAt,
      })
      .eq("id", orderId);
    if (updateError) throw new Error("Could not save Shiprocket order IDs");

    await db.from("payment_events")
      .update({
        event_type: "shiprocket.order_created",
        payload: {
          order_id: orderId,
          order_number: claimed.order_number,
          shiprocket_order_id: shiprocketOrderId,
          shiprocket_shipment_id: shipmentId,
        },
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "internal")
      .eq("provider_event_id", reservationKey);

    // Deliberately stop after creating the Shiprocket order.
    // Courier/AWB assignment is an explicit merchant action inside Shiprocket.
    // The Zucero website remains read-only for shipment assignment and only syncs status.
    return { fulfilled: true, shiprocketOrderId, shipmentId, awbAssigned: false };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Shiprocket order creation failed";
    // Keep the reservation on an ambiguous external API failure. This is safer than
    // automatically retrying and creating a duplicate Shiprocket order.
    await db.from("payment_events")
      .update({
        event_type: "shiprocket.order_create_uncertain",
        payload: { order_id: orderId, order_number: claimed.order_number, error: detail },
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "internal")
      .eq("provider_event_id", reservationKey);
    await db.from("orders").update({
      status: "processing",
      shiprocket_sync_error: detail.slice(0, 500),
      last_shiprocket_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
    throw error;
  }
}
