import { eachDay } from "./dates";
import { overlaps, type DateRange } from "./overlap";

/**
 * Which days in [from, to] have NO unit free?
 *
 * `unitRanges` holds one array of committed ranges per bookable unit.
 * A day is unavailable only when EVERY unit is busy on that day.
 */
export function unavailableDays(
  unitRanges: DateRange[][],
  from: string,
  to: string,
): string[] {
  if (unitRanges.length === 0) return eachDay(from, to);

  return eachDay(from, to).filter((day) => {
    const thatDay: DateRange = { start: day, end: day };
    return unitRanges.every((ranges) =>
      ranges.some((range) => overlaps(range, thatDay)),
    );
  });
}

/** Is this unit free for the whole requested range? */
export function isFree(ranges: DateRange[], requested: DateRange): boolean {
  return !ranges.some((range) => overlaps(range, requested));
}

/**
 * The first unit with no conflict, in the order given.
 * Callers pass units in a stable order so allocation is deterministic.
 */
export function findFreeUnitId(
  units: Array<{ id: string; ranges: DateRange[] }>,
  requested: DateRange,
): string | null {
  return units.find((unit) => isFree(unit.ranges, requested))?.id ?? null;
}

