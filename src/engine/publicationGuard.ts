import type { OfficialPublicPayloadV24 } from "../types";
import { scene24ById } from "./scenes24/registry";

export interface PublicationGuardResult {
  status: "PASS" | "BLOCKED";
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  reason: string;
  graphics: { masterAvailable: boolean | null };
}

export function evaluatePublicationGuard(payload: OfficialPublicPayloadV24, masterAvailable: boolean | null = null): PublicationGuardResult {
  let def;
  try { def = scene24ById(payload.scene.id); } catch { def = null; }
  const checks = [
    { name: "engine_v24", pass: payload.version === "2.0", detail: payload.version },
    { name: "minimum_models", pass: payload.models.count >= 3, detail: `models=${payload.models.count}` },
    { name: "decision_valid", pass: payload.decision.validity === "VALID", detail: payload.decision.validity },
    { name: "registry_identity", pass: !!def && def.key === payload.scene.key && def.label === payload.scene.label, detail: `${payload.scene.id}:${payload.scene.key}` },
    { name: "editorial_identity", pass: payload.editorial.scene.id === payload.scene.id && payload.editorial.scene.title === payload.scene.label, detail: payload.editorial.scene.title },
    { name: "hourly_payload", pass: payload.hourly.length >= 8 && payload.hourly.every((h) => Number.isFinite(h.temperatureC)), detail: `hours=${payload.hourly.length}` },
    {
      name: "analysis_v3",
      pass: !payload.analysis || payload.analysis.version === "3.0",
      detail: payload.analysis?.version ?? "legacy_preview"
    },
    {
      name: "adaptive_timeline",
      pass: !payload.analysis || (payload.analysis.timeline.points.length >= 5 && payload.analysis.timeline.points.length <= 9
        && payload.analysis.timeline.points.every((h, i, a) => Number.isFinite(h.temperatureC) && (i === 0 || h.hour > a[i - 1].hour))),
      detail: payload.analysis ? `hours=${payload.analysis.timeline.points.length}` : "legacy_preview"
    },
    { name: "thunder_invariant", pass: payload.scene.id !== 22 || Number(payload.decision.profileSummary.thunderHours ?? 0) > 0, detail: `scene=${payload.scene.id}` },
    { name: "rain_wind_invariant", pass: payload.scene.id !== 24 || Number(payload.decision.profileSummary.rainWindOverlap ?? 0) > 0, detail: `scene=${payload.scene.id}` }
  ];
  const blocked = checks.find((x) => !x.pass);
  return { status: blocked ? "BLOCKED" : "PASS", checks, reason: blocked?.name ?? "technical_integrity_pass", graphics: { masterAvailable } };
}
