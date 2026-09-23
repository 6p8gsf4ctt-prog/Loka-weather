/** Weekly renderer tokens, duplicated here to keep daily rendering immutable. */
export const LOKA_WEEKLY_PUBLICATION_STYLE = {
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
  content: { left: 50, width: 980, firstY: 336, bottom: 1305, gap: 22 }
} as const;
