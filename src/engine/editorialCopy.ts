/**
 * Shared copy contract for every LOKA weather synthesis.
 *
 * A day and a week do not use the same factual inputs, but they must always
 * be expressed through the same editorial cadence: an immediate tendency,
 * then one factual clarification.
 */
export interface LokaEditorialCopy {
  primaryLine: string;
  secondaryLine: string;
}

function normalized(value: string): string {
  return String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

export function buildLokaEditorialCopy(primaryLine: string, secondaryLine: string): LokaEditorialCopy {
  const primary = normalized(primaryLine);
  const secondary = normalized(secondaryLine);
  if (!primary || !secondary || primary === secondary) {
    throw new Error("loka_editorial_copy_invalid");
  }
  // These are the long-standing daily limits. Keeping them here guarantees
  // that a weekly tendency always fits the shared feed component as one line.
  if (primary.length > 80 || secondary.length > 120) {
    throw new Error("loka_editorial_copy_too_long");
  }
  return { primaryLine: primary, secondaryLine: secondary };
}
