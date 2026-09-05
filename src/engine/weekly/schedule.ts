export interface WeeklyDateRange {
  startDate: string;
  endDate: string;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Returns the Monday-to-Sunday range containing a local ISO date. */
export function weeklyRangeForDate(date: string): WeeklyDateRange {
  if (!validDate(date)) throw new Error(`weekly_invalid_local_date:${date}`);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const startDate = shiftDate(date, -daysSinceMonday);
  return { startDate, endDate: shiftDate(startDate, 6) };
}

/** Returns the given local date when it is Monday, otherwise the next Monday. */
export function nextMondayOrSame(date: string): string {
  if (!validDate(date)) throw new Error(`weekly_invalid_local_date:${date}`);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const daysUntilMonday = (8 - (weekday || 7)) % 7;
  return shiftDate(date, daysUntilMonday);
}

export function localDateIsMonday(timezone: string, instant: Date): boolean {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(instant) === "Mon";
}
