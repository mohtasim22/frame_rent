import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { createReviewSchema } from "@shared/schemas/review.schema";
import { gearSlugParamsSchema } from "@shared/schemas/gear.schema";
import { reviewService } from "./review.service";

export const reviewController = {
  async listForProduct(req: Request, res: Response) {
    const { slug } = gearSlugParamsSchema.parse(req.params);
    const data = await reviewService.listForProduct(slug);

    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },

  async listReviewable(req: Request, res: Response) {
    const data = await reviewService.listReviewable(req.user!);

    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },

  async create(req: Request, res: Response) {
    const input = createReviewSchema.parse(req.body);
    const data = await reviewService.create(input, req.user!);

    res.status(201).json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },
};
