import type {
  OfficialPublicPayloadV24,
  Scene24Confidence,
  ResolutionMode
} from "../types";
import {
  editorialFeedbackHistory,
  officialFeedDraft,
  officialStoryDraft,
  type EditorialFeedbackRecord,
  type FeedEditorialDraft,
  type StoryEditorialDraft
} from "./editorialFeedback";

export const EDITORIAL_EXPORT_SCHEMA_VERSION = "1.2" as const;
export const EDITORIAL_STORAGE_SCHEMA_VERSION = "1.0" as const;
export const EDITORIAL_ACTIVE_VISUAL_FIELDS = ["primaryLine", "secondaryLine"] as const;
export const EDITORIAL_ACTIVE_ENGAGEMENT_FIELDS = ["engagementFormat", "engagementQuestion", "engagementOptionA", "engagementOptionB"] as const;
export const EDITORIAL_LEGACY_RETIRED_FIELDS = ["subtitle"] as const;

export type EditorialFieldStatus = "ACTIVE" | "LEGACY_RETIRED";
export type EditorialVisualEra = "LEGACY_SUBTITLE_VISIBLE" | "PRIMARY_SECONDARY";

export type EditorialFieldDifference = {
  field: string;
  status: EditorialFieldStatus;
  official: string;
  edited: string;
};

export interface EditorialLearningCaseV11 {
  feedbackId: number;
  citySlug: string;
  forecastDate: string;
  generationId: number;
  scene: {
    id: number;
    key: string;
    label: string;
  };
  engine: {
    version: string;
    doctrineVersion: string;
    manifestHash: string;
  };
  editorialContract: {
    visualEra: EditorialVisualEra;
    legacySubtitleCorrectionPresent: boolean;
  };
  weatherContext: {
    temperatures: OfficialPublicPayloadV24["temperatures"];
    hourly: OfficialPublicPayloadV24["hourly"];
    editorialFacts: OfficialPublicPayloadV24["editorial"]["facts"];
    decision: {
      confidence: Scene24Confidence;
      resolutionMode: ResolutionMode;
      familyReason: string;
      reasons: string[];
      profileSummary: Record<string, number | string | boolean | null>;
    };
    models: OfficialPublicPayloadV24["models"];
  };
  official: {
    story: StoryEditorialDraft;
    feed: FeedEditorialDraft;
  };
  validated: {
    story: StoryEditorialDraft;
    feed: FeedEditorialDraft;
  };
  differences: {
    story: EditorialFieldDifference[];
    feed: EditorialFieldDifference[];
  };
  savedAt: string;
}

export type EditorialLearningCaseV1 = EditorialLearningCaseV11;

export interface EditorialLearningExportV11 {
  schemaVersion: "1.2";
  storageSchemaVersion: "1.0";
  exportType: "LOKA_EDITORIAL_LEARNING";
  generatedAt: string;
  citySlug: string;
  caseCount: number;
  fieldPolicy: {
    activeVisualFields: string[];
    activeEngagementFields: string[];
    legacyRetiredFields: Array<{
      field: "subtitle";
      currentGenerationValue: "";
      guidance: string;
    }>;
  };
  analysisGoal: string[];
  cases: EditorialLearningCaseV11[];
}

export type EditorialLearningExportV1 = EditorialLearningExportV11;

export function editorialExportFieldStatus(field: string): EditorialFieldStatus {
  return field === "subtitle" ? "LEGACY_RETIRED" : "ACTIVE";
}

function differences<T extends object>(
  official: T,
  edited: T
): EditorialFieldDifference[] {
  const result: EditorialFieldDifference[] = [];
  for (const key of Object.keys(official) as Array<keyof T>) {
    const officialValue = String(official[key] ?? "");
    const editedValue = String(edited[key] ?? "");
    if (officialValue !== editedValue) {
      const field = String(key);
      result.push({
        field,
        status: editorialExportFieldStatus(field),
        official: officialValue,
        edited: editedValue
      });
    }
  }
  return result;
}

function toLearningCase(record: EditorialFeedbackRecord): EditorialLearningCaseV11 {
  const payload = record.officialPayload;
  const officialStory = officialStoryDraft(payload);
  const officialFeed = officialFeedDraft(payload);
  const validatedStory = record.storyEdited ?? officialStory;
  const validatedFeed = record.feedEdited ?? officialFeed;
  const storyDifferences = differences(officialStory, validatedStory);
  const feedDifferences = differences(officialFeed, validatedFeed);
  const legacySubtitleVisible = officialStory.subtitle.length > 0 || officialFeed.subtitle.length > 0;
  const legacySubtitleCorrectionPresent = [...storyDifferences, ...feedDifferences]
    .some((difference) => difference.field === "subtitle");

  return {
    feedbackId: record.id,
    citySlug: record.citySlug,
    forecastDate: record.forecastDate,
    generationId: record.generationId,
    scene: {
      id: record.sceneId,
      key: record.sceneKey,
      label: record.sceneLabel
    },
    engine: {
      version: record.engineVersion,
      doctrineVersion: record.doctrineVersion,
      manifestHash: record.manifestHash
    },
    editorialContract: {
      visualEra: legacySubtitleVisible ? "LEGACY_SUBTITLE_VISIBLE" : "PRIMARY_SECONDARY",
      legacySubtitleCorrectionPresent
    },
    weatherContext: {
      temperatures: payload.temperatures,
      hourly: payload.hourly,
      editorialFacts: payload.editorial.facts,
      decision: {
        confidence: payload.decision.confidence,
        resolutionMode: payload.decision.resolutionMode,
        familyReason: payload.decision.familyReason,
        reasons: payload.decision.reasons,
        profileSummary: payload.decision.profileSummary
      },
      models: payload.models
    },
    official: {
      story: officialStory,
      feed: officialFeed
    },
    validated: {
      story: validatedStory,
      feed: validatedFeed
    },
    differences: {
      story: storyDifferences,
      feed: feedDifferences
    },
    savedAt: record.updatedAt
  };
}

export async function buildEditorialLearningExport(
  db: D1Database,
  citySlug: string,
  limit = 100
): Promise<EditorialLearningExportV11> {
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const records = await editorialFeedbackHistory(db, citySlug, safeLimit);
  const cases = records.map(toLearningCase);

  return {
    schemaVersion: EDITORIAL_EXPORT_SCHEMA_VERSION,
    storageSchemaVersion: EDITORIAL_STORAGE_SCHEMA_VERSION,
    exportType: "LOKA_EDITORIAL_LEARNING",
    generatedAt: new Date().toISOString(),
    citySlug,
    caseCount: cases.length,
    fieldPolicy: {
      activeVisualFields: [...EDITORIAL_ACTIVE_VISUAL_FIELDS],
      activeEngagementFields: [...EDITORIAL_ACTIVE_ENGAGEMENT_FIELDS],
      legacyRetiredFields: [{
        field: "subtitle",
        currentGenerationValue: "",
        guidance: "Champ historique conservé pour compatibilité. Ne pas en déduire une règle de la composition actuelle."
      }]
    },
    analysisGoal: [
      "Comparer la version officielle LOKA! à la version réellement validée par l'utilisateur.",
      "Comprendre l'intention éditoriale derrière chaque modification, pas seulement les mots remplacés.",
      "Relier chaque correction au contexte météo disponible, notamment aux données horaires.",
      "Distinguer les champs visuels actifs des champs historiques retirés de la composition actuelle.",
      "Analyser séparément la performance éditoriale de Story 2 : format d’interaction, question et réponses proposées.",
      "Ne pas transformer une ancienne correction du champ subtitle en règle pour les nouvelles générations.",
      "Identifier des principes généralisables de langage LOKA! sans transformer une correction ponctuelle en règle automatique.",
      "Privilégier la précision utile (horaire, intensité, évolution) lorsque les données la justifient, sans inventer d'information météo."
    ],
    cases
  };
}
