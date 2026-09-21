import { Router } from "express";
import { requireUser } from "../../middleware/auth";
import { reviewController } from "./review.controller";

export const reviewRoutes = Router();

reviewRoutes.get("/mine", requireUser, reviewController.listReviewable);
reviewRoutes.post("/", requireUser, reviewController.create);
