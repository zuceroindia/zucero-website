import { NextResponse } from "next/server";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files (PNG, JPG, WebP, AVIF) are allowed" }, { status: 400 });
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size must be under 10MB" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `uploads/${Date.now()}-${cleanName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage.from("site-cms").upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "31536000",
    });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicData } = db.storage.from("site-cms").getPublicUrl(filePath);

    return NextResponse.json({
      ok: true,
      url: publicData.publicUrl,
      fileName: cleanName,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}
