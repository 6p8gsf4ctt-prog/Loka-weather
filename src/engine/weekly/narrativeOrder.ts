import type { SelectedWeeklyEvent } from "./selection";

/**
 * Publication order is intentionally separate from importance ranking.
 * Importance decides what survives selection; this layer decides how the
 * retained stories are read in the carousel.
 */
export function orderWeeklyEvents(events: SelectedWeeklyEvent[]): SelectedWeeklyEvent[] {
  return [...events].sort((a, b) => {
    const aIsBestWindow = a.type === "BEST_WINDOW";
    const bIsBestWindow = b.type === "BEST_WINDOW";

    // A practical recommendation closes the story when it is available.
    if (aIsBestWindow !== bIsBestWindow) return aIsBestWindow ? 1 : -1;

    return a.startDate.localeCompare(b.startDate)
      || a.endDate.localeCompare(b.endDate)
      || a.id.localeCompare(b.id);
  });
}
