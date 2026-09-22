import { z } from "zod";
import {
  bookingResponseSchema,
  bookingSummarySchema,
  paymentIntentSchema,
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

export function createBooking({
  idempotencyKey,
  ...body
}: CreateBooking & { idempotencyKey: string }) {
  return api.post("/api/v1/bookings", body, {
    schema: bookingResponseSchema,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function getBooking(reference: string, signal?: AbortSignal) {
  return api.get(`/api/v1/bookings/${encodeURIComponent(reference)}`, {
    schema: bookingResponseSchema,
    signal,
  });
}

const bookingListSchema = z.array(bookingSummarySchema);

export function getMyBookings(scope: "upcoming" | "past" | "all", signal?: AbortSignal) {
  return api.get("/api/v1/bookings/mine", {
    query: { scope },
    schema: bookingListSchema,
    signal,
  });
}

export function cancelBooking(reference: string) {
  return api.post(
    `/api/v1/bookings/${encodeURIComponent(reference)}/cancel`,
    undefined,
    { schema: bookingResponseSchema },
  );
}

export function createPaymentIntent(reference: string) {
  return api.post(
    `/api/v1/payments/bookings/${encodeURIComponent(reference)}/intent`,
    undefined,
    { schema: paymentIntentSchema },
  );
}
