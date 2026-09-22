/**
 * Shared wrapper for every LOKA Story.
 *
 * A Story derives its vertical composition from the canonical 1080 x 1440
 * publication. Horizontal geometry stays unchanged; vertical coordinates,
 * box heights and internal spacing are expanded by one shared ratio.
 */
export const LOKA_PUBLICATION_STORY_FRAME = {
  width: 1080,
  height: 1920,
  publication: {
    x: 0,
    y: 170,
    width: 1080,
    sourceHeight: 1440,
    height: 1580,
    verticalScale: 1580 / 1440,
    visualScale: 1.04
  },
  safeArea: {
    top: 170,
    bottom: 170
  }
} as const;

/** The daily Story remains the current reference and is intentionally stable. */
export const LOKA_DAILY_STORY_FRAME = LOKA_PUBLICATION_STORY_FRAME;

/**
 * Weekly content has a denser hierarchy: smaller safe areas, a taller vertical
 * grid and a slightly stronger visual scale. Horizontal geometry is unchanged.
 */
export const LOKA_WEEKLY_STORY_FRAME = {
  width: 1080,
  height: 1920,
  publication: {
    x: 0,
    y: 120,
    width: 1080,
    sourceHeight: 1440,
    height: 1680,
    verticalScale: 1680 / 1440,
    visualScale: 1.08
  },
  safeArea: {
    top: 120,
    bottom: 120
  }
} as const;
