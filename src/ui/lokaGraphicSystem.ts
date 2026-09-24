/**
 * Canonical LOKA publication primitives.
 *
 * Content layouts remain product-specific, but daily and weekly renderers must
 * consume these same materials and hierarchy coefficients. This is deliberately
 * data-only so it can safely be interpolated into the canvas renderers.
 */
export const LOKA_GRAPHIC_SYSTEM = {
  palette: {
    ink: "#12264A",
    gold: "#FDB515"
  },
  fontFamily: '"Helvetica Neue",Arial,sans-serif',
  text: { strokeWidth: 0.44, lineJoin: "round", miterLimit: 2 },
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
  separator: { color: "rgba(18,38,74,0.13)", width: 1.05 },
  hierarchy: {
    logo: 1.12,
    header: 1.10,
    title: 1.035,
    section: 1.10,
    factDate: 1.08,
    metric: 1.13,
    pictogram: 1.11,
    editorialTitle: 1.035,
    editorialDetail: 1.10,
    stripLabel: 1.10,
    stripValue: 1.12,
    stripIcon: 1.10,
    signature: 1.14
  },
  publicationVisualScale: 1.06,
  content: { left: 50, width: 980, firstY: 336, bottom: 1305, gap: 22 }
} as const;

