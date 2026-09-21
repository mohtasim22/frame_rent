import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import type { BookingResponse, QuoteResponse } from "@shared/schemas/booking.schema";
import {
  bookingReferenceParamsSchema,
  createBookingSchema,
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
    const booking = await bookingService.create(parsed);

    const body: ApiSuccess<BookingResponse> = { success: true, data: booking };
    res.status(201).json(body);
  },

  async getByReference(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const booking = await bookingService.getByReference(reference.toUpperCase());

    const body: ApiSuccess<BookingResponse> = { success: true, data: booking };
    res.json(body);
  },
};
