import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeZuceroCmsRequest } from "@/lib/squargraph-control-auth";
import {
  getLiveCMSConfig,
  getCMSCommits,
  saveLiveCMSConfig,
  rollbackCMSCommit,
  type CMSConfig,
} from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await authorizeZuceroCmsRequest(request, "read");
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.reason || "Unauthorized", code: "SITE_CONTROL_ACCESS_DENIED" },
      { status: access.status }
    );
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
  const access = await authorizeZuceroCmsRequest(request, "publish");
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.reason || "Publishing unavailable", code: "SITE_CONTROL_ACCESS_DENIED" },
      { status: access.status }
    );
  }

  try {
    const body = (await request.json()) as {
      config?: CMSConfig;
      commitMessage?: string;
    };

    if (!body?.config) {
      return NextResponse.json({ error: "Missing config payload" }, { status: 400 });
    }

    const saveResult = await saveLiveCMSConfig(
      body.config,
      body.commitMessage || "Updated live website via Admin CMS",
      process.env.ORDER_NOTIFICATION_EMAIL || "zucero.thegoodsugar@gmail.com"
    );

    if (!saveResult.success) {
      return NextResponse.json({ error: saveResult.error || "Failed to save configuration" }, { status: 500 });
    }

    // Revalidate all public pages so changes reflect immediately on the live website
    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/products/desi-khand");
      revalidatePath("/products/dhage-wali-mishri");
      revalidatePath("/our-story");
      revalidatePath("/contact");
      revalidatePath("/shipping");
      revalidatePath("/returns");
      revalidatePath("/refunds");
      revalidatePath("/privacy");
      revalidatePath("/terms");
      revalidatePath("/guides/desi-khand");
      revalidatePath("/guides/sugar-alternatives");
      revalidatePath("/cart");
      revalidatePath("/checkout");
    } catch {
      // Ignore revalidation errors in non-standard contexts
    }

    const [savedConfig, commits] = await Promise.all([getLiveCMSConfig(), getCMSCommits()]);
    return NextResponse.json({ ok: true, success: true, commitId: saveResult.commitId, config: savedConfig, commits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save CMS config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const access = await authorizeZuceroCmsRequest(request, "publish");
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.reason || "Rollback unavailable", code: "SITE_CONTROL_ACCESS_DENIED" },
      { status: access.status }
    );
  }

  try {
    const { commitId } = (await request.json()) as { commitId?: string };
    if (!commitId) {
      return NextResponse.json({ error: "Missing commitId" }, { status: 400 });
    }

    const result = await rollbackCMSCommit(commitId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Rollback failed" }, { status: 500 });
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/cart");
      revalidatePath("/checkout");
    } catch {
      // ignore
    }

    const commits = await getCMSCommits();
    return NextResponse.json({ ok: true, success: true, config: result.config, commits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rollback error" },
      { status: 500 }
    );
  }
}
