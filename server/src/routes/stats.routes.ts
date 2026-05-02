import { Router } from "express";
import { UserRole } from "../entities/User";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { StatsService } from "../services/StatsService";

const router = Router();

router.get("/", authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  const stats = await StatsService.getGlobalStats();
  return res.status(200).json({ stats });
});

router.get("/manager", authenticate, authorize(UserRole.ASSET_MANAGER), async (req, res) => {
  const stats = await StatsService.getManagerStats(req.user!.id);
  return res.status(200).json({ stats });
});

router.get("/alert-trends", authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  const trends = await StatsService.getAlertTrends();
  return res.status(200).json({ trends });
});

router.get("/soh-overview", authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  const overview = await StatsService.getSoHOverview();
  return res.status(200).json({ overview });
});

export default router;
