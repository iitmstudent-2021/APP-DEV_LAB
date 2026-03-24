import { AppDataSource } from "../app-data-source";
import { AssetTechnicianAssignment } from "../entities/AssetTechnicianAssignment";
import { BESSAsset } from "../entities/BESSAsset";
import { User, UserRole } from "../entities/User";

const repo = () => AppDataSource.getRepository(AssetTechnicianAssignment);
const assetRepo = () => AppDataSource.getRepository(BESSAsset);
const userRepo = () => AppDataSource.getRepository(User);

export const AssignmentService = {
  async listForAsset(assetId: string) {
    return repo().find({
      where: { asset: { id: assetId } },
      relations: { technician: true },
      order: { assignedAt: "DESC" },
    });
  },

  async assign(assetId: string, technicianId: string, requesterId: string, requesterRole: UserRole) {
    const asset = await assetRepo().findOne({ where: { id: assetId }, relations: { owner: true } });
    if (!asset) throw new Error("Asset not found");

    // ASSET_MANAGER can only assign to their own assets
    if (requesterRole === UserRole.ASSET_MANAGER && asset.owner.id !== requesterId) {
      throw new Error("You can only assign technicians to your own assets");
    }

    const technician = await userRepo().findOne({ where: { id: technicianId, role: UserRole.TECHNICIAN } });
    if (!technician) throw new Error("Technician not found");

    const existing = await repo().findOne({ where: { asset: { id: assetId }, technician: { id: technicianId } } });
    if (existing) throw new Error("Technician is already assigned to this asset");

    const assignment = repo().create({ asset, technician, assignedAt: new Date() });
    return repo().save(assignment);
  },

  async unassign(assetId: string, technicianId: string, requesterId: string, requesterRole: UserRole) {
    const asset = await assetRepo().findOne({ where: { id: assetId }, relations: { owner: true } });
    if (!asset) throw new Error("Asset not found");

    if (requesterRole === UserRole.ASSET_MANAGER && asset.owner.id !== requesterId) {
      throw new Error("You can only remove technicians from your own assets");
    }

    const assignment = await repo().findOne({ where: { asset: { id: assetId }, technician: { id: technicianId } } });
    if (!assignment) throw new Error("Assignment not found");

    await repo().remove(assignment);
  },
};
