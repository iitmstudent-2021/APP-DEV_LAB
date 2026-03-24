import { AppDataSource } from "../app-data-source";
import { Alert, AlertSeverity, AlertStatus } from "../entities/Alert";
import { AssetStatus, BESSAsset } from "../entities/BESSAsset";
import { AssetTechnicianAssignment } from "../entities/AssetTechnicianAssignment";
import { MaintenanceLog, MaintenanceLogType } from "../entities/MaintenanceLog";
import { User, UserRole } from "../entities/User";

interface CreateLogInput {
  logType: MaintenanceLogType;
  description: string;
  stateOfHealthPercent: number;
  temperatureCelsius?: number;
  notes?: string;
  visitedAt: string;
}

const logRepo = () => AppDataSource.getRepository(MaintenanceLog);
const assetRepo = () => AppDataSource.getRepository(BESSAsset);
const userRepo = () => AppDataSource.getRepository(User);
const assignmentRepo = () => AppDataSource.getRepository(AssetTechnicianAssignment);
const alertRepo = () => AppDataSource.getRepository(Alert);

export const MaintenanceLogService = {
  async create(assetId: string, technicianId: string, input: CreateLogInput) {
    const asset = await assetRepo().findOne({ where: { id: assetId } });
    if (!asset) throw new Error("Asset not found");

    const technician = await userRepo().findOne({ where: { id: technicianId, role: UserRole.TECHNICIAN } });
    if (!technician) throw new Error("Technician not found");

    // Technician must be assigned to this asset
    const assignment = await assignmentRepo().findOne({
      where: { asset: { id: assetId }, technician: { id: technicianId } },
    });
    if (!assignment) throw new Error("You are not assigned to this asset");

    const log = logRepo().create({
      logType: input.logType,
      description: input.description,
      stateOfHealthPercent: input.stateOfHealthPercent,
      temperatureCelsius: input.temperatureCelsius ?? null,
      notes: input.notes ?? null,
      visitedAt: new Date(input.visitedAt),
      technician,
      asset,
    });

    const saved = await logRepo().save(log);

    // Auto-alert on low State of Health
    const soh = input.stateOfHealthPercent;
    if (soh < 20) {
      const autoAlert = alertRepo().create({
        title: `Critical SoH: ${soh}% on ${asset.name}`,
        severity: AlertSeverity.CRITICAL,
        description: `State of Health dropped to ${soh}% — immediate attention required.`,
        status: AlertStatus.OPEN,
        raisedAt: new Date(),
        raisedBy: technician,
        asset,
      });
      await alertRepo().save(autoAlert);
      // Also flip asset status
      if (asset.status === AssetStatus.ACTIVE) {
        await assetRepo().update(asset.id, { status: AssetStatus.UNDER_MAINTENANCE });
      }
    } else if (soh < 40) {
      const autoAlert = alertRepo().create({
        title: `Low SoH Warning: ${soh}% on ${asset.name}`,
        severity: AlertSeverity.WARNING,
        description: `State of Health is at ${soh}% — schedule maintenance soon.`,
        status: AlertStatus.OPEN,
        raisedAt: new Date(),
        raisedBy: technician,
        asset,
      });
      await alertRepo().save(autoAlert);
    }

    return saved;
  },

  async listForAsset(assetId: string) {
    return logRepo().find({
      where: { asset: { id: assetId } },
      relations: { technician: true },
      order: { visitedAt: "DESC" },
    });
  },
};
