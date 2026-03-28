import { AppDataSource } from "../app-data-source";
import { Alert, AlertSeverity, AlertStatus } from "../entities/Alert";
import { AssetStatus, BESSAsset } from "../entities/BESSAsset";
import { MaintenanceLog } from "../entities/MaintenanceLog";
import { User, UserRole } from "../entities/User";

export const StatsService = {
  async getManagerStats(managerId: string) {
    const assetRepo = AppDataSource.getRepository(BESSAsset);
    const logRepo = AppDataSource.getRepository(MaintenanceLog);

    const assets = await assetRepo.find({ where: { owner: { id: managerId } } });
    const assetIds = assets.map(a => a.id);

    if (assetIds.length === 0) return { averageSoH: null, assetSoH: [] };

    // For each asset, get latest SoH reading
    const assetSoH: { assetId: string; assetName: string; latestSoH: number | null }[] = [];
    for (const asset of assets) {
      const latestLog = await logRepo.findOne({
        where: { asset: { id: asset.id } },
        order: { visitedAt: "DESC" },
      });
      assetSoH.push({ assetId: asset.id, assetName: asset.name, latestSoH: latestLog?.stateOfHealthPercent ?? null });
    }

    const withReadings = assetSoH.filter(a => a.latestSoH !== null);
    const averageSoH = withReadings.length > 0
      ? Math.round(withReadings.reduce((sum, a) => sum + (a.latestSoH as number), 0) / withReadings.length * 10) / 10
      : null;

    return { averageSoH, assetSoH };
  },

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

    // Monthly asset registration counts (last 6 months) using raw query for SQLite
    const monthlyRaw: { month: string; count: number }[] = await AppDataSource.query(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM bess_asset
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`
    );
    const assetsPerMonth = monthlyRaw.reverse();

    return {
      assets: { total: totalAssets, active: activeAssets, underMaintenance: underMaintenanceAssets, offline: offlineAssets, decommissioned: decommissionedAssets },
      alerts: { open: openAlerts, acknowledged: acknowledgedAlerts, resolved: resolvedAlerts, critical: criticalAlerts, warning: warningAlerts, info: infoAlerts },
      users: { technicians: totalTechnicians, managers: totalManagers },
      maintenanceLogs: { total: totalLogs },
      assetsPerMonth,
    };
  },
};
