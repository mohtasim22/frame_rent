import { Router } from "express";
import { requireAdmin } from "../../middleware/auth";
import { adminController } from "./admin.controller";

export const adminRoutes = Router();

// One guard for the whole subtree. A new endpoint added below is protected by
// default rather than protected if somebody remembers.
adminRoutes.use(requireAdmin);

adminRoutes.get("/dashboard", adminController.dashboard);
adminRoutes.get("/occupancy", adminController.occupancy);

adminRoutes.get("/bookings", adminController.listBookings);
adminRoutes.post("/bookings/:reference/status", adminController.transition);
adminRoutes.post("/bookings/:reference/return", adminController.receiveReturn);

adminRoutes.post("/products", adminController.createProduct);
adminRoutes.patch("/products/:id", adminController.updateProduct);
adminRoutes.delete("/products/:id", adminController.archiveProduct);

adminRoutes.get("/products/:id/units", adminController.listUnits);
adminRoutes.post("/products/:id/units", adminController.addUnit);
adminRoutes.patch("/units/:id", adminController.updateUnit);

adminRoutes.post("/holds", adminController.createHold);
adminRoutes.delete("/holds/:id", adminController.deleteHold);
