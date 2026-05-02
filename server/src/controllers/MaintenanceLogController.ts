import { Request, Response } from "express";
import { MaintenanceLogType } from "../entities/MaintenanceLog";
import { MaintenanceLogService } from "../services/MaintenanceLogService";

const isValidLogType = (v: unknown): v is MaintenanceLogType =>
  typeof v === "string" && Object.values(MaintenanceLogType).includes(v as MaintenanceLogType);

export const MaintenanceLogController = {
  async list(req: Request, res: Response) {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const { logType, startDate, endDate } = req.query;
    const filters = {
      logType: isValidLogType(logType) ? (logType as MaintenanceLogType) : undefined,
      startDate: typeof startDate === "string" && startDate ? startDate : undefined,
      endDate: typeof endDate === "string" && endDate ? endDate : undefined,
    };
    const logs = await MaintenanceLogService.listForAsset(req.params.assetId as string, limit, filters);
    return res.status(200).json({ logs });
  },

  async sohTrend(req: Request, res: Response) {
    const trend = await MaintenanceLogService.getSoHTrend(req.params.assetId as string);
    return res.status(200).json({ trend });
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const assetId = req.params.assetId as string;
      const { logType, description, stateOfHealthPercent, temperatureCelsius, notes, visitedAt } = req.body;

      if (!logType || !description || stateOfHealthPercent === undefined || !visitedAt) {
        return res.status(400).json({ message: "logType, description, stateOfHealthPercent, and visitedAt are required" });
      }

      if (!isValidLogType(logType)) {
        return res.status(400).json({ message: "Invalid logType" });
      }

      const soh = Number(stateOfHealthPercent);
      if (isNaN(soh) || soh < 0 || soh > 100) {
        return res.status(400).json({ message: "stateOfHealthPercent must be a number between 0 and 100" });
      }

      const log = await MaintenanceLogService.create(assetId, req.user.id, {
        logType,
        description,
        stateOfHealthPercent: Number(stateOfHealthPercent),
        temperatureCelsius: temperatureCelsius !== undefined ? Number(temperatureCelsius) : undefined,
        notes,
        visitedAt,
      });

      return res.status(201).json({ log });
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: msg });
    }
  },
};
