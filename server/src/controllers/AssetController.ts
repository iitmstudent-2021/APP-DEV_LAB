import { Request, Response } from "express";
import { AssetCategory } from "../entities/BESSAsset";
import { UserRole } from "../entities/User";
import { AssetService } from "../services/AssetService";

const isValidCategory = (value: unknown): value is AssetCategory => {
  return typeof value === "string" && Object.values(AssetCategory).includes(value as AssetCategory);
};

export const AssetController = {
  async list(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const assets = await AssetService.listForRole(req.user.id, req.user.role as UserRole);
    return res.status(200).json({ assets });
  },

  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role !== UserRole.ASSET_MANAGER) {
        return res.status(403).json({ message: "Only Asset Managers can create assets" });
      }

      const { name, description, siteName, category, capacityKwh, installationDate, imageUrl } = req.body;
      if (!name || !siteName || !category || capacityKwh === undefined) {
        return res.status(400).json({ message: "name, siteName, category, and capacityKwh are required" });
      }

      if (!isValidCategory(category)) {
        return res.status(400).json({ message: "Invalid asset category" });
      }

      const asset = await AssetService.createForManager(req.user.id, {
        name,
        description,
        siteName,
        category,
        capacityKwh: Number(capacityKwh),
        installationDate,
        imageUrl,
      });

      return res.status(201).json({ asset });
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  },
};
