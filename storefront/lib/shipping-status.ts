type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as AnyRecord
    : {};
}

function text(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized || null;
  }
  return null;
}

export type LocalOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rto"
  | "delivery_exception"
  | "refunded"
  | "payment_failed";

export function mapShiprocketStatus(rawStatus: unknown, hasAwb = false): LocalOrderStatus {
  const raw = String(rawStatus ?? "").trim().toLowerCase();

  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("delivered")) return "delivered";
  if (raw.includes("out for delivery") || raw.includes("out_for_delivery")) return "out_for_delivery";
  if (
    raw.includes("rto") ||
    raw.includes("return to origin") ||
    raw.includes("returned to origin") ||
    raw.includes("return initiated")
  ) {
    return "rto";
  }
  if (
    raw.includes("ndr") ||
    raw.includes("undelivered") ||
    raw.includes("delivery exception") ||
    raw.includes("exception") ||
    raw.includes("failed delivery") ||
    raw.includes("lost") ||
    raw.includes("damaged")
  ) {
    return "delivery_exception";
  }
  if (
    raw.includes("shipped") ||
    raw.includes("in transit") ||
    raw.includes("in_transit") ||
    raw.includes("picked") ||
    raw.includes("pickup") ||
    raw.includes("manifest") ||
    raw.includes("handover")
  ) {
    return "shipped";
  }
  if (raw.includes("ready to ship") || raw.includes("awb assigned") || hasAwb) {
    return "processing";
  }
  return "processing";
}

export function displayShippingStatus(value: unknown): string {
  const normalized = String(value ?? "Processing").replaceAll("_", " ").trim();
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type ShiprocketSnapshot = {
  rawStatus: string | null;
  awb: string | null;
  courier: string | null;
  trackingUrl: string | null;
  edd: string | null;
  shipmentId: string | null;
  shiprocketOrderId: string | null;
};

export function extractShiprocketSnapshot(payload: unknown): ShiprocketSnapshot {
  const root = record(payload);
  const data = record(root.data);
  const source = Object.keys(data).length ? data : root;
  const shipments = Array.isArray(source.shipments)
    ? source.shipments.map(record)
    : [record(source.shipment)];
  const latest = shipments.find((item) => Object.keys(item).length > 0) ?? {};

  const rawStatus = text(
    latest.current_status ??
      latest.shipment_status ??
      latest.status ??
      source.current_status ??
      source.shipment_status ??
      source.status ??
      root.current_status ??
      root.shipment_status ??
      root.status
  );

  const awb = text(
    latest.awb ??
      latest.awb_code ??
      source.awb ??
      source.awb_code ??
      root.awb ??
      root.awb_code
  );

  const courier = text(
    latest.courier ??
      latest.courier_name ??
      latest.courier_company_name ??
      source.courier ??
      source.courier_name ??
      source.courier_company_name
  );

  const trackingUrl = text(
    latest.tracking_url ??
      latest.track_url ??
      source.tracking_url ??
      source.track_url ??
      root.tracking_url ??
      root.track_url
  );

  const edd = text(
    latest.edd ??
      latest.expected_date ??
      latest.etd ??
      source.edd ??
      source.expected_date ??
      source.etd
  );

  const shipmentId = text(
    latest.id ??
      latest.shipment_id ??
      source.shipment_id ??
      root.shipment_id
  );

  const shiprocketOrderId = text(
    source.id ??
      source.sr_order_id ??
      source.shiprocket_order_id ??
      root.sr_order_id ??
      root.shiprocket_order_id
  );

  return {
    rawStatus,
    awb,
    courier,
    trackingUrl,
    edd,
    shipmentId,
    shiprocketOrderId,
  };
}
