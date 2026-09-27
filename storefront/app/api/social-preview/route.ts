import { getLiveCMSConfig } from "@/lib/cms";

export const dynamic = "force-dynamic";

function resolveAssetUrl(request: Request, value: string | undefined, fallback: string) {
  const selected = (value || fallback).trim();
  if (/^https?:\/\//i.test(selected)) return selected;
  const origin = new URL(request.url).origin;
  return new URL(selected.startsWith("/") ? selected : `/${selected}`, origin).toString();
}

export async function GET(request: Request) {
  const cms = await getLiveCMSConfig();
  const target = resolveAssetUrl(
    request,
    cms.branding?.socialShareImage,
    "/images/zucero-highres-logo.png"
  );

  const response = await fetch(target, { cache: "no-store" });
  if (!response.ok) {
    return new Response("Social preview image unavailable", { status: 404 });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
