import { Router } from "express";
import { AssetController } from "../controllers/AssetController";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), AssetController.list);
router.post("/", authenticate, authorize(UserRole.ASSET_MANAGER), AssetController.create);

export default router;
