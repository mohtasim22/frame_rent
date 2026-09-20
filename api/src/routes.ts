import { Router } from "express";
import { brandRoutes } from "./modules/brand/brand.routes";
import { gearRoutes } from "./modules/gear/gear.routes";
import { categoryRoutes } from "./modules/category/category.routes";


export const apiRoutes = Router();

apiRoutes.use("/brands", brandRoutes);
apiRoutes.use("/gear", gearRoutes);
apiRoutes.use("/categories", categoryRoutes);
