import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), UserController.list);
router.patch("/:userId/role", authenticate, authorize(UserRole.ADMIN), UserController.updateRole);

export default router;
