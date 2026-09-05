import type { WeeklyCarouselPlan, WeeklyEditorial, WeeklySelectionStatus } from "../engine/weekly";

export interface WeeklyPublicationRecord {
  id: number;
  citySlug: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  source: string;
  status: WeeklySelectionStatus;
  engineVersion: string;
  editorial: WeeklyEditorial;
  carousel: WeeklyCarouselPlan;
  createdAt: string;
  updatedAt: string;
}

export interface SaveWeeklyPublicationInput {
  citySlug: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  source: string;
  status: WeeklySelectionStatus;
  engineVersion: string;
  editorial: WeeklyEditorial;
  carousel: WeeklyCarouselPlan;
}

interface WeeklyPublicationDbRow {
  id: number;
  city_slug: string;
  start_date: string;
  end_date: string;
  generated_at: string;
  source: string;
  status: WeeklySelectionStatus;
  engine_version: string;
  editorial_json: string;
  carousel_json: string;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string, field: string): T {
  try { return JSON.parse(value) as T; }
  catch { throw new Error(`weekly_publication_corrupt_${field}`); }
}

function mapRow(row: WeeklyPublicationDbRow): WeeklyPublicationRecord {
  if (row.status !== "EVENTS" && row.status !== "CALM") throw new Error("weekly_publication_invalid_status");
  const editorial = parseJson<WeeklyEditorial>(row.editorial_json, "editorial");
  const carousel = parseJson<WeeklyCarouselPlan>(row.carousel_json, "carousel");
  if (editorial.version !== "0.1.0" || carousel.version !== "0.1.0") throw new Error("weekly_publication_invalid_version");
  return {
    id: row.id,
    citySlug: row.city_slug,
    startDate: row.start_date,
    endDate: row.end_date,
    generatedAt: row.generated_at,
    source: row.source,
    status: row.status,
    engineVersion: row.engine_version,
    editorial,
    carousel,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function weeklyPublicationForRange(
  db: D1Database,
  citySlug: string,
  startDate: string,
  endDate: string
): Promise<WeeklyPublicationRecord | null> {
  const row = await db.prepare(`SELECT * FROM weekly_publications WHERE city_slug = ? AND start_date = ? AND end_date = ? LIMIT 1`)
    .bind(citySlug, startDate, endDate).first<WeeklyPublicationDbRow>();
  return row ? mapRow(row) : null;
}

export async function latestWeeklyPublication(db: D1Database, citySlug: string): Promise<WeeklyPublicationRecord | null> {
  const row = await db.prepare(`SELECT * FROM weekly_publications WHERE city_slug = ? ORDER BY start_date DESC, generated_at DESC LIMIT 1`)
    .bind(citySlug).first<WeeklyPublicationDbRow>();
  return row ? mapRow(row) : null;
}

export async function saveWeeklyPublication(
  db: D1Database,
  input: SaveWeeklyPublicationInput
): Promise<WeeklyPublicationRecord> {
  await db.prepare(`
    INSERT INTO weekly_publications (
      city_slug, start_date, end_date, generated_at, source, status, engine_version,
      editorial_json, carousel_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(city_slug, start_date, end_date) DO UPDATE SET
      generated_at = excluded.generated_at,
      source = excluded.source,
      status = excluded.status,
      engine_version = excluded.engine_version,
      editorial_json = excluded.editorial_json,
      carousel_json = excluded.carousel_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    input.citySlug, input.startDate, input.endDate, input.generatedAt, input.source, input.status,
    input.engineVersion, JSON.stringify(input.editorial), JSON.stringify(input.carousel)
  ).run();

  const saved = await weeklyPublicationForRange(db, input.citySlug, input.startDate, input.endDate);
  if (!saved) throw new Error("weekly_publication_readback_failed");
  return saved;
}
