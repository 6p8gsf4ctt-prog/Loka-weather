/**
 * Shared, pixel-locked frame for every LOKA Story publication.
 *
 * The daily Story is the source of truth. Daily and weekly content may use
 * different inner modules, but the canvas, header, title box, content bounds
 * and signature always resolve to these exact coordinates.
 */
export const LOKA_PUBLICATION_STORY_FRAME = {
  width: 1080,
  height: 1920,
  header: {
    logoX: 50,
    logoCenterY: 144,
    logoWidth: 190,
    logoHeight: 64,
    cityX: 540,
    cityBaseline: 158,
    citySize: 25,
    cityWeight: 680,
    cityTracking: 8,
    dateX: 1030,
    dateBaseline: 158,
    dateSize: 22,
    dateWeight: 540
  },
  title: { x: 44, y: 200, width: 992, height: 150 },
  content: {
    x: 44,
    width: 992,
    top: 396,
    bottom: 1734,
    firstGap: 39,
    secondGap: 44
  },
  dailyModules: {
    primary: { y: 396, height: 704 },
    editorial: { y: 1139, height: 272 },
    utility: { y: 1455, height: 279 }
  },
  signature: {
    x: 540,
    baseline: 1810,
    size: 22,
    weight: 500,
    colorAlpha: 1,
    underlineStartX: 514,
    underlineEndX: 566,
    underlineY: 1834,
    underlineWidth: 1.4
  }
} as const;

/** Backward-compatible semantic name for the daily reference renderer. */
export const LOKA_DAILY_STORY_FRAME = LOKA_PUBLICATION_STORY_FRAME;

/**
 * Weekly modules start from the daily geometry and may redistribute only the
 * useful heights. The shared top, bottom and gaps remain immutable.
 */
export const LOKA_WEEKLY_STORY_ADAPTIVE_LAYOUT = {
  top: LOKA_PUBLICATION_STORY_FRAME.content.top,
  bottom: LOKA_PUBLICATION_STORY_FRAME.content.bottom,
  firstGap: LOKA_PUBLICATION_STORY_FRAME.content.firstGap,
  secondGap: LOKA_PUBLICATION_STORY_FRAME.content.secondGap,
  facts: {
    minimumHeight: 620,
    preferredHeight: LOKA_PUBLICATION_STORY_FRAME.dailyModules.primary.height
  },
  summary: {
    minimumHeight: 220,
    preferredHeight: LOKA_PUBLICATION_STORY_FRAME.dailyModules.editorial.height
  },
  strip: {
    minimumHeight: LOKA_PUBLICATION_STORY_FRAME.dailyModules.utility.height,
    preferredHeight: LOKA_PUBLICATION_STORY_FRAME.dailyModules.utility.height
  }
} as const;
