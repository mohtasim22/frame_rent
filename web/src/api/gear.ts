import { z } from "zod";
import { availabilityResponseSchema, gearItemSchema, type GearQuery } from "@shared/schemas/gear.schema";
import { api } from "./client";

export type GearFilters = Partial<GearQuery>;

const gearListSchema = z.array(gearItemSchema);

export function getGear(filters: GearFilters, signal?: AbortSignal) {
  return api.get("/api/v1/gear", { query: filters, schema: gearListSchema, signal });
}

export function getGearBySlug(slug: string, signal?: AbortSignal) {
  return api.get(`/api/v1/gear/${encodeURIComponent(slug)}`, { schema: gearItemSchema, signal });
}
export function getAvailability(slug: string, from: string, to: string, signal?: AbortSignal) {
  return api.get(`/api/v1/gear/${encodeURIComponent(slug)}/availability`, {
    query: { from, to },
    schema: availabilityResponseSchema,
    signal,
  });
}

