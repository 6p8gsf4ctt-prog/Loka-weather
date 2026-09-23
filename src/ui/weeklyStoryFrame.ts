/**
 * Contract for the weekly Story only. Daily Stories keep their independent
 * renderer and are intentionally not imported here.
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
