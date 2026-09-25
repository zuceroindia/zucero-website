import { NextResponse } from "next/server";
import { isAuthorizedCmsRequest } from "@/lib/squargraph-control-cms-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowedExtensions = new Set(["woff2", "woff", "ttf", "otf"]);

export async function POST(request: Request) {
  if (!(await isAuthorizedCmsRequest(request, "media"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No font file provided." }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Font file must be under 8MB." }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) {
      return NextResponse.json({ error: "Upload a WOFF2, WOFF, TTF, or OTF font file." }, { status: 400 });
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `fonts/${Date.now()}-${cleanName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const db = supabaseAdmin();

    const contentType =
      extension === "woff2" ? "font/woff2" :
      extension === "woff" ? "font/woff" :
      extension === "ttf" ? "font/ttf" :
      "font/otf";

    const { error: uploadError } = await db.storage.from("site-cms").upload(filePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

    if (uploadError) {
      return NextResponse.json({ error: `Font upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data } = db.storage.from("site-cms").getPublicUrl(filePath);
    const familyName = cleanName.replace(/\.(woff2|woff|ttf|otf)$/i, "").replace(/[-_]+/g, " ").trim();

    return NextResponse.json({
      ok: true,
      success: true,
      publicUrl: data.publicUrl,
      url: data.publicUrl,
      name: familyName || "Custom Font",
      format: extension,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Font upload failed." },
      { status: 500 }
    );
  }
}
