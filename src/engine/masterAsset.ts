import type { Env, LokaForecast } from "../types";
import { buildV24PublicPayloadPreview } from "./publicPreview";

export interface V24MasterAvailability {
  version: "12.5.0";
  checked: boolean;
  available: boolean;
  masterUrl: string | null;
  status: number | null;
  contentType: string | null;
  reason: string;
  error: string | null;
}

type AssetFetcher = {
  fetch(input: Request): Promise<Response>;
};

function assets(env: Env): AssetFetcher | null {
  const value = (env as unknown as { ASSETS?: AssetFetcher }).ASSETS;
  return value && typeof value.fetch === "function" ? value : null;
}

function assetRequest(masterUrl: string, method: "HEAD" | "GET"): Request {
  const url = new URL(masterUrl, "https://loka-assets.invalid");
  return new Request(url.toString(), {
    method,
    headers: method === "GET" ? { Range: "bytes=0-0" } : undefined
  });
}

export async function verifyV24MasterAsset(
  env: Env,
  masterUrl: string
): Promise<V24MasterAvailability> {
  const binding = assets(env);

  if (!binding) {
    return {
      version: "12.5.0",
      checked: false,
      available: false,
      masterUrl,
      status: null,
      contentType: null,
      reason: "assets_binding_unavailable",
      error: null
    };
  }

  try {
    let response = await binding.fetch(assetRequest(masterUrl, "HEAD"));

    // Some static-asset stacks do not implement HEAD consistently.
    if (response.status === 405 || response.status === 501) {
      response = await binding.fetch(assetRequest(masterUrl, "GET"));
    }

    const contentType = response.headers.get("content-type");
    const image = !!contentType && contentType.toLowerCase().startsWith("image/");
    const available = response.ok && image;

    return {
      version: "12.5.0",
      checked: true,
      available,
      masterUrl,
      status: response.status,
      contentType,
      reason: available
        ? "master_asset_available"
        : response.ok
          ? "master_asset_not_image"
          : "master_asset_http_error",
      error: null
    };
  } catch (error) {
    return {
      version: "12.5.0",
      checked: true,
      available: false,
      masterUrl,
      status: null,
      contentType: null,
      reason: "master_asset_fetch_exception",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function verifyV24CandidateMasterAsset(
  env: Env,
  forecast: LokaForecast,
  required: boolean
): Promise<V24MasterAvailability> {
  if (!required) {
    return {
      version: "12.5.0",
      checked: false,
      available: false,
      masterUrl: null,
      status: null,
      contentType: null,
      reason: "master_check_not_required",
      error: null
    };
  }

  try {
    const preview = buildV24PublicPayloadPreview(forecast);
    return verifyV24MasterAsset(env, preview.scene.masterUrl);
  } catch (error) {
    return {
      version: "12.5.0",
      checked: true,
      available: false,
      masterUrl: null,
      status: null,
      contentType: null,
      reason: "master_check_payload_unavailable",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
