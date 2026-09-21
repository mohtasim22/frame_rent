import { Router } from "express";
import { requireUser } from "../../middleware/auth";
import { bookingController } from "./booking.controller";

export const bookingRoutes = Router();

// Quoting is public: the cart prices itself before anyone signs in.
bookingRoutes.post("/quote", bookingController.quote);

bookingRoutes.post("/", requireUser, bookingController.create);
bookingRoutes.get("/mine", requireUser, bookingController.listMine);
bookingRoutes.get("/:reference", requireUser, bookingController.getByReference);
bookingRoutes.post("/:reference/cancel", requireUser, bookingController.cancel);
