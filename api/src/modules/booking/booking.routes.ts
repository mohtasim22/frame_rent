import { Router } from "express";
import { bookingController } from "./booking.controller";

export const bookingRoutes = Router();

bookingRoutes.post("/quote", bookingController.quote);
bookingRoutes.post("/", bookingController.create);
bookingRoutes.get("/:reference", bookingController.getByReference);
