import { Request, Response } from "express";
import { AppDataSource } from "../app-data-source";
import { BESSAsset } from "../entities/BESSAsset";
import { AssetCategory, AssetStatus } from "../entities/BESSAsset";
import { UserRole } from "../entities/User";
import { AssetService } from "../services/AssetService";

const isValidCategory = (value: unknown): value is AssetCategory =>
  typeof value === "string" && Object.values(AssetCategory).includes(value as AssetCategory);

const isValidStatus = (value: unknown): value is AssetStatus =>
  typeof value === "string" && Object.values(AssetStatus).includes(value as AssetStatus);

export const AssetController = {
  async list(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const validSortBy = ["name", "capacityKwh", "installationDate", "createdAt"];
    const sortBy = validSortBy.includes(req.query.sortBy as string) ? (req.query.sortBy as string) : undefined;
    const sortOrder: "ASC" | "DESC" = req.query.sortOrder === "ASC" ? "ASC" : "DESC";

    const filters = {
      status: isValidStatus(req.query.status) ? req.query.status : undefined,
      category: isValidCategory(req.query.category) ? req.query.category : undefined,
      search: typeof req.query.search === "string" && req.query.search ? req.query.search : undefined,
      startDate: typeof req.query.startDate === "string" ? req.query.startDate : undefined,
      endDate: typeof req.query.endDate === "string" ? req.query.endDate : undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    };

    const result = await AssetService.listForRole(req.user.id, req.user.role as UserRole, filters);
    return res.status(200).json(result);
  },

  async updateStatus(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const assetId = req.params.assetId as string;
      const { status } = req.body;

      if (!isValidStatus(status)) {
        return res.status(400).json({ message: "Invalid status. Use ACTIVE, UNDER_MAINTENANCE, OFFLINE, or DECOMMISSIONED" });
      }

      const asset = await AssetService.updateStatus(assetId, status, req.user.id, req.user.role as UserRole);
      return res.status(200).json({ asset });
    } catch (error) {
      const msg = (error as Error).message;
      return res.status(msg.includes("not found") ? 404 : 400).json({ message: msg });
    }
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

  async uploadImage(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      if (!req.file) return res.status(400).json({ message: "No image file provided" });

      const assetId = req.params.assetId as string;
      const asset = await AppDataSource.getRepository(BESSAsset).findOne({
        where: { id: assetId },
        relations: { owner: true },
      });
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      if (asset.owner.id !== req.user.id) return res.status(403).json({ message: "Not your asset" });

      const imageUrl = `/uploads/${req.file.filename}`;
      await AppDataSource.getRepository(BESSAsset).update(assetId, { imageUrl });
      return res.status(200).json({ imageUrl });
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  },
};
