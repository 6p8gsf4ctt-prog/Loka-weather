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

export type EditorialFieldDifference = {
  field: string;
  official: string;
  edited: string;
};

export interface EditorialLearningCaseV1 {
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

export interface EditorialLearningExportV1 {
  schemaVersion: "1.0";
  exportType: "LOKA_EDITORIAL_LEARNING";
  generatedAt: string;
  citySlug: string;
  caseCount: number;
  analysisGoal: string[];
  cases: EditorialLearningCaseV1[];
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
      result.push({
        field: String(key),
        official: officialValue,
        edited: editedValue
      });
    }
  }
  return result;
}

function toLearningCase(record: EditorialFeedbackRecord): EditorialLearningCaseV1 {
  const payload = record.officialPayload;
  const officialStory = officialStoryDraft(payload);
  const officialFeed = officialFeedDraft(payload);
  const validatedStory = record.storyEdited ?? officialStory;
  const validatedFeed = record.feedEdited ?? officialFeed;

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
      story: differences(officialStory, validatedStory),
      feed: differences(officialFeed, validatedFeed)
    },
    savedAt: record.updatedAt
  };
}

export async function buildEditorialLearningExport(
  db: D1Database,
  citySlug: string,
  limit = 100
): Promise<EditorialLearningExportV1> {
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const records = await editorialFeedbackHistory(db, citySlug, safeLimit);
  const cases = records.map(toLearningCase);

  return {
    schemaVersion: "1.0",
    exportType: "LOKA_EDITORIAL_LEARNING",
    generatedAt: new Date().toISOString(),
    citySlug,
    caseCount: cases.length,
    analysisGoal: [
      "Comparer la version officielle LOKA! à la version réellement validée par l'utilisateur.",
      "Comprendre l'intention éditoriale derrière chaque modification, pas seulement les mots remplacés.",
      "Relier chaque correction au contexte météo disponible, notamment aux données horaires.",
      "Identifier des principes généralisables de langage LOKA! sans transformer une correction ponctuelle en règle automatique.",
      "Privilégier la précision utile (horaire, intensité, évolution) lorsque les données la justifient, sans inventer d'information météo."
    ],
    cases
  };
}
