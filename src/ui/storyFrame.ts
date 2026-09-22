/**
 * Shared wrapper for every LOKA Story.
 *
 * A Story no longer owns a second graphic composition. It draws the 1080 x
 * 1920 master background, then places the canonical 1080 x 1440 publication
 * composition at native scale in the vertical centre.
 */
export const LOKA_PUBLICATION_STORY_FRAME = {
  width: 1080,
  height: 1920,
  publication: {
    x: 0,
    y: 240,
    width: 1080,
    height: 1440
  },
  safeArea: {
    top: 240,
    bottom: 240
  }
} as const;

/** Daily and weekly Stories intentionally share the exact same wrapper. */
export const LOKA_DAILY_STORY_FRAME = LOKA_PUBLICATION_STORY_FRAME;
export const LOKA_WEEKLY_STORY_FRAME = LOKA_PUBLICATION_STORY_FRAME;
