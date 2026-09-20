import type { Request, Response } from "express";
import type { ApiSuccess } from "@shared/types/api";
import { categoryService } from "./category.service";

export const categoryController = {
  async list(_req: Request, res: Response) {
    const categories = await categoryService.listAll();

    const body: ApiSuccess<typeof categories> = { success: true, data: categories };
    res.json(body);
  },
};
