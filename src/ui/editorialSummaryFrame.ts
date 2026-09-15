/**
 * One visual grammar for the daily and weekly editorial summaries.
 * Their boxes may differ in height, but their copy hierarchy cannot drift.
 */
export const LOKA_EDITORIAL_SUMMARY_FRAME = {
  insetX: 68,
  primary: { maximumSize: 29, minimumSize: 20, weight: 650 },
  secondary: { maximumSize: 21, minimumSize: 17, weight: 550, maximumLines: 2 },
  accent: { width: 52, offsetBelowPrimary: 13, lineWidth: 3 },
  gapAfterAccent: 17,
  secondaryLineHeightRatio: 1.28
} as const;
