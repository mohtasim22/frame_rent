import type { BookingStatus } from "../types/domain";

/**
 * Which statuses a booking may move to next.
 *
 * Kept as data rather than a pile of `if`s so the API and the admin UI read the
 * same rules — the buttons that appear are derived from this, not hand-listed.
 */
export const ALLOWED_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["RETURNED", "OVERDUE"],
  OVERDUE: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
} as const satisfies Record<BookingStatus, readonly BookingStatus[]>;

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] as readonly BookingStatus[]).includes(to);
}

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

/**
 * A booking is overdue once the last day has passed and the gear is still out.
 * Dates are inclusive, so the 9th is late only from the 10th onwards.
 */
export function isOverdue(
  status: BookingStatus,
  endDate: string,
  today: string,
): boolean {
  return status === "PICKED_UP" && endDate < today;
}

/** Late fee: one day's rate per day late, capped at the deposit. */
export function lateFeeCents(
  dailyRateCents: number,
  endDate: string,
  returnedOn: string,
  depositCents: number,
): number {
  const DAY_MS = 86_400_000;
  const late = Math.round(
    (Date.parse(`${returnedOn}T00:00:00Z`) -
      Date.parse(`${endDate}T00:00:00Z`)) /
      DAY_MS,
  );

  if (late <= 0) return 0;

  return Math.min(late * dailyRateCents, depositCents);
}
