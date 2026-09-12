export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PICKED_UP",
  "RETURNED",
  "CANCELLED",
  "OVERDUE",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Statuses that make a gear unit unavailable for new bookings.
 * THE single source of truth — availability, admin and pricing all read this.
 * CANCELLED and RETURNED free the unit.
 */
export const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PICKED_UP",
  "OVERDUE",
] as const satisfies readonly BookingStatus[];

export const UNIT_STATUSES = ["AVAILABLE", "MAINTENANCE", "RETIRED"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const UNIT_CONDITIONS = ["NEW", "EXCELLENT", "GOOD", "FAIR"] as const;
export type UnitCondition = (typeof UNIT_CONDITIONS)[number];

export const ROLES = ["RENTER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
