import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { bookingReferenceParamsSchema } from "@shared/schemas/booking.schema";
import { paymentService } from "./payment.service";

export const paymentController = {
  async createIntent(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const data = await paymentService.intentForBooking(
      reference.toUpperCase(),
      req.user!,
    );

    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },
};
