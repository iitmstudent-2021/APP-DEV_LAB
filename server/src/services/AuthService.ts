import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../app-data-source";
import { User, UserRole } from "../entities/User";

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
}

const userRepository = () => AppDataSource.getRepository(User);

const buildToken = (user: User): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign({ role: user.role }, secret, {
    subject: user.id,
    expiresIn: "12h",
  });
};

export const AuthService = {
  async register(input: RegisterInput) {
    const repo = userRepository();
    const existing = await repo.findOne({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = repo.create({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
    });

    const saved = await repo.save(user);
    return {
      token: buildToken(saved),
      user: {
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        role: saved.role,
      },
    };
  },

  async login(input: LoginInput) {
    const repo = userRepository();
    const user = await repo.findOne({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new Error("Invalid email or password");
    }

    return {
      token: buildToken(user),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  },
};
