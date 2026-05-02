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

interface LogFilters {
  logType?: MaintenanceLogType;
  startDate?: string;
  endDate?: string;
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

  async listForAsset(assetId: string, limit?: number, filters?: LogFilters) {
    const qb = logRepo()
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.technician", "technician")
      .where("log.asset = :assetId", { assetId });

    if (filters?.logType) qb.andWhere("log.logType = :logType", { logType: filters.logType });
    if (filters?.startDate) qb.andWhere("log.visitedAt >= :startDate", { startDate: new Date(filters.startDate) });
    if (filters?.endDate) qb.andWhere("log.visitedAt <= :endDate", { endDate: new Date(filters.endDate) });

    qb.orderBy("log.visitedAt", "DESC");
    if (limit) qb.take(limit);

    return qb.getMany();
  },

  async getSoHTrend(assetId: string) {
    const logs = await logRepo().find({
      where: { asset: { id: assetId } },
      select: ["visitedAt", "stateOfHealthPercent", "logType"],
      order: { visitedAt: "ASC" },
      take: 20,
    });
    return logs.map(l => ({
      date: new Date(l.visitedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      soh: Number(l.stateOfHealthPercent),
      type: l.logType,
    }));
  },
};
