/**
 * Shared, pixel-locked frame for every LOKA feed publication.
 *
 * Daily and weekly content use different inner modules, but the canvas, the
 * header, the title box, the lower-box baseline and the signature must always
 * resolve to these exact coordinates.
 */
export const LOKA_PUBLICATION_FEED_FRAME = {
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

/** Backward-compatible name used by the daily renderer and existing audits. */
export const LOKA_DAILY_FEED_FRAME = LOKA_PUBLICATION_FEED_FRAME;

/**
 * Visual primitives shared by every 1080 x 1440 LOKA publication.
 *
 * These values are deliberately defined outside the daily and weekly
 * renderers so neither format can slowly develop its own opacity, outline,
 * radius or text-density system.
 */
export const LOKA_PUBLICATION_STYLE = {
  text: {
    strokeWidth: 0.44,
    lineJoin: "round",
    miterLimit: 2
  },
  glassBox: {
    radius: 36,
    insetRadius: 34,
    borderColor: "rgba(255,255,255,0.88)",
    borderWidth: 1.45,
    fillTop: "rgba(255,255,255,0.19)",
    fillMiddle: "rgba(255,255,255,0.145)",
    fillBottom: "rgba(255,255,255,0.105)",
    sheenTop: "rgba(255,255,255,0.20)",
    sheenBottom: "rgba(255,255,255,0.02)",
    sheenRatio: 0.48,
    sheenClipRatio: 0.43
  },
  separator: {
    color: "rgba(18,38,74,0.13)",
    width: 1.05
  },
  content: {
    left: 50,
    width: 980,
    firstY: 336,
    bottom: 1305,
    gap: 22
  }
} as const;
