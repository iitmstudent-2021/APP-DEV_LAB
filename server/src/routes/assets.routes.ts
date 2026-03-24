import { Router } from "express";
import { AlertController } from "../controllers/AlertController";
import { AssetController } from "../controllers/AssetController";
import { AssignmentController } from "../controllers/AssignmentController";
import { MaintenanceLogController } from "../controllers/MaintenanceLogController";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

// Asset CRUD
router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), AssetController.list);
router.post("/", authenticate, authorize(UserRole.ASSET_MANAGER), AssetController.create);
router.patch("/:assetId/status", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AssetController.updateStatus);

// Technician assignments for an asset
router.get("/:assetId/assignments", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AssignmentController.list);
router.post("/:assetId/assignments", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AssignmentController.assign);
router.delete("/:assetId/assignments/:technicianId", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AssignmentController.unassign);

// Maintenance logs for an asset
router.get("/:assetId/maintenance-logs", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), MaintenanceLogController.list);
router.post("/:assetId/maintenance-logs", authenticate, authorize(UserRole.TECHNICIAN), MaintenanceLogController.create);

// Alerts for an asset
router.get("/:assetId/alerts", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), AlertController.listForAsset);
router.post("/:assetId/alerts", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), AlertController.create);

export default router;
