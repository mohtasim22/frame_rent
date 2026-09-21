import type { BookingStatus } from "@shared/types/domain";

type Tone = "default" | "secondary" | "destructive" | "outline";

/**
 * One place that decides how a booking status looks, so the rentals list, the
 * confirmation page and the admin table can never disagree about it.
 */
const TONES: Record<BookingStatus, Tone> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PICKED_UP: "default",
  RETURNED: "outline",
  CANCELLED: "outline",
  OVERDUE: "destructive",
};

export function statusTone(status: BookingStatus): Tone {
  return TONES[status];
}

const LABELS: Record<BookingStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  PICKED_UP: "With you now",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
};

export function statusLabel(status: BookingStatus): string {
  return LABELS[status];
}
