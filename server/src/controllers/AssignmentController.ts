import { Request, Response } from "express";
import { UserRole } from "../entities/User";
import { AssignmentService } from "../services/AssignmentService";

export const AssignmentController = {
  async list(req: Request, res: Response) {
    const assetId = req.params.assetId as string;
    const assignments = await AssignmentService.listForAsset(assetId);
    return res.status(200).json({ assignments });
  },

  async assign(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const assetId = req.params.assetId as string;
      const { technicianId } = req.body;

      if (!technicianId) return res.status(400).json({ message: "technicianId is required" });

      const assignment = await AssignmentService.assign(
        assetId,
        technicianId,
        req.user.id,
        req.user.role as UserRole
      );
      return res.status(201).json({ assignment });
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: msg });
    }
  },

  async unassign(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const assetId = req.params.assetId as string;
      const technicianId = req.params.technicianId as string;

      await AssignmentService.unassign(assetId, technicianId, req.user.id, req.user.role as UserRole);
      return res.status(200).json({ message: "Technician unassigned" });
    } catch (error) {
      const msg = (error as Error).message;
      const status = msg.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: msg });
    }
  },
};
