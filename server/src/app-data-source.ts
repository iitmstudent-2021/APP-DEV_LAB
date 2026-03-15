import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { Alert } from "./entities/Alert";
import { AssetTechnicianAssignment } from "./entities/AssetTechnicianAssignment";
import { BESSAsset } from "./entities/BESSAsset";
import { MaintenanceLog } from "./entities/MaintenanceLog";
import { User } from "./entities/User";

dotenv.config();

const dbType = process.env.DB_TYPE || "postgres";

const shared = {
  entities: [User, BESSAsset, MaintenanceLog, Alert, AssetTechnicianAssignment],
  synchronize: true,
  logging: false,
};

export const AppDataSource =
  dbType === "sqlite"
    ? new DataSource({
        type: "sqlite",
        database: process.env.SQLITE_PATH || "./dev.sqlite",
        ...shared,
      })
    : new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "bess_portal",
        ...shared,
      });
