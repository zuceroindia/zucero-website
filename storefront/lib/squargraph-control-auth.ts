import "server-only";

import { createClient } from "@supabase/supabase-js";
import { isAuthorizedAdminOrInternal } from "@/lib/api-auth";

const CONTROL_URL =
  process.env.SQUARGRAPH_CONTROL_SUPABASE_URL?.trim() ||
  "https://htuswsvgobgpurnbmjkk.supabase.co";
const CONTROL_PUBLISHABLE_KEY =
  process.env.SQUARGRAPH_CONTROL_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  "sb_publishable_WBkaADa8PF8gTWEh5vYtKg_HvNWeYNI";

const CLIENT_KEY = "zucero";
const PRIMARY_DOMAIN = "thegoodsugar.in";

export type CmsFeature = "read" | "publish" | "media";

type ControlDecision = {
  authorized: boolean;
  status: number;
  source: "control" | "merchant" | "none";
  reason?: string;
  access?: Record<string, unknown>;
};

function controlClient(token?: string) {
  return createClient(CONTROL_URL, CONTROL_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

function featureEnabled(status: any, feature: CmsFeature) {
  if (!status) return false;
  if (feature === "read") return Boolean(status.live_update_enabled ?? status.liveUpdateEnabled);
  if (feature === "publish") return Boolean(status.publish_enabled ?? status.publishEnabled);
  return Boolean(status.media_enabled ?? status.mediaEnabled);
}

async function controlUserDecision(request: Request, feature: CmsFeature): Promise<ControlDecision | null> {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token) return null;

  try {
    const client = controlClient(token);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) return null;

    const { data: access, error: accessError } = await client.rpc("control_client_access", {
      p_client_key: CLIENT_KEY,
      p_feature: feature,
    });

    if (accessError) {
      return {
        authorized: false,
        status: 503,
        source: "control",
        reason: "SQUARGRAPH Control authorization could not be verified.",
      };
    }

    return {
      authorized: Boolean(access?.allowed),
      status: access?.allowed ? 200 : 423,
      source: "control",
      reason: access?.reason ? String(access.reason) : undefined,
      access: access || undefined,
    };
  } catch {
    return {
      authorized: false,
      status: 503,
      source: "control",
      reason: "SQUARGRAPH Control authorization could not be verified.",
    };
  }
}

async function merchantServiceDecision(feature: CmsFeature): Promise<ControlDecision> {
  try {
    const client = controlClient();
    const { data, error } = await client.rpc("site_control_public_status", {
      p_client_key: CLIENT_KEY,
      p_domain: PRIMARY_DOMAIN,
    });

    if (error) {
      return {
        authorized: false,
        status: 503,
        source: "merchant",
        reason: "SQUARGRAPH service status could not be verified.",
      };
    }

    const status = Array.isArray(data) ? data[0] : data;
    const enabled = featureEnabled(status, feature);

    return {
      authorized: enabled,
      status: enabled ? 200 : 423,
      source: "merchant",
      reason: enabled
        ? undefined
        : status?.suspension_reason || "SQUARGRAPH Live Website service is currently on hold.",
      access: status || undefined,
    };
  } catch {
    return {
      authorized: false,
      status: 503,
      source: "merchant",
      reason: "SQUARGRAPH service status could not be verified.",
    };
  }
}

export async function authorizeZuceroCmsRequest(
  request: Request,
  feature: CmsFeature
): Promise<ControlDecision> {
  const controlDecision = await controlUserDecision(request, feature);
  if (controlDecision) return controlDecision;

  const merchantAuthorized = await isAuthorizedAdminOrInternal(request);
  if (!merchantAuthorized) {
    return {
      authorized: false,
      status: 401,
      source: "none",
      reason: "Unauthorized",
    };
  }

  return merchantServiceDecision(feature);
}
