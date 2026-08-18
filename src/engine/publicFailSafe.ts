import type { OfficialPublicPayloadV24, PublicationManifestV24 } from "../types";
import { validateOfficialProduct } from "./publicProduct";

export type SafePublicSurface =
  | { engine: "V24"; payload: OfficialPublicPayloadV24; manifest: PublicationManifestV24 }
  | { engine: "UNAVAILABLE"; reason: string };

export async function resolvePublicSurfaceSafely(payload: OfficialPublicPayloadV24 | null, manifest: PublicationManifestV24 | null): Promise<SafePublicSurface> {
  if (!payload || !manifest) return { engine: "UNAVAILABLE", reason: "no_verified_v24_for_today" };
  const validation = await validateOfficialProduct(payload, manifest);
  return validation.ok ? { engine: "V24", payload, manifest } : { engine: "UNAVAILABLE", reason: validation.reason };
}
