import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { brandService } from "./brand.service";

export const brandController = {
  async list(_req: Request, res: Response) {
    const brands = await brandService.listAll();

    const body: ApiSuccess<typeof brands> = { success: true, data: brands };
    res.json(body);
  },
};
