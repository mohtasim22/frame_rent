import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import type { QuoteResponse } from "@shared/schemas/booking.schema";
import { quoteRequestSchema } from "@shared/schemas/booking.schema";
import { bookingService } from "./booking.service";

export const bookingController = {
  async quote(req: Request, res: Response) {
    const parsed = quoteRequestSchema.parse(req.body);
    const quote = await bookingService.quote(parsed);

    const body: ApiSuccess<QuoteResponse> = { success: true, data: quote };
    res.json(body);
  },
};
