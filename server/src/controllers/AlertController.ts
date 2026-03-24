import { Request, Response } from "express";
import { AlertSeverity, AlertStatus } from "../entities/Alert";
import { UserRole } from "../entities/User";
import { AlertService } from "../services/AlertService";

const isValidSeverity = (v: unknown): v is AlertSeverity =>
  typeof v === "string" && Object.values(AlertSeverity).includes(v as AlertSeverity);

const isValidStatus = (v: unknown): v is AlertStatus =>
  typeof v === "string" && Object.values(AlertStatus).includes(v as AlertStatus);

export const AlertController = {
  async listForAsset(req: Request, res: Response) {
    const alerts = await AlertService.listForAsset(req.params.assetId as string);
    return res.status(200).json({ alerts });
  },

  async listAll(_req: Request, res: Response) {
    const alerts = await AlertService.listAll();
    return res.status(200).json({ alerts });
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const assetId = req.params.assetId as string;
      const { title, severity, description } = req.body;

      if (!title || !severity) {
        return res.status(400).json({ message: "title and severity are required" });
      }

      if (!isValidSeverity(severity)) {
        return res.status(400).json({ message: "Invalid severity. Use CRITICAL, WARNING, or INFO" });
      }

      const alert = await AlertService.create(assetId, req.user.id, req.user.role as UserRole, {
        title,
        severity,
        description,
      });

      return res.status(201).json({ alert });
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: msg });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const alertId = req.params.alertId as string;
      const { status } = req.body;

      if (!isValidStatus(status)) {
        return res.status(400).json({ message: "Invalid status. Use OPEN, ACKNOWLEDGED, or RESOLVED" });
      }

      const alert = await AlertService.updateStatus(alertId, status);
      return res.status(200).json({ alert });
    } catch (error) {
      const msg = (error as Error).message;
      return res.status(msg.includes("not found") ? 404 : 400).json({ message: msg });
    }
  },
};
