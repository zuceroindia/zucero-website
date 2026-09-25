import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";
import { getLiveCMSConfig, getCMSCommits, saveLiveCMSConfig, type CMSConfig } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [config, commits] = await Promise.all([getLiveCMSConfig(), getCMSCommits()]);
    return NextResponse.json({ ok: true, config, commits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load CMS data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorizedAdminOrInternal(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      config?: CMSConfig;
      commitMessage?: string;
    };

    if (!body?.config) {
      return NextResponse.json({ error: "Missing config payload" }, { status: 400 });
    }

    const { config, commits } = await saveLiveCMSConfig(
      body.config,
      body.commitMessage || "Updated live website via Admin CMS",
      process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com"
    );

    // Revalidate all public pages so changes reflect immediately on the live website
    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/products/desi-khand");
      revalidatePath("/products/dhage-wali-mishri");
      revalidatePath("/cart");
      revalidatePath("/checkout");
    } catch {
      // Ignore revalidation errors in non-standard contexts
    }

    return NextResponse.json({ ok: true, config, commits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save CMS config" },
      { status: 500 }
    );
  }
}
