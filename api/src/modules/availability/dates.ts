import type { DateRange } from "./overlap";

const DAY_MS = 86_400_000;

/** Shift a YYYY-MM-DD date by whole days. Pure UTC arithmetic — no local time. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Every day from start to end, inclusive. Empty when end is before start. */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/**
 * Widen a range by `days` on BOTH ends.
 *
 * Turnaround is a gap between consecutive rentals, not a tail on one of them:
 * a unit returned on the 9th with a 1-day buffer is busy through the 10th, and
 * a rental ending on the 19th can't hand over to one starting on the 20th.
 */
export function padRange(range: DateRange, days: number): DateRange {
  if (days <= 0) return range;
  return {
    start: addDays(range.start, -days),
    end: addDays(range.end, days),
  };
}
