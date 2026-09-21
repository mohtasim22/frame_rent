import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelBooking,
  createBooking,
  getBooking,
  getMyBookings,
} from "@/api/booking";

/**
 * Creating a booking is a mutation: it must fire exactly once, when the user
 * says so, and it must never be retried automatically — a retry after a
 * timeout could book a second camera.
 */
export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
    retry: false,
  });
}

export function useBookingByReference(reference: string) {
  return useQuery({
    queryKey: ["booking", reference],
    queryFn: ({ signal }) => getBooking(reference, signal),
    select: (result) => result.data,
    enabled: reference.length > 0,
    staleTime: 60_000,
  });
}

export function useMyBookings(scope: "upcoming" | "past" | "all") {
  return useQuery({
    queryKey: ["bookings", "mine", scope],
    queryFn: ({ signal }) => getMyBookings(scope, signal),
    select: (result) => result.data,
    staleTime: 30_000,
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    retry: false,
    onSuccess: (result) => {
      // The list is now wrong, and so is every availability calendar that was
      // told those dates were taken.
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.setQueryData(["booking", result.data.reference], result);
    },
  });
}
