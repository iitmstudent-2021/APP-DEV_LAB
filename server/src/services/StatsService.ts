import { AppDataSource } from "../app-data-source";
import { Alert, AlertSeverity, AlertStatus } from "../entities/Alert";
import { AssetStatus, BESSAsset } from "../entities/BESSAsset";
import { MaintenanceLog } from "../entities/MaintenanceLog";
import { User, UserRole } from "../entities/User";

export const StatsService = {
  async getGlobalStats() {
    const assetRepo = AppDataSource.getRepository(BESSAsset);
    const alertRepo = AppDataSource.getRepository(Alert);
    const userRepo = AppDataSource.getRepository(User);
    const logRepo = AppDataSource.getRepository(MaintenanceLog);

    const [
      totalAssets,
      activeAssets,
      underMaintenanceAssets,
      offlineAssets,
      decommissionedAssets,
      openAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      totalTechnicians,
      totalManagers,
      totalLogs,
    ] = await Promise.all([
      assetRepo.count(),
      assetRepo.count({ where: { status: AssetStatus.ACTIVE } }),
      assetRepo.count({ where: { status: AssetStatus.UNDER_MAINTENANCE } }),
      assetRepo.count({ where: { status: AssetStatus.OFFLINE } }),
      assetRepo.count({ where: { status: AssetStatus.DECOMMISSIONED } }),
      alertRepo.count({ where: { status: AlertStatus.OPEN } }),
      alertRepo.count({ where: { status: AlertStatus.ACKNOWLEDGED } }),
      alertRepo.count({ where: { status: AlertStatus.RESOLVED } }),
      alertRepo.count({ where: { severity: AlertSeverity.CRITICAL, status: AlertStatus.OPEN } }),
      alertRepo.count({ where: { severity: AlertSeverity.WARNING, status: AlertStatus.OPEN } }),
      alertRepo.count({ where: { severity: AlertSeverity.INFO, status: AlertStatus.OPEN } }),
      userRepo.count({ where: { role: UserRole.TECHNICIAN } }),
      userRepo.count({ where: { role: UserRole.ASSET_MANAGER } }),
      logRepo.count(),
    ]);

    return {
      assets: { total: totalAssets, active: activeAssets, underMaintenance: underMaintenanceAssets, offline: offlineAssets, decommissioned: decommissionedAssets },
      alerts: { open: openAlerts, acknowledged: acknowledgedAlerts, resolved: resolvedAlerts, critical: criticalAlerts, warning: warningAlerts, info: infoAlerts },
      users: { technicians: totalTechnicians, managers: totalManagers },
      maintenanceLogs: { total: totalLogs },
    };
  },
};
