import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { gearQuerySchema, gearSlugParamsSchema } from "@shared/schemas/gear.schema";
import { gearService } from "./gear.service";

export const gearController = {
  async list(req: Request, res: Response) {
    const query = gearQuerySchema.parse(req.query);
    const { items, total } = await gearService.list(query);

    const body: ApiSuccess<typeof items> = {
      success: true,
      data: items,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.ceil(total / query.perPage),
      },
    };
    res.json(body);
  },
  async getBySlug(req: Request, res: Response) {
    const { slug } = gearSlugParamsSchema.parse(req.params);
    const product = await gearService.getBySlug(slug);

    const body: ApiSuccess<typeof product> = { success: true, data: product };
    res.json(body);
  },

};
