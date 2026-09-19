import { z } from "zod";

const API_BASE = "https://apiv2.shiprocket.in/v1/external";
let cachedToken: { value: string; expiresAt: number } | null = null;

export type ShippingQuote = {
  shippingPaise: number;
  courierCompanyId: number | null;
  courierName: string;
  chargeWeightKg: number;
  estimatedDeliveryDate?: string | null;
  estimatedDeliveryDays?: number | null;
  deliveryWindowText: string;
};

function credentials() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new Error("Shiprocket API credentials are not configured");
  return { email, password };
}

async function token() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(credentials()), cache: "no-store" });
  if (!response.ok) throw new Error(`Shiprocket authentication failed (${response.status})`);
  const parsed = z.object({ token: z.string().min(20) }).parse(await response.json());
  cachedToken = { value: parsed.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return parsed.token;
}

async function shiprocketFetch(path: string, init?: RequestInit) {
  const authToken = await token();
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { authorization: `Bearer ${authToken}`, "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error(`Shiprocket request failed (${response.status})`);
  return response.json();
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function courierRateRupees(option: Record<string, unknown>) {
  const rate = option.rate;
  if (rate && typeof rate === "object") {
    const rateObject = rate as Record<string, unknown>;
    const nested = numeric(rateObject.total) ?? numeric(rateObject.rate);
    if (nested !== null && nested > 0) return nested;
  }
  const direct = numeric(rate);
  if (direct !== null && direct > 0) return direct;

  const freight = numeric(option.freight_charge);
  if (freight === null || freight <= 0) return null;
  const other = numeric(option.other_charges) ?? 0;
  const coverage = numeric(option.coverage_charges) ?? 0;
  return freight + other + coverage;
}

export async function getShippingOptions(input: { pickupPostcode: string; deliveryPostcode: string; weightKg: number; cod?: boolean }) {
  const params = new URLSearchParams({ pickup_postcode: input.pickupPostcode, delivery_postcode: input.deliveryPostcode, weight: input.weightKg.toFixed(3), cod: input.cod ? "1" : "0" });
  return shiprocketFetch(`/courier/serviceability/?${params}`);
}

export function formatAccurateEdd(rawDate: unknown): string | null {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  if (str.toLowerCase().startsWith("expected by")) {
    return str;
  }

  const parsed = new Date(str.replace(/-/g, "/"));
  if (!isNaN(parsed.getTime())) {
    return `Expected by ${parsed.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return `Expected by ${fallback.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
  }

  return `Expected by ${str}`;
}

export function getFallbackDeliveryEstimate(destinationState?: string, baseDate = new Date()): { minDays: number; maxDays: number; windowText: string } {
  const minDays = 5;
  const maxDays = 7;

  return {
    minDays,
    maxDays,
    windowText: "5–7 days",
  };
}

export function selectPrepaidShippingQuote(result: unknown, fallbackWeightKg: number, destinationState?: string): ShippingQuote | null {
  if (!result || typeof result !== "object") return null;
  const data = (result as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return null;
  const dataObject = data as Record<string, unknown>;
  const companies = Array.isArray(dataObject.available_courier_companies) ? dataObject.available_courier_companies : [];

  const candidates = companies.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const option = entry as Record<string, unknown>;
    const rateRupees = courierRateRupees(option);
    if (rateRupees === null || rateRupees <= 0) return [];
    const etdString = typeof option.etd === "string" && option.etd.trim() ? option.etd.trim() : null;
    const etdDays = numeric(option.estimated_delivery_days) ?? (numeric(option.etd_hours) ? Math.max(1, Math.round(Number(option.etd_hours) / 24)) : null);
    return [{
      rateRupees,
      courierCompanyId: numeric(option.courier_company_id),
      courierName: typeof option.courier_name === "string" ? option.courier_name : "Shiprocket courier",
      chargeWeightKg: numeric(option.charge_weight) ?? fallbackWeightKg,
      etdString,
      etdDays,
    }];
  });

  if (!candidates.length) return null;

  const recommendedId = numeric(dataObject.recommended_courier_company_id) ?? numeric(dataObject.shiprocket_recommended_courier_id);
  const recommended = recommendedId === null ? null : candidates.find((item) => item.courierCompanyId === recommendedId) ?? null;
  const selected = recommended ?? candidates.reduce((best, item) => item.rateRupees < best.rateRupees ? item : best);

  // Standard estimated delivery time before order shipment is 5–7 days
  const windowText = "5–7 days";

  return {
    shippingPaise: Math.max(1, Math.round(selected.rateRupees * 100)),
    courierCompanyId: selected.courierCompanyId === null ? null : Math.round(selected.courierCompanyId),
    courierName: selected.courierName,
    chargeWeightKg: selected.chargeWeightKg,
    estimatedDeliveryDate: selected.etdString,
    estimatedDeliveryDays: 7,
    deliveryWindowText: windowText,
  };
}

export function getFallbackShippingQuote(totalWeightGrams: number, destinationState?: string): ShippingQuote {
  const normState = (destinationState ?? "").trim().toLowerCase();
  let basePaise = 11000; // Rest of India ₹110.00
  if (["haryana", "delhi", "chandigarh"].includes(normState)) {
    basePaise = 7500; // NCR / Haryana ₹75.00
  } else if (["punjab", "uttar pradesh", "rajasthan", "himachal pradesh", "uttarakhand"].includes(normState)) {
    basePaise = 9000; // North India ₹90.00
  }

  // Weight surcharge beyond 1kg: ₹35 per additional 500g
  const extraKg = Math.max(0, (totalWeightGrams - 1000) / 1000);
  const extraPaise = Math.ceil(extraKg * 2) * 3500;
  const shippingPaise = basePaise + extraPaise;
  const delivery = getFallbackDeliveryEstimate(destinationState);

  return {
    shippingPaise,
    courierCompanyId: null,
    courierName: "Insured Express Delivery",
    chargeWeightKg: Math.max(0.5, Number((totalWeightGrams / 1000).toFixed(2))),
    estimatedDeliveryDate: null,
    estimatedDeliveryDays: delivery.maxDays,
    deliveryWindowText: delivery.windowText,
  };
}

export async function getPrepaidShippingQuote(input: { pickupPostcode: string; deliveryPostcode: string; weightKg: number; destinationState?: string }): Promise<ShippingQuote> {
  const billableWeightKg = Math.max(0.5, input.weightKg);
  try {
    const result = await getShippingOptions({ ...input, weightKg: billableWeightKg, cod: false });
    const quote = selectPrepaidShippingQuote(result, billableWeightKg, input.destinationState);
    if (quote) return quote;
  } catch (err) {
    console.warn("[Shiprocket] Live rate fetch failed, using reliable fallback quote:", err);
  }
  return getFallbackShippingQuote(Math.round(billableWeightKg * 1000), input.destinationState);
}

export async function createShiprocketOrder(payload: Record<string, unknown>) {
  return shiprocketFetch("/orders/create/adhoc", { method: "POST", body: JSON.stringify(payload) });
}

export async function trackAwb(awb: string) {
  if (!/^\d{6,30}$/.test(awb)) throw new Error("Invalid AWB");
  return shiprocketFetch(`/courier/track/awb/${awb}`);
}
