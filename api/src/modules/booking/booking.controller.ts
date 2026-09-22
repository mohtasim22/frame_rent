import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import type {
  BookingResponse,
  BookingSummary,
  QuoteResponse,
} from "@shared/schemas/booking.schema";
import {
  bookingReferenceParamsSchema,
  createBookingSchema,
  myBookingsQuerySchema,
  quoteRequestSchema,
} from "@shared/schemas/booking.schema";
import { bookingService } from "./booking.service";

export const bookingController = {
  async quote(req: Request, res: Response) {
    const parsed = quoteRequestSchema.parse(req.body);
    const quote = await bookingService.quote(parsed);

    const body: ApiSuccess<QuoteResponse> = { success: true, data: quote };
    res.json(body);
  },

  async create(req: Request, res: Response) {
    const parsed = createBookingSchema.parse(req.body);

    // The IETF/Stripe convention: a header, not a body field, because it is
    // about the REQUEST rather than the booking being described.
    const header = req.headers["idempotency-key"];
    const idempotencyKey =
      typeof header === "string" && header.length >= 8 && header.length <= 200
        ? header
        : undefined;

    const booking = await bookingService.create(parsed, req.user!, idempotencyKey);

    const body: ApiSuccess<BookingResponse> = { success: true, data: booking };
    res.status(201).json(body);
  },

  async listMine(req: Request, res: Response) {
    const query = myBookingsQuerySchema.parse(req.query);
    const bookings = await bookingService.listMine(req.user!, query);

    const body: ApiSuccess<BookingSummary[]> = { success: true, data: bookings };
    res.json(body);
  },

  async getByReference(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const booking = await bookingService.getByReference(
      reference.toUpperCase(),
      req.user!,
    );

    const body: ApiSuccess<BookingResponse> = { success: true, data: booking };
    res.json(body);
  },

  async cancel(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const booking = await bookingService.cancel(reference.toUpperCase(), req.user!);

    const body: ApiSuccess<BookingResponse> = { success: true, data: booking };
    res.json(body);
  },
};
