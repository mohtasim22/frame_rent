import { taxonomyListSchema } from "@shared/schemas/taxonomy.schema";
import { api } from "./client";

export function getBrands(signal?: AbortSignal) {
  return api.get("/api/v1/brands", { schema: taxonomyListSchema, signal });
}

export function getCategories(signal?: AbortSignal) {
  return api.get("/api/v1/categories", { schema: taxonomyListSchema, signal });
}
