export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((x) => (x - m) ** 2)));
}

export function weightedMean(values: Array<[number | null, number]>): number {
  const valid = values.filter((x): x is [number, number] => x[0] !== null && Number.isFinite(x[0]));
  if (!valid.length) return 0;
  const total = valid.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return mean(valid.map(([v]) => v));
  return valid.reduce((sum, [v, w]) => sum + v * w, 0) / total;
}

export function weightedSupport(values: Array<[number, number]>, threshold: number): number {
  const total = values.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 0;
  return values.reduce((sum, [v, w]) => sum + (v >= threshold ? w : 0), 0) / total;
}

export function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

export function maxRun(values: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const value of values) {
    run = value ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function countRuns(values: boolean[]): number {
  let runs = 0;
  let active = false;
  for (const value of values) {
    if (value && !active) runs++;
    active = value;
  }
  return runs;
}

export function round(value: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}
