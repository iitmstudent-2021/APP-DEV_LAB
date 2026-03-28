import { In } from "typeorm";
import { AppDataSource } from "../app-data-source";
import { Alert, AlertSeverity, AlertStatus } from "../entities/Alert";
import { AssetCategory, AssetStatus, BESSAsset } from "../entities/BESSAsset";
import { User, UserRole } from "../entities/User";

interface CreateAssetInput {
  name: string;
  description?: string;
  siteName: string;
  category: AssetCategory;
  capacityKwh: number;
  installationDate?: string;
  imageUrl?: string;
}

interface AssetFilters {
  status?: AssetStatus;
  category?: AssetCategory;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

const assetRepository = () => AppDataSource.getRepository(BESSAsset);
const userRepository = () => AppDataSource.getRepository(User);
const alertRepository = () => AppDataSource.getRepository(Alert);

export const AssetService = {
  async createForManager(managerId: string, input: CreateAssetInput) {
    const manager = await userRepository().findOne({ where: { id: managerId, role: UserRole.ASSET_MANAGER } });
    if (!manager) {
      throw new Error("Asset manager account not found");
    }

    const asset = assetRepository().create({
      name: input.name,
      description: input.description ?? null,
      siteName: input.siteName,
      category: input.category,
      capacityKwh: input.capacityKwh,
      status: AssetStatus.ACTIVE,
      installationDate: input.installationDate ? new Date(input.installationDate) : null,
      imageUrl: input.imageUrl ?? null,
      owner: manager,
    });

    return assetRepository().save(asset);
  },

  async listForRole(userId: string, role: UserRole, filters?: AssetFilters) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const validSortFields: Record<string, string> = {
      name: "asset.name",
      capacityKwh: "asset.capacityKwh",
      installationDate: "asset.installationDate",
      createdAt: "asset.createdAt",
    };
    const orderField = validSortFields[filters?.sortBy ?? ""] ?? "asset.createdAt";
    const orderDir = filters?.sortOrder ?? "DESC";

    const buildQb = (baseWhere?: string, baseParams?: Record<string, unknown>) => {
      const qb = assetRepository()
        .createQueryBuilder("asset")
        .leftJoinAndSelect("asset.owner", "owner");

      if (baseWhere) qb.where(baseWhere, baseParams);

      if (filters?.status) qb.andWhere("asset.status = :status", { status: filters.status });
      if (filters?.category) qb.andWhere("asset.category = :category", { category: filters.category });
      if (filters?.search) qb.andWhere("(asset.name LIKE :q OR asset.siteName LIKE :q)", { q: `%${filters.search}%` });
      if (filters?.startDate) qb.andWhere("asset.installationDate >= :startDate", { startDate: new Date(filters.startDate) });
      if (filters?.endDate) qb.andWhere("asset.installationDate <= :endDate", { endDate: new Date(filters.endDate) });

      return qb;
    };

    if (role === UserRole.ADMIN) {
      const qb = buildQb();
      const total = await qb.getCount();
      const assets = await qb.orderBy(orderField, orderDir).skip(offset).take(limit).getMany();
      return { assets, total, page, limit };
    }

    if (role === UserRole.ASSET_MANAGER) {
      const qb = buildQb("asset.owner = :uid", { uid: userId });
      const total = await qb.getCount();
      const assets = await qb.orderBy(orderField, orderDir).skip(offset).take(limit).getMany();
      return { assets, total, page, limit };
    }

    // Technician — only assigned assets
    const qb = assetRepository()
      .createQueryBuilder("asset")
      .leftJoinAndSelect("asset.owner", "owner")
      .leftJoin("asset.assignments", "assignment")
      .leftJoin("assignment.technician", "technician")
      .where("technician.id = :userId", { userId });

    if (filters?.status) qb.andWhere("asset.status = :status", { status: filters.status });
    if (filters?.category) qb.andWhere("asset.category = :category", { category: filters.category });
    if (filters?.search) qb.andWhere("(asset.name LIKE :q OR asset.siteName LIKE :q)", { q: `%${filters.search}%` });
    if (filters?.startDate) qb.andWhere("asset.installationDate >= :startDate", { startDate: new Date(filters.startDate) });
    if (filters?.endDate) qb.andWhere("asset.installationDate <= :endDate", { endDate: new Date(filters.endDate) });

    const total = await qb.getCount();
    const assets = await qb.orderBy(orderField, orderDir).skip(offset).take(limit).getMany();
    return { assets, total, page, limit };
  },

  async updateStatus(assetId: string, newStatus: AssetStatus, requesterId: string, requesterRole: UserRole) {
    const asset = await assetRepository().findOne({ where: { id: assetId }, relations: { owner: true } });
    if (!asset) throw new Error("Asset not found");

    if (requesterRole === UserRole.ASSET_MANAGER && asset.owner.id !== requesterId) {
      throw new Error("You can only update status of your own assets");
    }

    // Block transition to ACTIVE if any unresolved Critical alert exists
    if (newStatus === AssetStatus.ACTIVE) {
      const openCritical = await alertRepository().count({
        where: {
          asset: { id: assetId },
          severity: AlertSeverity.CRITICAL,
          status: In([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]),
        },
      });
      if (openCritical > 0) {
        throw new Error("Cannot set asset to Active: resolve all Critical alerts first.");
      }
    }

    asset.status = newStatus;
    return assetRepository().save(asset);
  },
};
