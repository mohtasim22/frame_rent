/**
 * A rental range as plain YYYY-MM-DD strings, inclusive on BOTH ends.
 * A booking from 2026-03-06 to 2026-03-09 occupies the unit on the 9th.
 */
export type DateRange = {
  start: string;
  end: string;
};

/**
 * Do two inclusive date ranges share at least one day?
 *
 * Two ranges miss each other only when one finishes before the other starts:
 *   !(a.end < b.start || b.end < a.start)
 * which is the same as:
 */
export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && a.end >= b.start;
}
