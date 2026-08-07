export function weightedMean(values: Array<[number | null, number]>): number {
  const valid = values.filter((x): x is [number, number] => x[0] !== null && Number.isFinite(x[0]));
  if (!valid.length) return 0;
  const totalWeight = valid.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight <= 0) return valid.reduce((sum, [v]) => sum + v, 0) / valid.length;
  return valid.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight;
}

export function weightedSupport(values: Array<[number, number]>, threshold: number): number {
  if (!values.length) return 0;
  const totalWeight = values.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight <= 0) return 0;
  return values.reduce((sum, [v, w]) => sum + (v >= threshold ? w : 0), 0) / totalWeight;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
