import { AppDataSource } from "../app-data-source";
import { User, UserRole } from "../entities/User";

const userRepository = () => AppDataSource.getRepository(User);

export const UserService = {
  async listByRole(role?: UserRole) {
    if (role) {
      return userRepository().find({
        where: { role },
        select: { id: true, fullName: true, email: true, role: true },
        order: { fullName: "ASC" },
      });
    }
    return userRepository().find({
      select: { id: true, fullName: true, email: true, role: true },
      order: { fullName: "ASC" },
    });
  },

  async updateRole(userId: string, role: UserRole) {
    const user = await userRepository().findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    user.role = role;
    return userRepository().save(user);
  },
};
