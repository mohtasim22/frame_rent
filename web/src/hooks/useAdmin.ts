import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminBookingQuery } from "@shared/schemas/admin.schema";
import type { BookingStatus, UnitCondition, UnitStatus } from "@shared/types/domain";
import {
  addUnit,
  archiveProduct,
  createHold,
  getAdminBookings,
  getDashboard,
  getOccupancy,
  getAdminProducts,
  getUnits,
  returnBooking,
  setProductActive,
  transitionBooking,
  updateUnit,
} from "@/api/admin";

/** Anything that changes a booking invalidates all of these at once. */
function useAdminInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["gear"] });
  };
}

export function useAdminBookings(query: Partial<AdminBookingQuery>) {
  return useQuery({
    queryKey: ["admin", "bookings", query],
    queryFn: ({ signal }) => getAdminBookings(query, signal),
    staleTime: 15_000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => getDashboard(signal),
    select: (result) => result.data,
    staleTime: 15_000,
  });
}

export function useOccupancy(from: string, to: string, productId?: string) {
  return useQuery({
    queryKey: ["admin", "occupancy", from, to, productId ?? null],
    queryFn: ({ signal }) => getOccupancy(from, to, productId, signal),
    select: (result) => result.data,
    staleTime: 15_000,
  });
}

export function useTransition() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({ reference, status }: { reference: string; status: BookingStatus }) =>
      transitionBooking(reference, status),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useReturnBooking() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      reference,
      ...body
    }: {
      reference: string;
      returnedOn?: string;
      condition?: UnitCondition;
      notes?: string;
    }) => returnBooking(reference, body),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useUnits(productId: string) {
  return useQuery({
    queryKey: ["admin", "units", productId],
    queryFn: ({ signal }) => getUnits(productId, signal),
    select: (result) => result.data,
    enabled: productId.length > 0,
  });
}

export function useAddUnit(productId: string) {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: (body: {
      serialNumber: string;
      condition: UnitCondition;
      status: UnitStatus;
    }) => addUnit(productId, body),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useUpdateUnit() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status?: UnitStatus;
      condition?: UnitCondition;
    }) => updateUnit(id, body),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useCreateHold() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: createHold,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useArchiveProduct() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: archiveProduct,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: ({ signal }) => getAdminProducts(signal),
    select: (result) => result.data,
    staleTime: 15_000,
  });
}

export function useSetProductActive() {
  const invalidate = useAdminInvalidation();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setProductActive(id, isActive),
    retry: false,
    onSuccess: invalidate,
  });
}
