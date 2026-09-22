import type { Request, Response } from "express";
import { z } from "zod";
import type { ApiSuccess } from "@shared/types/api";
import {
  adminBookingQuerySchema,
  holdInputSchema,
  occupancyQuerySchema,
  productImagesSchema,
  productInputSchema,
  productPatchSchema,
  returnBookingSchema,
  transitionSchema,
  unitInputSchema,
  unitPatchSchema,
} from "@shared/schemas/admin.schema";
import { bookingReferenceParamsSchema } from "@shared/schemas/booking.schema";
import { adminService } from "./admin.service";
import { signUpload, uploadsEnabled } from "../../lib/cloudinary";
import { ServiceUnavailableError } from "../../lib/errors";

const idParams = z.object({ id: z.string().min(1) });

export const adminController = {
  async listBookings(req: Request, res: Response) {
    const query = adminBookingQuerySchema.parse(req.query);
    const { rows, total } = await adminService.listBookings(query);

    const body: ApiSuccess<typeof rows> = {
      success: true,
      data: rows,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.ceil(total / query.perPage),
      },
    };
    res.json(body);
  },

  async transition(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const { status } = transitionSchema.parse(req.body);

    const row = await adminService.transition(reference.toUpperCase(), status);
    res.json({ success: true, data: row } satisfies ApiSuccess<typeof row>);
  },

  async receiveReturn(req: Request, res: Response) {
    const { reference } = bookingReferenceParamsSchema.parse(req.params);
    const input = returnBookingSchema.parse(req.body ?? {});

    const row = await adminService.receiveReturn(
      reference.toUpperCase(),
      input,
    );
    res.json({ success: true, data: row } satisfies ApiSuccess<typeof row>);
  },

  async listProducts(_req: Request, res: Response) {
    const products = await adminService.listProducts();
    res.json({ success: true, data: products } satisfies ApiSuccess<typeof products>);
  },

  async createProduct(req: Request, res: Response) {
    const input = productInputSchema.parse(req.body);
    const product = await adminService.createProduct(input);

    res
      .status(201)
      .json({ success: true, data: product } satisfies ApiSuccess<
        typeof product
      >);
  },

  async updateProduct(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const input = productPatchSchema.parse(req.body);

    const product = await adminService.updateProduct(id, input);
    res.json({ success: true, data: product } satisfies ApiSuccess<
      typeof product
    >);
  },

  async archiveProduct(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const product = await adminService.archiveProduct(id);

    res.json({ success: true, data: product } satisfies ApiSuccess<
      typeof product
    >);
  },

  async uploadSignature(_req: Request, res: Response) {
    if (!uploadsEnabled) {
      throw new ServiceUnavailableError(
        "Image uploads are not configured on this server",
        "UPLOADS_DISABLED",
      );
    }

    const data = signUpload();
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },

  async setProductImages(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const { images } = productImagesSchema.parse(req.body);

    const product = await adminService.setProductImages(id, images);
    res.json({ success: true, data: product } satisfies ApiSuccess<typeof product>);
  },

  async listUnits(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const units = await adminService.listUnits(id);

    res.json({ success: true, data: units } satisfies ApiSuccess<typeof units>);
  },

  async addUnit(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const input = unitInputSchema.parse(req.body);

    const unit = await adminService.addUnit(id, input);
    res
      .status(201)
      .json({ success: true, data: unit } satisfies ApiSuccess<typeof unit>);
  },

  async updateUnit(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const input = unitPatchSchema.parse(req.body);

    const unit = await adminService.updateUnit(id, input);
    res.json({ success: true, data: unit } satisfies ApiSuccess<typeof unit>);
  },

  async createHold(req: Request, res: Response) {
    const input = holdInputSchema.parse(req.body);
    const hold = await adminService.createHold(input);

    res
      .status(201)
      .json({ success: true, data: hold } satisfies ApiSuccess<typeof hold>);
  },

  async deleteHold(req: Request, res: Response) {
    const { id } = idParams.parse(req.params);
    const deleted = await adminService.deleteHold(id);

    res.json({ success: true, data: deleted } satisfies ApiSuccess<
      typeof deleted
    >);
  },

  async dashboard(_req: Request, res: Response) {
    const data = await adminService.dashboard();
    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },

  async occupancy(req: Request, res: Response) {
    const { from, to, productId } = occupancyQuerySchema.parse(req.query);
    const data = await adminService.occupancy(from, to, productId);

    res.json({ success: true, data } satisfies ApiSuccess<typeof data>);
  },
};
