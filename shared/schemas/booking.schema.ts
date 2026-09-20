import { z } from "zod";
import { rentalDays } from "../lib/pricing";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RENTAL_DAYS = 90;
const MAX_LINES = 10;

const isDate = (value: string) => DATE_PATTERN.test(value);

export const quoteLineSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "slug may only contain lowercase letters, numbers and hyphens"),
    start: z.string().regex(DATE_PATTERN, "start must be YYYY-MM-DD"),
    end: z.string().regex(DATE_PATTERN, "end must be YYYY-MM-DD"),
  })
  // Both refinements bail out when the dates are malformed — zod 4 runs
  // object-level checks even after a field has already failed.
  .refine((v) => !isDate(v.start) || !isDate(v.end) || v.start <= v.end, {
    message: "start must not be after end",
    path: ["start"],
  })
  .refine(
    (v) =>
      !isDate(v.start) ||
      !isDate(v.end) ||
      v.start > v.end ||
      rentalDays(v.start, v.end) <= MAX_RENTAL_DAYS,
    { message: `a rental may not exceed ${MAX_RENTAL_DAYS} days`, path: ["end"] },
  );

export const quoteRequestSchema = z.object({
  lines: z.array(quoteLineSchema).min(1).max(MAX_LINES),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteLineResultSchema = z.object({
  slug: z.string(),
  name: z.string(),
  start: z.string(),
  end: z.string(),
  days: z.number().int(),
  dailyRateCents: z.number().int(),
  weeklyRateCents: z.number().int().nullable(),
  subtotalCents: z.number().int(),
  depositCents: z.number().int(),
  available: z.boolean(),
});

export const quoteResponseSchema = z.object({
  lines: z.array(quoteLineResultSchema),
  subtotalCents: z.number().int(),
  depositCents: z.number().int(),
  totalCents: z.number().int(),
  allAvailable: z.boolean(),
});

export type QuoteLineResult = z.infer<typeof quoteLineResultSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
