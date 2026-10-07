import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const feedbackSchema = z.object({
  orderNumber: z.string().trim().min(3).max(80),
  contact: z.string().trim().min(5).max(160),
  displayName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1200),
  consent: z.literal("true"),
});

function normalizeOrderNumber(value: string) {
  return value.trim().replace(/^#/, "").toUpperCase();
}

function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function phoneMatches(left: unknown, right: unknown) {
  const a = digits(left);
  const b = digits(right);
  if (a.length < 10 || b.length < 10) return false;
  return a.slice(-10) === b.slice(-10);
}

function emailMatches(left: unknown, right: unknown) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function isAllowedImage(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "image/webp") {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return bytes.length >= 12 && riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("reviews")
      .select("id,rating,body,display_name,image_urls,verified_purchase,published_at,created_at")
      .eq("approved", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw error;

    return NextResponse.json(
      { reviews: data || [] },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    console.error("Public reviews fetch failed:", error);
    return NextResponse.json({ reviews: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const db = supabaseAdmin();
  const uploadedPaths: string[] = [];

  try {
    const form = await request.formData();
    const input = feedbackSchema.parse({
      orderNumber: form.get("orderNumber"),
      contact: form.get("contact"),
      displayName: form.get("displayName"),
      rating: form.get("rating"),
      body: form.get("body"),
      consent: form.get("consent"),
    });

    const orderNumber = normalizeOrderNumber(input.orderNumber);
    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id,user_id,order_number,status,customer_email,customer_phone,shipping_address")
      .ilike("order_number", orderNumber)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order || order.status !== "delivered") {
      return NextResponse.json(
        { error: "We could not verify a delivered Zucero order with these details." },
        { status: 400 }
      );
    }

    const shippingAddress = (order.shipping_address || {}) as Record<string, unknown>;
    const contactVerified =
      emailMatches(input.contact, order.customer_email) ||
      phoneMatches(input.contact, order.customer_phone) ||
      phoneMatches(input.contact, shippingAddress.phone);

    if (!contactVerified) {
      return NextResponse.json(
        { error: "The email or mobile number does not match this order." },
        { status: 400 }
      );
    }

    const { data: item, error: itemError } = await db
      .from("order_items")
      .select("id,product_name")
      .eq("order_id", order.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) {
      return NextResponse.json({ error: "We could not find the items for this order." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await db
      .from("reviews")
      .select("id")
      .or("order_id.eq." + order.id + ",order_item_id.eq." + item.id)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json(
        { error: "A review has already been submitted for this order. Thank you for sharing your experience." },
        { status: 409 }
      );
    }

    const images = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: "Please upload no more than 3 images." }, { status: 400 });
    }

    const imageUrls: string[] = [];
    for (const file of images) {
      if (!MIME_EXTENSION[file.type] || file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Images must be JPG, PNG or WEBP and no larger than 5 MB each." },
          { status: 400 }
        );
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isAllowedImage(bytes, file.type)) {
        return NextResponse.json({ error: "One of the uploaded files is not a valid image." }, { status: 400 });
      }

      const path = order.id + "/" + crypto.randomUUID() + "." + MIME_EXTENSION[file.type];
      const { error: uploadError } = await db.storage
        .from("review-images")
        .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);

      const { data: publicData } = db.storage.from("review-images").getPublicUrl(path);
      imageUrls.push(publicData.publicUrl);
    }

    const now = new Date().toISOString();
    const { data: review, error: reviewError } = await db
      .from("reviews")
      .insert({
        order_item_id: item.id,
        order_id: order.id,
        user_id: order.user_id || null,
        rating: input.rating,
        body: input.body,
        display_name: input.displayName,
        approved: true,
        verified_purchase: true,
        source: "whatsapp_feedback",
        published_at: now,
        image_urls: imageUrls,
        updated_at: now,
      })
      .select("id")
      .single();

    if (reviewError) throw reviewError;

    return NextResponse.json({
      ok: true,
      reviewId: review.id,
      message: "Thank you. Your verified review is now live on Zucero.",
    });
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await db.storage.from("review-images").remove(uploadedPaths);
      } catch {}
    }

    const message = error instanceof z.ZodError
      ? "Please complete all required fields and write at least 10 characters."
      : error instanceof Error
        ? error.message
        : "Could not submit your review.";

    console.error("Feedback submission failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
