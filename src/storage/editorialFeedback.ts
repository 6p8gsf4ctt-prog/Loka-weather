import type { OfficialPublicPayloadV24, PublicationManifestV24, Scene24Id, Scene24Key } from "../types";
import { parseOfficialPayload, validateOfficialProduct } from "../engine/publicProduct";

export interface StoryEditorialDraft {
  subtitle: string;
  primaryLine: string;
  secondaryLine: string;
  hashtags: string;
}

export interface FeedEditorialDraft {
  subtitle: string;
  primaryLine: string;
  secondaryLine: string;
  paragraph1: string;
  paragraph2: string;
  caption: string;
  hashtags: string;
}

export interface EditorialFeedbackRecord {
  id: number;
  feedbackSchemaVersion: "1.0";
  citySlug: string;
  forecastDate: string;
  generationId: number;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  sceneLabel: string;
  officialPayload: OfficialPublicPayloadV24;
  storyEdited: StoryEditorialDraft | null;
  feedEdited: FeedEditorialDraft | null;
  manifestHash: string;
  engineVersion: string;
  doctrineVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveEditorialFeedbackInput {
  payload: OfficialPublicPayloadV24;
  manifest: PublicationManifestV24;
  story: StoryEditorialDraft | null;
  feed: FeedEditorialDraft | null;
}

interface FeedbackDbRow {
  id: number;
  feedback_schema_version: string;
  city_slug: string;
  forecast_date: string;
  generation_id: number;
  scene_id: number;
  scene_key: string;
  scene_label: string;
  official_payload_json: string;
  story_edited_json: string | null;
  feed_edited_json: string | null;
  manifest_hash: string;
  engine_version: string;
  doctrine_version: string;
  created_at: string;
  updated_at: string;
}

interface LedgerPointerRow {
  generation_id: number;
  scene_id: number;
  scene_key: string;
  manifest_hash: string;
}

const VISUAL_TEXT_LIMIT = 500;
const SOCIAL_TEXT_LIMIT = 8_000;
const HASHTAG_TEXT_LIMIT = 3_000;

function cleanText(value: string, limit: number, field: string): string {
  if (typeof value !== "string") throw new Error(`editorial_feedback_invalid_${field}`);
  const cleaned = value.replace(/\r\n?/g, "\n").normalize("NFC").trim();
  if (cleaned.length > limit) throw new Error(`editorial_feedback_${field}_too_long`);
  return cleaned;
}

function normalizeStoryDraft(value: StoryEditorialDraft): StoryEditorialDraft {
  return {
    subtitle: cleanText(value.subtitle, VISUAL_TEXT_LIMIT, "story_subtitle"),
    primaryLine: cleanText(value.primaryLine, VISUAL_TEXT_LIMIT, "story_primary_line"),
    secondaryLine: cleanText(value.secondaryLine, VISUAL_TEXT_LIMIT, "story_secondary_line"),
    hashtags: cleanText(value.hashtags, HASHTAG_TEXT_LIMIT, "story_hashtags")
  };
}

function normalizeFeedDraft(value: FeedEditorialDraft): FeedEditorialDraft {
  return {
    subtitle: cleanText(value.subtitle, VISUAL_TEXT_LIMIT, "feed_subtitle"),
    primaryLine: cleanText(value.primaryLine, VISUAL_TEXT_LIMIT, "feed_primary_line"),
    secondaryLine: cleanText(value.secondaryLine, VISUAL_TEXT_LIMIT, "feed_secondary_line"),
    paragraph1: cleanText(value.paragraph1, SOCIAL_TEXT_LIMIT, "feed_paragraph1"),
    paragraph2: cleanText(value.paragraph2, SOCIAL_TEXT_LIMIT, "feed_paragraph2"),
    caption: cleanText(value.caption, SOCIAL_TEXT_LIMIT, "feed_caption"),
    hashtags: cleanText(value.hashtags, HASHTAG_TEXT_LIMIT, "feed_hashtags")
  };
}

export function officialStoryDraft(payload: OfficialPublicPayloadV24): StoryEditorialDraft {
  return normalizeStoryDraft({
    subtitle: payload.editorial.visual.subtitle,
    primaryLine: payload.editorial.visual.primaryLine,
    secondaryLine: payload.editorial.visual.secondaryLine,
    hashtags: payload.editorial.social.hashtags
  });
}

export function officialFeedDraft(payload: OfficialPublicPayloadV24): FeedEditorialDraft {
  return normalizeFeedDraft({
    subtitle: payload.editorial.visual.subtitle,
    primaryLine: payload.editorial.visual.primaryLine,
    secondaryLine: payload.editorial.visual.secondaryLine,
    paragraph1: payload.editorial.social.paragraph1,
    paragraph2: payload.editorial.social.paragraph2,
    caption: payload.editorial.social.caption,
    hashtags: payload.editorial.social.hashtags
  });
}

function sameStory(a: StoryEditorialDraft, b: StoryEditorialDraft): boolean {
  return a.subtitle === b.subtitle
    && a.primaryLine === b.primaryLine
    && a.secondaryLine === b.secondaryLine
    && a.hashtags === b.hashtags;
}

function sameFeed(a: FeedEditorialDraft, b: FeedEditorialDraft): boolean {
  return a.subtitle === b.subtitle
    && a.primaryLine === b.primaryLine
    && a.secondaryLine === b.secondaryLine
    && a.paragraph1 === b.paragraph1
    && a.paragraph2 === b.paragraph2
    && a.caption === b.caption
    && a.hashtags === b.hashtags;
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value) as unknown; }
  catch { throw new Error("editorial_feedback_corrupt_json"); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseStoryDraft(value: string | null): StoryEditorialDraft | null {
  if (value === null) return null;
  const raw = parseJson(value);
  if (!isRecord(raw)) throw new Error("editorial_feedback_corrupt_story");
  const { subtitle, primaryLine, secondaryLine, hashtags } = raw;
  if (typeof subtitle !== "string" || typeof primaryLine !== "string" || typeof secondaryLine !== "string" || typeof hashtags !== "string") {
    throw new Error("editorial_feedback_corrupt_story");
  }
  return normalizeStoryDraft({ subtitle, primaryLine, secondaryLine, hashtags });
}

function parseFeedDraft(value: string | null): FeedEditorialDraft | null {
  if (value === null) return null;
  const raw = parseJson(value);
  if (!isRecord(raw)) throw new Error("editorial_feedback_corrupt_feed");
  const { subtitle, primaryLine, secondaryLine, paragraph1, paragraph2, caption, hashtags } = raw;
  if (
    typeof subtitle !== "string"
    || typeof primaryLine !== "string"
    || typeof secondaryLine !== "string"
    || typeof paragraph1 !== "string"
    || typeof paragraph2 !== "string"
    || typeof caption !== "string"
    || typeof hashtags !== "string"
  ) {
    throw new Error("editorial_feedback_corrupt_feed");
  }
  return normalizeFeedDraft({ subtitle, primaryLine, secondaryLine, paragraph1, paragraph2, caption, hashtags });
}

function toRecord(row: FeedbackDbRow): EditorialFeedbackRecord {
  const payload = parseOfficialPayload(parseJson(row.official_payload_json));
  if (!payload) throw new Error("editorial_feedback_corrupt_official_payload");
  if (row.feedback_schema_version !== "1.0") throw new Error("editorial_feedback_unknown_schema");
  if (!Number.isInteger(row.scene_id) || row.scene_id < 1 || row.scene_id > 24) throw new Error("editorial_feedback_corrupt_scene");
  if (
    payload.citySlug !== row.city_slug
    || payload.date !== row.forecast_date
    || payload.scene.id !== row.scene_id
    || payload.scene.key !== row.scene_key
    || payload.scene.label !== row.scene_label
  ) {
    throw new Error("editorial_feedback_reference_mismatch");
  }
  return {
    id: row.id,
    feedbackSchemaVersion: "1.0",
    citySlug: row.city_slug,
    forecastDate: row.forecast_date,
    generationId: row.generation_id,
    sceneId: row.scene_id as Scene24Id,
    sceneKey: row.scene_key as Scene24Key,
    sceneLabel: row.scene_label,
    officialPayload: payload,
    storyEdited: parseStoryDraft(row.story_edited_json),
    feedEdited: parseFeedDraft(row.feed_edited_json),
    manifestHash: row.manifest_hash,
    engineVersion: row.engine_version,
    doctrineVersion: row.doctrine_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function currentLedgerPointer(
  db: D1Database,
  citySlug: string,
  forecastDate: string
): Promise<LedgerPointerRow> {
  const row = await db.prepare(`
    SELECT generation_id, scene_id, scene_key, manifest_hash
    FROM daily_scene_ledger
    WHERE city_slug = ? AND forecast_date = ?
    ORDER BY revision DESC
    LIMIT 1
  `).bind(citySlug, forecastDate).first<LedgerPointerRow>();
  if (!row) throw new Error("editorial_feedback_official_ledger_missing");
  return row;
}

function assertManifestIdentity(payload: OfficialPublicPayloadV24, manifest: PublicationManifestV24): void {
  if (
    manifest.engine !== "V24"
    || manifest.citySlug !== payload.citySlug
    || manifest.forecastDate !== payload.date
    || manifest.sceneId !== payload.scene.id
    || manifest.sceneKey !== payload.scene.key
  ) {
    throw new Error("editorial_feedback_manifest_identity_mismatch");
  }
}

async function assertCurrentOfficial(
  db: D1Database,
  payload: OfficialPublicPayloadV24,
  manifest: PublicationManifestV24
): Promise<LedgerPointerRow> {
  assertManifestIdentity(payload, manifest);
  const validation = await validateOfficialProduct(payload, manifest);
  if (!validation.ok) throw new Error(`editorial_feedback_invalid_official_${validation.reason}`);

  const pointer = await currentLedgerPointer(db, payload.citySlug, payload.date);
  if (
    pointer.scene_id !== payload.scene.id
    || pointer.scene_key !== payload.scene.key
    || pointer.manifest_hash !== manifest.payloadSha256
  ) {
    throw new Error("editorial_feedback_not_current_official");
  }
  return pointer;
}

export async function editorialFeedbackForGeneration(
  db: D1Database,
  generationId: number
): Promise<EditorialFeedbackRecord | null> {
  if (!Number.isInteger(generationId) || generationId < 1) throw new Error("editorial_feedback_invalid_generation_id");
  const row = await db.prepare(`
    SELECT * FROM editorial_feedback
    WHERE generation_id = ?
    LIMIT 1
  `).bind(generationId).first<FeedbackDbRow>();
  return row ? toRecord(row) : null;
}

export async function editorialFeedbackForOfficial(
  db: D1Database,
  payload: OfficialPublicPayloadV24,
  manifest: PublicationManifestV24
): Promise<EditorialFeedbackRecord | null> {
  const pointer = await assertCurrentOfficial(db, payload, manifest);
  const feedback = await editorialFeedbackForGeneration(db, pointer.generation_id);
  if (!feedback) return null;
  if (feedback.manifestHash !== manifest.payloadSha256) throw new Error("editorial_feedback_manifest_changed");
  return feedback;
}

export async function editorialFeedbackHistory(
  db: D1Database,
  citySlug: string,
  limit = 100
): Promise<EditorialFeedbackRecord[]> {
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const rows = await db.prepare(`
    SELECT * FROM editorial_feedback
    WHERE city_slug = ?
    ORDER BY forecast_date DESC, updated_at DESC, id DESC
    LIMIT ?
  `).bind(citySlug, safeLimit).all<FeedbackDbRow>();
  return rows.results.map(toRecord);
}

export async function saveEditorialFeedback(
  db: D1Database,
  input: SaveEditorialFeedbackInput
): Promise<EditorialFeedbackRecord | null> {
  const { payload, manifest } = input;
  const pointer = await assertCurrentOfficial(db, payload, manifest);

  const officialStory = officialStoryDraft(payload);
  const officialFeed = officialFeedDraft(payload);
  const requestedStory = input.story ? normalizeStoryDraft(input.story) : officialStory;
  const requestedFeed = input.feed ? normalizeFeedDraft(input.feed) : officialFeed;

  const storyEdited = sameStory(requestedStory, officialStory) ? null : requestedStory;
  const feedEdited = sameFeed(requestedFeed, officialFeed) ? null : requestedFeed;

  const existing = await editorialFeedbackForGeneration(db, pointer.generation_id);
  if (existing && existing.manifestHash !== manifest.payloadSha256) {
    throw new Error("editorial_feedback_manifest_changed");
  }

  if (!storyEdited && !feedEdited) {
    if (existing) {
      await db.prepare(`DELETE FROM editorial_feedback WHERE id = ?`).bind(existing.id).run();
    }
    return null;
  }

  if (existing) {
    await db.prepare(`
      UPDATE editorial_feedback
      SET story_edited_json = ?,
          feed_edited_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      storyEdited ? JSON.stringify(storyEdited) : null,
      feedEdited ? JSON.stringify(feedEdited) : null,
      existing.id
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO editorial_feedback (
        city_slug,
        forecast_date,
        generation_id,
        scene_id,
        scene_key,
        scene_label,
        official_payload_json,
        story_edited_json,
        feed_edited_json,
        manifest_hash,
        engine_version,
        doctrine_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payload.citySlug,
      payload.date,
      pointer.generation_id,
      payload.scene.id,
      payload.scene.key,
      payload.scene.label,
      JSON.stringify(payload),
      storyEdited ? JSON.stringify(storyEdited) : null,
      feedEdited ? JSON.stringify(feedEdited) : null,
      manifest.payloadSha256,
      payload.decision.version,
      payload.decision.doctrineVersion
    ).run();
  }

  const saved = await editorialFeedbackForGeneration(db, pointer.generation_id);
  if (!saved) throw new Error("editorial_feedback_readback_failed");
  return saved;
}

export async function clearEditorialFeedback(
  db: D1Database,
  payload: OfficialPublicPayloadV24,
  manifest: PublicationManifestV24
): Promise<void> {
  const pointer = await assertCurrentOfficial(db, payload, manifest);
  await db.prepare(`
    DELETE FROM editorial_feedback
    WHERE generation_id = ? AND manifest_hash = ?
  `).bind(pointer.generation_id, manifest.payloadSha256).run();
}
