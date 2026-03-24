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

  async listAll() {
    return alertRepo().find({
      relations: { raisedBy: true, asset: true },
      order: { raisedAt: "DESC" },
    });
  },

  async updateStatus(alertId: string, status: AlertStatus) {
    const alert = await alertRepo().findOne({ where: { id: alertId } });
    if (!alert) throw new Error("Alert not found");

    alert.status = status;
    if (status === AlertStatus.RESOLVED) {
      alert.resolvedAt = new Date();
    }

    return alertRepo().save(alert);
  },
};
