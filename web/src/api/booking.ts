import {
  bookingResponseSchema,
  quoteResponseSchema,
} from "@shared/schemas/booking.schema";
import type { CreateBooking, QuoteRequest } from "@shared/schemas/booking.schema";
import { api } from "./client";

export function postQuote(body: QuoteRequest, signal?: AbortSignal) {
  return api.post("/api/v1/bookings/quote", body, {
    schema: quoteResponseSchema,
    signal,
  });
}

export function createBooking(body: CreateBooking) {
  return api.post("/api/v1/bookings", body, { schema: bookingResponseSchema });
}

export function getBooking(reference: string, signal?: AbortSignal) {
  return api.get(`/api/v1/bookings/${encodeURIComponent(reference)}`, {
    schema: bookingResponseSchema,
    signal,
  });
}
