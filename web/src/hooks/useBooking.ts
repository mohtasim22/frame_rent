import { useMutation, useQuery } from "@tanstack/react-query";
import { createBooking, getBooking } from "@/api/booking";

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
