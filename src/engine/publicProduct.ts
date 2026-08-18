import type { OfficialPublicPayloadV24, PublicationManifestV24, Scene24Id, Scene24Key } from "../types";
import { evaluatePublicationGuard } from "./publicationGuard";
import { verifyPublicationManifest } from "./publicationManifest";
import { scene24ById } from "./scenes24/registry";

function isSceneId(value: unknown): value is Scene24Id { return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 24; }
function isSceneKey(value: unknown): value is Scene24Key { return typeof value === "string"; }

export function parseOfficialPayload(value: unknown): OfficialPublicPayloadV24 | null {
  if (!value || typeof value !== "object") return null;
  const p = value as OfficialPublicPayloadV24;
  if (p.version !== "2.0" || typeof p.citySlug !== "string" || typeof p.date !== "string" || !p.scene || !isSceneId(p.scene.id) || !isSceneKey(p.scene.key)) return null;
  try {
    const def = scene24ById(p.scene.id);
    if (def.key !== p.scene.key || def.label !== p.scene.label) return null;
  } catch { return null; }
  if (!p.editorial || p.editorial.scene?.id !== p.scene.id || !Array.isArray(p.hourly) || !p.decision) return null;
  return p;
}

export async function validateOfficialProduct(payload: OfficialPublicPayloadV24, manifest: PublicationManifestV24): Promise<{ ok: boolean; reason: string }> {
  const guard = evaluatePublicationGuard(payload);
  if (guard.status !== "PASS") return { ok: false, reason: guard.reason };
  if (!await verifyPublicationManifest(payload, manifest)) return { ok: false, reason: "manifest_mismatch" };
  return { ok: true, reason: "verified_v24" };
}
