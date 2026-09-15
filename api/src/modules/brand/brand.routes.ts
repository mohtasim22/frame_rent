import { Router } from "express";
import { brandController } from "./brand.controller";

export const brandRoutes = Router();

brandRoutes.get("/", brandController.list);
