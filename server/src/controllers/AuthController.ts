import { Request, Response } from "express";
import { UserRole } from "../entities/User";
import { AuthService } from "../services/AuthService";

const isValidRole = (value: unknown): value is UserRole => {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole);
};

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { fullName, email, password, role } = req.body;
      if (!fullName || !email || !password || !role) {
        return res.status(400).json({ message: "fullName, email, password, and role are required" });
      }

      if (!isValidRole(role)) {
        return res.status(400).json({ message: "Invalid role value" });
      }

      const result = await AuthService.register({ fullName, email, password, role });
      return res.status(201).json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes("already exists")) return res.status(409).json({ message: msg });
      return res.status(400).json({ message: msg });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "email and password are required" });
      }

      const result = await AuthService.login({ email, password });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({ message: (error as Error).message });
    }
  },

  me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.status(200).json({ user: req.user });
  },
};
