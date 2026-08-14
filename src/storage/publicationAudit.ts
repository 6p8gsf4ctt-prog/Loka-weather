import type { LokaForecast } from "../types";
import {
  publicationIdentity,
  readPublicationManifest,
  verifyPublicationManifest,
  type PublicationIdentity,
  type PublicationSurface
} from "../engine/publicationManifest";

export interface PublicationGenerationAudit {
  id: number;
  citySlug: string;
  generatedAt: string;
  recordedAt: string;
  effectiveEngine: string;
  sceneKey: string;
  fingerprint: string;
  verificationStatus: string;
}

export interface PublicSurfaceObservation {
  surface: PublicationSurface;
  status: number;
  version: string | null;
  generatedAt: string | null;
  engine: string | null;
  scene: string | null;
  fingerprint: string | null;
}

export interface SurfaceCoherenceResult {
  version: "12.6.0";
  status: "PASS" | "FAIL";
  expected: PublicationIdentity;
  observations: PublicSurfaceObservation[];
  checks: Array<{
    surface: PublicationSurface;
    passed: boolean;
    reasons: string[];
  }>;
  reason: string;
}

const REQUIRED_SURFACES: PublicationSurface[] = [
  "api_latest",
  "api_decision",
  "dashboard",
  "instagram"
];

export async function ensurePublicationAuditReady(
  db: D1Database
): Promise<void> {
  await db.prepare(`
    SELECT 1
    FROM publication_generation_audit
    LIMIT 1
  `).first();
}

export async function recordPublicationGenerationAudit(
  db: D1Database,
  forecast: LokaForecast,
  source: string
): Promise<boolean> {
  const verified = await verifyPublicationManifest(forecast);
  const manifest = verified.manifest;

  if (!verified.valid || !manifest) return false;

  await db.prepare(`
    INSERT INTO publication_generation_audit (
      event_id,
      city_slug,
      forecast_date,
      generated_at,
      recorded_at,
      source,
      effective_engine,
      scene_key,
      v24_scene_id,
      fingerprint_sha256,
      manifest_json,
      guard_status,
      fallback_applied,
      fallback_reason,
      surface_contract_version,
      verification_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
    ON CONFLICT(city_slug, generated_at) DO NOTHING
  `).bind(
    crypto.randomUUID(),
    forecast.citySlug,
    forecast.date,
    forecast.generatedAt,
    new Date().toISOString(),
    source,
    manifest.effectiveEngine,
    manifest.scene.key,
    manifest.scene.v24Id,
    manifest.fingerprintSha256,
    JSON.stringify(manifest),
    manifest.safety.guardStatus,
    manifest.safety.generationFallbackRequired ? 1 : 0,
    manifest.safety.generationFallbackReason,
    manifest.surfaceContractVersion
  ).run();

  const row = await db.prepare(`
    SELECT
      effective_engine,
      scene_key,
      fingerprint_sha256,
      verification_status
    FROM publication_generation_audit
    WHERE city_slug = ?
      AND generated_at = ?
    LIMIT 1
  `).bind(
    forecast.citySlug,
    forecast.generatedAt
  ).first<{
    effective_engine: string;
    scene_key: string;
    fingerprint_sha256: string;
    verification_status: string;
  }>();

  return !!row &&
    row.effective_engine === manifest.effectiveEngine &&
    row.scene_key === manifest.scene.key &&
    row.fingerprint_sha256 === manifest.fingerprintSha256 &&
    row.verification_status === "VERIFIED";
}

export async function latestPublicationGenerationAudit(
  db: D1Database,
  citySlug: string
): Promise<PublicationGenerationAudit | null> {
  const row = await db.prepare(`
    SELECT
      id,
      city_slug,
      generated_at,
      recorded_at,
      effective_engine,
      scene_key,
      fingerprint_sha256,
      verification_status
    FROM publication_generation_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    city_slug: string;
    generated_at: string;
    recorded_at: string;
    effective_engine: string;
    scene_key: string;
    fingerprint_sha256: string;
    verification_status: string;
  }>();

  return row ? {
    id: row.id,
    citySlug: row.city_slug,
    generatedAt: row.generated_at,
    recordedAt: row.recorded_at,
    effectiveEngine: row.effective_engine,
    sceneKey: row.scene_key,
    fingerprint: row.fingerprint_sha256,
    verificationStatus: row.verification_status
  } : null;
}

export function validateSurfaceObservations(
  expected: PublicationIdentity,
  observations: PublicSurfaceObservation[]
): SurfaceCoherenceResult {
  const checks = REQUIRED_SURFACES.map((surface) => {
    const item = observations.find((x) => x.surface === surface);
    const reasons: string[] = [];

    if (!item) {
      reasons.push("surface_missing");
      return { surface, passed: false, reasons };
    }

    if (item.status < 200 || item.status >= 300) {
      reasons.push(`http_status_${item.status}`);
    }
    if (item.version !== expected.version) {
      reasons.push("version_mismatch");
    }
    if (item.generatedAt !== expected.generatedAt) {
      reasons.push("generated_at_mismatch");
    }
    if (item.engine !== expected.engine) {
      reasons.push("engine_mismatch");
    }
    if (item.scene !== expected.scene) {
      reasons.push("scene_mismatch");
    }
    if (item.fingerprint !== expected.fingerprint) {
      reasons.push("fingerprint_mismatch");
    }

    return {
      surface,
      passed: reasons.length === 0,
      reasons
    };
  });

  const passed =
    observations.length === REQUIRED_SURFACES.length &&
    checks.every((item) => item.passed);

  return {
    version: "12.6.0",
    status: passed ? "PASS" : "FAIL",
    expected,
    observations,
    checks,
    reason: passed
      ? "all_public_surfaces_same_generation"
      : "public_surface_divergence_detected"
  };
}

export async function recordSurfaceCoherenceAudit(
  db: D1Database,
  citySlug: string,
  forecast: LokaForecast,
  observations: PublicSurfaceObservation[]
): Promise<SurfaceCoherenceResult> {
  const identity = publicationIdentity(forecast);

  if (!identity) {
    throw new Error("publication_identity_unavailable");
  }

  const result = validateSurfaceObservations(
    identity,
    observations
  );

  await db.prepare(`
    INSERT INTO publication_surface_audit (
      event_id,
      city_slug,
      generated_at,
      checked_at,
      expected_engine,
      expected_scene,
      expected_fingerprint,
      status,
      observations_json,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    citySlug,
    identity.generatedAt,
    new Date().toISOString(),
    identity.engine,
    identity.scene,
    identity.fingerprint,
    result.status,
    JSON.stringify(observations),
    result.reason
  ).run();

  return result;
}

export async function latestSurfaceCoherenceAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  generatedAt: string;
  checkedAt: string;
  expectedEngine: string;
  expectedScene: string;
  expectedFingerprint: string;
  status: "PASS" | "FAIL";
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      generated_at,
      checked_at,
      expected_engine,
      expected_scene,
      expected_fingerprint,
      status,
      reason
    FROM publication_surface_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    generated_at: string;
    checked_at: string;
    expected_engine: string;
    expected_scene: string;
    expected_fingerprint: string;
    status: "PASS" | "FAIL";
    reason: string;
  }>();

  return row ? {
    id: row.id,
    generatedAt: row.generated_at,
    checkedAt: row.checked_at,
    expectedEngine: row.expected_engine,
    expectedScene: row.expected_scene,
    expectedFingerprint: row.expected_fingerprint,
    status: row.status,
    reason: row.reason
  } : null;
}
