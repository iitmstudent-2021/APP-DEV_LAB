import { Router } from "express";
import multer from "multer";
import path from "path";
import { AlertController } from "../controllers/AlertController";
import { AssetController } from "../controllers/AssetController";
import { AssignmentController } from "../controllers/AssignmentController";
import { MaintenanceLogController } from "../controllers/MaintenanceLogController";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// Asset CRUD
router.get("/", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.TECHNICIAN), AssetController.list);
router.post("/", authenticate, authorize(UserRole.ASSET_MANAGER), AssetController.create);
router.patch("/:assetId/status", authenticate, authorize(UserRole.ADMIN, UserRole.ASSET_MANAGER), AssetController.updateStatus);
router.post("/:assetId/image", authenticate, authorize(UserRole.ASSET_MANAGER), upload.single("image"), AssetController.uploadImage);

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
