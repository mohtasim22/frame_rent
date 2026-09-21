import { Router } from "express";
import { brandRoutes } from "./modules/brand/brand.routes";
import { gearRoutes } from "./modules/gear/gear.routes";
import { categoryRoutes } from "./modules/category/category.routes";
import { bookingRoutes } from "./modules/booking/booking.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { reviewRoutes } from "./modules/review/review.routes";


export const apiRoutes = Router();

apiRoutes.use("/brands", brandRoutes);
apiRoutes.use("/gear", gearRoutes);
apiRoutes.use("/categories", categoryRoutes);
apiRoutes.use("/bookings", bookingRoutes);
apiRoutes.use("/admin", adminRoutes);
apiRoutes.use("/reviews", reviewRoutes);
