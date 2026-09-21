import { BLOCKING_BOOKING_STATUSES } from "@shared/types/domain";
import type { Prisma } from "../../generated/prisma/client";

/**
 * THE single definition of "this booking is holding its units".
 *
 * A status alone is no longer enough. Once payment is taken at checkout, a
 * booking exists in PENDING while the customer is still typing their card —
 * it must hold the units during that window, or two people can pay for the
 * last camera. But if they wander off, an unpaid PENDING booking would hold it
 * forever, so it stops blocking once `paymentDueBy` has passed.
 *
 * Every availability query imports this. Anything that computes it separately
 * will drift, and the drift shows up as a double booking.
 */
export function blockingBookingWhere(now = new Date()): Prisma.BookingWhereInput {
  return {
    status: { in: [...BLOCKING_BOOKING_STATUSES] },
    OR: [
      // Paid, or past the point where payment matters.
      { paymentDueBy: null },
      // Still inside the checkout window.
      { paymentDueBy: { gt: now } },
    ],
  };
}

/** How long an unpaid booking may hold its units while the customer pays. */
export const CHECKOUT_WINDOW_MINUTES = 30;

export function checkoutDeadline(from = new Date()): Date {
  return new Date(from.getTime() + CHECKOUT_WINDOW_MINUTES * 60 * 1000);
}
