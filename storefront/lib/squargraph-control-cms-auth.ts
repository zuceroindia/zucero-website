import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

export type SquargraphCmsFeature = "read" | "publish" | "media";

const CONTROL_SUPABASE_URL =
  process.env.SQUARGRAPH_CONTROL_SUPABASE_URL?.trim() ||
  "https://htuswsvgobgpurnbmjkk.supabase.co";

const CONTROL_PUBLISHABLE_KEY =
  process.env.SQUARGRAPH_CONTROL_PUBLISHABLE_KEY?.trim() ||
  "sb_publishable_WBkaADa8PF8gTWEh5vYtKg_HvNWeYNI";

const CLIENT_KEY = "zucero";

/**
 * Authorizes the Zucero CMS during the SQUARGRAPH Control migration.
 *
 * Accepted paths:
 * 1. Existing Zucero merchant/internal authorization (temporary transition path).
 * 2. A SQUARGRAPH Control Supabase bearer session that is currently assigned
 *    to the Zucero tenant and has the requested feature enabled.
 *
 * The Control publishable key is public by design; authorization comes from
 * the signed user bearer token plus Control's server-side tenant membership.
 */
export async function isAuthorizedCmsRequest(
  request: Request,
  feature: SquargraphCmsFeature
): Promise<boolean> {
  if (await isAuthorizedAdminOrInternal(request)) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer\s+\S+/i)) {
    return false;
  }

  try {
    const response = await fetch(
      `${CONTROL_SUPABASE_URL}/rest/v1/rpc/control_client_access`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          apikey: CONTROL_PUBLISHABLE_KEY,
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          p_client_key: CLIENT_KEY,
          p_feature: feature,
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return false;
    const access = (await response.json()) as { allowed?: boolean };
    return access?.allowed === true;
  } catch {
    return false;
  }
}
