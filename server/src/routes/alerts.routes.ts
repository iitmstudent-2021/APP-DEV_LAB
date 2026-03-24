import { Router } from "express";
import { AlertController } from "../controllers/AlertController";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

// Admin: list all alerts across all assets
router.get("/", authenticate, authorize(UserRole.ADMIN), AlertController.listAll);

// Update alert status (acknowledge / resolve)
router.patch("/:alertId", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AlertController.updateStatus);

export default router;
