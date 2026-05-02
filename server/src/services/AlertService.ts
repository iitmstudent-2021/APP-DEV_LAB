import { AppDataSource } from "../app-data-source";
import { Alert, AlertSeverity, AlertStatus } from "../entities/Alert";
import { AssetTechnicianAssignment } from "../entities/AssetTechnicianAssignment";
import { AssetStatus, BESSAsset } from "../entities/BESSAsset";
import { User, UserRole } from "../entities/User";

interface CreateAlertInput {
  title: string;
  severity: AlertSeverity;
  description?: string;
}

interface AlertFilters {
  severity?: AlertSeverity;
  status?: AlertStatus;
  startDate?: string;
  endDate?: string;
}

const alertRepo = () => AppDataSource.getRepository(Alert);
const assetRepo = () => AppDataSource.getRepository(BESSAsset);
const userRepo = () => AppDataSource.getRepository(User);
const assignmentRepo = () => AppDataSource.getRepository(AssetTechnicianAssignment);

export const AlertService = {
  async create(assetId: string, raisedById: string, requesterRole: UserRole, input: CreateAlertInput) {
    const asset = await assetRepo().findOne({ where: { id: assetId }, relations: { owner: true } });
    if (!asset) throw new Error("Asset not found");

    const raisedBy = await userRepo().findOne({ where: { id: raisedById } });
    if (!raisedBy) throw new Error("User not found");

    // Technicians can only raise alerts on assigned assets
    if (requesterRole === UserRole.TECHNICIAN) {
      const assignment = await assignmentRepo().findOne({
        where: { asset: { id: assetId }, technician: { id: raisedById } },
      });
      if (!assignment) throw new Error("You are not assigned to this asset");
    }

    // Asset managers can only raise alerts on their own assets
    if (requesterRole === UserRole.ASSET_MANAGER && asset.owner.id !== raisedById) {
      throw new Error("You can only raise alerts on your own assets");
    }

    const alert = alertRepo().create({
      title: input.title,
      severity: input.severity,
      description: input.description ?? null,
      status: AlertStatus.OPEN,
      raisedAt: new Date(),
      raisedBy,
      asset,
    });

    const saved = await alertRepo().save(alert);

    // Auto-transition asset to UNDER_MAINTENANCE on CRITICAL alert
    if (input.severity === AlertSeverity.CRITICAL && asset.status === AssetStatus.ACTIVE) {
      await assetRepo().update(asset.id, { status: AssetStatus.UNDER_MAINTENANCE });
    }

    return saved;
  },

  async listForAsset(assetId: string) {
    return alertRepo().find({
      where: { asset: { id: assetId } },
      relations: { raisedBy: true },
      order: { raisedAt: "DESC" },
    });
  },

  async listAll(filters?: AlertFilters) {
    const qb = alertRepo()
      .createQueryBuilder("alert")
      .leftJoinAndSelect("alert.raisedBy", "raisedBy")
      .leftJoinAndSelect("alert.asset", "asset");

    if (filters?.severity) qb.andWhere("alert.severity = :severity", { severity: filters.severity });
    if (filters?.status) qb.andWhere("alert.status = :status", { status: filters.status });
    if (filters?.startDate) qb.andWhere("alert.raisedAt >= :startDate", { startDate: new Date(filters.startDate) });
    if (filters?.endDate) qb.andWhere("alert.raisedAt <= :endDate", { endDate: new Date(filters.endDate) });

    return qb.orderBy("alert.raisedAt", "DESC").getMany();
  },

  async updateStatus(alertId: string, status: AlertStatus, requesterId: string, requesterRole: UserRole) {
    const alert = await alertRepo().findOne({
      where: { id: alertId },
      relations: { asset: { owner: true } },
    });
    if (!alert) throw new Error("Alert not found");

    if (requesterRole === UserRole.ASSET_MANAGER && alert.asset.owner.id !== requesterId) {
      throw new Error("You can only update alerts on your own assets");
    }

    alert.status = status;
    if (status === AlertStatus.RESOLVED) {
      alert.resolvedAt = new Date();
    }

    return alertRepo().save(alert);
  },
};
