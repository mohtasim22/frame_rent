import { z } from "zod";
import { MOUNTS, productSpecsSchema } from "./specs.schema";

export const GEAR_SORTS = ["name", "price-asc", "price-desc", "newest"] as const;
export type GearSort = (typeof GEAR_SORTS)[number];

export const gearQuerySchema = z
  .object({
    category: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    mount: z.enum(MOUNTS).optional(),
    minCents: z.coerce.number().int().nonnegative().optional(),
    maxCents: z.coerce.number().int().nonnegative().optional(),
    q: z.string().min(1).max(100).optional(),
    sort: z.enum(GEAR_SORTS).default("name"),
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().positive().max(48).default(12),
  })
  .refine(
    (v) =>
      v.minCents === undefined ||
      v.maxCents === undefined ||
      v.minCents <= v.maxCents,
    { message: "minCents must not be greater than maxCents", path: ["minCents"] }
  );

export type GearQuery = z.infer<typeof gearQuerySchema>;

export const gearSlugParamsSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug may only contain lowercase letters, numbers and hyphens"),
});

const refSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });

export const gearItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  specs: productSpecsSchema,
  dailyRateCents: z.number().int(),
  weeklyRateCents: z.number().int().nullable(),
  depositCents: z.number().int(),
  replacementCents: z.number().int(),
  mount: z.string().nullable(),
  bufferDays: z.number().int(),
  brand: refSchema,
  category: refSchema,
  _count: z.object({ units: z.number().int() }),
});

export type GearItem = z.infer<typeof gearItemSchema>;
