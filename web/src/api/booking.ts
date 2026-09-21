import { quoteResponseSchema } from "@shared/schemas/booking.schema";
import type { QuoteRequest } from "@shared/schemas/booking.schema";
import { api } from "./client";

export function postQuote(body: QuoteRequest, signal?: AbortSignal) {
  return api.post("/api/v1/bookings/quote", body, {
    schema: quoteResponseSchema,
    signal,
  });
}
