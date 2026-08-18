import type { OfficialPublicPayloadV24, PublicationManifestV24 } from "../types";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  }
  return value;
}
export function canonicalJson(value: unknown): string { return JSON.stringify(canonical(value)); }

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildPublicationManifest(payload: OfficialPublicPayloadV24): Promise<PublicationManifestV24> {
  return {
    version: "2.0", engine: "V24", citySlug: payload.citySlug, forecastDate: payload.date,
    generatedAt: payload.generatedAt, sceneId: payload.scene.id, sceneKey: payload.scene.key,
    payloadSha256: await sha256Hex(canonicalJson(payload)), createdAt: new Date().toISOString()
  };
}

export async function verifyPublicationManifest(payload: OfficialPublicPayloadV24, manifest: PublicationManifestV24): Promise<boolean> {
  return manifest.version === "2.0" && manifest.engine === "V24"
    && manifest.citySlug === payload.citySlug && manifest.forecastDate === payload.date
    && manifest.generatedAt === payload.generatedAt && manifest.sceneId === payload.scene.id
    && manifest.sceneKey === payload.scene.key
    && manifest.payloadSha256 === await sha256Hex(canonicalJson(payload));
}
