import { Router } from "express";
import { requireUser } from "../../middleware/auth";
import { paymentController } from "./payment.controller";

export const paymentRoutes = Router();

paymentRoutes.post(
  "/bookings/:reference/intent",
  requireUser,
  paymentController.createIntent,
);
