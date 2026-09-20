import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { availabilityQuerySchema, AvailabilityResponse, gearQuerySchema, gearSlugParamsSchema } from "@shared/schemas/gear.schema";
import { gearService } from "./gear.service";
import { availabilityService } from "../availability/availability.service";

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
    async availability(req: Request, res: Response) {
    const { slug } = gearSlugParamsSchema.parse(req.params);
    const { from, to } = availabilityQuerySchema.parse(req.query);

    const product = await gearService.getBySlug(slug);
    const unavailableDates = await availabilityService.getUnavailableDates(product.id, from, to);

    const body: ApiSuccess<AvailabilityResponse> = {
      success: true,
      data: { from, to, unavailableDates },
    };
    res.json(body);
  },


};
