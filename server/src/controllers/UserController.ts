import { Request, Response } from "express";
import { UserRole } from "../entities/User";
import { UserService } from "../services/UserService";

const isValidRole = (value: unknown): value is UserRole =>
  typeof value === "string" && Object.values(UserRole).includes(value as UserRole);

export const UserController = {
  async list(req: Request, res: Response) {
    const { role } = req.query;
    const roleFilter = role && isValidRole(role) ? role : undefined;
    const users = await UserService.listByRole(roleFilter);
    return res.status(200).json({ users });
  },

  async updateRole(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const userId = req.params.userId as string;
      const { role } = req.body;

      if (!isValidRole(role)) {
        return res.status(400).json({ message: "Invalid role. Use ADMIN, ASSET_MANAGER, or TECHNICIAN" });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }

      const user = await UserService.updateRole(userId, role);
      return res.status(200).json({ user });
    } catch (error) {
      const msg = (error as Error).message;
      return res.status(msg.includes("not found") ? 404 : 400).json({ message: msg });
    }
  },
};
