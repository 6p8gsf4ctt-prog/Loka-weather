/**
 * Shared, pixel-locked frame for every LOKA feed publication.
 *
 * Daily and weekly content use different inner modules, but the canvas, the
 * header, the title box, the lower-box baseline and the signature must always
 * resolve to these exact coordinates.
 */
export const LOKA_DAILY_FEED_FRAME = {
  width: 1080,
  height: 1440,
  header: {
    logoX: 50,
    logoCenterY: 79,
    logoWidth: 174,
    logoHeight: 58,
    cityX: 540,
    cityBaseline: 94,
    citySize: 22,
    cityWeight: 680,
    cityTracking: 8,
    dateX: 1030,
    dateBaseline: 94,
    dateSize: 19,
    dateWeight: 540
  },
  title: { x: 50, y: 160, width: 980, height: 150 },
  lowerBox: { x: 50, y: 1100, width: 980, height: 205, bottom: 1305 },
  signature: {
    x: 540,
    baseline: 1368,
    size: 18,
    weight: 500,
    colorAlpha: 0.88,
    underlineStartX: 518,
    underlineEndX: 562,
    underlineY: 1387,
    underlineWidth: 1.2
  }
} as const;
