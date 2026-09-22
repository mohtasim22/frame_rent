import { z } from "zod";
import {
  BOOKING_STATUSES,
  UNIT_CONDITIONS,
  UNIT_STATUSES,
} from "../types/domain";
import { MOUNTS, productSpecsSchema } from "./specs.schema";
import { gearItemSchema } from "./gear.schema";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * z.url() accepts any scheme the URL constructor does, including `javascript:`
 * and `data:`. An image address has no business being either.
 */
const imageUrl = z
  .url()
  .refine((value) => value.startsWith("https://"), "images must be https URLs");
const dateString = z.string().regex(DATE_PATTERN, "must be YYYY-MM-DD");
const isDate = (value: string) => DATE_PATTERN.test(value);

/* ------------------------------------------------------------------ bookings */

export const adminBookingQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  q: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(25),
});

export type AdminBookingQuery = z.infer<typeof adminBookingQuerySchema>;

export const adminBookingRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(BOOKING_STATUSES),
  startDate: z.string(),
  endDate: z.string(),
  totalCents: z.number().int(),
  feeCents: z.number().int(),
  itemCount: z.number().int(),
  headline: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  nextStatuses: z.array(z.enum(BOOKING_STATUSES)),
});

export type AdminBookingRow = z.infer<typeof adminBookingRowSchema>;

export const transitionSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});

export const returnBookingSchema = z.object({
  returnedOn: dateString.optional(),
  condition: z.enum(UNIT_CONDITIONS).optional(),
  notes: z.string().max(500).optional(),
});

export type ReturnBooking = z.infer<typeof returnBookingSchema>;

/* ------------------------------------------------------------------ products */

/**
 * The fields, with NO defaults.
 *
 * This split exists because of a data-loss bug: `.partial()` does not remove a
 * `.default()`, it only makes the key optional — so a PATCH that never
 * mentioned `images` still parsed to `images: []` and wiped them, and one that
 * only set `isActive` silently reset bufferDays, mount and the weekly rate too.
 *
 * Defaults belong to CREATE, where an absent field genuinely means "use the
 * default". On an update an absent field means "leave it alone", which is the
 * opposite.
 */
const productFields = z.object({
  name: z.string().min(1).max(160),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only"),
  description: z.string().min(1).max(4000),
  images: z.array(imageUrl).max(8),
  specs: productSpecsSchema,
  dailyRateCents: z.number().int().positive(),
  weeklyRateCents: z.number().int().positive().nullable(),
  depositCents: z.number().int().nonnegative(),
  replacementCents: z.number().int().nonnegative(),
  mount: z.enum(MOUNTS).nullable(),
  bufferDays: z.number().int().min(0).max(14),
  isActive: z.boolean(),
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
});

export const productInputSchema = productFields.extend({
  images: z.array(imageUrl).max(8).default([]),
  weeklyRateCents: z.number().int().positive().nullable().default(null),
  mount: z.enum(MOUNTS).nullable().default(null),
  bufferDays: z.number().int().min(0).max(14).default(1),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productInputSchema>;

/** Absent means "leave it alone" — never "reset it". */
export const productPatchSchema = productFields.partial();

/**
 * Same shape the catalogue returns, plus `isActive` — the admin needs to see
 * archived products in order to bring one back, and the public list filters
 * them out by design.
 */
export const adminProductSchema = gearItemSchema.extend({
  isActive: z.boolean(),
});

export type AdminProduct = z.infer<typeof adminProductSchema>;

/* --------------------------------------------------------------------- units */

export const unitInputSchema = z.object({
  serialNumber: z.string().min(1).max(60),
  condition: z.enum(UNIT_CONDITIONS).default("EXCELLENT"),
  status: z.enum(UNIT_STATUSES).default("AVAILABLE"),
  notes: z.string().max(500).nullable().default(null),
});

export const unitPatchSchema = unitInputSchema.partial();

export const unitRowSchema = z.object({
  id: z.string(),
  serialNumber: z.string(),
  condition: z.enum(UNIT_CONDITIONS),
  status: z.enum(UNIT_STATUSES),
  notes: z.string().nullable(),
});

export type UnitRow = z.infer<typeof unitRowSchema>;

export const holdInputSchema = z
  .object({
    gearUnitId: z.string().min(1),
    reason: z.string().min(1).max(200),
    start: dateString,
    end: dateString,
  })
  .refine((v) => !isDate(v.start) || !isDate(v.end) || v.start <= v.end, {
    message: "start must not be after end",
    path: ["start"],
  });

export type HoldInput = z.infer<typeof holdInputSchema>;

export const holdRowSchema = z.object({
  id: z.string(),
  gearUnitId: z.string(),
  serialNumber: z.string(),
  reason: z.string(),
  start: z.string(),
  end: z.string(),
});

/* ------------------------------------------------------------------ uploads */

export const uploadSignatureSchema = z.object({
  cloudName: z.string(),
  apiKey: z.string(),
  timestamp: z.number().int(),
  folder: z.string(),
  signature: z.string(),
});

export type UploadSignature = z.infer<typeof uploadSignatureSchema>;

export const productImagesSchema = z.object({
  images: z.array(imageUrl).max(8),
});

/* ----------------------------------------------------------------- dashboard */

export const dashboardSchema = z.object({
  date: z.string(),
  pickupsDue: z.array(adminBookingRowSchema),
  returnsDue: z.array(adminBookingRowSchema),
  overdue: z.array(adminBookingRowSchema),
  unitsInMaintenance: z.number().int(),
  unitsTotal: z.number().int(),
  outNow: z.number().int(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

/* ------------------------------------------------------------- occupancy grid */

export const occupancyQuerySchema = z
  .object({
    from: dateString,
    to: dateString,
    productId: z.string().optional(),
  })
  .refine((v) => !isDate(v.from) || !isDate(v.to) || v.from <= v.to, {
    message: "from must not be after to",
    path: ["from"],
  });

export const occupancyCellSchema = z.enum([
  "free",
  "booked",
  "buffer",
  "hold",
  "offline",
]);

export const occupancyRowSchema = z.object({
  unitId: z.string(),
  serialNumber: z.string(),
  productName: z.string(),
  days: z.array(occupancyCellSchema),
});

export const occupancySchema = z.object({
  from: z.string(),
  to: z.string(),
  dates: z.array(z.string()),
  rows: z.array(occupancyRowSchema),
});

export type Occupancy = z.infer<typeof occupancySchema>;
export type OccupancyCell = z.infer<typeof occupancyCellSchema>;
