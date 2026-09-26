import { supabaseAdmin } from "@/lib/supabase-admin";

export type DiscountCoupon = {
  id: string;
  code: string;
  percentage: number;
  active: boolean;
  createdAt: string;
};

const BUCKET_NAME = "site-admin";
const COUPONS_PATH = "discount-coupons.json";

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

async function ensurePrivateBucket() {
  const db = supabaseAdmin();
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) throw new Error(error.message);

  if (!buckets?.some((bucket: { name: string }) => bucket.name === BUCKET_NAME)) {
    const { error: createError } = await db.storage.createBucket(BUCKET_NAME, { public: false });
    if (createError && !createError.message.toLowerCase().includes("already")) {
      throw new Error(createError.message);
    }
  }
}

export async function getDiscountCoupons(): Promise<DiscountCoupon[]> {
  await ensurePrivateBucket();
  const db = supabaseAdmin();
  const { data, error } = await db.storage.from(BUCKET_NAME).download(COUPONS_PATH);

  if (error) {
    if (
      error.message.toLowerCase().includes("not found") ||
      error.message.toLowerCase().includes("object not found")
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  if (!data) return [];

  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDiscountCoupons(coupons: DiscountCoupon[]) {
  await ensurePrivateBucket();
  const db = supabaseAdmin();
  const payload = Buffer.from(JSON.stringify(coupons, null, 2), "utf-8");
  const { error } = await db.storage.from(BUCKET_NAME).upload(COUPONS_PATH, payload, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
  if (error) throw new Error(error.message);
}

export async function createDiscountCoupon(input: { code: string; percentage: number }) {
  const code = normalizeCode(input.code);
  const percentage = Math.round(Number(input.percentage));

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    throw new Error("Coupon code must be 3–40 characters and use only letters, numbers, hyphens or underscores.");
  }
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
    throw new Error("Discount percentage must be between 1 and 100.");
  }

  const coupons = await getDiscountCoupons();
  if (coupons.some((coupon) => coupon.code === code)) {
    throw new Error("A coupon with this code already exists.");
  }

  const coupon: DiscountCoupon = {
    id: `coupon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    code,
    percentage,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await saveDiscountCoupons([coupon, ...coupons]);
  return coupon;
}

export async function setDiscountCouponActive(id: string, active: boolean) {
  const coupons = await getDiscountCoupons();
  const index = coupons.findIndex((coupon) => coupon.id === id);
  if (index === -1) throw new Error("Coupon not found.");

  coupons[index] = { ...coupons[index], active };
  await saveDiscountCoupons(coupons);
  return coupons[index];
}

export async function deleteDiscountCoupon(id: string) {
  const coupons = await getDiscountCoupons();
  const next = coupons.filter((coupon) => coupon.id !== id);
  if (next.length === coupons.length) throw new Error("Coupon not found.");
  await saveDiscountCoupons(next);
}

export async function validateDiscountCoupon(codeInput: string) {
  const code = normalizeCode(codeInput);
  if (!code) return { valid: false as const, error: "Please enter a coupon code." };

  const coupons = await getDiscountCoupons();
  const coupon = coupons.find((item) => item.code === code);

  if (!coupon || !coupon.active) {
    return { valid: false as const, error: "This discount code is not valid or is no longer active." };
  }

  return {
    valid: true as const,
    code: coupon.code,
    percentage: coupon.percentage,
  };
}
