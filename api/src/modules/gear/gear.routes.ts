import { Router } from "express";
import { gearController } from "./gear.controller";
import { reviewController } from "../review/review.controller";

export const gearRoutes = Router();

gearRoutes.get("/", gearController.list);
gearRoutes.get("/:slug", gearController.getBySlug);
gearRoutes.get("/:slug/availability", gearController.availability);
gearRoutes.get("/:slug/reviews", reviewController.listForProduct);
