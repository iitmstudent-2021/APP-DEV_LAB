import { AppDataSource } from "../app-data-source";
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

const assetRepository = () => AppDataSource.getRepository(BESSAsset);
const userRepository = () => AppDataSource.getRepository(User);

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

  async listForRole(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return assetRepository().find({ relations: { owner: true }, order: { createdAt: "DESC" } });
    }

    if (role === UserRole.ASSET_MANAGER) {
      return assetRepository().find({
        where: { owner: { id: userId } },
        relations: { owner: true },
        order: { createdAt: "DESC" },
      });
    }

    return assetRepository()
      .createQueryBuilder("asset")
      .leftJoinAndSelect("asset.owner", "owner")
      .leftJoin("asset.assignments", "assignment")
      .leftJoin("assignment.technician", "technician")
      .where("technician.id = :userId", { userId })
      .orderBy("asset.createdAt", "DESC")
      .getMany();
  },
};
