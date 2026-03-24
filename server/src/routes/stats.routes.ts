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

export default router;
