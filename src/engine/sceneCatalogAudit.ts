import type {
  DayProfile,
  Env,
  LokaForecast,
  Scene24Id
} from "../types";
import {
  SCENE24_REGISTRY,
  getScene24ById,
  getScene24ByKey
} from "./scenes24/registry";
import {
  buildV24PublicPayloadPreview
} from "./publicPreview";
import {
  verifyV24MasterAsset
} from "./masterAsset";

type Obj = Record<string, unknown>;

export type SceneCatalogAuditStatus =
  | "PASS"
  | "FAIL"
  | "PENDING";

export interface RegistryAuditCheck {
  id: string;
  status: "PASS" | "FAIL";
  detail: string;
}

export interface SceneCatalogAuditItem {
  id: number;
  key: string;
  label: string;
  family: string;
  masterFileName: string;
  masterUrl: string;

  status: SceneCatalogAuditStatus;

  checks: {
    idSequential: boolean;
    keyUnique: boolean;
    masterNameExact: boolean;
    lookupById: boolean;
    lookupByKey: boolean;
    previewBuild: boolean;
    previewIdentity: boolean;
    editorialValid: boolean;
    editorialUnique: boolean;
    masterChecked: boolean;
    masterAvailable: boolean;
    masterIsImage: boolean;
  };

  editorial: {
    source: string | null;
    subtitle: string | null;
    summaryLineCount: number;
    mainVerdict: string | null;
    notableEvent: string | null;
  };

  master: {
    checked: boolean;
    available: boolean;
    status: number | null;
    contentType: string | null;
    reason: string;
    error: string | null;
  };

  errors: string[];
}

export interface SceneCatalogAuditReport {
  version: "12.9.0";
  runAt: string;
  citySlug: string;
  generatedAt: string | null;

  status: SceneCatalogAuditStatus;

  registryChecks: RegistryAuditCheck[];
  scenes: SceneCatalogAuditItem[];

  summary: {
    registryCount: number;
    sceneCount: number;
    passed: number;
    failed: number;
    pending: number;
    uniqueKeys: number;
    uniqueMasters: number;
    uniqueEditorialSubtitles: number;
    mastersAvailable: number;
    editorialsValid: number;
  };

  safety: {
    productionMutated: false;
    engineControlMutated: false;
    forecastWritten: false;
    auditOnlyMutation: true;
  };

  reason: string;
}

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function expectedMasterFileName(
  id: number,
  key: string
): string {
  return `${pad2(id)}_${key}.png`;
}

function registryCheck(
  id: string,
  passed: boolean,
  detail: string
): RegistryAuditCheck {
  return {
    id,
    status: passed ? "PASS" : "FAIL",
    detail
  };
}

function safeNumber(
  obj: Obj,
  key: string,
  fallback: number
): number {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

/**
 * Creates a deterministic editorial exercise profile from the real
 * DayProfile shape. The audit does not invent a production forecast:
 * it only changes a clone used to exercise scene-specific editorial branches.
 */
function profileForScene(
  sceneId: Scene24Id,
  base: DayProfile
): DayProfile {
  const profile = clone(base) as unknown as Obj;

  const evolution =
    asObj(profile.evolution) ?? {};
  const rain =
    asObj(profile.rain) ?? {};
  const wind =
    asObj(profile.wind) ?? {};
  const convection =
    asObj(profile.convection) ?? {};
  const visibility =
    asObj(profile.visibility) ?? {};

  evolution.meanCloudMorning =
    safeNumber(evolution, "meanCloudMorning", 50);
  evolution.meanCloudAfternoon =
    safeNumber(evolution, "meanCloudAfternoon", 50);

  rain.maxRainMmPerHour =
    safeNumber(rain, "maxRainMmPerHour", 0);
  rain.rainBlockMaxHours =
    safeNumber(rain, "rainBlockMaxHours", 0);
  rain.showerBlockCount =
    safeNumber(rain, "showerBlockCount", 0);

  wind.notableHours =
    safeNumber(wind, "notableHours", 0);
  wind.maxGustKmh =
    safeNumber(wind, "maxGustKmh", 0);

  convection.thunderHours =
    safeNumber(convection, "thunderHours", 0);
  convection.peakThunderSupport =
    safeNumber(convection, "peakThunderSupport", 0);

  if (!("visibilityMinKm" in visibility)) {
    visibility.visibilityMinKm = null;
  }

  if (sceneId === 5) {
    evolution.meanCloudMorning = 20;
    evolution.meanCloudAfternoon = 75;
  }

  if (sceneId === 11 || sceneId === 15) {
    evolution.meanCloudMorning = 80;
    evolution.meanCloudAfternoon = 25;
  }

  if ([12, 13, 22, 24].includes(sceneId)) {
    rain.maxRainMmPerHour = 5;
    rain.rainBlockMaxHours = 4;
    rain.showerBlockCount = 2;
  }

  if ([6, 10, 14, 20, 24].includes(sceneId)) {
    wind.notableHours = 3;
    wind.maxGustKmh = 65;
  }

  if (sceneId === 22) {
    convection.thunderHours = 2;
    convection.peakThunderSupport = 0.8;
  }

  if (sceneId === 8) {
    visibility.visibilityMinKm = 2;
  }

  if (sceneId === 17) {
    visibility.visibilityMinKm = 0.4;
  }

  profile.evolution = evolution;
  profile.rain = rain;
  profile.wind = wind;
  profile.convection = convection;
  profile.visibility = visibility;

  return profile as unknown as DayProfile;
}

function forecastForScene(
  source: LokaForecast,
  sceneId: Scene24Id
): LokaForecast {
  const forecast = clone(source);
  const def = getScene24ById(sceneId);

  const baseProfile =
    forecast.diagnostics.dayProfile24 as DayProfile | undefined;

  if (!baseProfile || typeof baseProfile !== "object") {
    throw new Error("scene_catalog_audit_no_day_profile24");
  }

  forecast.diagnostics.dayProfile24 =
    profileForScene(sceneId, baseProfile);

  forecast.diagnostics.scene24 = {
    sceneId,
    sceneKey: def.key,
    sceneLabel: def.label,
    score: 80,
    confidence: "HIGH",
    runnerUp: {
      sceneId: sceneId === 24 ? 23 : sceneId + 1,
      score: 65
    },
    reasons: ["scene_catalog_audit"],
    fallbackUsed: false,
    hysteresisApplied: false,
    candidates: []
  };

  forecast.diagnostics.scene24Raw = {
    sceneId,
    sceneKey: def.key,
    score: 80
  };

  forecast.diagnostics.scene24Reliability = {
    applied: false,
    reason: "scene_catalog_audit"
  };

  return forecast;
}

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function runSceneCatalogAudit(
  env: Env,
  citySlug: string,
  forecast: LokaForecast
): Promise<SceneCatalogAuditReport> {
  const runAt = new Date().toISOString();

  const ids = SCENE24_REGISTRY.map((scene) => scene.id);
  const keys = SCENE24_REGISTRY.map((scene) => scene.key);
  const masters = SCENE24_REGISTRY.map(
    (scene) => scene.masterFileName
  );

  const expectedIds =
    Array.from({ length: 24 }, (_, index) => index + 1);

  const uniqueIds = new Set(ids);
  const uniqueKeys = new Set(keys);
  const uniqueMasters = new Set(masters);

  const registryChecks: RegistryAuditCheck[] = [
    registryCheck(
      "registry_count",
      SCENE24_REGISTRY.length === 24,
      `${SCENE24_REGISTRY.length} scène(s) déclarée(s), attendu 24.`
    ),
    registryCheck(
      "ids_01_24",
      JSON.stringify(ids) === JSON.stringify(expectedIds),
      `IDs observés : ${ids.map(pad2).join(", ")}.`
    ),
    registryCheck(
      "ids_unique",
      uniqueIds.size === 24,
      `${uniqueIds.size} ID(s) unique(s).`
    ),
    registryCheck(
      "keys_unique",
      uniqueKeys.size === 24,
      `${uniqueKeys.size} clé(s) unique(s).`
    ),
    registryCheck(
      "masters_unique",
      uniqueMasters.size === 24,
      `${uniqueMasters.size} nom(s) de master unique(s).`
    ),
    registryCheck(
      "registry_fields_complete",
      SCENE24_REGISTRY.every((scene) =>
        nonEmpty(scene.key) &&
        nonEmpty(scene.label) &&
        nonEmpty(scene.family) &&
        nonEmpty(scene.description) &&
        nonEmpty(scene.masterFileName)
      ),
      "key, label, family, description et masterFileName doivent être non vides."
    )
  ];

  const subtitleSeen = new Map<string, number>();
  const scenes: SceneCatalogAuditItem[] = [];

  for (const def of SCENE24_REGISTRY) {
    const errors: string[] = [];

    const idSequential =
      def.id >= 1 &&
      def.id <= 24 &&
      ids[def.id - 1] === def.id;

    const keyUnique =
      keys.filter((key) => key === def.key).length === 1;

    const expectedMaster =
      expectedMasterFileName(def.id, def.key);

    const masterNameExact =
      def.masterFileName === expectedMaster;

    const lookupById =
      getScene24ById(def.id as Scene24Id) === def;

    const lookupByKey =
      getScene24ByKey(def.key) === def;

    if (!idSequential) errors.push("id_not_sequential");
    if (!keyUnique) errors.push("key_not_unique");
    if (!masterNameExact) {
      errors.push(
        `master_name_mismatch:${expectedMaster}`
      );
    }
    if (!lookupById) errors.push("lookup_by_id_mismatch");
    if (!lookupByKey) errors.push("lookup_by_key_mismatch");

    let previewBuild = false;
    let previewIdentity = false;
    let editorialValid = false;
    let subtitle: string | null = null;
    let summaryLineCount = 0;
    let mainVerdict: string | null = null;
    let notableEvent: string | null = null;
    let editorialSource: string | null = null;
    let masterUrl = `/masters24/${def.masterFileName}`;

    try {
      const synthetic = forecastForScene(
        forecast,
        def.id as Scene24Id
      );

      const preview =
        buildV24PublicPayloadPreview(synthetic);

      previewBuild = true;

      previewIdentity =
        preview.scene.id === def.id &&
        preview.scene.key === def.key &&
        preview.scene.label === def.label &&
        preview.scene.family === def.family &&
        preview.scene.masterFileName ===
          def.masterFileName &&
        preview.scene.masterUrl === masterUrl;

      if (!previewIdentity) {
        errors.push("preview_identity_mismatch");
      }

      subtitle = preview.editorial.subtitle;
      summaryLineCount =
        preview.editorial.summaryLines.length;
      mainVerdict =
        preview.editorial.mainVerdict;
      notableEvent =
        preview.editorial.notableEvent;
      editorialSource =
        preview.editorial.source;

      editorialValid =
        preview.editorial.source === "v24_native_v1" &&
        nonEmpty(preview.editorial.subtitle) &&
        nonEmpty(preview.editorial.mainVerdict) &&
        nonEmpty(preview.editorial.rainVerdict) &&
        preview.editorial.summaryLines.length >= 2 &&
        preview.editorial.summaryLines.length <= 3 &&
        preview.editorial.summaryLines.every(nonEmpty) &&
        preview.editorial.mainVerdict ===
          preview.editorial.subtitle;

      if (!editorialValid) {
        errors.push("editorial_invalid");
      }
    } catch (error) {
      errors.push(
        `preview_or_editorial_error:${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }

    let editorialUnique = false;

    if (subtitle) {
      const count = subtitleSeen.get(subtitle) ?? 0;
      subtitleSeen.set(subtitle, count + 1);
    }

    const master = await verifyV24MasterAsset(
      env,
      masterUrl
    );

    const masterChecked = master.checked;
    const masterAvailable = master.available;
    const masterIsImage =
      !!master.contentType &&
      master.contentType.toLowerCase()
        .startsWith("image/");

    if (!masterChecked) {
      errors.push(`master_not_checked:${master.reason}`);
    }
    if (!masterAvailable) {
      errors.push(`master_unavailable:${master.reason}`);
    }
    if (masterChecked && !masterIsImage) {
      errors.push(
        `master_not_image:${master.contentType ?? "null"}`
      );
    }

    scenes.push({
      id: def.id,
      key: def.key,
      label: def.label,
      family: def.family,
      masterFileName: def.masterFileName,
      masterUrl,
      status: "PENDING",
      checks: {
        idSequential,
        keyUnique,
        masterNameExact,
        lookupById,
        lookupByKey,
        previewBuild,
        previewIdentity,
        editorialValid,
        editorialUnique,
        masterChecked,
        masterAvailable,
        masterIsImage
      },
      editorial: {
        source: editorialSource,
        subtitle,
        summaryLineCount,
        mainVerdict,
        notableEvent
      },
      master: {
        checked: master.checked,
        available: master.available,
        status: master.status,
        contentType: master.contentType,
        reason: master.reason,
        error: master.error
      },
      errors
    });
  }

  // Editorial uniqueness is evaluated only after all 24 copies were built.
  for (const item of scenes) {
    const subtitle = item.editorial.subtitle;
    const editorialUnique =
      !!subtitle && subtitleSeen.get(subtitle) === 1;

    item.checks.editorialUnique = editorialUnique;

    if (!editorialUnique) {
      item.errors.push("editorial_subtitle_not_unique");
    }

    const blockingChecks = Object.values(item.checks);

    if (
      !item.master.checked &&
      item.master.reason === "assets_binding_unavailable"
    ) {
      item.status = "PENDING";
    } else {
      item.status =
        blockingChecks.every(Boolean) &&
        item.errors.length === 0
          ? "PASS"
          : "FAIL";
    }
  }

  const registryFailed =
    registryChecks.some((item) => item.status === "FAIL");

  const passed = scenes.filter(
    (scene) => scene.status === "PASS"
  ).length;
  const failed = scenes.filter(
    (scene) => scene.status === "FAIL"
  ).length;
  const pending = scenes.filter(
    (scene) => scene.status === "PENDING"
  ).length;

  const status: SceneCatalogAuditStatus =
    registryFailed || failed > 0
      ? "FAIL"
      : pending > 0
        ? "PENDING"
        : "PASS";

  return {
    version: "12.9.0",
    runAt,
    citySlug,
    generatedAt: forecast.generatedAt,
    status,
    registryChecks,
    scenes,
    summary: {
      registryCount: SCENE24_REGISTRY.length,
      sceneCount: scenes.length,
      passed,
      failed,
      pending,
      uniqueKeys: uniqueKeys.size,
      uniqueMasters: uniqueMasters.size,
      uniqueEditorialSubtitles:
        subtitleSeen.size,
      mastersAvailable:
        scenes.filter(
          (scene) => scene.master.available
        ).length,
      editorialsValid:
        scenes.filter(
          (scene) => scene.checks.editorialValid
        ).length
    },
    safety: {
      productionMutated: false,
      engineControlMutated: false,
      forecastWritten: false,
      auditOnlyMutation: true
    },
    reason:
      status === "PASS"
        ? "all_24_scenes_registry_masters_editorials_verified"
        : status === "PENDING"
          ? "scene_catalog_audit_waiting_asset_binding"
          : "scene_catalog_audit_detected_mismatch"
  };
}
