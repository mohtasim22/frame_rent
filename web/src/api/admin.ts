import { z } from "zod";
import {
  adminBookingRowSchema,
  dashboardSchema,
  holdRowSchema,
  occupancySchema,
  unitRowSchema,
} from "@shared/schemas/admin.schema";
import type {
  AdminBookingQuery,
  HoldInput,
  ProductInput,
} from "@shared/schemas/admin.schema";
import type { BookingStatus, UnitCondition, UnitStatus } from "@shared/types/domain";
import { api } from "./client";

const bookingRows = z.array(adminBookingRowSchema);
const unitRows = z.array(unitRowSchema);

export function getAdminBookings(
  query: Partial<AdminBookingQuery>,
  signal?: AbortSignal,
) {
  return api.get("/api/v1/admin/bookings", {
    query,
    schema: bookingRows,
    signal,
  });
}

export function transitionBooking(reference: string, status: BookingStatus) {
  return api.post(
    `/api/v1/admin/bookings/${encodeURIComponent(reference)}/status`,
    { status },
    { schema: adminBookingRowSchema },
  );
}

export function returnBooking(
  reference: string,
  body: { returnedOn?: string; condition?: UnitCondition; notes?: string },
) {
  return api.post(
    `/api/v1/admin/bookings/${encodeURIComponent(reference)}/return`,
    body,
    { schema: adminBookingRowSchema },
  );
}

export function getDashboard(signal?: AbortSignal) {
  return api.get("/api/v1/admin/dashboard", { schema: dashboardSchema, signal });
}

export function getOccupancy(
  from: string,
  to: string,
  productId?: string,
  signal?: AbortSignal,
) {
  return api.get("/api/v1/admin/occupancy", {
    query: { from, to, productId },
    schema: occupancySchema,
    signal,
  });
}

export function getUnits(productId: string, signal?: AbortSignal) {
  return api.get(`/api/v1/admin/products/${productId}/units`, {
    schema: unitRows,
    signal,
  });
}

export function addUnit(
  productId: string,
  body: { serialNumber: string; condition: UnitCondition; status: UnitStatus },
) {
  return api.post(`/api/v1/admin/products/${productId}/units`, body, {
    schema: unitRowSchema,
  });
}

export function updateUnit(
  id: string,
  body: { status?: UnitStatus; condition?: UnitCondition; notes?: string | null },
) {
  return api.patch(`/api/v1/admin/units/${id}`, body, { schema: unitRowSchema });
}

export function createHold(body: HoldInput) {
  return api.post("/api/v1/admin/holds", body, { schema: holdRowSchema });
}

const productWriteSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
});

export function createProduct(body: ProductInput) {
  return api.post("/api/v1/admin/products", body, { schema: productWriteSchema });
}

export function updateProduct(id: string, body: Partial<ProductInput>) {
  return api.patch(`/api/v1/admin/products/${id}`, body, {
    schema: productWriteSchema,
  });
}

export function archiveProduct(id: string) {
  return api.delete(`/api/v1/admin/products/${id}`, { schema: productWriteSchema });
}
