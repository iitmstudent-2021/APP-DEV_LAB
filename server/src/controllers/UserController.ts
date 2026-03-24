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
};
